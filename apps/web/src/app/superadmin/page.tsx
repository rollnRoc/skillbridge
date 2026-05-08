'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import axios from 'axios';

export default function SuperadminLoginPage() {
  const router = useRouter();
  const { user, login, logout } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password, rememberMe);
      const u = useAuthStore.getState().user;
      if (u?.role !== 'PLATFORM_ADMIN') {
        await logout();
        setError(
          'Bu sayfa yalnızca platform yöneticisi hesapları içindir. Diğer roller için ana sayfadaki girişi kullanın.'
        );
        return;
      }
      router.replace('/admin');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; error?: string } | undefined;
        setError(data?.message ?? data?.error ?? 'Giriş başarısız');
      } else {
        setError(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-violet-600 p-3 text-white">
            <Shield className="w-7 h-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Platform yönetici girişi</h1>
            <p className="text-sm text-gray-500">
              Platform yöneticisi hesapları ana sayfadaki girişle de oturum açabilir; bu sayfa yalnızca onlar içindir.
            </p>
          </div>
        </div>

        {user?.role === 'PLATFORM_ADMIN' && (
          <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
            Zaten giriş yapmış görünüyorsunuz.
            <Link
              href="/admin"
              className="ml-2 font-medium underline inline-flex items-center gap-1"
            >
              Yönetim paneli <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            Beni hatırla (uzun oturum)
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 text-white font-medium py-2.5 hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Giriş yap
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/dashboard" className="text-violet-600 hover:underline">
            Ana sayfaya dön
          </Link>
        </p>
      </div>
    </div>
  );
}
