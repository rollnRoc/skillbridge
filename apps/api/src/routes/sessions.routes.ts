import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as sessionsService from '../services/sessions.service.js';
import * as templatesService from '../services/templates.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { getAssessmentConfig } from '../utils/assessment-config.js';

const router = Router();
router.use(authenticate);

// ─── Şablon Kütüphanesi ────────────────────────────────────────────────────────

// GET /api/sessions/templates
router.get('/templates', async (req, res, next) => {
  try {
    const { search, difficulty, minQ, maxQ } = req.query as Record<string, string>;
    const templates = await templatesService.listTemplates({
      search,
      difficulty,
      minQuestions: minQ ? Number(minQ) : undefined,
      maxQuestions: maxQ ? Number(maxQ) : undefined,
    });
    res.json(templates);
  } catch (err) { next(err); }
});

// GET /api/sessions/assessment-config
router.get('/assessment-config', async (_req, res, next) => {
  try {
    res.json(await getAssessmentConfig());
  } catch (err) { next(err); }
});

// GET /api/sessions/templates/:id/preview
router.get('/templates/:id/preview', async (req, res, next) => {
  try {
    res.json(await templatesService.previewTemplate(req.params.id));
  } catch (err) { next(err); }
});

// POST /api/sessions/templates/:id/use — Şablonu kopyala (50 kontör düşmez, sadece kopya oluşturur)
router.post('/templates/:id/use', async (req: any, res, next) => {
  try {
    res.status(201).json(await templatesService.useTemplate(req.params.id, req.user.id));
  } catch (err) { next(err); }
});

// ─── Test Oturumu ──────────────────────────────────────────────────────────────

// POST /api/sessions/start
router.post('/start', async (req: any, res, next) => {
  try {
    const { testId, shareToken, participantName } = req.body;
    if (!testId && !shareToken) throw new AppError(400, 'testId veya shareToken gereklidir');
    const result = await sessionsService.startSession(testId, req.user.id, shareToken, participantName);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// POST /api/sessions/:sessionId/answer
router.post('/:sessionId/answer', async (req: any, res, next) => {
  try {
    const { questionId, response } = req.body;
    if (!questionId) throw new AppError(400, 'questionId zorunludur');
    const answer = await sessionsService.saveAnswer(
      req.params.sessionId,
      req.user.id,
      questionId,
      response
    );
    res.json(answer);
  } catch (err) { next(err); }
});

// POST /api/sessions/:sessionId/complete
router.post('/:sessionId/complete', async (req: any, res, next) => {
  try {
    res.json(await sessionsService.completeSession(req.params.sessionId, req.user.id));
  } catch (err) { next(err); }
});

// POST /api/sessions/:sessionId/ai-analysis — AI yorumu (10 kontör)
router.post('/:sessionId/ai-analysis', async (req: any, res, next) => {
  try {
    res.json(await sessionsService.requestAIAnalysis(req.params.sessionId, req.user.id));
  } catch (err) { next(err); }
});

// GET /api/sessions/:sessionId/result
router.get('/:sessionId/result', async (req: any, res, next) => {
  try {
    res.json(
      await sessionsService.getSessionResult(
        req.params.sessionId,
        req.user.id,
        req.user.role,
        req.user.companyId
      )
    );
  } catch (err) { next(err); }
});

// GET /api/sessions — Geçmiş testler
router.get('/', async (req: any, res, next) => {
  try {
    res.json(
      await sessionsService.listSessionsForViewer(
        req.user.id,
        req.user.role,
        req.user.companyId
      )
    );
  } catch (err) { next(err); }
});

export default router;
