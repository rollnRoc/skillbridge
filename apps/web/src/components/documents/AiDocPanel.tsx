"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, FileText, ChevronRight, RefreshCw, Save, Coins } from "lucide-react";
import { CenteredModal } from "../ui/CenteredModal";
import { useTaxonomy, TaxonomyBlock } from "../ui/taxonomy";
import {
  generateDocument,
  saveGeneratedDocument,
} from "../../lib/ai-document.api";

const ACCENT    = "focus:ring-purple-500";
const ACCENT_CB = "bg-purple-600 border-purple-600";

export function AiDocPanel({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  type Step = "form" | "generating" | "preview";
  const [step,         setStep]         = useState<Step>("form");
  const [topic,        setTopic]        = useState("");
  const [detailNotes,  setDetailNotes]  = useState("");
  const [language,     setLanguage]     = useState<"TR" | "EN">("TR");
  const [content,      setContent]      = useState("");
  const [title,        setTitle]        = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  const tax = useTaxonomy();

  // Meslek seçilince konu boşsa öneri olarak doldur (isteğe bağlı)
  useEffect(() => {
    if (tax.occupationName && !topic) setTopic(tax.occupationName);
  }, [tax.occupationName]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildAdditionalContext = () => {
    const parts: string[] = [];
    if (detailNotes.trim()) parts.push(`Kullanıcının detaylı açıklaması:\n${detailNotes.trim()}`);
    const tx = tax.buildContext();
    if (tx) parts.push(`Taksonomi seçimi:\n${tx}`);
    return parts.join("\n\n") || undefined;
  };

  const doGenerate = async () => {
    if (!topic.trim()) { setError("Konu zorunludur."); return; }
    setError(""); setStep("generating");
    try {
      const r = await generateDocument({
        topic: topic.trim(),
        language,
        sector:            tax.sectorName     || undefined,
        occupation:        tax.occupationName || undefined,
        additionalContext: buildAdditionalContext(),
      });
      setContent(r.content);
      setTitle(topic.slice(0, 80));
      setStep("preview");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Hata oluştu.");
      setStep("form");
    }
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await saveGeneratedDocument({
        title, content, language,
        category: "AI Doküman",
        description: detailNotes.trim().slice(0, 2000) || undefined,
      });
      onSaved(); onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Kaydetme hatası.");
    } finally { setSaving(false); }
  };

  const isGenerating = step === "generating";
  const ctx          = buildAdditionalContext();

  return (
    <CenteredModal
      title="AI ile Doküman Oluştur"
      icon={Sparkles}
      iconColor="text-purple-600"
      badge={
        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          <Coins className="w-3 h-3" /> 50 kontör
        </span>
      }
      onClose={onClose}
      width={1100}
    >
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left ── */}
        <div className="w-80 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50 p-4 space-y-3">

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Konu <span className="text-red-500">*</span>
            </label>
            <textarea rows={2} value={topic} onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating} placeholder="Örn: Tedarik zinciri risk yönetimi ve SLA süreçleri"
              className={`w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 ${ACCENT}`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dokümanla ilgili detaylı bilgi</label>
            <textarea rows={4} value={detailNotes} onChange={(e) => setDetailNotes(e.target.value)}
              disabled={isGenerating}
              placeholder="Kapsam, hedef rol, özel başlıklar, bağlam… (isteğe bağlı)"
              className={`w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 ${ACCENT}`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dil</label>
            <div className="flex gap-2">
              {(["TR", "EN"] as const).map((l) => (
                <button key={l} type="button" disabled={isGenerating} onClick={() => setLanguage(l)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-purple-400"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <TaxonomyBlock tax={tax} disabled={isGenerating}
            accentClass={`${ACCENT} ${ACCENT_CB}`} />
          <p className="text-[10px] text-gray-400 leading-snug">
            Aşağıdan sektör, meslek ve yetkinlikleri seçerek üretim prompt&apos;una bağlam ekleyin; konu ile birlikte kütüphaneye uygun belge üretilir.
          </p>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

          {step === "form" ? (
            <button type="button" onClick={doGenerate} disabled={!topic.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Üret <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button type="button" onClick={doGenerate} disabled={isGenerating}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              Yeniden Üret
            </button>
          )}
        </div>

        {/* ── Right: preview ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {step === "form" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-gray-300">
              <FileText className="w-14 h-14 mb-3" />
              <p className="text-sm text-gray-400 mb-3">
                Parametreleri doldurun ve <strong className="text-purple-500">Üret</strong>'e tıklayın.
              </p>
              {ctx && (
                <div className="text-left bg-purple-50 border border-purple-100 rounded-xl p-3 max-w-sm">
                  {ctx.split("\n").map((line, i) => (
                    <p key={i} className="text-xs text-purple-700">{line}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          {step === "generating" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <Sparkles className="w-12 h-12 text-purple-500 animate-pulse" />
              <p className="mt-3 text-sm font-medium text-gray-700">Claude üretiyor…</p>
              <p className="text-xs text-gray-400 mt-1">Taxonomy verileri işleniyor</p>
            </div>
          )}
          {step === "preview" && (
            <>
              <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm font-semibold text-gray-900 border-0 border-b border-transparent focus:border-purple-500 focus:outline-none pb-1"
                  placeholder="Başlık…" />
              </div>
              <div className="flex-1 overflow-y-auto">
                <textarea value={content} onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full p-4 text-xs text-gray-700 font-mono resize-none focus:outline-none leading-relaxed"
                  spellCheck={false} />
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <p className="text-xs text-gray-400">Düzenleyebilirsiniz.</p>
                <button type="button" onClick={doSave} disabled={saving || !title.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}
