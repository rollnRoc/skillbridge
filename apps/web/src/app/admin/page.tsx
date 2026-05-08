'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck, Users, Tags, Coins, Building2,
  ChevronLeft, ChevronRight, Loader2, Save,
} from 'lucide-react';
import {
  getCreditSummary,
  listAdminUsers,
  getAssessmentConfigAdmin,
  updateAssessmentConfigAdmin,
  type CreditSummary,
  type AssessmentConfig,
} from '../../lib/admin.api';
import { useAuthStore } from '../../store/auth.store';

const NAV_CARDS = [
  { href: '/admin/users',    icon: Users,    title: 'Kullanıcılar',     desc: 'Üye listesi ve rol yönetimi',  color: 'bg-blue-600' },
  { href: '/admin/credits',  icon: Coins,    title: 'Kontör İşlemleri', desc: 'Kontör ver, geçmişi incele',   color: 'bg-amber-500' },
  { href: '/admin/taxonomy', icon: Tags,     title: 'Taxonomy',         desc: 'Sektör, meslek, birim',        color: 'bg-emerald-600' },
  { href: '/admin/company',  icon: Building2,title: 'Şirket Ayarları',  desc: 'Şirket profili ve fatura',     color: 'bg-indigo-600' },
];

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState('');
  const [assessmentConfig, setAssessmentConfig] = useState<AssessmentConfig>({
    level1Min: 80,
    level2Min: 70,
    level3Min: 60,
    level4Min: 50,
  });

  useEffect(() => {
    if (user && user.role !== 'PLATFORM_ADMIN' && user.role !== 'CORPORATE_ADMIN') {
      router.replace('/dashboard');
      return;
    }
    Promise.all([
      getCreditSummary().catch(() => null),
      listAdminUsers().then((u) => u.length).catch(() => null),
      getAssessmentConfigAdmin().catch(() => null),
    ]).then(([s, uc, cfg]) => {
      setSummary(s);
      setUserCount(uc);
      if (cfg) setAssessmentConfig(cfg);
    }).finally(() => setLoading(false));
  }, [user, router]);

  const saveConfig = async () => {
    setConfigMsg('');
    setSavingConfig(true);
    try {
      const saved = await updateAssessmentConfigAdmin(assessmentConfig);
      setAssessmentConfig(saved);
      setConfigMsg('Değerlendirme eşikleri kaydedildi.');
    } catch (e: any) {
      setConfigMsg(e?.response?.data?.error ?? 'Ayarlar kaydedilemedi.');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#1A2E5A]" />
            <div>
              <h1 className="text-2xl font-bold text-[#1A2E5A]">Yönetim Paneli</h1>
              <p className="text-gray-500 text-sm mt-0.5">Platform yönetimi ve yapılandırma</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Kullanıcı" value={userCount ?? '—'} color="text-blue-600" />
            <StatCard label="Toplam Verilen" value={summary ? `${summary.totalGranted} kr` : '—'} color="text-amber-600" />
            <StatCard label="Toplam Harcanan" value={summary ? `${summary.totalSpent} kr` : '—'} color="text-red-500" />
            <StatCard label="Net Bakiye" value={summary ? `${summary.totalGranted - summary.totalSpent} kr` : '—'} color="text-emerald-600" />
          </div>
        )}

        {/* Nav cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {NAV_CARDS.map((card) => (
            <Link key={card.href} href={card.href}
              className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
              <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center flex-shrink-0`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{card.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{card.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-[#1A2E5A] mb-1">Değerlendirme Eşik Ayarları</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ağaç seviyeleri bu yüzdelere göre belirlenir: L1 ({'>'}= level1), L2 ({'>'}= level2), L3 ({'>'}= level3), L4 ({'>'}= level4), L5 (altı).
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ThresholdInput
              label="1. Seviye Alt Sınır"
              value={assessmentConfig.level1Min}
              onChange={(v) => setAssessmentConfig((p) => ({ ...p, level1Min: v }))}
            />
            <ThresholdInput
              label="2. Seviye Alt Sınır"
              value={assessmentConfig.level2Min}
              onChange={(v) => setAssessmentConfig((p) => ({ ...p, level2Min: v }))}
            />
            <ThresholdInput
              label="3. Seviye Alt Sınır"
              value={assessmentConfig.level3Min}
              onChange={(v) => setAssessmentConfig((p) => ({ ...p, level3Min: v }))}
            />
            <ThresholdInput
              label="4. Seviye Alt Sınır"
              value={assessmentConfig.level4Min}
              onChange={(v) => setAssessmentConfig((p) => ({ ...p, level4Min: v }))}
            />
          </div>

          {configMsg && (
            <p className={`mt-3 text-sm ${configMsg.includes('kaydedildi') ? 'text-emerald-600' : 'text-red-500'}`}>
              {configMsg}
            </p>
          )}

          <div className="mt-4">
            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A2E5A] text-white text-sm hover:bg-[#122244] disabled:opacity-50"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingConfig ? 'Kaydediliyor...' : 'Eşikleri Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThresholdInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm"
        />
        <span className="text-sm text-gray-400">%</span>
      </div>
    </label>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
