import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticate } from '../middleware/auth.middleware.js';
import * as aiDocumentService from '../services/ai-document.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { prisma } from '@org/database';

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Anthropic.AuthenticationError)
    return new AppError(503, 'AI servisi kimlik doğrulama hatası. Lütfen sistem yöneticisine başvurun.');
  if (err instanceof Anthropic.RateLimitError)
    return new AppError(429, 'AI servisi istek limiti aşıldı. Lütfen biraz bekleyin.');
  if (err instanceof Anthropic.APIConnectionError)
    return new AppError(503, 'AI servisine bağlanılamadı.');
  if (err instanceof Anthropic.APIError)
    return new AppError(502, `AI servisi hatası: ${(err as Error).message}`);
  return new AppError(500, 'Sunucu hatası');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const router = Router();
router.use(authenticate);

// POST /api/ai/generate-document
router.post('/generate-document', async (req: any, res, next) => {
  try {
    const { topic, documentType, sector, occupation, language, additionalContext } = req.body;

    if (!topic || String(topic).trim() === '') {
      throw new AppError(400, 'Konu zorunludur');
    }

    const result = await aiDocumentService.generateDocument({
      userId: req.user.id,
      topic: String(topic).trim(),
      documentType,
      sector,
      occupation,
      language,
      additionalContext,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/save-document
router.post('/save-document', async (req: any, res, next) => {
  try {
    const { title, content, language, category, description } = req.body;

    if (!title || !content) {
      throw new AppError(400, 'Başlık ve içerik zorunludur');
    }

    const doc = await aiDocumentService.saveGeneratedDocument({
      userId: req.user.id,
      title,
      content,
      language,
      category,
      description,
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/cv-jd-match
router.post('/cv-jd-match', async (req: any, res, next) => {
  try {
    const { cvText, jdText, language = 'TR' } = req.body;
    if (!cvText || !jdText) throw new AppError(400, 'CV ve iş tanımı zorunludur');

    const lang = language === 'EN' ? 'English' : 'Türkçe';
    const systemPrompt = language === 'EN'
      ? 'You are an expert HR consultant specializing in CV and job description matching. Respond in English with strict JSON only — no markdown fences.'
      : 'Sen deneyimli bir İK uzmanısın. CV ve iş ilanı eşleştirme konusunda uzmansın. Yanıtını yalnızca geçerli JSON olarak ver — markdown fence kullanma.';

    const userPrompt = `Aşağıdaki CV ile iş tanımını (JD) analiz et ve eşleşme skoru hesapla.

CV:
${cvText.slice(0, 4000)}

İş Tanımı (JD):
${jdText.slice(0, 4000)}

Yanıtını şu JSON yapısında ver (${lang}):
{
  "matchScore": <0-100 arası sayı>,
  "summary": "<2-3 cümle özet>",
  "strengths": ["<güçlü yön 1>", "<güçlü yön 2>", ...],
  "gaps": ["<eksik 1>", "<eksik 2>", ...],
  "recommendation": "<işe alma tavsiyesi>"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0];
    if (text.type !== 'text') throw new AppError(500, 'AI yanıtı alınamadı');

    // Strip possible markdown fences before parsing
    const cleaned = text.text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    // Deduct 10 credits
    await aiDocumentService.deductAnalysisCredits(req.user.id);

    res.json(result);
  } catch (err) { next(toAppError(err)); }
});

// ─── POST /api/ai/cv-jd-multi — Görev tanımına birden fazla CV karşılaştır ─────
router.post('/cv-jd-multi', async (req: any, res, next) => {
  try {
    const { jdText, cvs, language = 'TR' } = req.body as {
      jdText: string;
      cvs: { name: string; text: string }[];
      language?: string;
    };
    if (!jdText || !cvs?.length || cvs.length < 2) {
      throw new AppError(400, 'İş tanımı ve en az 2 CV gereklidir');
    }
    const lang = language === 'EN' ? 'English' : 'Türkçe';
    const systemPrompt = language === 'EN'
      ? 'You are an expert HR recruiter. Compare multiple CVs against a job description and rank candidates. Respond with strict JSON only.'
      : 'Sen deneyimli bir İK uzmanısın. Birden fazla CV\'yi iş tanımıyla karşılaştırıp adayları sırala. Yanıtını yalnızca geçerli JSON olarak ver.';

    const cvsText = cvs.map((cv, i) => `--- ADAY ${i + 1}: ${cv.name} ---\n${cv.text.slice(0, 2000)}`).join('\n\n');

    const userPrompt = `İş Tanımı:\n${jdText.slice(0, 3000)}\n\n${cvsText}\n\nAdayları iş tanımına uygunlukları açısından karşılaştır ve sırala. Yanıtını ${lang} dilinde şu JSON formatında ver:\n{\n  "winner": "<en uygun aday adı>",\n  "rankings": [\n    { "rank": 1, "name": "<ad>", "score": <0-100>, "summary": "<2 cümle özet>", "strengths": ["..."], "gaps": ["..."] },\n    ...\n  ],\n  "verdict": "<genel değerlendirme ve işe alım tavsiyesi>"\n}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = message.content[0];
    if (text.type !== 'text') throw new AppError(500, 'AI yanıtı alınamadı');
    const cleaned = text.text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    await aiDocumentService.deductAnalysisCredits(req.user.id);
    res.json(result);
  } catch (err) { next(toAppError(err)); }
});

// ─── POST /api/ai/cv-vs-cv — İki CV karşılaştır ───────────────────────────────
router.post('/cv-vs-cv', async (req: any, res, next) => {
  try {
    const { cv1, cv2, position, language = 'TR' } = req.body as {
      cv1: { name: string; text: string };
      cv2: { name: string; text: string };
      position?: string;
      language?: string;
    };
    if (!cv1?.text || !cv2?.text) throw new AppError(400, 'İki CV gereklidir');
    const lang = language === 'EN' ? 'English' : 'Türkçe';
    const systemPrompt = language === 'EN'
      ? 'You are an expert HR analyst comparing two candidate CVs. Respond with strict JSON only.'
      : 'Sen iki adayın CV\'sini karşılaştıran uzman bir İK analistsin. Yanıtını yalnızca geçerli JSON olarak ver.';

    const positionText = position ? `Değerlendirilen Pozisyon: ${position}\n\n` : '';
    const userPrompt = `${positionText}CV A — ${cv1.name}:\n${cv1.text.slice(0, 3000)}\n\n---\n\nCV B — ${cv2.name}:\n${cv2.text.slice(0, 3000)}\n\nBu iki CV'yi karşılaştır. Yanıtını ${lang} dilinde şu JSON formatında ver:\n{\n  "winner": "<kazanan ad veya 'Berabere'>",\n  "scores": { "A": <0-100>, "B": <0-100> },\n  "summary": "<genel karşılaştırma özeti>",\n  "cvA": { "strengths": ["..."], "weaknesses": ["..."] },\n  "cvB": { "strengths": ["..."], "weaknesses": ["..."] },\n  "verdict": "<kim daha üstün ve neden - 2-3 cümle>"\n}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1536,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = message.content[0];
    if (text.type !== 'text') throw new AppError(500, 'AI yanıtı alınamadı');
    const cleaned = text.text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    await aiDocumentService.deductAnalysisCredits(req.user.id);
    res.json(result);
  } catch (err) { next(toAppError(err)); }
});

// ─── POST /api/ai/compare-sessions — Birden fazla oturumun cevaplarını karşılaştır
router.post('/compare-sessions', async (req: any, res, next) => {
  try {
    const { sessionIds, language = 'TR' } = req.body as { sessionIds: string[]; language?: string };
    if (!sessionIds?.length || sessionIds.length < 2) {
      throw new AppError(400, 'En az 2 oturum ID gereklidir');
    }
    // Fetch session data with answers and questions
    const sessions = await prisma.testSession.findMany({
      where: { id: { in: sessionIds } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        test: { select: { title: true } },
        answers: {
          include: {
            question: { select: { content: true, type: true, correctAnswer: true } },
          },
        },
      },
    });
    if (sessions.length < 2) throw new AppError(404, 'Oturumlar bulunamadı');

    const lang = language === 'EN' ? 'English' : 'Türkçe';
    const systemPrompt = language === 'EN'
      ? 'You are an expert test evaluator comparing multiple candidate test sessions. Respond with strict JSON only.'
      : 'Sen birden fazla adayın test cevaplarını karşılaştıran uzman bir değerlendiricisin. Yanıtını yalnızca geçerli JSON olarak ver.';

    const sessionsText = sessions.map((s, i) => {
      const name = `${s.user.firstName} ${s.user.lastName}`;
      const answers = s.answers.map((a) =>
        `Soru: ${a.question.content}\nCevap: ${JSON.stringify(a.response)}\nDoğru: ${JSON.stringify(a.question.correctAnswer)}`
      ).join('\n\n');
      return `--- ADAY ${i + 1}: ${name} (Puan: ${s.score ?? 'N/A'}) ---\n${answers}`;
    }).join('\n\n====================\n\n');

    const testTitle = sessions[0]?.test.title ?? 'Test';
    const userPrompt = `Test: ${testTitle}\n\n${sessionsText}\n\nBu adayların cevaplarını karşılaştır ve kiminin daha iyi performans gösterdiğini belirle. Yanıtını ${lang} dilinde şu JSON formatında ver:\n{\n  "winner": "<kazanan aday tam adı>",\n  "rankings": [\n    { "rank": 1, "name": "<ad>", "systemScore": <sayı>, "aiScore": <0-100>, "summary": "<2 cümle performans özeti>", "strengths": ["..."], "weaknesses": ["..."] },\n    ...\n  ],\n  "verdict": "<genel karşılaştırma ve sonuç>"\n}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = message.content[0];
    if (text.type !== 'text') throw new AppError(500, 'AI yanıtı alınamadı');
    const cleaned = text.text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    await aiDocumentService.deductAnalysisCredits(req.user.id);
    res.json(result);
  } catch (err) { next(toAppError(err)); }
});

export default router;
