import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';

export const CREDIT_COSTS = {
  WELCOME_BONUS: 50,
  TEST_GENERATION: 50,
  DOC_GENERATION: 50,
  AI_ANALYSIS: 10,
  READY_TEST_PER_QUESTION: 1,
  LEVEL_EXAM: 100,
} as const;

export async function getAvailableCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');
  return user.role === 'CORPORATE_ADMIN' ? (user.company?.credits ?? 0) : user.credits;
}

export async function deductCredits(
  userId: string,
  amount: number,
  type: string,
  description?: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');

  const available =
    user.role === 'CORPORATE_ADMIN' ? (user.company?.credits ?? 0) : user.credits;
  if (available < amount) {
    throw new AppError(402, `Yetersiz kontör. Gerekli: ${amount}, Mevcut: ${available}`);
  }

  await prisma.$transaction(async (tx) => {
    if (user.role === 'CORPORATE_ADMIN' && user.companyId) {
      await tx.company.update({
        where: { id: user.companyId },
        data: { credits: { decrement: amount } },
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
      });
    }
    await tx.creditLog.create({
      data: {
        userId,
        amount: -amount,
        type: type as any,
        description: description?.slice(0, 200),
      },
    });
  });
}

export async function grantCredits(
  userId: string,
  amount: number,
  type: string,
  description?: string
) {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');

    if (user.role === 'CORPORATE_ADMIN' && user.companyId) {
      await tx.company.update({
        where: { id: user.companyId },
        data: { credits: { increment: amount } },
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
      });
    }
    await tx.creditLog.create({
      data: {
        userId,
        amount,
        type: type as any,
        description: description?.slice(0, 200),
      },
    });
  });
}
