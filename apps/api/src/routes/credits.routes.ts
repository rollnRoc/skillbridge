import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';
import { getAvailableCredits, grantCredits } from '../utils/credit.js';

const router = Router();
router.use(authenticate);

// GET /api/credits/balance — mevcut bakiye
router.get('/balance', async (req: any, res, next) => {
  try {
    const credits = await getAvailableCredits(req.user.id);
    res.json({ credits });
  } catch (err) { next(err); }
});

// GET /api/credits/logs — harcama geçmişi
router.get('/logs', async (req: any, res, next) => {
  try {
    const logs = await prisma.creditLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (err) { next(err); }
});

// POST /api/credits/admin/grant — Platform admin: kullanıcıya kontör ver
router.post('/admin/grant', requireRole('PLATFORM_ADMIN'), async (req: any, res, next) => {
  try {
    const { userId, amount, description } = req.body;
    if (!userId || !amount || amount <= 0) {
      throw new AppError(400, 'userId ve pozitif amount gereklidir');
    }
    await grantCredits(userId, amount, 'ADMIN_GRANT', description);
    res.json({ message: `${amount} kontör başarıyla tanımlandı` });
  } catch (err) { next(err); }
});

export default router;
