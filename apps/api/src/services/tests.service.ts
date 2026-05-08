import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';
import { deductCredits } from '../utils/credit.js';
import { parseJsonLoose } from '../utils/ai-json.js';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

// QuestionType değerleri (enum kaldırıldı - SQL Server uyumu)
type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_CORRECT' | 'OPEN_ENDED' | 'YES_NO' | 'ORDERING';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function handleAnthropicError(err: unknown): never {
  if (err instanceof Anthropic.AuthenticationError) {
    throw new AppError(503, 'AI servisi kimlik doğrulama hatası. ANTHROPIC_API_KEY değerini kontrol edin.');
  }
  if (err instanceof Anthropic.RateLimitError) {
    throw new AppError(429, 'AI servisi istek limiti aşıldı. Lütfen biraz bekleyin.');
  }
  if (err instanceof Anthropic.APIConnectionError) {
    throw new AppError(503, 'AI servisine bağlanılamadı. İnternet bağlantınızı kontrol edin.');
  }
  if (err instanceof Anthropic.APIError) {
    throw new AppError(502, `AI servisi hatası: ${(err as Error).message}`);
  }
  throw err;
}

const VALID_QUESTION_TYPES: QuestionType[] = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_CORRECT',
  'OPEN_ENDED',
  'YES_NO',
  'ORDERING',
];

function normalizeQuestionType(raw: unknown): QuestionType {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (VALID_QUESTION_TYPES.includes(s as QuestionType)) return s as QuestionType;
  const t = String(raw ?? '').toLowerCase();
  if (t.includes('multiple') && t.includes('correct')) return 'MULTIPLE_CORRECT';
  if (t.includes('multiple') || t.includes('çoktan')) return 'MULTIPLE_CHOICE';
  if (t.includes('open') || t.includes('açık')) return 'OPEN_ENDED';
  if (t.includes('yes') || t.includes('evet') || t.includes('hayır')) return 'YES_NO';
  if (t.includes('order') || t.includes('sıra')) return 'ORDERING';
  return 'MULTIPLE_CHOICE';
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function listTests(ownerId: string) {
  return prisma.test.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      isPublished: true,
      isTemplate: true,
      shareToken: true,
      timeLimit: true,
      parameters: true,
      createdAt: true,
      _count: { select: { questions: true, sessions: true } },
    },
  });
}

export async function getTest(id: string, ownerId: string) {
  const test = await prisma.test.findFirst({
    where: { id, ownerId },
    include: { questions: { orderBy: { orderIndex: 'asc' } }, document: true },
  });
  if (!test) throw new AppError(404, 'Test bulunamadı');

  // Soruları parse et — options ve correctAnswer DB'de JSON string olarak saklanıyor
  const parsedQuestions = test.questions.map((q) => ({
    ...q,
    options: q.options ? safeJsonParse(q.options) : null,
    correctAnswer: q.correctAnswer ? safeJsonParse(q.correctAnswer) : null,
  }));

  return { ...test, questions: parsedQuestions };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function createTestDraft(params: {
  ownerId: string;
  title: string;
  documentId?: string;
  parameters?: object;
  timeLimit?: number;
}) {
  return prisma.test.create({
    data: {
      title: params.title,
      documentId: params.documentId,
      parameters: JSON.stringify(params.parameters ?? {}),
      timeLimit: params.timeLimit,
      ownerId: params.ownerId,
    },
  });
}

export async function updateTest(
  id: string,
  ownerId: string,
  data: {
    title?: string;
    parameters?: object;
    timeLimit?: number;
    isPublished?: boolean;
  }
) {
  await getTest(id, ownerId);
  return prisma.test.update({ where: { id }, data });
}

export async function publishTest(id: string, ownerId: string) {
  await getTest(id, ownerId);
  const shareToken = crypto.randomBytes(12).toString('hex');
  return prisma.test.update({
    where: { id },
    data: { isPublished: true, shareToken },
  });
}

export async function deleteTest(id: string, ownerId: string) {
  await getTest(id, ownerId);
  await prisma.test.delete({ where: { id } });
}

// ─── AI Test Generation ────────────────────────────────────────────────────────

interface GenerateTestParams {
  userId: string;
  testId: string;
  documentContent?: string;
  questionCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questionTypes: string[];
  competencies: string[];
  language?: 'TR' | 'EN';
  additionalInstructions?: string;
}

function buildTestGenerationPrompt(p: GenerateTestParams): string {
  const difficultyLabel =
    p.difficulty === 'beginner' ? 'Başlangıç' :
      p.difficulty === 'intermediate' ? 'Orta' : 'İleri';

  const typesList = p.questionTypes.join(', ');
  const competencyList = p.competencies.join(', ');

  return `Sen bir eğitim ve değerlendirme uzmanısın. Aşağıdaki parametrelere göre ${p.questionCount} soruluk bir test oluştur.

**Parametreler:**
- Soru Sayısı: ${p.questionCount}
- Zorluk Seviyesi: ${difficultyLabel}
- Soru Tipleri: ${typesList}
- Ölçülecek Yetkinlikler: ${competencyList}
${p.documentContent ? `\n**Kaynak Doküman İçeriği:**\n${p.documentContent.slice(0, 8000)}\n` : ''}
${p.additionalInstructions ? `**Ek Talimatlar:** ${p.additionalInstructions}` : ''}

**Çok önemli:** Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:

{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE | MULTIPLE_CORRECT | OPEN_ENDED | YES_NO | ORDERING",
      "content": "Soru metni",
      "options": [
        { "id": "a", "text": "Seçenek A" },
        { "id": "b", "text": "Seçenek B" },
        { "id": "c", "text": "Seçenek C" },
        { "id": "d", "text": "Seçenek D" }
      ],
      "correctAnswer": "a",
      "competency": "İlgili yetkinlik adı"
    }
  ]
}

Notlar:
- OPEN_ENDED sorularda options ve correctAnswer null olabilir
- YES_NO sorularda options [{"id":"yes","text":"Evet"},{"id":"no","text":"Hayır"}]
- ORDERING sorularda correctAnswer ["a","b","c","d"] şeklinde sıralı dizi
- MULTIPLE_CORRECT sorularda correctAnswer ["a","c"] gibi dizi`;
}

function buildFallbackQuestions(params: GenerateTestParams): { questions: any[] } {
  const isTR = params.language !== 'EN';
  const topic = params.additionalInstructions?.split('\n')[0]?.replace(/^Konular:\s*/i, '') ||
    params.documentContent?.slice(0, 60) || (isTR ? 'Genel Bilgi' : 'General Knowledge');

  const questions: any[] = [];
  const types = params.questionTypes.length ? params.questionTypes : ['MULTIPLE_CHOICE'];

  for (let i = 0; i < params.questionCount; i++) {
    const type = normalizeQuestionType(types[i % types.length]);
    if (type === 'OPEN_ENDED') {
      questions.push({
        type: 'OPEN_ENDED',
        content: isTR
          ? `${topic} konusuyla ilgili ${i + 1}. açık uçlu soruyu kendi bilgilerinize göre yanıtlayın.`
          : `Answer open-ended question ${i + 1} about: ${topic}`,
        options: null,
        correctAnswer: null,
        competency: params.competencies[0] ?? topic,
      });
    } else if (type === 'YES_NO') {
      questions.push({
        type: 'YES_NO',
        content: isTR
          ? `${topic} konusunda ${i + 1}. ifade doğru mudur?`
          : `Is statement ${i + 1} about ${topic} correct?`,
        options: [{ id: 'yes', text: isTR ? 'Evet' : 'Yes' }, { id: 'no', text: isTR ? 'Hayır' : 'No' }],
        correctAnswer: 'yes',
        competency: params.competencies[0] ?? topic,
      });
    } else {
      questions.push({
        type,
        content: isTR
          ? `${topic} konusunda ${i + 1}. soru — lütfen bu soruyu düzenleyin.`
          : `Question ${i + 1} about ${topic} — please edit this question.`,
        options: [
          { id: 'a', text: isTR ? 'Seçenek A' : 'Option A' },
          { id: 'b', text: isTR ? 'Seçenek B' : 'Option B' },
          { id: 'c', text: isTR ? 'Seçenek C' : 'Option C' },
          { id: 'd', text: isTR ? 'Seçenek D' : 'Option D' },
        ],
        correctAnswer: type === 'MULTIPLE_CORRECT' ? ['a'] : 'a',
        competency: params.competencies[0] ?? topic,
      });
    }
  }
  return { questions };
}

async function saveQuestions(params: GenerateTestParams, parsed: { questions: any[] }, isFallback: boolean) {
  const test = await prisma.test.findUnique({ where: { id: params.testId } });
  if (!test) throw new AppError(404, 'Test bulunamadı');

  // Kontörü sadece gerçek AI için düş
  if (!isFallback) {
    await deductCredits(
      params.userId,
      50,
      'TEST_GENERATION',
      `Test soruları üretimi (${params.questionCount} soru)`
    );
  }

  await prisma.question.deleteMany({ where: { testId: params.testId } });

  const questions = await prisma.$transaction(
    parsed.questions.map((q: any, i: number) => {
      const content =
        typeof q.content === 'string' && q.content.trim().length > 0
          ? q.content.trim()
          : 'Soru metni oluşturulamadı; lütfen soruyu düzenleyin.';
      return prisma.question.create({
        data: {
          testId: params.testId,
          type: normalizeQuestionType(q.type),
          content,
          options: q.options != null ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer != null ? JSON.stringify(q.correctAnswer) : null,
          orderIndex: i,
        },
      });
    })
  );

  return questions;
}

export async function generateTestQuestions(params: GenerateTestParams) {
  const isDev = process.env.NODE_ENV !== 'production';

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    if (isDev) {
      return await saveQuestions(params, buildFallbackQuestions(params), true);
    }
    throw new AppError(503, 'AI servisi yapılandırılmamış (ANTHROPIC_API_KEY eksik).');
  }

  let message: Awaited<ReturnType<typeof claude.messages.create>>;
  try {
    message = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: `Sen profesyonel bir test ve sınav hazırlama uzmanısın. ${params.language === 'EN' ? 'Respond in English.' : 'Türkçe yanıt ver.'}`,
      messages: [{ role: 'user', content: buildTestGenerationPrompt(params) }],
    });
  } catch (err) {
    if (isDev && (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.APIConnectionError)) {
      return await saveQuestions(params, buildFallbackQuestions(params), true);
    }
    handleAnthropicError(err);
  }

  const raw = message!.content[0];
  if (raw.type !== 'text') throw new AppError(500, 'AI yanıtı alınamadı');

  let parsed: { questions: any[] };
  try {
    const obj = parseJsonLoose<Record<string, unknown> | unknown[]>(raw.text);
    let questions: any[];
    if (Array.isArray(obj)) questions = obj;
    else if (obj && typeof obj === 'object' && Array.isArray((obj as { questions?: unknown }).questions))
      questions = (obj as { questions: any[] }).questions;
    else if (obj && typeof obj === 'object' && Array.isArray((obj as { data?: unknown }).data))
      questions = (obj as { data: any[] }).data;
    else throw new Error('no questions array');
    if (!questions.length) throw new Error('empty questions');
    parsed = { questions };
  } catch {
    throw new AppError(500, 'AI yanıtı JSON formatında değil veya soru listesi okunamadı');
  }

  return await saveQuestions(params, parsed, false);
}

// ─── Questions CRUD ────────────────────────────────────────────────────────────

export async function updateQuestion(
  questionId: string,
  ownerId: string,
  data: {
    content?: string;
    options?: any;
    correctAnswer?: any;
    orderIndex?: number;
  }
) {
  const q = await prisma.question.findFirst({
    where: { id: questionId, test: { ownerId } },
  });
  if (!q) throw new AppError(404, 'Soru bulunamadı');
  return prisma.question.update({ where: { id: questionId }, data });
}

export async function deleteQuestion(questionId: string, ownerId: string) {
  const q = await prisma.question.findFirst({
    where: { id: questionId, test: { ownerId } },
  });
  if (!q) throw new AppError(404, 'Soru bulunamadı');
  await prisma.question.delete({ where: { id: questionId } });
}
