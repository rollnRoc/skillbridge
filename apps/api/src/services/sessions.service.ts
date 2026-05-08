import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';
import { deductCredits } from '../utils/credit.js';
import { parseJsonLoose } from '../utils/ai-json.js';
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type SessionMeta = {
  participantName?: string;
  invitationToken?: string;
  inviteEmail?: string;
};

function parseSessionMeta(aiReport: string | null | undefined): SessionMeta {
  if (!aiReport) return {};
  try {
    const parsed = JSON.parse(aiReport) as { meta?: SessionMeta };
    return parsed?.meta ?? {};
  } catch {
    return {};
  }
}

function mergeSessionReport(
  aiReport: string | null | undefined,
  patch: { meta?: SessionMeta; breakdown?: unknown; aiAnalysis?: unknown }
): string {
  let base: Record<string, unknown> = {};
  if (aiReport) {
    try {
      base = JSON.parse(aiReport) as Record<string, unknown>;
    } catch {
      base = {};
    }
  }

  const prevMeta = ((base.meta as SessionMeta | undefined) ?? {});
  const nextMeta = patch.meta ? { ...prevMeta, ...patch.meta } : prevMeta;

  return JSON.stringify({
    ...base,
    ...(patch.breakdown !== undefined ? { breakdown: patch.breakdown } : {}),
    ...(patch.aiAnalysis !== undefined ? { aiAnalysis: patch.aiAnalysis } : {}),
    meta: nextMeta,
  });
}

// ─── Test Oturumu ──────────────────────────────────────────────────────────────

export async function startSession(
  testId: string,
  userId: string,
  shareToken?: string,
  participantName?: string
) {
  // Token ile erişimde şablon ya da paylaşılan test
  let test;
  let invitationToken: string | undefined;
  let inviteEmail: string | undefined;
  if (shareToken) {
    const invitation = await prisma.invitation.findUnique({
      where: { token: shareToken },
      include: {
        test: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                type: true,
                content: true,
                options: true,
                orderIndex: true,
              },
            },
          },
        },
      },
    });

    // Davet token'i zaten erişim yetkisi verir; testin global olarak publish olma
    // şartı olmadan, süre geçerliliği üzerinden kontrol ederiz.
    const isInvitationValid =
      !!invitation &&
      (!invitation.expiresAt || invitation.expiresAt > new Date());

    if (isInvitationValid && invitation) {
      test = invitation.test;
      invitationToken = invitation.token;
      inviteEmail = invitation.email;
      if (invitation.status === 'PENDING' || invitation.status === 'EMAIL_OPENED') {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'TEST_STARTED' },
        });
      }
    } else {
      test = await prisma.test.findFirst({
        where: { shareToken, isPublished: true },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              type: true,
              content: true,
              options: true,
              orderIndex: true,
              // correctAnswer gönderilmez
            },
          },
        },
      });
    }
  } else {
    test = await prisma.test.findFirst({
      where: { id: testId, OR: [{ ownerId: userId }, { isPublished: true }] },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            type: true,
            content: true,
            options: true,
            orderIndex: true,
          },
        },
      },
    });
  }

  if (!test) throw new AppError(404, 'Test bulunamadı veya erişim izniniz yok');

  // Hazır şablon ise kontör düş (soru başına 1)
  if (test.isTemplate) {
    const cost = test.questions.length;
    await deductCredits(
      userId,
      cost,
      'READY_TEST',
      `${test.title} şablonu (${cost} soru)`
    );
  }

  // Davet/token akışında her giriş için yeni oturum açılır.
  if (!shareToken) {
    const existing = await prisma.testSession.findFirst({
      where: { testId: test.id, userId, completedAt: null },
    });
    if (existing) return { session: existing, test };
  }

  const session = await prisma.testSession.create({
    data: {
      testId: test.id,
      userId,
      aiReport: mergeSessionReport(undefined, {
        meta: {
          participantName: participantName?.trim() || undefined,
          invitationToken,
          inviteEmail,
        },
      }),
    },
  });

  return { session, test };
}

export async function saveAnswer(
  sessionId: string,
  userId: string,
  questionId: string,
  response: unknown
) {
  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId, completedAt: null },
  });
  if (!session) throw new AppError(404, 'Aktif oturum bulunamadı');

  return prisma.answer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: { sessionId, questionId, response: response as any },
    update: { response: response as any },
  });
}

export async function completeSession(sessionId: string, userId: string) {
  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId, completedAt: null },
    include: {
      test: {
        include: {
          questions: true,
        },
      },
      answers: true,
    },
  });
  if (!session) throw new AppError(404, 'Aktif oturum bulunamadı');

  // Puanlama
  const { score, breakdown } = calculateScore(session.test.questions, session.answers);

  const completed = await prisma.testSession.update({
    where: { id: sessionId },
    data: {
      completedAt: new Date(),
      score,
      aiReport: mergeSessionReport(session.aiReport, { breakdown }),
    },
  });

  const meta = parseSessionMeta(session.aiReport);
  if (meta.invitationToken) {
    await prisma.invitation.updateMany({
      where: { token: meta.invitationToken },
      data: { status: 'COMPLETED' },
    });
  }

  return { session: completed, breakdown };
}

// ─── Puanlama ──────────────────────────────────────────────────────────────────

function calculateScore(questions: any[], answers: any[]) {
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  let correct = 0;
  let wrong = 0;
  let empty = 0;

  const breakdown: Record<string, { correct: number; total: number }> = {};

  for (const q of questions) {
    const answer = answerMap.get(q.id);

    if (!answer || answer.response === null || answer.response === undefined) {
      empty++;
      continue;
    }

    const isCorrect = checkAnswer(q, answer.response);

    if (isCorrect) {
      correct++;
      breakdown[q.id] = { correct: 1, total: 1 };
    } else {
      wrong++;
      breakdown[q.id] = { correct: 0, total: 1 };
    }
  }

  const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;
  return { score: Math.round(score * 10) / 10, breakdown: { correct, wrong, empty, total: questions.length, score } };
}

function checkAnswer(question: any, response: unknown): boolean {
  if (!question.correctAnswer) return false; // Açık uçlu = AI değerlendirir

  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'YES_NO':
      return response === question.correctAnswer;

    case 'MULTIPLE_CORRECT': {
      const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
      const given = Array.isArray(response) ? response : [];
      return (
        correct.length === given.length &&
        correct.every((c: string) => given.includes(c))
      );
    }

    case 'ORDERING': {
      const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
      const given = Array.isArray(response) ? response : [];
      return correct.every((c: string, i: number) => c === given[i]);
    }

    default:
      return false;
  }
}

// ─── AI Yorumu ─────────────────────────────────────────────────────────────────

export async function requestAIAnalysis(sessionId: string, userId: string) {
  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      test: { include: { questions: true } },
      answers: true,
    },
  });
  if (!session) throw new AppError(404, 'Oturum bulunamadı');
  if (!session.completedAt) throw new AppError(400, 'Test henüz tamamlanmamış');

  // Mevcut rapor varsa döndür
  const existing = session.aiReport ? JSON.parse(session.aiReport) : null;
  if (existing?.aiAnalysis) return { aiAnalysis: existing.aiAnalysis };

  // 10 kontör düş
  await deductCredits(userId, 10, 'AI_ANALYSIS', `${session.test.title} AI yorumu`);

  // Veri hazırla
  const answerMap = new Map(session.answers.map((a) => [a.questionId, a.response]));
  const qaList = session.test.questions.map((q) => ({
    question: q.content,
    type: q.type,
    correctAnswer: q.correctAnswer,
    userAnswer: answerMap.get(q.id) ?? null,
    isCorrect: checkAnswer(q, answerMap.get(q.id) ?? null),
  }));

  const prompt = `Bir değerlendirme testinin sonuçlarını analiz et ve profesyonel bir geri bildirim raporu hazırla.

**Test:** ${session.test.title}
**Toplam Puan:** ${session.score?.toFixed(1)}%
**Parametreler:** ${JSON.stringify(session.test.parameters)}

**Soru-Cevap Detayları:**
${qaList.map((q, i) => `${i + 1}. [${q.isCorrect ? 'DOĞRU' : 'YANLIŞ'}] ${q.question}`).join('\n')}

Lütfen aşağıdaki JSON formatında yanıt ver:
{
  "strengthAreas": ["güçlü yön 1", "güçlü yön 2"],
  "improvementAreas": ["gelişim alanı 1", "gelişim alanı 2"],
  "developmentSuggestions": ["öneri 1", "öneri 2", "öneri 3"],
  "careerGuidance": "kariyer yönlendirmesi metni",
  "overallFeedback": "genel değerlendirme paragrafı",
  "competencyLevel": "Çok Yetkin | Yetkin | Beklenen / Ortalama | Yetkin Olmayan"
}`;

  const msg = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0];
  if (raw.type !== 'text') throw new AppError(500, 'AI yanıtı alınamadı');

  let aiAnalysis: object;
  try {
    aiAnalysis = parseJsonLoose<Record<string, unknown>>(raw.text);
  } catch {
    const text = raw.text.trim();
    aiAnalysis = {
      strengthAreas: [] as string[],
      improvementAreas: [] as string[],
      developmentSuggestions: [] as string[],
      careerGuidance: '',
      overallFeedback: text.slice(0, 8000),
      competencyLevel: 'Beklenen / Ortalama',
      _parseNote: 'Yanıt JSON olarak çözülemedi; ham metin overallFeedback alanında saklandı.',
    };
  }

  // Raporu kaydet
  await prisma.testSession.update({
    where: { id: sessionId },
    data: {
      aiReport: mergeSessionReport(session.aiReport, { aiAnalysis }),
    },
  });

  return { aiAnalysis };
}

// ─── Geçmiş ────────────────────────────────────────────────────────────────────

export async function getSessionResult(
  sessionId: string,
  viewerId: string,
  viewerRole: string,
  viewerCompanyId?: string
) {
  const canViewAll = viewerRole === 'PLATFORM_ADMIN';
  const canViewCompany = viewerRole === 'CORPORATE_ADMIN' && !!viewerCompanyId;

  const accessFilter = canViewAll
    ? {}
    : canViewCompany
      ? {
        OR: [
          { userId: viewerId },
          { test: { owner: { companyId: viewerCompanyId } } },
        ],
      }
      : { userId: viewerId };

  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, ...accessFilter },
    include: {
      test: { select: { id: true, title: true, parameters: true, timeLimit: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      answers: {
        include: { question: { select: { content: true, type: true, correctAnswer: true } } },
      },
    },
  });
  if (!session) throw new AppError(404, 'Sonuç bulunamadı');

  // correctAnswer ve response alanlarını parse et — DB'de JSON string olarak saklanıyor
  const parsedAnswers = session.answers.map((a) => ({
    ...a,
    question: {
      ...a.question,
      correctAnswer: a.question.correctAnswer ? safeJsonParse(a.question.correctAnswer) : null,
    },
  }));

  return { ...session, answers: parsedAnswers };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}


export async function listUserSessions(userId: string) {
  return listSessionsForViewer(userId, 'INDIVIDUAL');
}

export async function listSessionsForViewer(
  viewerId: string,
  viewerRole: string,
  viewerCompanyId?: string
) {
  const canViewAll = viewerRole === 'PLATFORM_ADMIN';
  const canViewCompany = viewerRole === 'CORPORATE_ADMIN' && !!viewerCompanyId;

  const where = canViewAll
    ? { completedAt: { not: null } }
    : canViewCompany
      ? {
        completedAt: { not: null },
        OR: [
          { userId: viewerId },
          { test: { owner: { companyId: viewerCompanyId } } },
        ],
      }
      : { userId: viewerId, completedAt: { not: null } };

  return prisma.testSession.findMany({
    where,
    orderBy: { completedAt: 'desc' },
    include: {
      test: { select: { id: true, title: true, parameters: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}
