import { apiClient } from './api-client';
import type { Document } from './documents.api';

export type DocumentType =
  | 'competency_guide'
  | 'job_description'
  | 'competency_matrix'
  | 'case_document'
  | 'performance_form'
  | 'custom';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  competency_guide: 'Yetkinlik / Mesleki Beceri Rehberi',
  job_description: 'Görev Tanımı (RACI Bazlı)',
  competency_matrix: 'Yetkinlik Matrisi',
  case_document: 'Vaka / Senaryo Belgesi',
  performance_form: 'Performans Değerlendirme Formu',
  custom: 'Özel Doküman',
};

export interface GenerateDocumentRequest {
  topic: string;
  /** Kaldırıldı: sunucu konu + bağlama göre üretir. Geriye dönük uyumluluk için isteğe bağlı. */
  documentType?: DocumentType;
  sector?: string;
  occupation?: string;
  language?: 'TR' | 'EN';
  /** Detaylı açıklama + taksonomi metni birlikte gönderilebilir */
  additionalContext?: string;
}

export async function generateDocument(
  params: GenerateDocumentRequest
): Promise<{ content: string }> {
  const res = await apiClient.post<{ content: string }>('/api/ai/generate-document', params);
  return res.data;
}

export async function saveGeneratedDocument(params: {
  title: string;
  content: string;
  language?: 'TR' | 'EN';
  category?: string;
  description?: string;
}): Promise<Document> {
  const res = await apiClient.post<Document>('/api/ai/save-document', params);
  return res.data;
}
