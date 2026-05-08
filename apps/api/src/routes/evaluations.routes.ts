import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';

const router = Router();
router.use(authenticate);

// POST /api/evaluations/360  — 360° değerlendirme başlat
// NOTE: Evaluation360 model will be added in a future migration.
// For now this endpoint validates inputs and returns a stub success response.
router.post('/360', async (req: any, res, next) => {
  try {
    const { evaluatee, evaluators } = req.body;
    if (!evaluatee?.name || !evaluatee?.email)
      throw new AppError(400, 'Değerlendirilen kişi bilgileri zorunludur');
    if (!Array.isArray(evaluators) || evaluators.length === 0)
      throw new AppError(400, 'En az bir değerlendirici gereklidir');

    const valid = (evaluators as { email?: string; name?: string; relation?: string }[]).filter(
      (e) => e.email && String(e.email).includes('@')
    );
    if (valid.length === 0)
      throw new AppError(400, 'Geçerli değerlendirici e-postası bulunamadı');

    // TODO: persist to Evaluation360 model (schema migration pending)
    // TODO: send emails to each evaluator

    res.status(201).json({
      message: '360° değerlendirme başarıyla başlatıldı.',
      evaluateeName:  evaluatee.name,
      evaluateeEmail: evaluatee.email,
      evaluatorCount: valid.length,
    });
  } catch (err) { next(err); }
});

export default router;
