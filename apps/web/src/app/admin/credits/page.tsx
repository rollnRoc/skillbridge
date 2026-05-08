'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Coins, Plus, Loader2, Search, TrendingUp, TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  getCreditLogs, grantCreditsToUser, getCreditSummary, listAdminUsers,
  type CreditLog, type CreditSummary, type AdminUser,
} from '../../../lib/admin.api';

const TYPE_LABELS: Record<string, string> = {
  ADMIN_GRANT:       'Admin Grant',
  TEST_GENERATION:   'Test Üretimi',
  DOC_GENERATION:    'Doküman Üretimi',
  AI_ANALYSIS:       'AI Analiz',
  WELCOME_BONUS:     'Hoş Geldin Bonusu',
  READY_TEST_USAGE:  'Hazır Test',
  LEVEL_EXAM:        'Seviye Sınavı',
};

export default function AdminCreditsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<CreditLog[]>([]);
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Grant form
  const [grantUserId, setGrantUserId] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantDesc, setGrantDesc] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantMsg, setGrantMsg] = useState('');

  useEffect(() => {
    Promise.all([
      getCreditLogs({ limit: 200 }),
      getCreditSummary(),
      listAdminUsers(),
    ]).then(([l, s, u]) => {
      setLogs(l);
      setSummary(s);
      setUsers(u);
    }).finally(() => setLoading(false));
  }, []);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId || !grantAmount) return;
    setGranting(true);
    setGrantMsg('');
    try {
      const res = await grantCreditsToUser(grantUserId, Number(grantAmount), grantDesc || undefined);
      setGrantMsg(res.message);
      setGrantAmount('');
      setGrantDesc('');
      // Refresh logs
      const updated = await getCreditLogs({ limit: 200 });
      setLogs(updated);
    } catch (e: any) {
      setGrantMsg(e?.response?.data?.error || 'Hata oluştu');
    } finally {
      setGranting(false);
    }
  };

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.user?.email ?? '').toLowerCase().includes(q) ||
      (l.user?.firstName ?? '').toLowerCase().includes(q) ||
      (l.type ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Admin Panel
          </button>
          <div className="flex items-center gap-3">
            <Coins className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold text-[#1A2E5A]">Kontör İşlemleri</h1>
          </div>
        </div>

        {/* Stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-gray-500">Toplam Verilen</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{summary.totalGranted.toLocaleString('tr-TR')}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <p className="text-xs text-gray-500">Toplam Harcanan</p>
              </div>
              <p className="text-2xl font-bold text-red-500">{summary.totalSpent.toLocaleString('tr-TR')}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-gray-500">Net Dolaşımda</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">{(summary.totalGranted - summary.totalSpent).toLocaleString('tr-TR')}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grant form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" /> Kontör Ver
              </h2>
              <form onSubmit={handleGrant} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kullanıcı</label>
                  <select
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    required
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">— Kullanıcı seçin —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.email}) — {u.credits} kr
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Miktar (kontör)</label>
                  <input
                    type="number"
                    min="1"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    placeholder="Ör: 100"
                    required
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama (isteğe bağlı)</label>
                  <input
                    type="text"
                    value={grantDesc}
                    onChange={(e) => setGrantDesc(e.target.value)}
                    placeholder="Ör: Hoş geldin paketi"
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                {grantMsg && (
                  <p className={`text-xs p-2 rounded-lg ${grantMsg.includes('Hata') || grantMsg.includes('hata') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {grantMsg}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={granting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Coins className="w-4 h-4" /> Kontör Tanımla</>}
                </button>
              </form>
            </div>
          </div>

          {/* Logs table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="E-posta veya işlem türüne göre ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent"
                />
              </div>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Hareket bulunamadı.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Tarih</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Kullanıcı</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">İşlem</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-600">Miktar</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                            {format(new Date(log.createdAt), 'd MMM yyyy HH:mm', { locale: tr })}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 text-xs">
                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : log.userId.slice(0, 8)}
                            {log.user?.email && <div className="text-gray-400">{log.user.email}</div>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {TYPE_LABELS[log.type] ?? log.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold">
                            <span className={log.amount > 0 ? 'text-emerald-600' : 'text-red-500'}>
                              {log.amount > 0 ? '+' : ''}{log.amount}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{log.description ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
