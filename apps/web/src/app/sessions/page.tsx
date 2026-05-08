'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Clock, BarChart3,
  Loader2, FileText,
} from 'lucide-react';
import { useSessions } from '../../hooks';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuthStore } from '../../store/auth.store';

function getParticipantName(aiReport: string | null, fallback: string) {
  if (!aiReport) return fallback;
  try {
    const parsed = JSON.parse(aiReport) as { meta?: { participantName?: string } };
    return parsed?.meta?.participantName?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export default function SessionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: sessionsData, loading, error, execute } = useSessions();
  const sessions = sessionsData ?? [];
  const isManager = user?.role === 'PLATFORM_ADMIN' || user?.role === 'CORPORATE_ADMIN';
  const pageTitle = isManager ? 'Aday Test Sonuclari' : 'Test Sonuclarim';

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-sm font-semibold text-[#1A2E5A]">{pageTitle}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-[#1A2E5A]" />
          <h1 className="text-xl font-bold text-[#1A2E5A]">{pageTitle}</h1>
        </div>

        {error ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-red-100">
            <p className="text-red-600 mb-2">{error}</p>
            <button onClick={() => execute()} className="text-sm text-[#1A2E5A] hover:underline">Tekrar dene</button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Henüz tamamlanmış test yok.</p>
            <p className="text-xs text-gray-300 mt-1">Testleri çözdükten sonra sonuçlarınız burada görünecek.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 text-sm text-[#1A2E5A] hover:underline"
            >
              Dashboard'a dön
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s, idx) => {
              const score = s.score ?? 0;
              const params = s.test.parameters as Record<string, string> | null;
              const report = s.aiReport ? JSON.parse(s.aiReport) : null;
              const hasAI = !!report?.aiAnalysis;
              const fallbackName = s.user ? `${s.user.firstName} ${s.user.lastName}`.trim() : 'Aday';
              const participantName = getParticipantName(s.aiReport, fallbackName);
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5 hover:border-gray-200 transition-colors cursor-pointer"
                  onClick={() => router.push(`/sessions/${s.id}`)}
                >
                  {/* Score circle */}
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                      <circle
                        cx="28" cy="28" r="24" fill="none"
                        stroke={score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#ef4444'}
                        strokeWidth="5"
                        strokeDasharray={`${(score / 100) * 150.8} 150.8`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-bold ${score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {score.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{s.test.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {s.completedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(s.completedAt), 'd MMM yyyy', { locale: tr })}
                        </span>
                      )}
                      {params?.sectorName && (
                        <span>{params.sectorName}</span>
                      )}
                      {params?.occupationName && (
                        <span>{params.occupationName}</span>
                      )}
                    </div>
                    {isManager && (
                      <p className="text-xs text-gray-500 mt-1">Katilimci: {participantName}</p>
                    )}
                    {hasAI && (
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100">
                        <CheckCircle2 className="w-3 h-3" /> AI Değerlendirme Mevcut
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
