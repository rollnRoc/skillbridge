'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Search, Eye, Copy, BookOpen, Clock, BarChart3, X, ChevronLeft } from 'lucide-react';
import { fetchTemplates, previewTemplate, useTemplate, type Template, type Question } from '../../../lib/sessions.api';
import { useRouter } from 'next/navigation';
import { getUnifiedModalStyle } from '../../../components/ui/modal-layout';

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

export default function TestLibraryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<(Template & { questions: Question[] }) | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates().then(setTemplates).finally(() => setLoading(false));
  }, []);

  const filtered = templates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handlePreview = async (id: string) => {
    setPreviewError(null);
    setPreview(null);
    setPreviewingId(id);
    setPreviewLoading(true);
    try {
      const data = await previewTemplate(id);
      setPreview(data);
    } catch (err: unknown) {
      let message = 'Önizleme yüklenemedi.';
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { status?: number; data?: { message?: string } } }).response;
        if (res?.status === 401) message = 'Bu işlem için yetkiniz yok veya oturum geçersiz.';
        else if (res?.data?.message) message = res.data.message;
      } else if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
        const msg = (err as { message: string }).message;
        if (msg.includes('Network') || msg.includes('ECONNREFUSED')) {
          message = 'API sunucusuna ulaşılamadı. Lütfen API\'nin çalıştığından emin olun (npm run dev:api).';
        } else {
          message = msg;
        }
      }
      setPreviewError(message);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewError(null);
    setPreviewingId(null);
  };

  const handleUseTemplate = async (id: string) => {
    setCopying(id);
    try {
      await useTemplate(id);
      router.push('/tests');
    } finally {
      setCopying(null);
    }
  };

  const params = (t: Template) => t.parameters as Record<string, unknown>;
  const difficulty = (t: Template) => (params(t).difficulty as string) ?? 'intermediate';

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back + Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Geri
          </button>
          <h1 className="text-2xl font-bold text-[#1A2E5A]">Hazır Test Kütüphanesi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Önceden hazırlanmış şablonları incele ve kütüphanene ekle.
            <span className="ml-2 text-amber-600 font-medium">Her soru başına 1 kontör</span>
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Test ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>{search ? 'Arama sonucu bulunamadı.' : 'Henüz şablon yok.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="font-semibold text-gray-900 leading-snug">{t.title}</h3>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5" />
                    {t._count.questions} soru
                  </span>
                  {t.timeLimit && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t.timeLimit} dk
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      difficulty(t) === 'beginner'
                        ? 'bg-green-50 text-green-700'
                        : difficulty(t) === 'advanced'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {DIFFICULTY_LABEL[difficulty(t)] ?? 'Orta'}
                  </span>
                </div>

                <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1 w-fit">
                  {t._count.questions} kontör gerekli
                </div>

                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handlePreview(t.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Önizle
                  </button>
                  <button
                    onClick={() => handleUseTemplate(t.id)}
                    disabled={copying === t.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm bg-[#1A2E5A] text-white rounded-lg hover:bg-[#152448] disabled:opacity-50 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    {copying === t.id ? 'Kopyalanıyor...' : 'Bu Testi Kullan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {(preview || previewLoading || previewError) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={getUnifiedModalStyle()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-[#1A2E5A]">
                {preview ? preview.title : previewError ? 'Önizleme hatası' : 'Yükleniyor...'}
              </h3>
              <button
                onClick={closePreview}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {previewError && (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">{previewError}</p>
                  {previewingId && (
                    <button
                      onClick={() => handlePreview(previewingId)}
                      className="px-4 py-2 bg-[#1A2E5A] text-white text-sm font-medium rounded-lg hover:bg-[#152448]"
                    >
                      Tekrar dene
                    </button>
                  )}
                </div>
              )}
              {previewLoading && !previewError && (
                <div className="text-center py-8 text-gray-400">Sorular yükleniyor...</div>
              )}
              {preview?.questions?.map((q, i) => (
                <div key={q.id} className="mb-5 pb-5 border-b border-gray-100 last:border-0">
                  <p className="font-medium text-gray-900 mb-2">
                    {i + 1}. {q.content}
                  </p>
                  {q.options && (
                    <ul className="space-y-1">
                      {q.options.map((opt) => (
                        <li key={opt.id} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                            {opt.id.toUpperCase()}
                          </span>
                          {opt.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                      {q.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <p className="text-xs text-gray-500 mb-3">
                Sorular önizleme modunda gösteriliyor. Testi çözmek için "Bu Testi Kullan"a tıklayın.
              </p>
              {preview && (
                <button
                  onClick={() => { handleUseTemplate(preview.id); setPreview(null); }}
                  disabled={copying === preview.id}
                  className="w-full py-2.5 bg-[#1A2E5A] text-white text-sm font-medium rounded-xl hover:bg-[#152448] transition-colors disabled:opacity-50"
                >
                  Bu Testi Kullan — {preview.questions.length} kontör
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
