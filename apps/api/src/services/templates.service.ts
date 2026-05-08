import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';
import { deductCredits } from '../utils/credit.js';
import crypto from 'crypto';

export async function listTemplates(filters?: {
  search?: string;
  difficulty?: string;
  minQuestions?: number;
  maxQuestions?: number;
}) {
  const templates = await prisma.test.findMany({
    where: {
      isTemplate: true,
      isPublished: true,
      ...(filters?.search
        ? { title: { contains: filters.search } }
        : {}),
    },
    include: {
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Soru sayısı filtresi
  return templates.filter((t) => {
    const count = t._count.questions;
    if (filters?.minQuestions && count < filters.minQuestions) return false;
    if (filters?.maxQuestions && count > filters.maxQuestions) return false;
    return true;
  });
}

export async function previewTemplate(templateId: string) {
  const template = await prisma.test.findFirst({
    where: { id: templateId, isTemplate: true, isPublished: true },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          type: true,
          content: true,
          options: true,
          orderIndex: true,
          // correctAnswer gizlenir — preview ücretsiz ama çözülemez
        },
      },
    },
  });
  if (!template) throw new AppError(404, 'Şablon bulunamadı');
  return template;
}

export async function useTemplate(templateId: string, userId: string) {
  const template = await prisma.test.findFirst({
    where: { id: templateId, isTemplate: true, isPublished: true },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!template) throw new AppError(404, 'Şablon bulunamadı');

  // Şablonu kullanıcının testine kopyala
  const newTest = await prisma.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: {
        title: `${template.title} (Kopyam)`,
        parameters: template.parameters,
        timeLimit: template.timeLimit,
        isPublished: false,
        isTemplate: false,
        ownerId: userId,
      },
    });

    await tx.question.createMany({
      data: template.questions.map((q) => ({
        testId: test.id,
        type: q.type,
        content: q.content,
        options: q.options ?? undefined,
        correctAnswer: q.correctAnswer ?? undefined,
        orderIndex: q.orderIndex,
      })),
    });

    return test;
  });

  return newTest;
}
