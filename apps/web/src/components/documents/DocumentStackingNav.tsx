"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, Upload, Sparkles, ChevronRight, RefreshCw, Save, Coins } from "lucide-react";
import { AbovePanel } from "../ui/AbovePanel";
import { UploadPanel } from "./UploadPanel";
import { useTaxonomy, TaxonomyBlock } from "../ui/taxonomy";
import {
  generateDocument,
  saveGeneratedDocument,
} from "../../lib/ai-document.api";

const CARD_W = 400;
const COLLAPSED_OFFSET = 340; // px each card peeks 60px

const ACCENT = "focus:ring-purple-500";
const ACCENT_CB = "bg-purple-600 border-purple-600";

// ─── AI Document Panel ────────────────────────────────────────────────────────

function AiDocPanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  type Step = "form" | "generating" | "preview";
  const [step, setStep] = useState<Step>("form");
  const [topic, setTopic] = useState("");
  const [detailNotes, setDetailNotes] = useState("");
  const [language, setLanguage] = useState<"TR" | "EN">("TR");
  const tax = useTaxonomy();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        sector: tax.sectorName || undefined,
        occupation: tax.occupationName || undefined,
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
        title,
        content,
        language,
        category: "AI Doküman",
        description: detailNotes.trim().slice(0, 2000) || undefined,
      });
      onSaved(); onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Kaydetme hatası.");
    } finally { setSaving(false); }
  };

  return (
    <AbovePanel
      title="AI ile Doküman Oluştur"
      icon={Sparkles}
      iconColor="text-purple-600"
      badge={
        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          <Coins className="w-3 h-3" /> 50 kontör
        </span>
      }
      onClose={onClose}
      width={860}
    >
      <div className="flex" style={{ minHeight: 420 }}>
        {/* Left form */}
        <div className="w-72 flex-shrink-0 border-r border-gray-100 p-4 bg-gray-50 overflow-y-auto">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Konu <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={step === "generating"}
                placeholder='Örn: Satış ekibi için iletişim ve müzakere becerileri'
                className={`w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 ${ACCENT}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dokümanla ilgili detaylı bilgi</label>
              <textarea
                rows={4}
                value={detailNotes}
                onChange={(e) => setDetailNotes(e.target.value)}
                disabled={step === "generating"}
                placeholder="Kapsam, hedef kitle, özel istekler, bağlam… (isteğe bağlı)"
                className={`w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 ${ACCENT}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dil</label>
              <div className="flex gap-2">
                {(["TR", "EN"] as const).map((l) => (
                  <button key={l} disabled={step === "generating"}
                    onClick={() => setLanguage(l)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-purple-400"}`}
                  >{l}</button>
                ))}
              </div>
            </div>
            <TaxonomyBlock tax={tax} disabled={step === "generating"} accentClass={`${ACCENT} ${ACCENT_CB}`} />
            {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
            {step === "form" ? (
              <button
                onClick={doGenerate}
                disabled={!topic.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Üret <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button onClick={doGenerate} disabled={step === "generating"}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${step === "generating" ? "animate-spin" : ""}`} />
                Yeniden Üret
              </button>
            )}
          </div>
        </div>

        {/* Right preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {step === "form" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-300">
              <FileText className="w-12 h-12 mb-3" />
              <p className="text-sm text-gray-400">Parametreleri doldurun ve Üret'e tıklayın.</p>
            </div>
          )}
          {step === "generating" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <Sparkles className="w-10 h-10 text-purple-500 animate-pulse" />
              <p className="mt-3 text-sm font-medium text-gray-700">Claude üretiyor…</p>
              <p className="text-xs text-gray-400 mt-1">10–20 saniye sürebilir</p>
            </div>
          )}
          {step === "preview" && (
            <>
              <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm font-semibold text-gray-900 border-0 border-b border-transparent focus:border-purple-500 focus:outline-none pb-1"
                  placeholder="Başlık…"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                <textarea
                  value={content} onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full p-4 text-xs text-gray-700 font-mono resize-none focus:outline-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">Düzenleyebilirsiniz. Kaydedince kütüphaneye eklenir.</p>
                <button
                  onClick={doSave}
                  disabled={saving || !title.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AbovePanel>
  );
}

// ─── Single stacking card ─────────────────────────────────────────────────────

function StackCard({
  label,
  description,
  icon: Icon,
  gradient,
  index,
  expanded,
  onClick,
  href,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  index: number;
  expanded: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <div
      className={`bg-gradient-to-br ${gradient} text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg select-none cursor-pointer transition-shadow hover:shadow-xl`}
      style={{ width: CARD_W, height: 140 }}
    >
      <Icon className="w-6 h-6 opacity-90" />
      <div>
        <p className="font-semibold text-sm leading-tight">{label}</p>
        <p className="text-xs text-white/60 mt-0.5">{description}</p>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ x: -COLLAPSED_OFFSET * index }}
      animate={{ x: expanded ? 0 : -COLLAPSED_OFFSET * index }}
      transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.04 * index }}
      style={{ zIndex: 100 - index }}
    >
      {href ? (
        <Link href={href}>{inner}</Link>
      ) : (
        <div onClick={onClick}>{inner}</div>
      )}
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

type ActivePanel = "upload" | "ai" | null;

export function DocumentStackingNav({ onDocumentChange }: { onDocumentChange?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<ActivePanel>(null);

  const open = (p: ActivePanel) => { setActive(p); setExpanded(true); };
  const close = () => setActive(null);

  const cards = [
    { label: "Dokümanlar", description: "Kütüphaneyi görüntüle", icon: FileText, gradient: "from-[#1A2E5A] to-blue-600", href: "/documents" },
    { label: "Doküman Yükle", description: "Belge yükle", icon: Upload, gradient: "from-indigo-500 to-indigo-700", onClick: () => open("upload") },
    { label: "Doküman Yarat", description: "AI ile oluştur", icon: Sparkles, gradient: "from-purple-600 to-purple-800", onClick: () => open("ai") },
  ];

  return (
    <div className="relative w-fit">
      {/* Panel above */}
      {active === "upload" && <UploadPanel onClose={close} onUploaded={() => { onDocumentChange?.(); close(); }} />}
      {active === "ai" && <AiDocPanel onClose={close} onSaved={() => { onDocumentChange?.(); }} />}

      {/* Cards */}
      <div
        className="flex items-center gap-x-3"
        onMouseEnter={() => !active && setExpanded(true)}
        onMouseLeave={() => !active && setExpanded(false)}
      >
        {cards.map((c, i) => (
          <StackCard key={i} {...c} index={i} expanded={expanded} />
        ))}
      </div>
    </div>
  );
}
