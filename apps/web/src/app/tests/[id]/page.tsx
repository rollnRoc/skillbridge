'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, Sparkles, CheckCircle2, Clock, BarChart3,
  Trash2, Copy, Share2, Loader2, Edit3, Check, X, PlayCircle,
} from 'lucide-react';
import { getTest, publishTest, deleteQuestion, updateTest, type TestDetail } from '../../../lib/tests.api';

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Çoktan Seçmeli',
  MULTIPLE_CORRECT: 'Çok Doğrulu',
  OPEN_ENDED: 'Açık Uçlu',
  YES_NO: 'Evet / Hayır',
  ORDERING: 'Sıralama',
};

export default function TestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const router = useRouter();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  useEffect(() => {
    getTest(id)
      .then((t) => { setTest(t); setTitleValue(t.title); })
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handlePublish = async () => {
    if (!test) return;
    setPublishing(true);
    try {
      const updated = await publishTest(test.id);
      // API response doesn't include questions — preserve them from current state
      setTest({ ...updated, questions: test.questions });
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = () => {
    if (!test?.shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/exam/${test.shareToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!test) return;
    setDeletingId(questionId);
    try {
      await deleteQuestion(questionId);
      setTest((prev) => prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== questionId) } : prev);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveTitle = async () => {
    if (!test || !titleValue.trim()) return;
    const updated = await updateTest(test.id, { title: titleValue.trim() });
    setTest({ ...updated, questions: test.questions });
    setEditTitle(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </button>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            {editTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  autoFocus
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditTitle(false); }}
                  className="flex-1 text-sm font-semibold border-b border-blue-400 outline-none bg-transparent"
                />
                <button onClick={handleSaveTitle} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditTitle(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button
                onClick={() => setEditTitle(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#1A2E5A] truncate hover:text-blue-600 transition-colors"
              >
                <span className="truncate">{test.title}</span>
                <Edit3 className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {test.isPublished ? (
              <>
                <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Yayında
                </span>
                <button
                  onClick={() => router.push(`/exam/${test.shareToken}`)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Testi Çöz
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Kopyalandı</> : <><Copy className="w-3.5 h-3.5" /> Linki Kopyala</>}
                </button>
              </>
            ) : (
              <button
                onClick={handlePublish}
                disabled={publishing || test.questions.length === 0}
                className="flex items-center gap-1.5 text-sm px-4 py-2 bg-[#1A2E5A] text-white rounded-xl hover:bg-[#152448] disabled:opacity-50 transition-colors"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                Yayınla
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            {test.questions.length} soru
          </span>
          {test.timeLimit && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {test.timeLimit} dakika
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            AI ile üretildi
          </span>
        </div>

        {/* Questions */}
        {test.questions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>Henüz soru yok.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {test.questions.map((q, i) => (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1A2E5A]/10 text-[#1A2E5A] text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">{q.content}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      {TYPE_LABELS[q.type] ?? q.type}
                    </span>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      disabled={deletingId === q.id}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    >
                      {deletingId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {q.options && q.options.length > 0 && (
                  <ul className="space-y-1.5 ml-10">
                    {q.options.map((opt) => (
                      <li
                        key={opt.id}
                        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg text-gray-600"
                      >
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-gray-100 text-gray-500">
                          {opt.id.toUpperCase()}
                        </span>
                        {opt.text}
                      </li>
                    ))}
                  </ul>
                )}

                {q.type === 'OPEN_ENDED' && (
                  <div className="ml-10 mt-2 text-xs text-gray-400 italic">Açık uçlu — serbest yanıt</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Publish CTA at bottom */}
        {!test.isPublished && test.questions.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-2 px-8 py-3 bg-[#1A2E5A] text-white font-medium rounded-2xl hover:bg-[#152448] disabled:opacity-50 shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              Testi Yayınla ve Paylaş
            </button>
          </div>
        )}

        {/* Share link after publish */}
        {test.isPublished && test.shareToken && (
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-2xl text-center">
            <p className="text-sm font-semibold text-green-800 mb-2">Test yayında!</p>
            <p className="text-xs text-green-600 break-all font-mono">
              {typeof window !== 'undefined' ? `${window.location.origin}/exam/${test.shareToken}` : `/exam/${test.shareToken}`}
            </p>
            <button
              onClick={handleCopyLink}
              className="mt-3 flex items-center gap-1.5 text-xs px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mx-auto"
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Kopyalandı!</> : <><Copy className="w-3.5 h-3.5" /> Linki Kopyala</>}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
