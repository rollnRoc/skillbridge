'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, CheckCircle2, XCircle, Minus, Sparkles,
  Loader2, BarChart3, TrendingUp, Target, BookOpen, Star, Download,
} from 'lucide-react';
import {
  getSessionResult,
  requestAIAnalysis,
  getAssessmentConfig,
  type SessionResult,
  type AssessmentConfig,
} from '../../../lib/sessions.api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuthStore } from '../../../store/auth.store';

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Çoktan Seçmeli',
  MULTIPLE_CORRECT: 'Çok Doğrulu',
  OPEN_ENDED: 'Açık Uçlu',
  YES_NO: 'Evet / Hayır',
  ORDERING: 'Sıralama',
};

function formatAnswer(answer: unknown): string {
  if (answer === null || answer === undefined) return '—';
  if (Array.isArray(answer)) return answer.join(', ');
  if (answer === 'yes') return 'Evet';
  if (answer === 'no') return 'Hayır';
  return String(answer);
}

function isAnswerCorrect(userAnswer: unknown, correctAnswer: unknown, type: string): boolean | null {
  if (!correctAnswer) return null; // open-ended
  if (userAnswer === null || userAnswer === undefined) return false;
  if (type === 'MULTIPLE_CHOICE' || type === 'YES_NO') return userAnswer === correctAnswer;
  if (type === 'MULTIPLE_CORRECT') {
    const correct = Array.isArray(correctAnswer) ? correctAnswer : [];
    const given = Array.isArray(userAnswer) ? userAnswer : [];
    return correct.length === given.length && correct.every((c: string) => given.includes(c));
  }
  if (type === 'ORDERING') {
    const correct = Array.isArray(correctAnswer) ? correctAnswer : [];
    const given = Array.isArray(userAnswer) ? userAnswer : [];
    return correct.every((c: string, i: number) => c === given[i]);
  }
  return null;
}

type EvaluatedAnswer = {
  index: number;
  questionId: string;
  questionText: string;
  type: string;
  userAnswer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean | null;
  explanation: string;
};

const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  level1Min: 80,
  level2Min: 70,
  level3Min: 60,
  level4Min: 50,
};

function buildAnswerExplanation(item: {
  isCorrect: boolean | null;
  questionText: string;
  type: string;
  userAnswer: unknown;
  correctAnswer: unknown;
}): string {
  if (item.isCorrect === true) {
    return `Doğru cevap verdiniz. Bu soru (${TYPE_LABELS[item.type] ?? item.type}) tipinde beklenen bilgiyi doğru uyguladığınızı gösteriyor.`;
  }

  if (item.isCorrect === false) {
    return `Bu soruda gelişim ihtiyacı var. Verdiğiniz cevap: "${formatAnswer(item.userAnswer)}". Beklenen doğru cevap: "${formatAnswer(item.correctAnswer)}".`;
  }

  return 'Bu soru açık uçlu/özel formatta olduğu için otomatik doğru-yanlış sınıflandırmasına dahil edilmedi.';
}

function getTreeLevel(score: number, cfg: AssessmentConfig) {
  if (score >= cfg.level1Min) {
    return {
      level: 1,
      image: '/1.png',
      title: '1 Numaralı Ağaç',
      note: `Başarı seviyesi %${cfg.level1Min}-%100 aralığında. Güçlü bir gelişim profili var.`,
    };
  }
  if (score >= cfg.level2Min) {
    return {
      level: 2,
      image: '/2.png',
      title: '2 Numaralı Ağaç',
      note: `Başarı seviyesi %${cfg.level2Min}-%${cfg.level1Min - 1} aralığında. İyi düzeyde, daha da güçlenebilir.`,
    };
  }
  if (score >= cfg.level3Min) {
    return {
      level: 3,
      image: '/3.png',
      title: '3 Numaralı Ağaç',
      note: `Başarı seviyesi %${cfg.level3Min}-%${cfg.level2Min - 1} aralığında. Temel yeterlilik var, düzenli gelişim gerekli.`,
    };
  }
  if (score >= cfg.level4Min) {
    return {
      level: 4,
      image: '/4.png',
      title: '4 Numaralı Ağaç',
      note: `Başarı seviyesi %${cfg.level4Min}-%${cfg.level3Min - 1} aralığında. Gelişime ihtiyaç belirgin.`,
    };
  }
  return {
    level: 5,
    image: '/5.png',
    title: '5 Numaralı Ağaç',
    note: `Başarı seviyesi %${cfg.level4Min} altı. Öncelikli gelişim planı önerilir.`,
  };
}

function buildWeeklyPlan(level: number): string[] {
  if (level === 1) {
    return [
      'Hafta 1: Güçlü olduğunuz konularda ileri seviye vaka çözün.',
      'Hafta 2: Her gün 20 dk tekrar ile kalıcılığı artırın.',
      'Hafta 3: Yeni bir konuda mini proje/senaryo çözümü yapın.',
      'Hafta 4: Deneme testleriyle seviyeyi %90+ bandında koruyun.',
    ];
  }
  if (level === 2) {
    return [
      'Hafta 1: Yanlış çıkan konuları başlık başlık çıkarın.',
      'Hafta 2: Her başlık için 10 soru çözümü yapın.',
      'Hafta 3: Zayıf başlıklarda kısa not kartları hazırlayın.',
      'Hafta 4: Karma deneme ile hedefi bir üst seviyeye taşıyın.',
    ];
  }
  if (level === 3) {
    return [
      'Hafta 1: Temel konuları tekrar edip eksik kavramları netleştirin.',
      'Hafta 2: Günlük kısa testlerle doğruluk oranını artırın.',
      'Hafta 3: Yanlış yapılan soru tiplerinde odak çalışma yapın.',
      'Hafta 4: Süre tutarak deneme çözün ve hata analizi çıkarın.',
    ];
  }
  if (level === 4) {
    return [
      'Hafta 1: Konu anlatımı + örnek soru ile temel güçlendirme.',
      'Hafta 2: Her gün 15-20 soru çözerek rutin oluşturma.',
      'Hafta 3: Öğrenilen başlıkları küçük tekrar döngüsüne alma.',
      'Hafta 4: Basit düzey deneme ile ilerleme takibi yapma.',
    ];
  }

  return [
    'Hafta 1: En temel kavramlardan başlayarak konu haritası çıkarın.',
    'Hafta 2: Kısa konu anlatımı sonrası temel soru setleri çözün.',
    'Hafta 3: Yanlışlar için birebir konu tekrarı yapın.',
    'Hafta 4: Öğrenme koçu/mentor desteği ile tekrar deneme uygulayın.',
  ];
}

function getParticipantName(session: SessionResult | null): string {
  if (!session) return 'Aday';
  const fallback = session.user ? `${session.user.firstName} ${session.user.lastName}`.trim() : 'Aday';
  if (!session.aiReport) return fallback;
  try {
    const parsed = JSON.parse(session.aiReport) as { meta?: { participantName?: string } };
    return parsed?.meta?.participantName?.trim() || fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function exportRowsToExcel(rows: EvaluatedAnswer[], filename: string, title: string) {
  const html = `
    <table border="1">
      <tr><th colspan="3">${escapeHtml(title)}</th></tr>
      <tr><th>#</th><th>Soru</th><th>Açıklama</th></tr>
      ${rows
      .map((r) => `<tr><td>${r.index}</td><td>${escapeHtml(r.questionText)}</td><td>${escapeHtml(r.explanation)}</td></tr>`)
      .join('')}
    </table>
  `;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportSummaryToPdf(sessionTitle: string, score: number, correct: number, wrong: number, empty: number, rows: EvaluatedAnswer[]) {
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) return;

  const rowsHtml = rows
    .map((r) => `<tr><td>${r.index}</td><td>${escapeHtml(r.questionText)}</td><td>${escapeHtml(r.explanation)}</td></tr>`)
    .join('');

  const scoreColor = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const today = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  win.document.write(`
    <html>
      <head>
        <meta charset="UTF-8">
        <title>SkillBridge Sonuç Raporu</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            color: #1f2937; 
            line-height: 1.5;
            background: #f3f4f6;
            padding: 20px;
          }
          .container { 
            background: white; 
            max-width: 900px; 
            margin: 0 auto; 
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            padding: 40px;
          }
          .header {
            border-bottom: 3px solid #1a2e5a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 24px;
            color: #1a2e5a;
            margin-bottom: 4px;
          }
          .header p {
            font-size: 12px;
            color: #6b7280;
          }
          .score-card {
            display: flex;
            align-items: center;
            gap: 30px;
            background: linear-gradient(135deg, #1a2e5a 0%, #0f1929 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
          }
          .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .score-number {
            font-size: 36px;
            font-weight: 900;
            color: ${scoreColor};
          }
          .score-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
          }
          .score-details {
            flex: 1;
          }
          .score-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
          }
          .score-stats {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }
          .stat {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
          }
          .stat-badge {
            display: inline-block;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            text-align: center;
            line-height: 20px;
            font-weight: bold;
            font-size: 11px;
          }
          .stat-badge.correct { background: #dcfce7; color: #166534; }
          .stat-badge.wrong { background: #fee2e2; color: #991b1b; }
          .stat-badge.empty { background: #f3f4f6; color: #6b7280; }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #1a2e5a;
            margin-top: 30px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          table { 
            width: 100%; 
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 10px;
          }
          th { 
            background: #f3f4f6; 
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
          }
          td { 
            padding: 10px 12px;
            border-bottom: 1px solid #f0f0f0;
            word-wrap: break-word;
          }
          tr:hover { background: #fafafa; }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
          @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; padding: 20px; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SkillBridge Sonuç Raporu</h1>
            <p>Değerlendirme Tarihi: ${today}</p>
          </div>

          <div class="score-card">
            <div class="score-circle">
              <div class="score-number">${Math.round(score)}</div>
              <div class="score-label">%</div>
            </div>
            <div class="score-details">
              <div class="score-title">${escapeHtml(sessionTitle)}</div>
              <div class="score-stats">
                <div class="stat">
                  <span class="stat-badge correct">✓</span>
                  <span><strong>${correct}</strong> Doğru</span>
                </div>
                <div class="stat">
                  <span class="stat-badge wrong">✕</span>
                  <span><strong>${wrong}</strong> Yanlış</span>
                </div>
                <div class="stat">
                  <span class="stat-badge empty">−</span>
                  <span><strong>${empty}</strong> Boş</span>
                </div>
              </div>
            </div>
          </div>

          <div class="section-title">Soru Detayları</div>
          <table>
            <thead>
              <tr>
                <th style="width: 4%;">#</th>
                <th style="width: 48%;">Soru</th>
                <th style="width: 48%;">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <p>Bu rapor SkillBridge platform'ş tarafından otomatik olarak oluşturulmuştur.</p>
            <p style="margin-top: 8px;">© 2026 SkillBridge. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export default function SessionResultPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId as string;;
  const router = useRouter();
  const { user } = useAuthStore();

  const [session, setSession] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [correctPage, setCorrectPage] = useState(1);
  const [wrongPage, setWrongPage] = useState(1);
  const [assessmentConfig, setAssessmentConfig] = useState<AssessmentConfig>(DEFAULT_ASSESSMENT_CONFIG);
  const [explanationTab, setExplanationTab] = useState<'correct' | 'wrong'>('correct');

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([
      getSessionResult(sessionId),
      getAssessmentConfig().catch(() => DEFAULT_ASSESSMENT_CONFIG),
    ])
      .then(([sessionResult, cfg]) => {
        setSession(sessionResult);
        setAssessmentConfig(cfg);
      })
      .catch(() => router.replace('/sessions'))
      .finally(() => setLoading(false));
  }, [sessionId, router]);

  const evaluatedAnswers = useMemo<EvaluatedAnswer[]>(() => {
    if (!session) return [];
    return session.answers.map((a, i) => {
      const result = isAnswerCorrect(a.response, a.question.correctAnswer, a.question.type);
      return {
        index: i + 1,
        questionId: a.questionId,
        questionText: a.question.content,
        type: a.question.type,
        userAnswer: a.response,
        correctAnswer: a.question.correctAnswer,
        isCorrect: result,
        explanation: buildAnswerExplanation({
          isCorrect: result,
          questionText: a.question.content,
          type: a.question.type,
          userAnswer: a.response,
          correctAnswer: a.question.correctAnswer,
        }),
      };
    });
  }, [session]);

  const handleAIAnalysis = async () => {
    if (!session || analyzing) return;
    setAnalyzing(true);
    setAiError('');
    try {
      const { aiAnalysis } = await requestAIAnalysis(sessionId);
      const existing = session.aiReport ? JSON.parse(session.aiReport) : {};
      setSession((prev) =>
        prev ? { ...prev, aiReport: JSON.stringify({ ...existing, aiAnalysis }) } : prev
      );
    } catch (e: any) {
      setAiError(e?.response?.data?.error || 'AI analizi başlatılamadı.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) return null;

  const report = session.aiReport ? JSON.parse(session.aiReport) : null;
  const breakdown = report?.breakdown;
  const aiAnalysis = report?.aiAnalysis;
  const isManager = user?.role === 'PLATFORM_ADMIN' || user?.role === 'CORPORATE_ADMIN';
  const participantName = getParticipantName(session);
  const score = session.score ?? 0;
  const treeLevel = getTreeLevel(score, assessmentConfig);
  const scoreRounded = Math.max(0, Math.min(100, Math.round(score)));
  const weeklyPlan = buildWeeklyPlan(treeLevel.level);

  const correctExplanations = evaluatedAnswers.filter((x) => x.isCorrect === true);
  const wrongExplanations = evaluatedAnswers.filter((x) => x.isCorrect === false);

  const pageSize = 6;
  const correctPageCount = Math.max(1, Math.ceil(correctExplanations.length / pageSize));
  const wrongPageCount = Math.max(1, Math.ceil(wrongExplanations.length / pageSize));

  const correctRows = correctExplanations.slice((correctPage - 1) * pageSize, correctPage * pageSize);
  const wrongRows = wrongExplanations.slice((wrongPage - 1) * pageSize, wrongPage * pageSize);

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push('/sessions')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {isManager ? 'Aday Sonuclari' : 'Sonuclarim'}
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-sm font-semibold text-[#1A2E5A] truncate">{session.test.title}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Score hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke={score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'}
                strokeWidth="10"
                strokeDasharray={`${(score / 100) * 276.46} 276.46`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {score.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1A2E5A] mb-1">{session.test.title}</h1>
            {isManager && (
              <p className="text-sm text-gray-600 mb-1">Katilimci: {participantName}</p>
            )}
            {session.completedAt && (
              <p className="text-xs text-gray-400 mb-3">
                {format(new Date(session.completedAt), 'd MMMM yyyy HH:mm', { locale: tr })}
              </p>
            )}
            {breakdown && (
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> {breakdown.correct} Doğru
                </span>
                <span className="flex items-center gap-1.5 text-red-500 font-medium">
                  <XCircle className="w-4 h-4" /> {breakdown.wrong} Yanlış
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Minus className="w-4 h-4" /> {breakdown.empty} Boş
                </span>
                <span className="text-gray-400">Toplam: {breakdown.total}</span>
              </div>
            )}
          </div>
        </div>

        {/* Question-by-question breakdown */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#1A2E5A] px-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Soru Detayları
          </h2>
          {session.answers.map((a, i) => {
            const correct = isAnswerCorrect(a.response, a.question.correctAnswer, a.question.type);
            return (
              <div key={a.questionId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${correct === true ? 'bg-green-100' : correct === false ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                    {correct === true
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : correct === false
                        ? <XCircle className="w-4 h-4 text-red-500" />
                        : <Minus className="w-4 h-4 text-gray-400" />
                    }
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 leading-relaxed">{a.question.content}</p>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full flex-shrink-0">
                        {TYPE_LABELS[a.question.type] ?? a.question.type}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className={`px-3 py-2 rounded-lg border ${correct === false ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                        <span className="font-semibold text-gray-500 block mb-0.5">Cevabınız</span>
                        <span className={correct === false ? 'text-red-700' : 'text-gray-700'}>
                          {formatAnswer(a.response)}
                        </span>
                      </div>
                      {a.question.correctAnswer !== null && a.question.correctAnswer !== undefined && (
                        <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                          <span className="font-semibold text-gray-500 block mb-0.5">Doğru Cevap</span>
                          <span className="text-green-700">{formatAnswer(a.question.correctAnswer)}</span>
                        </div>
                      )}
                      {(a.question.correctAnswer === null || a.question.correctAnswer === undefined) && (
                        <div className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200">
                          <span className="font-semibold text-gray-500 block mb-0.5">Değerlendirme</span>
                          <span className="text-purple-600">AI tarafından değerlendirilecek</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Doğru / yanlış açıklama tabloları */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-[#1A2E5A] mb-3">Dışa Aktar</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportRowsToExcel(correctExplanations, 'dogrular-aciklama.xls', 'Dogrularin Aciklamalari')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
            >
              <Download className="w-3.5 h-3.5" /> Doğrular (Excel)
            </button>
            <button
              type="button"
              onClick={() => exportRowsToExcel(wrongExplanations, 'yanlislar-aciklama.xls', 'Yanlislarin Aciklamalari')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
            >
              <Download className="w-3.5 h-3.5" /> Yanlışlar (Excel)
            </button>
            <button
              type="button"
              onClick={() => exportSummaryToPdf(session.test.title, score, breakdown?.correct ?? 0, breakdown?.wrong ?? 0, breakdown?.empty ?? 0, evaluatedAnswers)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <Download className="w-3.5 h-3.5" /> Sonuç Raporu (PDF)
            </button>
          </div>
        </div>

        {/* Sekmeli doğru/yanlış açıklamaları */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab buttons */}
          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => { setExplanationTab('correct'); setCorrectPage(1); }}
              className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${explanationTab === 'correct'
                  ? 'text-green-700 bg-green-50 border-b-2 border-green-500'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <CheckCircle2 className="w-4 h-4 inline mr-2" />
              Doğruların Açıklamaları ({correctExplanations.length})
            </button>
            <button
              type="button"
              onClick={() => { setExplanationTab('wrong'); setWrongPage(1); }}
              className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${explanationTab === 'wrong'
                  ? 'text-red-700 bg-red-50 border-b-2 border-red-500'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <XCircle className="w-4 h-4 inline mr-2" />
              Yanlışların Açıklamaları ({wrongExplanations.length})
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {explanationTab === 'correct' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="py-2 pr-2">#</th>
                        <th className="py-2 pr-2">Soru</th>
                        <th className="py-2 pr-2">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {correctRows.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-3 text-gray-400">Bu sayfada doğru açıklaması yok.</td>
                        </tr>
                      )}
                      {correctRows.map((row) => (
                        <tr key={row.questionId} className="border-b border-gray-50 align-top">
                          <td className="py-2 pr-2 font-semibold text-green-700">{row.index}</td>
                          <td className="py-2 pr-2 text-gray-700">{row.questionText}</td>
                          <td className="py-2 pr-2 text-green-700">{row.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Sayfa {correctPage}/{correctPageCount}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={correctPage <= 1}
                      onClick={() => setCorrectPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                    >Önceki</button>
                    <button
                      type="button"
                      disabled={correctPage >= correctPageCount}
                      onClick={() => setCorrectPage((p) => Math.min(correctPageCount, p + 1))}
                      className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                    >Sonraki</button>
                  </div>
                </div>
              </div>
            )}

            {explanationTab === 'wrong' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="py-2 pr-2">#</th>
                        <th className="py-2 pr-2">Soru</th>
                        <th className="py-2 pr-2">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wrongRows.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-3 text-gray-400">Bu sayfada yanlış açıklaması yok.</td>
                        </tr>
                      )}
                      {wrongRows.map((row) => (
                        <tr key={row.questionId} className="border-b border-gray-50 align-top">
                          <td className="py-2 pr-2 font-semibold text-red-700">{row.index}</td>
                          <td className="py-2 pr-2 text-gray-700">{row.questionText}</td>
                          <td className="py-2 pr-2 text-red-700">{row.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Sayfa {wrongPage}/{wrongPageCount}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={wrongPage <= 1}
                      onClick={() => setWrongPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                    >Önceki</button>
                    <button
                      type="button"
                      disabled={wrongPage >= wrongPageCount}
                      onClick={() => setWrongPage((p) => Math.min(wrongPageCount, p + 1))}
                      className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                    >Sonraki</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gelişim ağacı */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-[#1A2E5A] mb-4">Gelişim Ağacı</h2>
          <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-5 items-center">
            <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              <img src={treeLevel.image} alt={treeLevel.title} className="w-full h-auto object-cover" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-[#1A2E5A]">{treeLevel.title}</p>
              <p className="text-sm text-gray-600">{treeLevel.note}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-[11px] text-green-700 font-semibold">Güçlü Yönler (100 üzerinden)</p>
                  <p className="text-lg font-bold text-green-700">%{scoreRounded}</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-[11px] text-amber-700 font-semibold">Gelişim İhtiyacı (100 üzerinden)</p>
                  <p className="text-lg font-bold text-amber-700">%{100 - scoreRounded}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Otomatik Haftalık Gelişim Planı</h3>
            <div className="space-y-1.5">
              {weeklyPlan.map((step, i) => (
                <p key={i} className="text-xs text-blue-900"><span className="font-semibold">{i + 1}.</span> {step}</p>
              ))}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1A2E5A] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> AI Değerlendirmesi
            </h2>
            {!aiAnalysis && (
              <button
                onClick={handleAIAnalysis}
                disabled={analyzing}
                className="flex items-center gap-1.5 text-xs px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {analyzing ? 'Analiz ediliyor...' : 'AI Analizi Başlat (10 kr)'}
              </button>
            )}
          </div>

          {aiError && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-3">{aiError}</p>
          )}

          {!aiAnalysis && !analyzing && (
            <p className="text-sm text-gray-400 text-center py-6">
              AI analizi henüz çalıştırılmadı. Detaylı geri bildirim için yukarıdaki butona tıklayın.
            </p>
          )}

          {analyzing && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> AI raporu hazırlanıyor...
            </div>
          )}

          {aiAnalysis && (
            <div className="space-y-4">
              {/* Competency level */}
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                <Star className="w-5 h-5 text-purple-500 flex-shrink-0" />
                <div>
                  <span className="text-xs text-purple-500 font-medium">Yetkinlik Seviyesi</span>
                  <p className="text-sm font-bold text-purple-800">{aiAnalysis.competencyLevel}</p>
                </div>
              </div>

              {/* Overall feedback */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">{aiAnalysis.overallFeedback}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div>
                  <h3 className="text-xs font-semibold text-green-700 flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Güçlü Yönler
                  </h3>
                  <ul className="space-y-1">
                    {(aiAnalysis.strengthAreas ?? []).map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvement areas */}
                <div>
                  <h3 className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                    <Target className="w-3.5 h-3.5" /> Gelişim Alanları
                  </h3>
                  <ul className="space-y-1">
                    {(aiAnalysis.improvementAreas ?? []).map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h3 className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5" /> Gelişim Önerileri
                </h3>
                <ul className="space-y-1">
                  {(aiAnalysis.developmentSuggestions ?? []).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="text-blue-400 font-bold flex-shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Career guidance */}
              {aiAnalysis.careerGuidance && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h3 className="text-xs font-semibold text-blue-700 mb-1">Kariyer Yönlendirmesi</h3>
                  <p className="text-xs text-blue-800 leading-relaxed">{aiAnalysis.careerGuidance}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-center pb-6">
          <button
            onClick={() => router.push('/sessions')}
            className="text-sm text-gray-500 hover:text-[#1A2E5A] underline transition-colors"
          >
            Tüm sonuçlarıma dön
          </button>
        </div>
      </main>
    </div>
  );
}
