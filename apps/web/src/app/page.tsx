'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { BrainCircuit, FileText, Trophy, Coins, ArrowRight } from 'lucide-react';

const FEATURES = [
  { icon: BrainCircuit, title: 'AI Destekli Test Üretimi', desc: 'Claude ile saniyeler içinde özelleştirilmiş sorular.', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: FileText,     title: 'Doküman Kütüphanesi',    desc: 'PDF, DOCX, PPTX yükle; testini içerikten oluştur.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { icon: Trophy,       title: 'Anlık Sonuç Analizi',    desc: 'Her yanıt otomatik puanlanır, raporlar hazır.', color: 'text-amber-600', bg: 'bg-amber-50' },
  { icon: Coins,        title: 'Kontör Ekonomisi',        desc: 'Sadece kullandığın kadar öde, limitsiz ölçekle.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900 select-none">

      {/* Soft gradient background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-blue-100/70 blur-[140px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-indigo-100/60 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-cyan-100/50 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-10 pt-7 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="SkillBridge" style={{ height: '2cm' }} />
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A2E5A] hover:bg-[#152448] text-white text-sm font-medium shadow-sm transition-colors"
        >
          Başla <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-20 flex flex-col items-center justify-center text-center px-6 pt-16 pb-32">

        {/* Partner logos */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mendomi-bigsafer.jpg"
            alt="Mendomi Akademi işbirliğiyle"
            style={{ maxHeight: 110, maxWidth: 220, objectFit: 'contain' }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bigsafer-logo.png"
            alt="BIGsafer"
            style={{ maxHeight: 70, maxWidth: 200, objectFit: 'contain' }}
          />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs text-blue-700 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          AI destekli değerlendirme platformu
        </div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.1] mb-6 max-w-3xl text-[#1A2E5A]">
          Yetenekleri{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
            doğru ölç
          </span>
          ,<br />kararları güvenle ver.
        </h1>

        <p className="text-lg text-gray-500 max-w-xl leading-relaxed mb-10">
          SkillBridge, Claude AI ile özelleştirilmiş testler üretir, adayları davet eder ve
          sonuçları anında analiz eder — saniyeler içinde.
        </p>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#1A2E5A] hover:bg-[#152448] text-white font-semibold text-sm shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            Başla <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm shadow-sm transition-colors"
          >
            Panele git
          </Link>
        </div>
      </main>

      {/* Feature cards */}
      <section className="relative z-20 grid grid-cols-2 sm:grid-cols-4 gap-4 px-10 pb-20 max-w-4xl mx-auto">
        {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
          <div
            key={title}
            className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 text-left hover:shadow-md transition-shadow"
          >
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">{title}</p>
            <p className="text-xs text-gray-500 leading-snug">{desc}</p>
          </div>
        ))}
      </section>

    </div>
  );
}
