"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, BrainCircuit, FileUser, Sparkles, ChevronRight, Loader2, Coins, ClipboardList, FileText } from "lucide-react";
import { CenteredModal } from "../ui/CenteredModal";
import { useTaxonomy, TaxonomyBlock } from "../ui/taxonomy";
import { fetchDocuments, getDocument, downloadDocumentBlob, type Document, type DocumentDetail } from "../../lib/documents.api";
import {
  createTestDraft, generateQuestionsForTest,
  type Difficulty, type QuestionType,
} from "../../lib/tests.api";
import { getApiErrorMessage } from "../../lib/api-client";

// ─── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner",     label: "Başlangıç" },
  { value: "intermediate", label: "Orta"       },
  { value: "advanced",     label: "İleri"      },
];

const Q_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MULTIPLE_CHOICE",  label: "Çoktan Seçmeli" },
  { value: "MULTIPLE_CORRECT", label: "Çok Doğrulu"    },
  { value: "OPEN_ENDED",       label: "Açık Uçlu"      },
  { value: "YES_NO",           label: "Evet / Hayır"   },
];

// ─── Shared settings ───────────────────────────────────────────────────────────

function GenerateSettings({
  questionCount, setQuestionCount,
  difficulty, setDifficulty,
  questionTypes, setQuestionTypes,
  language, setLanguage,
  disabled, ring = "ring-blue-500",
}: {
  questionCount: number; setQuestionCount: (n: number) => void;
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  questionTypes: QuestionType[]; setQuestionTypes: (t: QuestionType[]) => void;
  language: "TR" | "EN"; setLanguage: (l: "TR" | "EN") => void;
  disabled: boolean; ring?: string;
}) {
  const toggle = (t: QuestionType) =>
    setQuestionTypes(questionTypes.includes(t) ? questionTypes.filter((x) => x !== t) : [...questionTypes, t]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Soru Sayısı</label>
          <select value={questionCount} onChange={(e) => setQuestionCount(+e.target.value)} disabled={disabled}
            className={`w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 ${ring}`}>
            {[5, 10, 15, 20, 25].map((n) => <option key={n} value={n}>{n} soru</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Zorluk</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} disabled={disabled}
            className={`w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 ${ring}`}>
            {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Soru Türleri</label>
        <div className="flex flex-wrap gap-1.5">
          {Q_TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => toggle(t.value)} disabled={disabled}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${questionTypes.includes(t.value) ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Dil</label>
        <div className="flex gap-1.5">
          {(["TR", "EN"] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLanguage(l)} disabled={disabled}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Context preview ───────────────────────────────────────────────────────────

function CtxPreview({ ctx, color = "blue" }: { ctx: string; color?: string }) {
  if (!ctx) return null;
  return (
    <div className={`mt-4 text-left bg-${color}-50 border border-${color}-100 rounded-xl p-3`}>
      {ctx.split("\n").map((l, i) => <p key={i} className={`text-xs text-${color}-700`}>{l}</p>)}
    </div>
  );
}

// ─── Panel 1: Belgeden Test ────────────────────────────────────────────────────

export function FromDocPanel({ onClose, initialDocId }: { onClose: () => void; initialDocId?: string }) {
  const router = useRouter();
  const [docs,          setDocs]          = useState<Document[]>([]);
  const [docId,         setDocId]         = useState(initialDocId ?? "");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty,    setDifficulty]    = useState<Difficulty>("intermediate");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["MULTIPLE_CHOICE"]);
  const [language,      setLanguage]      = useState<"TR" | "EN">("TR");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [docDetail,     setDocDetail]     = useState<DocumentDetail | null>(null);
  const [docLoading,    setDocLoading]    = useState(false);
  const [pdfUrl,        setPdfUrl]        = useState<string | null>(null);
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const pdfUrlRef = React.useRef<string | null>(null);
  const tax = useTaxonomy();

  useEffect(() => { fetchDocuments().then(setDocs); }, []);

  // Doküman seçilince içeriği yükle
  useEffect(() => {
    if (pdfUrlRef.current) { URL.revokeObjectURL(pdfUrlRef.current); pdfUrlRef.current = null; }
    setPdfUrl(null);
    setDocDetail(null);
    setPreviewOpen(false);
    if (!docId) return;
    setDocLoading(true);
    setPreviewOpen(true);
    getDocument(docId).then(async (detail) => {
      setDocDetail(detail);
      if (!detail.content && detail.fileUrl) {
        if (detail.mimeType === "application/pdf") {
          try {
            const blob = await downloadDocumentBlob(docId);
            const u = URL.createObjectURL(blob);
            pdfUrlRef.current = u;
            setPdfUrl(u);
          } catch { /* PDF önizleme yüklenemedi */ }
        }
      }
    }).catch(() => setDocDetail(null)).finally(() => setDocLoading(false));

    return () => {
      if (pdfUrlRef.current) { URL.revokeObjectURL(pdfUrlRef.current); pdfUrlRef.current = null; }
    };
  }, [docId]);

  const handleGenerate = async () => {
    if (!docId) { setError("Önce kütüphaneden bir doküman seçmelisiniz; doküman olmadan test üretilemez."); return; }
    setError(""); setLoading(true);
    try {
      const doc   = docs.find((d) => d.id === docId);
      const draft = await createTestDraft({
        title: `${doc?.title ?? "Belge"} — Test`,
        documentId: docId,
        parameters: { sectorId: tax.sectorId, sectorName: tax.sectorName, occupationId: tax.occupationId, occupationName: tax.occupationName },
      });
      const taxCtx = tax.buildContext();
      await generateQuestionsForTest(draft.id, {
        questionCount, difficulty, questionTypes, language,
        additionalInstructions: taxCtx ? `Taxonomy bağlamı:\n${taxCtx}` : undefined,
      });
      router.push(`/tests/${draft.id}`);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Test oluşturulurken hata oluştu."));
    } finally { setLoading(false); }
  };

  const ctx = tax.buildContext();

  return (
    <>
      <CenteredModal title="Belgeden Test Oluştur" icon={FileSearch} iconColor="text-blue-600"
        badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />50 kontör</span>}
        onClose={onClose} width={960}>
        <div className="flex flex-1 overflow-hidden">

          {/* Left: form */}
          <div className="w-72 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50 p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kütüphaneden doküman seç <span className="text-red-500">*</span></label>
              <select value={docId} onChange={(e) => setDocId(e.target.value)} disabled={loading}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Kütüphaneden doküman seçin —</option>
                {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mt-1.5 leading-snug">
                Soru üretimi için önce metin/AI içeriği olan bir doküman seçin. Doküman seçince içerik ayrı bir pencerede açılır.
              </p>
            </div>
            <GenerateSettings questionCount={questionCount} setQuestionCount={setQuestionCount}
              difficulty={difficulty} setDifficulty={setDifficulty}
              questionTypes={questionTypes} setQuestionTypes={setQuestionTypes}
              language={language} setLanguage={setLanguage} disabled={loading || !docId} ring="ring-blue-500" />
            <TaxonomyBlock tax={tax} disabled={loading || !docId}
              accentClass="focus:ring-blue-500 bg-blue-600 border-blue-600" />
            {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
            <button type="button" onClick={handleGenerate} disabled={loading || !docId}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Test Oluştur<ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>

          {/* Right: info panel */}
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-gray-300">
            <FileSearch className="w-14 h-14 mb-3" />
            {!docId ? (
              <>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  Kütüphaneden doküman seçtikten sonra taxonomy ile sektör/meslek/yetkinlik bağlamı ekleyebilirsiniz; AI soruları doküman metnine dayandırır.
                </p>
                <CtxPreview ctx={ctx} color="blue" />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                  Seçtiğiniz belgenin içeriği soru üretimi için ayrı bir pencerede açılır. Gerekirse aşağıdaki butonla tekrar açabilirsiniz.
                </p>
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left max-w-md w-full">
                  <div className="flex items-center gap-2 text-sm text-blue-800 font-medium">
                    <FileText className="w-4 h-4" />
                    <span>{docDetail?.title ?? docs.find((d) => d.id === docId)?.title ?? "Seçilen Belge"}</span>
                  </div>
                  <p className="mt-2 text-xs text-blue-700 leading-relaxed">
                    {docLoading
                      ? "Belge içeriği yükleniyor..."
                      : docDetail?.content || pdfUrl
                        ? "Belge içeriği hazır. İncelemek için pencereyi açabilirsiniz."
                        : "Bu belge tarayıcıda sınırlı önizleniyor olabilir; yine de soru üretiminde kullanılabilir."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    disabled={docLoading}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {docLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    Belge İçeriğini Aç
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CenteredModal>

      {previewOpen && docId ? (
        <CenteredModal
          title={docDetail?.title ?? "Belge İçeriği"}
          icon={FileText}
          iconColor="text-blue-600"
          onClose={() => setPreviewOpen(false)}
          width={1100}
        >
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            {docLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-7 h-7 animate-spin" />
                <span className="text-sm">Doküman içeriği yükleniyor…</span>
              </div>
            ) : pdfUrl ? (
              <div className="flex flex-1 flex-col overflow-hidden p-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-medium text-gray-700">PDF Önizleme</span>
                </div>
                <iframe src={pdfUrl} className="flex-1 w-full rounded-xl border border-gray-200 bg-white" title="PDF önizleme" style={{ minHeight: 0 }} />
              </div>
            ) : docDetail?.content ? (
              <div className="flex flex-1 flex-col overflow-hidden p-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-medium text-gray-700">Soru oluşturmak için belge içeriği</span>
                </div>
                <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs text-gray-800" style={{ minHeight: 0 }}>
                  {docDetail.content}
                </pre>
              </div>
            ) : docDetail ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-gray-400">
                <FileSearch className="mb-1 h-12 w-12 text-gray-300" />
                <p className="text-sm max-w-md leading-relaxed">Bu doküman türü tarayıcıda doğrudan önizlenemiyor. AI yine de doküman içeriğini kullanarak test oluşturabilir.</p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-gray-400">
                <FileSearch className="mb-1 h-12 w-12 text-gray-300" />
                <p className="text-sm max-w-md leading-relaxed">Doküman içeriği yüklenemedi.</p>
              </div>
            )}
          </div>
        </CenteredModal>
      ) : null}
    </>
  );
}

// ─── Panel 2: Konulardan Test ──────────────────────────────────────────────────

export function FromTopicsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [topics,        setTopics]        = useState("");
  const [prompt,        setPrompt]        = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty,    setDifficulty]    = useState<Difficulty>("intermediate");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["MULTIPLE_CHOICE"]);
  const [language,      setLanguage]      = useState<"TR" | "EN">("TR");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const tax = useTaxonomy();

  useEffect(() => {
    if (tax.occupationName && !topics) setTopics(tax.occupationName);
  }, [tax.occupationName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!topics.trim()) { setError("En az bir konu girin."); return; }
    setError(""); setLoading(true);
    try {
      const draft = await createTestDraft({
        title: topics.slice(0, 60) + " — Test",
        parameters: { sectorId: tax.sectorId, sectorName: tax.sectorName, occupationId: tax.occupationId, occupationName: tax.occupationName },
      });
      const taxCtx = tax.buildContext();
      const instructions = [
        `Konular: ${topics}`,
        taxCtx ? `Taxonomy:\n${taxCtx}` : null,
        prompt ? `Ek talimatlar: ${prompt}` : null,
      ].filter(Boolean).join("\n\n");
      await generateQuestionsForTest(draft.id, { questionCount, difficulty, questionTypes, language, additionalInstructions: instructions });
      router.push(`/tests/${draft.id}`);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Test oluşturulurken hata oluştu."));
    } finally { setLoading(false); }
  };

  const ctx = tax.buildContext();

  return (
    <CenteredModal title="Konulardan Test Yarat" icon={BrainCircuit} iconColor="text-emerald-600"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />50 kontör</span>}
      onClose={onClose} width={1000}>
      <div className="flex flex-1 overflow-hidden">

        {/* Left: form */}
        <div className="w-80 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Konular <span className="text-red-500">*</span></label>
            <textarea rows={3} value={topics} onChange={(e) => setTopics(e.target.value)} disabled={loading}
              placeholder="Ör: İş hukuku, 4857 sayılı Kanun, fazla mesai hakları"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ek Talimat / Prompt</label>
            <textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={loading}
              placeholder="Ör: Vaka bazlı sorular ekle"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <GenerateSettings questionCount={questionCount} setQuestionCount={setQuestionCount}
            difficulty={difficulty} setDifficulty={setDifficulty}
            questionTypes={questionTypes} setQuestionTypes={setQuestionTypes}
            language={language} setLanguage={setLanguage} disabled={loading} ring="ring-emerald-500" />
          <TaxonomyBlock tax={tax} disabled={loading}
            accentClass="focus:ring-emerald-500 bg-emerald-600 border-emerald-600" />
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <button type="button" onClick={handleGenerate} disabled={loading || !topics.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Test Yarat<ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>

        {/* Right: info */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-gray-300">
          <BrainCircuit className="w-14 h-14 mb-3" />
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            Konuları yazın, taxonomy ile sektör/meslek/yetkinlik bağlamı ekleyin; AI özel sorular üretsin.
          </p>
          <CtxPreview ctx={ctx} color="emerald" />
        </div>
      </div>
    </CenteredModal>
  );
}

// ─── Panel 3: CV'ye Göre ──────────────────────────────────────────────────────

export function FromCvPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [cvText,        setCvText]        = useState("");
  const [position,      setPosition]      = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty,    setDifficulty]    = useState<Difficulty>("intermediate");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["MULTIPLE_CHOICE"]);
  const [language,      setLanguage]      = useState<"TR" | "EN">("TR");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const tax = useTaxonomy();

  useEffect(() => {
    if (tax.occupationName && !position) setPosition(tax.occupationName);
  }, [tax.occupationName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!cvText.trim()) { setError("CV içeriği boş olamaz."); return; }
    setError(""); setLoading(true);
    try {
      const titleStr = position ? `${position} — CV Bazlı Test` : "CV Bazlı Yeterlilik Testi";
      const draft    = await createTestDraft({
        title: titleStr,
        parameters: { sectorId: tax.sectorId, sectorName: tax.sectorName, occupationId: tax.occupationId, occupationName: tax.occupationName },
      });
      const taxCtx   = tax.buildContext();
      const instructions = [
        `Aşağıdaki CV'deki eğitim geçmişi, beceriler ve deneyimler göz önünde bulundurularak${position ? ` "${position}" pozisyonuna uygunluğunu` : ""} ölçen sorular oluştur.`,
        taxCtx ? `Taxonomy bağlamı:\n${taxCtx}` : null,
        `CV:\n${cvText}`,
      ].filter(Boolean).join("\n\n");
      await generateQuestionsForTest(draft.id, { questionCount, difficulty, questionTypes, language, additionalInstructions: instructions });
      router.push(`/tests/${draft.id}`);
    } catch (e: any) {
      setError(getApiErrorMessage(e, "Test oluşturulurken hata oluştu."));
    } finally { setLoading(false); }
  };

  const ctx = tax.buildContext();

  return (
    <CenteredModal title="CV'ye Göre Test Hazırla" icon={FileUser} iconColor="text-orange-500"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />50 kontör</span>}
      onClose={onClose} width={1100}>
      <div className="flex flex-1 overflow-hidden">

        {/* Col 1: CV */}
        <div className="w-72 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CV İçeriği <span className="text-red-500">*</span></label>
            <textarea rows={14} value={cvText} onChange={(e) => setCvText(e.target.value)} disabled={loading}
              placeholder="CV metnini buraya yapıştırın (eğitim, beceriler, deneyim…)"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hedef Pozisyon</label>
            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} disabled={loading}
              placeholder="Ör: Satış Müdürü"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        {/* Col 2: settings + taxonomy */}
        <div className="w-72 flex-shrink-0 border-r border-gray-100 overflow-y-auto p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Test Ayarları</p>
          <GenerateSettings questionCount={questionCount} setQuestionCount={setQuestionCount}
            difficulty={difficulty} setDifficulty={setDifficulty}
            questionTypes={questionTypes} setQuestionTypes={setQuestionTypes}
            language={language} setLanguage={setLanguage} disabled={loading} ring="ring-orange-500" />
          <TaxonomyBlock tax={tax} disabled={loading}
            accentClass="focus:ring-orange-500 bg-orange-500 border-orange-500" />
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <button type="button" onClick={handleGenerate} disabled={loading || !cvText.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Test Hazırla<ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>

        {/* Col 3: info */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-gray-300">
          <FileUser className="w-14 h-14 mb-3" />
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            CV'yi yapıştırın, taxonomy ile sektör/meslek/yetkinlik bağlamı ekleyin; AI adaya özel sorular üretsin.
          </p>
          <CtxPreview ctx={ctx} color="orange" />
        </div>

      </div>
    </CenteredModal>
  );
}

// ─── Panel 4: Vaka Analizi ────────────────────────────────────────────────────

const CASE_Q_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MULTIPLE_CHOICE",  label: "Çoktan Seçmeli" },
  { value: "MULTIPLE_CORRECT", label: "Çok Doğrulu"    },
  { value: "YES_NO",           label: "Evet / Hayır"   },
];

export function CaseAnalysisPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [caseText,      setCaseText]      = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty,    setDifficulty]    = useState<Difficulty>("intermediate");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["MULTIPLE_CHOICE"]);
  const [language,      setLanguage]      = useState<"TR" | "EN">("TR");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const tax = useTaxonomy();

  const toggleType = (t: QuestionType) =>
    setQuestionTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleGenerate = async () => {
    if (!caseText.trim()) { setError("Vaka metnini girin."); return; }
    setError(""); setLoading(true);
    try {
      const taxCtx = tax.buildContext();
      const title = `${caseText.slice(0, 50).trim()}… — Vaka Analizi`;

      const draft = await createTestDraft({
        title,
        parameters: {
          sectorId: tax.sectorId, sectorName: tax.sectorName,
          occupationId: tax.occupationId, occupationName: tax.occupationName,
          type: "CASE_ANALYSIS",
        },
      });

      const instructions = [
        "Bu bir vaka analizi testidir. Aşağıdaki vakayı dikkate alarak, vakada anlatılan olay/durum üzerinden sorular üret.",
        "Sorular; vakadaki bilgileri, sebep-sonuç ilişkilerini, doğru karar alma süreçlerini ve tutarlılık analizi yeteneklerini ölçmeli.",
        taxCtx ? `Taxonomy bağlamı:\n${taxCtx}` : null,
        `VAKA:\n${caseText}`,
      ].filter(Boolean).join("\n\n");

      await generateQuestionsForTest(draft.id, {
        questionCount, difficulty, questionTypes, language,
        additionalInstructions: instructions,
      });
      router.push(`/tests/${draft.id}`);
    } catch (e: any) {
      setError(getApiErrorMessage(e, "Test oluşturulurken hata oluştu."));
    } finally { setLoading(false); }
  };

  const ctx = tax.buildContext();
  const canGenerate = caseText.trim().length > 0;

  return (
    <CenteredModal title="Vaka Analizi Testi" icon={ClipboardList} iconColor="text-rose-600"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />50 kontör</span>}
      onClose={onClose} width={1100}>
      <div className="flex flex-1 overflow-hidden">

        {/* Col 1: Vaka Girişi */}
        <div className="w-80 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Vaka Girişi</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vaka Metni <span className="text-red-500">*</span></label>
            <textarea rows={12} value={caseText} onChange={(e) => setCaseText(e.target.value)} disabled={loading}
              placeholder="Vakayı buraya yazın veya yapıştırın. Ör: Bir şirkette yaşanan iş kazası, bir yönetim kararı, bir müşteri şikayeti, bir hukuki durum…"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-500" />
            <p className="text-[10px] text-gray-400 mt-1">{caseText.length} karakter</p>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

          <button type="button" onClick={handleGenerate} disabled={loading || !canGenerate}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Test Oluştur<ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>

        {/* Col 2: Ayarlar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-100 overflow-y-auto p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Test Ayarları</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Soru Sayısı</label>
            <select value={questionCount} onChange={(e) => setQuestionCount(+e.target.value)} disabled={loading}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500">
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} soru</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Zorluk</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} disabled={loading}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500">
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Soru Türleri</label>
            <div className="flex flex-col gap-1.5">
              {CASE_Q_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => toggleType(t.value)} disabled={loading}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border text-left transition-colors ${questionTypes.includes(t.value) ? "bg-rose-600 text-white border-rose-600" : "bg-white text-gray-600 border-gray-200 hover:border-rose-400"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dil</label>
            <div className="flex gap-1.5">
              {(["TR", "EN"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLanguage(l)} disabled={loading}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l ? "bg-rose-600 text-white border-rose-600" : "bg-white text-gray-600 border-gray-200 hover:border-rose-400"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <TaxonomyBlock tax={tax} disabled={loading}
            accentClass="focus:ring-rose-500 bg-rose-600 border-rose-600" />
        </div>

        {/* Col 3: Bilgi */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-gray-300">
          <ClipboardList className="w-14 h-14 mb-3" />
          <p className="text-sm font-semibold text-gray-400 mb-2">Vaka Analizi</p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            Gerçek ya da hayali bir olay/durum senaryosu girin. AI, vakayı analiz ederek çoktan seçmeli, çok doğrulu ve evet/hayır sorularıyla bir test oluşturur.
          </p>
          <div className="mt-6 text-left bg-rose-50 border border-rose-100 rounded-xl p-4 w-full max-w-xs">
            <p className="text-xs font-semibold text-rose-700 mb-2">Uygun Vaka Türleri</p>
            <ul className="space-y-1.5 text-xs text-rose-600">
              <li>• İş hukuku / disiplin olayları</li>
              <li>• Yönetim kararı senaryoları</li>
              <li>• Müşteri şikayet / kriz durumları</li>
              <li>• İş güvenliği olayları</li>
              <li>• Etik ikilem senaryoları</li>
            </ul>
          </div>
          {ctx && <CtxPreview ctx={ctx} color="rose" />}
        </div>
      </div>
    </CenteredModal>
  );
}
