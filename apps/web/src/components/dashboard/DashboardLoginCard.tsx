'use client';

import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';

export function DashboardLoginCard() {
  const { login, logout, fetchMe } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password, rememberMe);
      setPassword('');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as { message?: string; error?: string } | undefined;
        if (status === 404) {
          setError('API endpoint bulunamadı (404). Sunucu deploy/URL ayarını kontrol edin.');
        } else if (status === 500) {
          setError(data?.message ?? data?.error ?? 'Sunucu hatası (500). JWT_SECRET ve API env ayarlarını kontrol edin.');
        } else {
          setError(data?.message ?? data?.error ?? 'Giriş başarısız');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await logout();
      await fetchMe();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      onClick={(e) => e.stopPropagation()}
      title="Bireysel, kurumsal ve platform yöneticisi (PLATFORM_ADMIN) hesapları"
      className="flex flex-col gap-0 h-full min-h-0 justify-center leading-none text-gray-900"
    >
      <div className="flex gap-0.5">
        <label className="sr-only" htmlFor="dash-login-email">
          E-posta
        </label>
        <input
          id="dash-login-email"
          type="email"
          autoComplete="username"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white placeholder:text-gray-400 text-gray-900 text-[9px] px-1 py-0.5 leading-tight outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600"
        />
        <label className="sr-only" htmlFor="dash-login-password">
          Şifre
        </label>
        <input
          id="dash-login-password"
          type="password"
          autoComplete="current-password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white placeholder:text-gray-400 text-gray-900 text-[9px] px-1 py-0.5 leading-tight outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600"
        />
      </div>
      <div className="flex gap-0.5 items-center mt-0.5">
        <label className="flex items-center gap-0.5 shrink-0 text-[8px] text-gray-600 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-gray-400 text-green-600 h-2.5 w-2.5 focus:ring-green-600"
          />
          Hatırla
        </label>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-0.5 rounded bg-green-600 hover:bg-green-700 text-white text-[9px] font-semibold py-0.5 px-1 min-h-0 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : null}
          Giriş
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={(e) => void handleLogout(e)}
          className="flex items-center justify-center rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[9px] font-medium py-0.5 px-1 disabled:opacity-50 shrink-0"
          title="Çıkış"
          aria-label="Çıkış"
        >
          <LogOut className="w-3 h-3" />
        </button>
      </div>
      {error ? (
        <p className="text-[7px] text-red-600 truncate mt-0.5 leading-tight" title={error}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
