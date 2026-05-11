'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Coins, Trophy, Building2, FileText, Upload, Sparkles,
  BookOpen, FileSearch, BrainCircuit, FileUser,
  UserPlus, Users, Link2, BarChart3, UserCheck, GitCompare,
  ShieldCheck, Tags, UsersRound, Settings2, ClipboardList,
  ClipboardCheck, PlayCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { listUserSessions, type SessionResult } from '../../lib/sessions.api';
import { UploadPanel } from '../../components/documents/UploadPanel';
import { AiDocPanel } from '../../components/documents/AiDocPanel';
import { FromDocPanel, FromTopicsPanel, FromCvPanel, CaseAnalysisPanel } from '../../components/tests/TestPanels';
import { InvitePanel, BulkInvitePanel, InviteUrlPanel } from '../../components/candidates/CandidatePanels';
import { AiAnalysisPanel, Assessment360Panel, CvJdMatchPanel } from '../../components/evaluation/EvaluationPanels';
import { CvJdMultiPanel, CvVsCvPanel, SessionComparePanel } from '../../components/comparison/ComparisonPanels';
import { TestProfilePanel } from '../../components/dashboard/TestProfilePanel';
import { DashboardLoginCard } from '../../components/dashboard/DashboardLoginCard';

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 250; // kart genişliği (px)
const H = '3.5cm'; // tüm kartların yüksekliği
const GAP = 38; // ~1 cm gap between cards
const OFFSET = W; // cards peek exactly 1 cm (GAP) to the right when stacked

// ─── Generic stacking card ────────────────────────────────────────────────────

function SCard({
  index, expanded, gradient, href, onClick, children,
  width = W,
  height = H,
  formMode = false,
  loginCard = false,
}: {
  index: number; expanded: boolean; gradient: string;
  href?: string; onClick?: () => void; children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  /** Form alanları: tıklama / seçim için kart modu */
  formMode?: boolean;
  /** Beyaz kart + yeşil kenarlık (kullanıcı girişi) */
  loginCard?: boolean;
}) {
  const inner = (
    <div
      className={
        loginCard
          ? 'rounded-2xl bg-white border-2 border-green-600 text-gray-900 flex flex-col shadow-md transition-shadow overflow-hidden select-text cursor-default'
          : `rounded-2xl bg-gradient-to-br ${gradient} text-white flex flex-col shadow-lg transition-shadow overflow-hidden ${formMode
            ? 'select-text cursor-default'
            : 'justify-between cursor-pointer select-none hover:shadow-xl'
          }`
      }
      style={{
        width,
        height,
        padding: loginCard ? '4px 6px' : formMode ? '2px 4px' : '6px 10px',
      }}
    >
      {children}
    </div>
  );

  return (
    <motion.div
      initial={{ x: -OFFSET * index }}
      animate={{ x: expanded ? 0 : -OFFSET * index }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.03 * index }}
      style={{ zIndex: 100 - index, flexShrink: 0 }}
      onMouseDown={(e) => {
        if (formMode) e.stopPropagation();
      }}
    >
      {href ? (
        <Link href={href}>{inner}</Link>
      ) : onClick ? (
        <div onClick={onClick} role="presentation">
          {inner}
        </div>
      ) : (
        <div>{inner}</div>
      )}
    </motion.div>
  );
}

// ─── Label card (anchor, always visible) ─────────────────────────────────────

function LabelCard({ label, sub }: { label: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl bg-[#1A2E5A] text-white flex flex-col justify-center shadow-xl flex-shrink-0 select-none overflow-hidden"
      style={{ width: W, height: H, padding: '6px 10px', zIndex: 200 }}
    >
      <p className="text-[9px] uppercase tracking-widest text-white/35 mb-0.5 leading-none">{sub ?? 'SkillBridge'}</p>
      <p className="text-sm font-bold leading-tight">{label}</p>
      <p className="text-[9px] text-white/35 mt-0.5 leading-none">üzerine gelin →</p>
    </div>
  );
}

// ─── Row wrapper ──────────────────────────────────────────────────────────────

type CardDef = {
  gradient: string;
  href?: string;
  onClick?: () => void;
  content: React.ReactNode;
  width?: number | string;
  height?: number | string;
  formMode?: boolean;
  /** Beyaz arka plan + yeşil çerçeve */
  loginCard?: boolean;
};

function StackingRow({
  labelText, labelSub, panel, cards,
}: {
  labelText: string; labelSub?: string;
  panel?: React.ReactNode; cards: CardDef[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);

  const keepInsideViewport = () => {
    const el = rowRef.current;
    if (!el) return;

    const margin = 16;
    const rect = el.getBoundingClientRect();
    const overflowRight = rect.right - (window.innerWidth - margin);

    if (overflowRight <= 0) {
      setShiftX(0);
      return;
    }

    const maxShiftWithoutLeftOverflow = Math.max(rect.left - margin, 0);
    setShiftX(Math.min(overflowRight, maxShiftWithoutLeftOverflow));
  };

  useEffect(() => {
    if (!expanded) {
      setShiftX(0);
      return;
    }

    const frameId = window.requestAnimationFrame(keepInsideViewport);
    const onResize = () => keepInsideViewport();
    window.addEventListener('resize', onResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
    };
  }, [expanded]);

  return (
    <div
      ref={rowRef}
      className="relative"
      style={{ width: 'fit-content', transform: `translateX(-${shiftX}px)` }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        setExpanded(false);
        setShiftX(0);
      }}
    >
      {panel}
      <div className="flex items-stretch" style={{ gap: GAP }}>
        <LabelCard label={labelText} sub={labelSub} />
        {cards.map((card, i) => (
          <SCard
            key={i}
            index={i + 1}
            expanded={expanded}
            gradient={card.gradient}
            href={card.href}
            onClick={card.onClick}
            width={card.width}
            height={card.height}
            formMode={card.formMode || card.loginCard}
            loginCard={card.loginCard}
          >
            {card.content}
          </SCard>
        ))}
      </div>
    </div>
  );
}

// ─── Card content helpers ─────────────────────────────────────────────────────

function CIcon({ icon: Icon }: { icon: React.ElementType }) {
  return <Icon className="w-5 h-5 opacity-80" />;
}

function CBody({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <p className="font-bold text-sm leading-snug">{title}</p>
      <p className="text-xs text-white/55 mt-0.5 leading-snug">{desc}</p>
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, fetchMe } = useAuthStore();
  const [sessions, setSessions] = useState<SessionResult[]>([]);

  type DocPanel = 'upload' | 'ai' | 'case' | null;
  type TestPanel = 'doc' | 'topics' | 'cv' | 'profile' | null;
  type CandidatePanel = 'invite' | 'bulk' | 'url' | null;
  type EvalPanel = 'analysis' | '360' | 'cvjd' | null;
  type ComparePanel = 'jd-multi' | 'cv-vs-cv' | 'sessions' | null;

  const [docPanel, setDocPanel] = useState<DocPanel>(null);
  const [testPanel, setTestPanel] = useState<TestPanel>(null);
  const [candidatePanel, setCandidatePanel] = useState<CandidatePanel>(null);
  const [evalPanel, setEvalPanel] = useState<EvalPanel>(null);
  const [comparePanel, setComparePanel] = useState<ComparePanel>(null);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }
    listUserSessions().then(setSessions).catch(() => setSessions([]));
  }, [user]);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || 'Kullanıcı'
    : 'Kullanıcı';
  const credits = user
    ? (user.role === 'CORPORATE_ADMIN' ? (user.company?.credits ?? 0) : user.credits)
    : 0;
  const recent = sessions.slice(0, 5);
  const avgScore = recent.length
    ? Math.round(recent.reduce((s, r) => s + (r.score ?? 0), 0) / recent.length)
    : null;
  const companyPct = avgScore !== null ? Math.min(99, Math.max(1, 100 - Math.floor(avgScore / 2))) : null;

  return (
    <div className="min-h-screen bg-[#F5F6FA]">

      {/* ── Centered modals (fixed overlay, outside scroll container) ── */}
      {docPanel === 'ai' && <AiDocPanel onClose={() => setDocPanel(null)} onSaved={() => { }} />}
      {docPanel === 'case' && <CaseAnalysisPanel onClose={() => setDocPanel(null)} />}
      {comparePanel === 'jd-multi' && <CvJdMultiPanel onClose={() => setComparePanel(null)} />}
      {comparePanel === 'cv-vs-cv' && <CvVsCvPanel onClose={() => setComparePanel(null)} />}
      {comparePanel === 'sessions' && <SessionComparePanel onClose={() => setComparePanel(null)} />}
      {testPanel === 'doc' && <FromDocPanel onClose={() => setTestPanel(null)} />}
      {testPanel === 'topics' && <FromTopicsPanel onClose={() => setTestPanel(null)} />}
      {testPanel === 'cv' && <FromCvPanel onClose={() => setTestPanel(null)} />}
      {testPanel === 'profile' && <TestProfilePanel onClose={() => setTestPanel(null)} />}
      {candidatePanel === 'invite' && <InvitePanel onClose={() => setCandidatePanel(null)} />}
      {candidatePanel === 'bulk' && <BulkInvitePanel onClose={() => setCandidatePanel(null)} />}
      {candidatePanel === 'url' && <InviteUrlPanel onClose={() => setCandidatePanel(null)} />}
      {evalPanel === 'analysis' && <AiAnalysisPanel onClose={() => setEvalPanel(null)} />}
      {evalPanel === '360' && <Assessment360Panel onClose={() => setEvalPanel(null)} />}
      {evalPanel === 'cvjd' && <CvJdMatchPanel onClose={() => setEvalPanel(null)} />}

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SkillBridge" style={{ height: '2cm' }} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{displayName}</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">{credits}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Three stacking rows ── */}
      <main
        className="flex flex-col w-full max-w-full overflow-x-hidden"
        style={{ padding: '1cm', gap: '1cm' }}
      >

        {/* ── ROW 1 — Dashboard + stats ── */}
        <StackingRow
          labelText="Dashboard"
          labelSub={displayName}
          cards={[
            {
              gradient: 'from-slate-600 to-slate-800',
              loginCard: true,
              content: <DashboardLoginCard />,
            },
            {
              gradient: 'from-blue-500 to-blue-700',
              content: (
                <>
                  <div className="flex items-center gap-1.5">
                    <CIcon icon={Trophy} />
                    <p className="text-[11px] font-semibold text-white/80">Katıldığım Sınavlar</p>
                  </div>
                  <div>
                    {recent.length === 0 ? (
                      <p className="text-[11px] text-white/40">Henüz sınav yok</p>
                    ) : (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {recent.map((s) => (
                          <div key={s.id} className="flex items-center gap-1">
                            <p className="text-[10px] text-white/65 truncate max-w-[110px]">{s.test.title}</p>
                            <span className="text-[10px] font-bold bg-white/20 px-1 py-0.5 rounded shrink-0">
                              {s.score ?? '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ),
            },
            {
              gradient: 'from-indigo-500 to-indigo-700',
              content: (
                <>
                  <CIcon icon={Building2} />
                  <div>
                    {companyPct !== null ? (
                      <>
                        <p className="text-2xl font-black">%{companyPct}</p>
                        <p className="text-xs text-white/60">şirket içi sıralama</p>
                        <p className="text-[10px] text-white/35 truncate">
                          {(user as { company?: { name?: string } } | null)?.company?.name ?? 'Şirket bilgisi yok'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold">Şirket İçi Sıralama</p>
                        <p className="text-[10px] text-white/45 leading-snug">
                          Sınav tamamladıkça hesaplanır.
                        </p>
                      </>
                    )}
                  </div>
                </>
              ),
            },
            {
              gradient: 'from-amber-500 to-amber-600',
              content: (
                <>
                  <CIcon icon={Coins} />
                  <div>
                    <p className="text-2xl font-black">{credits}</p>
                    <p className="text-xs text-white/60">kontör bakiyesi</p>
                    <p className="text-[10px] text-white/35">
                      {user?.role === 'CORPORATE_ADMIN' ? 'şirket havuzu' : 'bireysel bakiye'}
                    </p>
                  </div>
                </>
              ),
            },
          ]}
        />

        {/* ── ROW 2 — Doküman İşlemleri ── */}
        <StackingRow
          labelText="Doküman İşlemleri"
          panel={
            <>
              {docPanel === 'upload' && (
                <UploadPanel onClose={() => setDocPanel(null)} onUploaded={() => setDocPanel(null)} />
              )}
            </>
          }
          cards={[
            {
              gradient: 'from-[#1E3A6E] to-blue-600',
              href: '/documents',
              content: (<><CIcon icon={FileText} /><CBody title="Dokümanlar" desc="Kütüphaneyi görüntüle" /></>),
            },
            {
              gradient: 'from-indigo-500 to-indigo-700',
              onClick: () => setDocPanel('upload'),
              content: (<><CIcon icon={Upload} /><CBody title="Doküman Yükle" desc="PDF · DOCX · TXT · PPTX" /></>),
            },
            {
              gradient: 'from-purple-600 to-purple-800',
              onClick: () => setDocPanel('ai'),
              content: (<><CIcon icon={Sparkles} /><CBody title="Doküman Yarat" desc="AI ile oluştur · 50 kontör" /></>),
            },
            {
              gradient: 'from-rose-600 to-rose-800',
              onClick: () => setDocPanel('case'),
              content: (<><CIcon icon={ClipboardList} /><CBody title="Vaka Analizi" desc="Olay/senaryo bazlı test · 50 kontör" /></>),
            },
          ]}
        />

        {/* ── ROW 3 — Test İşlemleri ── */}
        <StackingRow
          labelText="Test İşlemleri"
          cards={[
            {
              gradient: 'from-[#1A2E5A] to-cyan-700',
              href: '/tests',
              content: (<><CIcon icon={BookOpen} /><CBody title="Testler" desc="Test kütüphanesini aç" /></>),
            },
            {
              gradient: 'from-blue-500 to-blue-700',
              onClick: () => setTestPanel('doc'),
              content: (<><CIcon icon={FileSearch} /><CBody title="Belgeden Test Oluştur" desc="Dokümanı seç, AI üretsin" /></>),
            },
            {
              gradient: 'from-emerald-500 to-emerald-700',
              onClick: () => setTestPanel('topics'),
              content: (<><CIcon icon={BrainCircuit} /><CBody title="Konulardan Test Yarat" desc="Prompt ile özel test" /></>),
            },
            {
              gradient: 'from-orange-400 to-orange-600',
              onClick: () => setTestPanel('cv'),
              content: (<><CIcon icon={FileUser} /><CBody title="CV'ye Göre Hazırla" desc="Eğitim ve becerilere özel" /></>),
            },
            {
              gradient: 'from-cyan-500 to-cyan-700',
              onClick: () => setTestPanel('profile'),
              content: (<><CIcon icon={PlayCircle} /><CBody title="Testi çöz" desc="Ad, şirket, departman, meslek" /></>),
            },
          ]}
        />

        {/* ── ROW 4 — Karşılaştırma ── */}
        <StackingRow
          labelText="Karşılaştırma"
          cards={[
            {
              gradient: 'from-indigo-500 to-indigo-700',
              onClick: () => setComparePanel('jd-multi'),
              content: (<><CIcon icon={Users} /><CBody title="Görev Tanımı + CV'ler" desc="Çoklu CV'yi JD ile karşılaştır" /></>),
            },
            {
              gradient: 'from-violet-500 to-violet-700',
              onClick: () => setComparePanel('cv-vs-cv'),
              content: (<><CIcon icon={GitCompare} /><CBody title="CV vs CV" desc="İki adayı karşı karşıya analiz et" /></>),
            },
            {
              gradient: 'from-teal-500 to-teal-700',
              onClick: () => setComparePanel('sessions'),
              content: (<><CIcon icon={ClipboardCheck} /><CBody title="Test Cevapları" desc="Cevapları karşılaştır, kazananı bul" /></>),
            },
          ]}
        />

        {/* ── ROW 5 — Aday İşlemleri ── */}
        <StackingRow
          labelText="Aday İşlemleri"
          cards={[
            {
              gradient: 'from-[#0F4C6E] to-teal-600',
              href: '/invitations',
              content: (<><CIcon icon={UsersRound} /><CBody title="Davetler" desc="Tüm davetleri görüntüle" /></>),
            },
            {
              gradient: 'from-teal-500 to-teal-700',
              onClick: () => setCandidatePanel('invite'),
              content: (<><CIcon icon={UserPlus} /><CBody title="Aday Davet Et" desc="E-posta ile tek davet" /></>),
            },
            {
              gradient: 'from-cyan-500 to-cyan-700',
              onClick: () => setCandidatePanel('bulk'),
              content: (<><CIcon icon={Users} /><CBody title="Toplu Davet" desc="CSV / çoklu e-posta" /></>),
            },
            {
              gradient: 'from-sky-500 to-sky-700',
              onClick: () => setCandidatePanel('url'),
              content: (<><CIcon icon={Link2} /><CBody title="Sınav Linki" desc="Paylaşılabilir test URL'si" /></>),
            },
          ]}
        />

        {/* ── ROW 6 — Değerlendirme & Analiz ── */}
        <StackingRow
          labelText="Değerlendirme"
          cards={[
            {
              gradient: 'from-[#145A3C] to-emerald-600',
              href: '/sessions',
              content: (<><CIcon icon={BarChart3} /><CBody title="Sonuçlar" desc="Tüm oturumları görüntüle" /></>),
            },
            {
              gradient: 'from-amber-500 to-amber-600',
              onClick: () => setEvalPanel('analysis'),
              content: (<><CIcon icon={Sparkles} /><CBody title="AI Analizi" desc="Sonucu Claude ile analiz et" /></>),
            },
            {
              gradient: 'from-violet-500 to-violet-700',
              onClick: () => setEvalPanel('360'),
              content: (<><CIcon icon={UserCheck} /><CBody title="360° Değerlendirme" desc="Çok yönlü geri bildirim" /></>),
            },
            {
              gradient: 'from-rose-500 to-rose-700',
              onClick: () => setEvalPanel('cvjd'),
              content: (<><CIcon icon={GitCompare} /><CBody title="CV + JD Eşleştirme" desc="Aday-pozisyon uyumu" /></>),
            },
          ]}
        />

        {/* ── ROW 6 — Yönetim (rol bağımlı) ── */}
        {(user?.role === 'CORPORATE_ADMIN' || user?.role === 'PLATFORM_ADMIN') && (
          <StackingRow
            labelText="Yönetim"
            cards={[
              {
                gradient: 'from-[#1A2E5A] to-slate-600',
                href: '/admin',
                content: (<><CIcon icon={ShieldCheck} /><CBody title="Admin Panel" desc="Platform yönetimi" /></>),
              },
              {
                gradient: 'from-slate-500 to-slate-700',
                href: '/admin/taxonomy',
                content: (<><CIcon icon={Tags} /><CBody title="Taxonomy" desc="Sektör, pozisyon, birim" /></>),
              },
              {
                gradient: 'from-gray-500 to-gray-700',
                href: '/admin/users',
                content: (<><CIcon icon={UsersRound} /><CBody title="Kullanıcılar" desc="Üye ve rol yönetimi" /></>),
              },
              {
                gradient: 'from-zinc-600 to-zinc-800',
                href: '/admin/company',
                content: (<><CIcon icon={Settings2} /><CBody title="Şirket Ayarları" desc="Profil ve fatura" /></>),
              },
            ]}
          />
        )}

        <footer className="mt-8 pb-6 text-center text-xs text-gray-400">
          <Link href="/superadmin" className="hover:text-gray-600 underline">
            Platform yönetici girişi
          </Link>
        </footer>
      </main>
    </div>
  );
}
