'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  TestTube,
  Download,
  Eye,
  Filter,
  Sparkles,
  ChevronLeft,
  Loader2,
  X,
} from 'lucide-react';
import { AiDocumentModal } from '../../components/documents/AiDocumentModal';
import { FromDocPanel } from '../../components/tests/TestPanels';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  getDocument,
  downloadDocumentBlob,
  type Document,
  type DocumentDetail,
} from '../../lib/documents.api';

import { useEffect } from 'react';
import { getUnifiedModalStyle } from '../../components/ui/modal-layout';

const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
};

function formatBytes(bytes: number | null) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<'ALL' | 'TR' | 'EN'>('ALL');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [fromDocPanelId, setFromDocPanelId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewDetail, setPreviewDetail] = useState<DocumentDetail | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewBlobRef = useRef<string | null>(null);

  const closePreview = () => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
    setPreviewOpen(false);
    setPreviewDoc(null);
    setPreviewDetail(null);
    setPreviewBlobUrl(null);
    setPreviewText(null);
    setPreviewError('');
    setPreviewLoading(false);
  };

  const handlePreview = async (doc: Document) => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
    setPreviewDoc(doc);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewDetail(null);
    setPreviewText(null);
    setPreviewBlobUrl(null);
    try {
      const detail = await getDocument(doc.id);
      setPreviewDetail(detail);
      if (detail.content && !detail.fileUrl) {
        setPreviewText(detail.content);
        return;
      }
      const blob = await downloadDocumentBlob(doc.id);
      const mime = detail.mimeType || blob.type || '';
      if (mime === 'application/pdf' || blob.type === 'application/pdf') {
        const u = URL.createObjectURL(blob);
        previewBlobRef.current = u;
        setPreviewBlobUrl(u);
      } else if (mime === 'text/plain' || blob.type === 'text/plain') {
        setPreviewText(await blob.text());
      } else {
        setPreviewText(null);
        setPreviewBlobUrl(null);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setPreviewError(msg || 'Önizleme yüklenemedi.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    setRowBusyId(doc.id);
    try {
      const blob = await downloadDocumentBlob(doc.id);
      const ext =
        doc.mimeType == null
          ? '.txt'
          : doc.mimeType === 'application/pdf'
          ? '.pdf'
          : doc.mimeType?.includes('wordprocessingml')
            ? '.docx'
            : doc.mimeType?.includes('presentationml')
              ? '.pptx'
              : doc.mimeType === 'text/plain'
                ? '.txt'
                : '';
      const name = `${doc.title.replace(/[<>:"/\\|?*]/g, '_')}${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('İndirme başarısız.');
    } finally {
      setRowBusyId(null);
    }
  };

  const handleCreateTest = (doc: Document) => {
    setFromDocPanelId(doc.id);
  };

  const load = useCallback(async () => {
    try {
      const data = await fetchDocuments();
      setDocuments(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^.]+$/, ''));

    // Simüle progress (gerçek upload progress için axios onUploadProgress kullanılacak)
    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 90));
    }, 200);

    try {
      await uploadDocument(formData);
      setUploadProgress(100);
      await load();
    } finally {
      clearInterval(interval);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" silinsin mi?`)) return;
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const filtered = documents.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchLang = langFilter === 'ALL' || d.language === langFilter;
    return matchSearch && matchLang;
  });

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1A2E5A]">Doküman Kütüphanesi</h1>
              <p className="text-gray-500 text-sm mt-1">
                Test oluşturmak için belgelerinizi yükleyin veya AI ile oluşturun.
              </p>
            </div>
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              AI ile Doküman Oluştur
            </button>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors cursor-pointer ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-blue-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.pptx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700">
            Dosyayı buraya sürükleyin veya{' '}
            <span className="text-blue-600 underline">seçin</span>
          </p>
          <p className="text-sm text-gray-400 mt-1">PDF, DOCX, TXT, PPTX · Maks 20 MB</p>

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Yükleniyor... {uploadProgress}%</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Doküman ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1">
            <Filter className="w-4 h-4 text-gray-400 ml-2" />
            {(['ALL', 'TR', 'EN'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLangFilter(lang)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  langFilter === lang
                    ? 'bg-[#1A2E5A] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {lang === 'ALL' ? 'Tümü' : lang}
              </button>
            ))}
          </div>
        </div>

        {/* Document List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {search ? 'Arama sonucu bulunamadı.' : 'Henüz doküman yüklenmedi.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-10">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Doküman</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Konu / Tür</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Format</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Dil</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Boyut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kontör</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, idx) => (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(doc.createdAt), 'd MMM yyyy', { locale: tr })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{doc.title}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {doc.category ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                        {doc.mimeType ? MIME_LABELS[doc.mimeType] ?? '?' : 'AI'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{doc.language}</td>
                    <td className="px-4 py-3 text-gray-600">{formatBytes(doc.sizeBytes)}</td>
                    <td className="px-4 py-3">
                      {doc.mimeType == null ? (
                        <span className="flex items-center gap-1 text-amber-600 text-xs">
                          <span className="font-semibold">50</span> kontör
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Ücretsiz</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Önizle"
                          disabled={rowBusyId === doc.id}
                          onClick={() => handlePreview(doc)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-40"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Test Oluştur"
                          disabled={rowBusyId === doc.id}
                          onClick={() => handleCreateTest(doc)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-40"
                        >
                          {rowBusyId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <TestTube className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="İndir"
                          disabled={rowBusyId === doc.id}
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Sil"
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/45 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
            style={getUnifiedModalStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-semibold text-[#1A2E5A] text-sm truncate pr-2">
                Önizleme — {previewDoc?.title}
              </h2>
              <button
                type="button"
                onClick={closePreview}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex-shrink-0"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 min-h-[220px] bg-gray-50/50">
              {previewLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm">Yükleniyor…</span>
                </div>
              )}
              {!previewLoading && previewError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{previewError}</p>
              )}
              {!previewLoading && !previewError && previewText != null && (
                <pre className="text-xs whitespace-pre-wrap font-mono text-gray-800 max-h-[70vh] overflow-auto bg-white border border-gray-100 rounded-xl p-4">
                  {previewText}
                </pre>
              )}
              {!previewLoading && !previewError && previewBlobUrl && (
                <iframe
                  src={previewBlobUrl}
                  className="w-full rounded-xl border border-gray-200 bg-white"
                  style={{ minHeight: '65vh' }}
                  title="PDF önizleme"
                />
              )}
              {!previewLoading &&
                !previewError &&
                previewText == null &&
                !previewBlobUrl &&
                previewDetail && (
                  <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-4">
                    <p>
                      Bu dosya türü (Word / PowerPoint vb.) tarayıcıda doğrudan önizlenemez. Dosyayı bilgisayarınıza indirip
                      açabilirsiniz.
                    </p>
                    <button
                      type="button"
                      onClick={() => previewDoc && handleDownload(previewDoc)}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#1A2E5A] text-white text-sm font-medium rounded-lg hover:bg-[#152448]"
                    >
                      <Download className="w-4 h-4" />
                      İndir
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {showAiModal && (
        <AiDocumentModal
          onClose={() => setShowAiModal(false)}
          onSaved={() => { load(); setShowAiModal(false); }}
        />
      )}

      {fromDocPanelId && (
        <FromDocPanel
          initialDocId={fromDocPanelId}
          onClose={() => setFromDocPanelId(null)}
        />
      )}
    </div>
  );
}
