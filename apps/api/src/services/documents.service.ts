import { prisma } from '@org/database';
import { AppError } from '../middleware/error.middleware.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function listDocuments(ownerId: string) {
  return prisma.document.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      language: true,
      mimeType: true,
      sizeBytes: true,
      category: true,
      description: true,
      createdAt: true,
    },
  });
}

export async function getDocument(id: string, ownerId: string) {
  const doc = await prisma.document.findFirst({
    where: { id, ownerId },
  });
  if (!doc) throw new AppError(404, 'Doküman bulunamadı');
  return doc;
}

export async function uploadDocument(params: {
  ownerId: string;
  title: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  language?: 'TR' | 'EN';
  category?: string;
  description?: string;
}) {
  if (!ALLOWED_MIME_TYPES.has(params.mimeType)) {
    throw new AppError(400, 'Desteklenmeyen dosya formatı (PDF, DOCX, TXT, PPTX)');
  }
  if (params.sizeBytes > MAX_SIZE_BYTES) {
    throw new AppError(400, 'Dosya boyutu 20 MB sınırını aşıyor');
  }

  return prisma.document.create({
    data: {
      title: params.title,
      fileUrl: params.fileUrl,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      language: params.language ?? 'TR',
      category: params.category,
      description: params.description,
      ownerId: params.ownerId,
    },
  });
}

export async function updateDocument(
  id: string,
  ownerId: string,
  data: { title?: string; category?: string; description?: string }
) {
  await getDocument(id, ownerId); // ownership check
  return prisma.document.update({
    where: { id },
    data,
  });
}

export async function deleteDocument(id: string, ownerId: string) {
  await getDocument(id, ownerId); // ownership check
  await prisma.document.delete({ where: { id } });
}
