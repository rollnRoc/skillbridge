import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';
import { grantCredits } from '../utils/credit.js';
import { getAssessmentConfig, saveAssessmentConfig } from '../utils/assessment-config.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('PLATFORM_ADMIN', 'CORPORATE_ADMIN'));

// ─── DEĞERLENDİRME AYARLARI ──────────────────────────────────────────────────

// GET /api/admin/assessment-config
router.get('/assessment-config', async (_req, res, next) => {
  try {
    res.json(await getAssessmentConfig());
  } catch (err) { next(err); }
});

// PUT /api/admin/assessment-config
router.put('/assessment-config', async (req, res, next) => {
  try {
    const { level1Min, level2Min, level3Min, level4Min } = req.body ?? {};
    const config = await saveAssessmentConfig({
      level1Min: Number(level1Min),
      level2Min: Number(level2Min),
      level3Min: Number(level3Min),
      level4Min: Number(level4Min),
    });
    res.json(config);
  } catch (err) { next(err); }
});

// ─── KULLANICILAR ──────────────────────────────────────────────────────────────

// GET /api/admin/users — tüm kullanıcılar (PLATFORM_ADMIN) veya şirket üyeleri (CORPORATE_ADMIN)
router.get('/users', async (req: any, res, next) => {
  try {
    const where = req.user.role === 'CORPORATE_ADMIN'
      ? { companyId: req.user.companyId }
      : {};
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        credits: true,
        emailVerified: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

// GET /api/admin/users/:id — kullanıcı detayı + kredi logu
router.get('/users/:id', async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        credits: true,
        emailVerified: true,
        createdAt: true,
        company: { select: { id: true, name: true, credits: true } },
        creditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { tests: true, documents: true } },
      },
    });
    if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');
    res.json(user);
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/role — rol değiştir (PLATFORM_ADMIN only)
router.patch('/users/:id/role', requireRole('PLATFORM_ADMIN'), async (req: any, res, next) => {
  try {
    const { role } = req.body;
    if (!['INDIVIDUAL', 'CORPORATE_ADMIN', 'PLATFORM_ADMIN'].includes(role)) {
      throw new AppError(400, 'Geçersiz rol');
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

// ─── KREDİ (KONTÖR) İŞLEMLERİ ─────────────────────────────────────────────────

// GET /api/admin/credits/logs — tüm kredi hareketleri (filtrelenebilir)
router.get('/credits/logs', requireRole('PLATFORM_ADMIN'), async (req: any, res, next) => {
  try {
    const { userId, type, limit = '100' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (type)   where.type   = type;
    const logs = await prisma.creditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    res.json(logs);
  } catch (err) { next(err); }
});

// POST /api/admin/credits/grant — kullanıcıya kontör ver
router.post('/credits/grant', requireRole('PLATFORM_ADMIN'), async (req: any, res, next) => {
  try {
    const { userId, amount, description } = req.body;
    if (!userId || !amount || amount <= 0) {
      throw new AppError(400, 'userId ve pozitif amount gereklidir');
    }
    await grantCredits(userId, amount, 'ADMIN_GRANT', description);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, credits: true },
    });
    res.json({ message: `${amount} kontör başarıyla tanımlandı`, user });
  } catch (err) { next(err); }
});

// GET /api/admin/credits/summary — toplam istatistikler
router.get('/credits/summary', requireRole('PLATFORM_ADMIN'), async (_req, res, next) => {
  try {
    const [totalGranted, totalSpent, userCount] = await Promise.all([
      prisma.creditLog.aggregate({
        where: { amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.creditLog.aggregate({
        where: { amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      prisma.user.count(),
    ]);
    res.json({
      totalGranted: totalGranted._sum.amount ?? 0,
      totalSpent: Math.abs(totalSpent._sum.amount ?? 0),
      userCount,
    });
  } catch (err) { next(err); }
});

// ─── ŞİRKETLER ────────────────────────────────────────────────────────────────

// GET /api/admin/companies — tüm şirketler
router.get('/companies', requireRole('PLATFORM_ADMIN'), async (_req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(companies);
  } catch (err) { next(err); }
});

// POST /api/admin/companies/:id/grant-credits — şirkete kontör ver
router.post('/companies/:id/grant-credits', requireRole('PLATFORM_ADMIN'), async (req: any, res, next) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) throw new AppError(400, 'Pozitif amount gereklidir');
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: { credits: { increment: amount } },
    });
    // Log the grant
    await prisma.creditLog.create({
      data: {
        userId: req.user.id,
        amount,
        type: 'ADMIN_GRANT',
        description: description ?? `Şirkete ${amount} kontör tanımlandı`,
      },
    });
    res.json({ message: `${amount} kontör tanımlandı`, company });
  } catch (err) { next(err); }
});

export default router;
