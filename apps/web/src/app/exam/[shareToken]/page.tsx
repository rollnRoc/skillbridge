'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Loader2, Send, PlayCircle } from 'lucide-react';
import {
  startSession,
  saveAnswer,
  completeSession,
  type Question,
} from '../../../lib/sessions.api';

export default function ExamPage() {
  const params = useParams<{ shareToken: string }>();
  const shareToken = params?.shareToken as string;
  const router = useRouter();

  const sessionIdRef = useRef<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testTitle, setTestTitle] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [starting, setStarting] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const remembered = window.localStorage.getItem('skillbridge.examParticipantName');
      if (remembered) setParticipantName(remembered);
    }
    setLoading(false);
  }, []);

  async function beginSession() {
    const cleanedName = participantName.trim();
    if (!cleanedName) {
      setError('Lutfen ad ve soyadinizi girin.');
      return;
    }

    setError('');
    setStarting(true);
    setLoading(true);
    try {
      const { session, test } = await startSession(undefined, shareToken, cleanedName);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('skillbridge.examParticipantName', cleanedName);
      }
      sessionIdRef.current = session.id;
      setTestTitle(test.title);
      setQuestions(test.questions);
      if (test.timeLimit) setSecondsLeft(test.timeLimit * 60);
      setSessionStarted(true);
    } catch {
      setError('Test bulunamadi veya erisim izniniz yok.');
    } finally {
      setLoading(false);
      setStarting(false);
    }
  }

  // Timer
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0) submit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function pick(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (sessionIdRef.current) {
      saveAnswer(sessionIdRef.current, questionId, value).catch(() => {});
    }
  }

  async function submit() {
    const sid = sessionIdRef.current;
    if (!sid || submitting) return;
    setSubmitting(true);
    try {
      await completeSession(sid);
      router.push(`/sessions/${sid}`);
    } catch {
      setError('Test tamamlanamadı. Lütfen tekrar deneyin.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && sessionStarted) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">{error}</p>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700 underline">
            Dashboard'a dön
          </button>
        </div>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-[#1A2E5A] mb-1">Teste Baslamadan Once</h1>
          <p className="text-sm text-gray-500 mb-5">Sonuclarin yoneticiler tarafindan gorulebilmesi icin adinizi girin.</p>

          <label className="block text-xs font-medium text-gray-600 mb-1.5">Ad Soyad</label>
          <input
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="Ornek: Ayse Yilmaz"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2E5A]/30"
          />

          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

          <button
            onClick={beginSession}
            disabled={starting}
            className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-[#1A2E5A] text-white rounded-xl hover:bg-[#152448] disabled:opacity-50 transition-colors"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            {starting ? 'Test Hazirlaniyor...' : 'Teste Basla'}
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <p className="text-gray-400">Bu testte soru bulunamadı.</p>
      </div>
    );
  }

  const q = questions[current];
  if (!q) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <p className="text-gray-400">Soru yüklenemedi.</p>
      </div>
    );
  }
  const allAnswered = questions.every((qu) => {
    const a = answers[qu.id];
    return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
  });
  const mins = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const secs = secondsLeft !== null ? secondsLeft % 60 : null;

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-sm font-semibold text-[#1A2E5A] truncate max-w-xs">{testTitle}</h1>
          <div className="flex items-center gap-4">
            {secondsLeft !== null && (
              <span className={`flex items-center gap-1.5 text-sm font-mono font-bold ${secondsLeft < 300 ? 'text-red-500' : 'text-gray-600'}`}>
                <Clock className="w-4 h-4" />
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
            )}
            <span className="text-xs text-gray-400">{current + 1} / {questions.length}</span>
          </div>
        </div>
      </header>

      <div className="bg-cyan-50/90 border-b border-cyan-100">
        <div className="max-w-3xl mx-auto px-6 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-cyan-700/80 font-semibold mb-1.5">Katilimci bilgisi</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-800">
            <span>
              <span className="text-gray-500">Ad Soyad:</span>{' '}
              <strong>{participantName || '—'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-[#1A2E5A] transition-all duration-300"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-3 mb-6">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1A2E5A]/10 text-[#1A2E5A] text-sm font-bold flex items-center justify-center">
              {current + 1}
            </span>
            <p className="text-base font-medium text-gray-900 leading-relaxed">{q.content}</p>
          </div>

          <QuestionInput
            question={q}
            value={answers[q.id]}
            onChange={(val) => pick(q.id, val)}
          />
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Önceki
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {questions.map((qu, i) => {
              const a = answers[qu.id];
              const done = a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
              return (
                <button
                  key={qu.id}
                  onClick={() => setCurrent(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === current ? 'bg-[#1A2E5A]' : done ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                />
              );
            })}
          </div>

          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#1A2E5A] border border-[#1A2E5A]/30 rounded-xl hover:bg-[#1A2E5A]/5 transition-colors"
            >
              Sonraki <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 text-sm bg-[#1A2E5A] text-white rounded-xl hover:bg-[#152448] disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Testi Bitir
            </button>
          )}
        </div>

        {/* Submit CTA when all answered */}
        {allAnswered && current < questions.length - 1 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={submit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Tüm sorular cevaplandı — Testi Tamamla
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Soru tiplerine göre input bileşeni ───────────────────────────────────────

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const opts = question.options ?? [];

  if (question.type === 'MULTIPLE_CHOICE') {
    return (
      <div className="space-y-2">
        {opts.map((opt) => {
          const sel = value === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer select-none transition-all ${
                sel
                  ? 'bg-blue-50 border-blue-500 text-blue-800'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${sel ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                {sel && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{opt.id.toUpperCase()}.</span>
              <span className="text-sm">{opt.text}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (question.type === 'MULTIPLE_CORRECT') {
    const sel: string[] = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-2">
        {opts.map((opt) => {
          const checked = sel.includes(opt.id);
          return (
            <div
              key={opt.id}
              onClick={() => onChange(checked ? sel.filter((s) => s !== opt.id) : [...sel, opt.id])}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer select-none transition-all ${
                checked
                  ? 'bg-blue-50 border-blue-500 text-blue-800'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{opt.id.toUpperCase()}.</span>
              <span className="text-sm">{opt.text}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (question.type === 'YES_NO') {
    return (
      <div className="flex gap-3">
        {(['yes', 'no'] as const).map((v) => {
          const sel = value === v;
          return (
            <div
              key={v}
              onClick={() => onChange(v)}
              className={`flex-1 py-3 rounded-xl border text-sm font-medium text-center cursor-pointer select-none transition-all ${
                sel
                  ? v === 'yes'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-red-50 border-red-400 text-red-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {v === 'yes' ? 'Evet' : 'Hayır'}
            </div>
          );
        })}
      </div>
    );
  }

  if (question.type === 'ORDERING') {
    const items: string[] = Array.isArray(value) && (value as string[]).length > 0
      ? (value as string[])
      : opts.map((o) => o.id);

    function move(from: number, to: number) {
      const arr = [...items];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      onChange(arr);
    }

    return (
      <div className="space-y-2">
        {items.map((id, idx) => {
          const opt = opts.find((o) => o.id === id);
          return (
            <div key={id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
              <span className="text-sm flex-1">{opt?.text ?? id}</span>
              <div className="flex gap-1">
                <button
                  disabled={idx === 0}
                  onClick={(e) => { e.stopPropagation(); move(idx, idx - 1); }}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
                >
                  <ChevronLeft className="w-4 h-4 rotate-90" />
                </button>
                <button
                  disabled={idx === items.length - 1}
                  onClick={(e) => { e.stopPropagation(); move(idx, idx + 1); }}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
                >
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (question.type === 'OPEN_ENDED') {
    return (
      <textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cevabınızı buraya yazın..."
        rows={5}
        className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1A2E5A]/30"
      />
    );
  }

  return null;
}
