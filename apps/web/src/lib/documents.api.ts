import { apiClient } from './api-client';
import axios from 'axios';

export interface Document {
  id: string;
  title: string;
  language: 'TR' | 'EN';
  mimeType: string | null;
  sizeBytes: number | null;
  category: string | null;
  description: string | null;
  createdAt: string;
}

/** GET /api/documents/:id — tam kayıt (önizleme için) */
export interface DocumentDetail extends Document {
  fileUrl: string | null;
  content: string | null;
}

type OfflineDocument = DocumentDetail & {
  offlineOnly?: boolean;
};

const OFFLINE_DOCS_KEY = 'skillbridge.offlineDocuments';

function isApiUnavailable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  return !err.response || status === 404 || status === 502 || status === 503 || status === 504;
}

function loadOfflineDocuments(): OfflineDocument[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_DOCS_KEY);
    return raw ? (JSON.parse(raw) as OfflineDocument[]) : [];
  } catch {
    return [];
  }
}

function saveOfflineDocuments(docs: OfflineDocument[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OFFLINE_DOCS_KEY, JSON.stringify(docs));
}

function toDocument(detail: OfflineDocument): Document {
  return {
    id: detail.id,
    title: detail.title,
    language: detail.language,
    mimeType: detail.mimeType,
    sizeBytes: detail.sizeBytes,
    category: detail.category,
    description: detail.description,
    createdAt: detail.createdAt,
  };
}

async function fileToTextIfPlain(file: File): Promise<string | null> {
  const lower = file.name.toLowerCase();
  if (file.type === 'text/plain' || lower.endsWith('.txt')) {
    return file.text();
  }
  return null;
}

function normalizeLanguage(input: FormDataEntryValue | null): 'TR' | 'EN' {
  if (typeof input === 'string' && input.toUpperCase() === 'EN') return 'EN';
  return 'TR';
}

export async function fetchDocuments(): Promise<Document[]> {
  try {
    const res = await apiClient.get<Document[]>('/api/documents');
    return res.data;
  } catch (err) {
    if (!isApiUnavailable(err)) throw err;
    return loadOfflineDocuments().map(toDocument);
  }
}

export async function uploadDocument(formData: FormData): Promise<Document> {
  try {
    const res = await apiClient.post<Document>('/api/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err) {
    if (!isApiUnavailable(err)) throw err;

    const fileEntry = formData.get('file');
    const titleEntry = formData.get('title');
    const langEntry = formData.get('language');
    const categoryEntry = formData.get('category');
    const descriptionEntry = formData.get('description');

    if (!(fileEntry instanceof File)) {
      throw err;
    }

    const detail: OfflineDocument = {
      id: `offline-doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title:
        typeof titleEntry === 'string' && titleEntry.trim() !== ''
          ? titleEntry.trim()
          : fileEntry.name.replace(/\.[^.]+$/, ''),
      language: normalizeLanguage(langEntry),
      mimeType: fileEntry.type || null,
      sizeBytes: fileEntry.size,
      category: typeof categoryEntry === 'string' && categoryEntry.trim() ? categoryEntry.trim() : null,
      description:
        typeof descriptionEntry === 'string' && descriptionEntry.trim() ? descriptionEntry.trim() : null,
      createdAt: new Date().toISOString(),
      fileUrl: null,
      content: await fileToTextIfPlain(fileEntry),
      offlineOnly: true,
    };

    const current = loadOfflineDocuments();
    current.unshift(detail);
    saveOfflineDocuments(current);
    return toDocument(detail);
  }
}

export async function updateDocument(
  id: string,
  data: Partial<Pick<Document, 'title' | 'category' | 'description'>>
): Promise<Document> {
  const res = await apiClient.patch<Document>(`/api/documents/${id}`, data);
  return res.data;
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/documents/${id}`);
  } catch (err) {
    if (!isApiUnavailable(err)) throw err;
    const next = loadOfflineDocuments().filter((d) => d.id !== id);
    saveOfflineDocuments(next);
  }
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  try {
    const res = await apiClient.get<DocumentDetail>(`/api/documents/${id}`);
    return res.data;
  } catch (err) {
    if (!isApiUnavailable(err)) throw err;
    const found = loadOfflineDocuments().find((d) => d.id === id);
    if (!found) throw err;
    return found;
  }
}

/** İndirme / PDF önizleme için blob (çerez ile) */
export async function downloadDocumentBlob(id: string): Promise<Blob> {
  try {
    const res = await apiClient.get(`/api/documents/${id}/download`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  } catch (err) {
    if (!isApiUnavailable(err)) throw err;
    const found = loadOfflineDocuments().find((d) => d.id === id);
    if (found?.content != null) {
      return new Blob([found.content], { type: found.mimeType || 'text/plain' });
    }
    throw new Error('Offline yüklenen bu dosya yalnızca metadata olarak saklandı. İndirme için API gereklidir.');
  }
}
