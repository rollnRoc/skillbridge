'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseAsyncReturn<T> extends UseAsyncState<T> {
  execute: () => Promise<void>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export interface UseAsyncOptions<T> {
  /** Mount'ta otomatik çalıştır (varsayılan: true) */
  immediate?: boolean;
  /** Başlangıç değeri */
  initialData?: T | null;
  /** Bu değerler değişince immediate ise tekrar çalıştır */
  deps?: unknown[];
}

/**
 * Async veri çekme veya işlem için genel hook.
 *
 * @example
 * const { data, loading, error, execute } = useAsync(listUserSessions);
 * const { data, execute } = useAsync(() => fetchTest(id), { deps: [id] });
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T> {
  const { immediate = true, initialData = null, deps = [] } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(asyncFn);
  fnRef.current = asyncFn;

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      setData(result);
    } catch (err) {
      const errorLike = err as {
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      let message =
        errorLike?.message && typeof errorLike.message === 'string'
          ? errorLike.message
          : 'Bir hata oluştu';

      if (errorLike?.response?.status === 404) {
        const data = errorLike.response.data as { error?: string; message?: string } | string | undefined;
        const backendMsg =
          typeof data === 'string'
            ? data
            : data?.error || data?.message;
        message = backendMsg && backendMsg.trim() !== ''
          ? backendMsg
          : 'İstenen kaynak bulunamadı (404). API endpoint/deploy ayarını kontrol edin.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  useEffect(() => {
    if (immediate) execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, execute, reset, setData };
}
