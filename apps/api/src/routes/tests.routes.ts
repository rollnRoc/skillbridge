import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';
import * as testsService from '../services/tests.service.js';

const router = Router();
router.use(authenticate);

// GET /api/tests
router.get('/', async (req: any, res, next) => {
  try {
    res.json(await testsService.listTests(req.user.id));
  } catch (err) { next(err); }
});

// GET /api/tests/:id
router.get('/:id', async (req: any, res, next) => {
  try {
    res.json(await testsService.getTest(req.params.id, req.user.id));
  } catch (err) { next(err); }
});

// POST /api/tests — taslak oluştur
router.post('/', async (req: any, res, next) => {
  try {
    const test = await testsService.createTestDraft({
      ownerId: req.user.id,
      title: req.body.title || 'Yeni Test',
      documentId: req.body.documentId,
      parameters: req.body.parameters,
      timeLimit: req.body.timeLimit,
    });
    res.status(201).json(test);
  } catch (err) { next(err); }
});

// PATCH /api/tests/questions/:questionId  — must come BEFORE /:id routes
router.patch('/questions/:questionId', async (req: any, res, next) => {
  try {
    res.json(await testsService.updateQuestion(req.params.questionId, req.user.id, req.body));
  } catch (err) { next(err); }
});

// DELETE /api/tests/questions/:questionId — must come BEFORE /:id routes
router.delete('/questions/:questionId', async (req: any, res, next) => {
  try {
    await testsService.deleteQuestion(req.params.questionId, req.user.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// PATCH /api/tests/:id
router.patch('/:id', async (req: any, res, next) => {
  try {
    res.json(await testsService.updateTest(req.params.id, req.user.id, req.body));
  } catch (err) { next(err); }
});

// POST /api/tests/:id/publish
router.post('/:id/publish', async (req: any, res, next) => {
  try {
    res.json(await testsService.publishTest(req.params.id, req.user.id));
  } catch (err) { next(err); }
});

// DELETE /api/tests/:id
router.delete('/:id', async (req: any, res, next) => {
  try {
    await testsService.deleteTest(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/tests/:id/generate-questions — AI ile soru üret (50 kontör)
router.post('/:id/generate-questions', async (req: any, res, next) => {
  try {
    const test = await testsService.getTest(req.params.id, req.user.id);

    // Doküman içeriğini çek
    let documentContent: string | undefined;
    if (test.documentId) {
      const doc = await prisma.document.findUnique({ where: { id: test.documentId } });
      documentContent = doc?.content ?? undefined;
      const hasText = documentContent && String(documentContent).trim().length > 0;
      if (!hasText) {
        throw new AppError(
          400,
          'Bu test için seçilen dokümanda metin içeriği yok. Kütüphanede AI ile oluşturulmuş veya metin içeren bir doküman seçin; yalnızca PDF/Word yüklenmişse önce içeriği düzenleyerek kaydedin.'
        );
      }
    }

    const questions = await testsService.generateTestQuestions({
      userId: req.user.id,
      testId: req.params.id,
      documentContent,
      questionCount: req.body.questionCount ?? 10,
      difficulty: req.body.difficulty ?? 'intermediate',
      questionTypes: req.body.questionTypes ?? ['MULTIPLE_CHOICE'],
      competencies: req.body.competencies ?? [],
      language: req.body.language ?? 'TR',
      additionalInstructions: req.body.additionalInstructions,
    });

    res.json(questions);
  } catch (err) { next(err); }
});

export default router;
