import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

// POST /api/invitations  — tek aday daveti
router.post('/', async (req: any, res, next) => {
  try {
    const { testId, email, expiresInDays = 14 } = req.body;
    if (!testId || !email) throw new AppError(400, 'testId ve email zorunludur');

    const test = await prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new AppError(404, 'Test bulunamadı');

    const token     = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + Number(expiresInDays) * 86_400_000);
    const inviteUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/exam/${token}`;

    const invitation = await prisma.invitation.create({
      data: { testId, email, token, expiresAt },
    });

    // TODO: send email via Resend / SendGrid
    res.status(201).json({ ...invitation, inviteUrl, url: inviteUrl });
  } catch (err) { next(err); }
});

// POST /api/invitations/bulk  — toplu CSV daveti
router.post('/bulk', async (req: any, res, next) => {
  try {
    const { testId, csvData, emails, expiresInDays = 14 } = req.body;
    if (!testId || (!csvData && !Array.isArray(emails))) {
      throw new AppError(400, 'testId ve emails/csvData zorunludur');
    }

    const test = await prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new AppError(404, 'Test bulunamadı');

    const parsedEmails = Array.isArray(emails)
      ? emails.map((e) => String(e).trim()).filter((e) => e.includes('@'))
      : String(csvData)
          .split('\n')
          .map((l) => l.split(',')[0].trim())
          .filter((e) => e.includes('@'));

    if (parsedEmails.length === 0) throw new AppError(400, 'Geçerli e-posta adresi bulunamadı');

    const expiresAt = new Date(Date.now() + Number(expiresInDays) * 86_400_000);
    const invitations = await Promise.all(
      parsedEmails.map((email) =>
        prisma.invitation.create({
          data: { testId, email, token: crypto.randomBytes(24).toString('hex'), expiresAt },
        })
      )
    );

    // TODO: batch email sending
    res.status(201).json({ sent: invitations.length, skipped: 0, invitations });
  } catch (err) { next(err); }
});

// POST /api/invitations/url  — herkese açık link oluştur
router.post('/url', async (req: any, res, next) => {
  try {
    const { testId, expiresInDays = 30 } = req.body;
    if (!testId) throw new AppError(400, 'testId zorunludur');

    const test = await prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new AppError(404, 'Test bulunamadı');

    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + Number(expiresInDays) * 86_400_000);
    const inviteUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/exam/${token}`;

    // Use a placeholder email for open-link invitations
    const invitation = await prisma.invitation.create({
      data: { testId, email: `open-link-${token.slice(0, 8)}@skillbridge.local`, token, expiresAt },
    });

    res.status(201).json({ ...invitation, inviteUrl, url: inviteUrl });
  } catch (err) { next(err); }
});

export default router;
