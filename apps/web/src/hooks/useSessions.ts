'use client';

import { useAsync } from './useAsync';
import { listUserSessions, type SessionResult } from '../lib/sessions.api';

/**
 * Kullanıcının test oturumlarını (sonuçlarını) getirir.
 * Dashboard ve Sonuçlar sayfalarında kullanılabilir.
 */
export function useSessions(options?: { immediate?: boolean }) {
  return useAsync<SessionResult[]>(listUserSessions, {
    immediate: options?.immediate ?? true,
    initialData: null,
  });
}
