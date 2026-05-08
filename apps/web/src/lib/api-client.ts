import axios from 'axios';

/**
 * Tarayıcıda varsayılan: aynı köken (Next rewrite → API). httpOnly çerez + Bearer uyumu.
 * Doğrudan API kökü istiyorsanız: NEXT_PUBLIC_API_URL=http://localhost:3001
 * Sunucu tarafı (SSR): INTERNAL_API_URL veya 127.0.0.1:3001
 */
function resolveBaseURL(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  if (explicit && explicit.trim() !== '') {
    return explicit.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return '';
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.API_INTERNAL_URL ||
    'http://127.0.0.1:3001'
  );
}

export const apiClient = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** Axios hata yanıtından okunabilir mesaj (Express `error` / `message` alanları). */
export function getApiErrorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: unknown } };
  const d = ax?.response?.data;
  if (typeof d === 'string' && d.trim()) return d.trim();
  if (d && typeof d === 'object') {
    const o = d as { error?: string; message?: string };
    const msg = o.error ?? o.message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  return fallback;
}
