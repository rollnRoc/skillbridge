'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Building2, Loader2, Coins, Users, Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { listCompanies, grantCreditsToCompany, type AdminCompany } from '../../../lib/admin.api';
import { getUnifiedModalStyle } from '../../../components/ui/modal-layout';

export default function AdminCompanyPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantTarget, setGrantTarget] = useState<AdminCompany | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantMsg, setGrantMsg] = useState('');

  useEffect(() => {
    listCompanies()
      .then(setCompanies)
      .finally(() => setLoading(false));
  }, []);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantTarget || !grantAmount) return;
    setGranting(true);
    setGrantMsg('');
    try {
      const res = await grantCreditsToCompany(grantTarget.id, Number(grantAmount));
      setGrantMsg(res.message);
      setCompanies((prev) => prev.map((c) =>
        c.id === grantTarget.id ? { ...c, credits: c.credits + Number(grantAmount) } : c
      ));
      setGrantAmount('');
    } catch (e: any) {
      setGrantMsg(e?.response?.data?.error || 'Hata oluştu');
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Admin Panel
          </button>
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-[#1A2E5A]">Şirket Yönetimi</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Henüz şirket kaydı yok.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((company) => (
              <div key={company.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{company.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Kayıt: {format(new Date(company.createdAt), 'd MMM yyyy', { locale: tr })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <Coins className="w-4 h-4" /> {company.credits.toLocaleString('tr-TR')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="w-3.5 h-3.5" /> {company._count.users} üye
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setGrantTarget(company); setGrantAmount(''); setGrantMsg(''); }}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm hover:bg-amber-100 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Kontör Ekle
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Grant modal */}
        {grantTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <form onSubmit={handleGrant} className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col" style={getUnifiedModalStyle()}>
              <h3 className="font-semibold text-gray-900 mb-1">Şirkete Kontör Ekle</h3>
              <p className="text-sm text-gray-500 mb-4">
                {grantTarget.name} — mevcut: {grantTarget.credits.toLocaleString('tr-TR')} kr
              </p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Miktar</label>
                <input
                  type="number" min="1" value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  placeholder="Ör: 500"
                  autoFocus required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              {grantMsg && (
                <p className={`text-xs p-2 rounded-lg mb-3 ${grantMsg.includes('Hata') || grantMsg.includes('hata') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  {grantMsg}
                </p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setGrantTarget(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  İptal
                </button>
                <button type="submit" disabled={granting}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Onayla'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
