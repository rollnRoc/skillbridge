"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, FileSearch, BrainCircuit, FileUser,
  X, Sparkles, Coins, ChevronRight, Loader2,
} from "lucide-react";
import { fetchDocuments, type Document } from "../../lib/documents.api";
import { createTestDraft, generateQuestionsForTest, type Difficulty, type QuestionType } from "../../lib/tests.api";
import { getApiErrorMessage } from "../../lib/api-client";

const CARD_W = 400;
const COLLAPSED_OFFSET = 340;

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Başlangıç" },
  { value: "intermediate", label: "Orta" },
  { value: "advanced", label: "İleri" },
];

const Q_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MULTIPLE_CHOICE", label: "Çoktan Seçmeli" },
  { value: "MULTIPLE_CORRECT", label: "Çok Doğrulu" },
  { value: "OPEN_ENDED", label: "Açık Uçlu" },
  { value: "YES_NO", label: "Evet / Hayır" },
];

// ─── Shared above-panel wrapper ───────────────────────────────────────────────

function AbovePanel({
  title, icon: Icon, iconColor, badge, onClose, children, width = 660,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  badge?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <AnimatePresence>
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="absolute bottom-[calc(100%+14px)] left-0 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] overflow-hidden"
        style={{ width }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon style={{ width: 18, height: 18 }} className={iconColor} />
            <h3 className="font-semibold text-[#1A2E5A] text-sm">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            {badge}
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Shared settings row ──────────────────────────────────────────────────────

function GenerateSettings({
  questionCount, setQuestionCount,
  difficulty, setDifficulty,
  questionTypes, setQuestionTypes,
  language, setLanguage,
  disabled,
}: {
  questionCount: number;
  setQuestionCount: (n: number) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  questionTypes: QuestionType[];
  setQuestionTypes: (t: QuestionType[]) => void;
  language: "TR" | "EN";
  setLanguage: (l: "TR" | "EN") => void;
  disabled: boolean;
}) {
  const toggleType = (t: QuestionType) =>
    setQuestionTypes(
      questionTypes.includes(t) ? questionTypes.filter((x) => x !== t) : [...questionTypes, t]
    );

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Soru sayısı */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Soru Sayısı</label>
        <select value={questionCount} onChange={(e) => setQuestionCount(+e.target.value)}
          disabled={disabled}
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[5, 10, 15, 20, 25].map((n) => <option key={n} value={n}>{n} soru</option>)}
        </select>
      </div>
      {/* Zorluk */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Zorluk</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          disabled={disabled}
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>
      {/* Soru türleri */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Soru Türleri</label>
        <div className="flex flex-wrap gap-1.5">
          {Q_TYPES.map((t) => (
            <button key={t.value} onClick={() => toggleType(t.value)} disabled={disabled}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${questionTypes.includes(t.value)
                ? "bg-[#1A2E5A] text-white border-[#1A2E5A]"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {/* Dil */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Dil</label>
        <div className="flex gap-1.5">
          {(["TR", "EN"] as const).map((l) => (
            <button key={l} onClick={() => setLanguage(l)} disabled={disabled}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l
                ? "bg-[#1A2E5A] text-white border-[#1A2E5A]"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
              }`}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Belgeden Test Oluştur ─────────────────────────────────────────────

function FromDocPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [docs, setDocs] = useState<Document[]>([]);
  const [docId, setDocId] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["MULTIPLE_CHOICE"]);
  const [language, setLanguage] = useState<"TR" | "EN">("TR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchDocuments().then(setDocs); }, []);

  const handleGenerate = async () => {
    if (!docId) { setError("Önce kütüphaneden bir doküman seçmelisiniz."); return; }
    setError(""); setLoading(true);
    try {
      const doc = docs.find((d) => d.id === docId);
      const draft = await createTestDraft({ title: `${doc?.title ?? "Belge"} — Test`, documentId: docId });
      await generateQuestionsForTest(draft.id, { questionCount, difficulty, questionTypes, language });
      router.push(`/tests/${draft.id}`);
    } catch (e: any) {
      setError(getApiErrorMessage(e, "Test oluşturulurken hata oluştu."));
    } finally { setLoading(false); }
  };

  return (
    <AbovePanel title="Belgeden Test Oluştur" icon={FileSearch} iconColor="text-blue-600"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />50 kontör</span>}
      onClose={onClose} width={580}>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kütüphaneden doküman seç <span className="text-red-500">*</span></label>
          <select value={docId} onChange={(e) => setDocId(e.target.value)} disabled={loading}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Kütüphaneden doküman seçin —</option>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          <p className="text-[10px] text-amber-700 mt-1.5">Doküman seçmeden soru üretilemez.</p>
        </div>
        <GenerateSettings
          questionCount={questionCount} setQuestionCount={setQuestionCount}
          difficulty={difficulty} setDifficulty={setDifficulty}
          questionTypes={questionTypes} setQuestionTypes={setQuestionTypes}
          language={language} setLanguage={setLanguage}
          disabled={loading || !docId}
        />
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        <button onClick={handleGenerate} disabled={loading || !docId}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Test Oluştur <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </AbovePanel>
  );
}

// ─── Panel: Seçimli Konulardan Prompt ile Test ────────────────────────────────

function FromTopicsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [topics, setTopics] = useState("");
  const [prompt, setPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["MULTIPLE_CHOICE"]);
  const [language, setLanguage] = useState<"TR" | "EN">("TR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!topics.trim()) { setError("En az bir konu girin."); return; }
    setError(""); setLoading(true);
    try {
      const draft = await createTestDraft({ title: topics.slice(0, 60) + " — Test" });
      const instructions = `Konular: ${topics}${prompt ? `\n\nEk talimatlar: ${prompt}` : ""}`;
      await generateQuestionsForTest(draft.id, { questionCount, difficulty, questionTypes, language, additionalInstructions: instructions });
      router.push(`/tests/${draft.id}`);
    } catch (e: any) {
      setError(getApiErrorMessage(e, "Test oluşturulurken hata oluştu."));
    } finally { setLoading(false); }
  };

  return (
    <AbovePanel title="Seçimli Konulardan Prompt ile Test Yarat" icon={BrainCircuit} iconColor="text-emerald-600"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />50 kontör</span>}
      onClose={onClose} width={620}>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Konular <span className="text-red-500">*</span></label>
          <textarea rows={3} value={topics}
            onChange={(e) => setTopics(e.target.value)} disabled={loading}
            placeholder="Ör: İş hukuku, 4857 sayılı Kanun, fazla mesai hakları"
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ek Talimat / Prompt</label>
          <textarea rows={2} value={prompt}
            onChange={(e) => setPrompt(e.target.value)} disabled={loading}
            placeholder="Ör: Vaka bazlı sorular ekle, senaryo odaklı olsun"
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <GenerateSettings
          questionCount={questionCount} setQuestionCount={setQuestionCount}
          difficulty={difficulty} setDifficulty={setDifficulty}
          questionTypes={questionTypes} setQuestionTypes={setQuestionTypes}
          language={language} setLanguage={setLanguage}
          disabled={loading}
        />
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        <button onClick={handleGenerate} disabled={loading || !topics.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Test Yarat <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </AbovePanel>
  );
}

// ─── Panel: CV'ye Göre Hazırla ────────────────────────────────────────────────

function FromCvPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [cvText, setCvText] = useState("");
  const [position, setPosition] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["MULTIPLE_CHOICE"]);
  const [language, setLanguage] = useState<"TR" | "EN">("TR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!cvText.trim()) { setError("CV içeriği boş olamaz."); return; }
    setError(""); setLoading(true);
    try {
      const title = position ? `${position} — CV Bazlı Test` : "CV Bazlı Yeterlilik Testi";
      const draft = await createTestDraft({ title });
      const instructions = `Aşağıdaki CV'deki eğitim geçmişi, beceriler ve deneyimler göz önünde bulundurularak${position ? ` "${position}" pozisyonuna uygunluğunu` : ""} ölçen sorular oluştur.\n\nCV:\n${cvText}`;
      await generateQuestionsForTest(draft.id, { questionCount, difficulty, questionTypes, language, additionalInstructions: instructions });
      router.push(`/tests/${draft.id}`);
    } catch (e: any) {
      setError(getApiErrorMessage(e, "Test oluşturulurken hata oluştu."));
    } finally { setLoading(false); }
  };

  return (
    <AbovePanel title="Kişinin CV'sine Göre Test Hazırla" icon={FileUser} iconColor="text-orange-500"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />50 kontör</span>}
      onClose={onClose} width={660}>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">CV İçeriği <span className="text-red-500">*</span></label>
            <textarea rows={7} value={cvText}
              onChange={(e) => setCvText(e.target.value)} disabled={loading}
              placeholder="CV metnini buraya yapıştırın (eğitim, beceriler, deneyim…)"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hedef Pozisyon</label>
              <input type="text" value={position} onChange={(e) => setPosition(e.target.value)}
                disabled={loading} placeholder="Ör: Satış Müdürü"
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Soru Sayısı</label>
              <select value={questionCount} onChange={(e) => setQuestionCount(+e.target.value)}
                disabled={loading}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} soru</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zorluk</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                disabled={loading}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dil</label>
              <div className="flex gap-1.5">
                {(["TR", "EN"] as const).map((l) => (
                  <button key={l} onClick={() => setLanguage(l)} disabled={loading}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-orange-400"}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Soru Türleri</label>
          <div className="flex flex-wrap gap-1.5">
            {Q_TYPES.map((t) => (
              <button key={t.value} disabled={loading}
                onClick={() => setQuestionTypes(questionTypes.includes(t.value) ? questionTypes.filter((x) => x !== t.value) : [...questionTypes, t.value])}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${questionTypes.includes(t.value) ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-orange-400"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        <button onClick={handleGenerate} disabled={loading || !cvText.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Test Hazırla <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </AbovePanel>
  );
}

// ─── Single stacking card ─────────────────────────────────────────────────────

function StackCard({
  label, description, icon: Icon, gradient, index, expanded, onClick, href,
}: {
  label: string; description: string; icon: React.ElementType;
  gradient: string; index: number; expanded: boolean;
  onClick?: () => void; href?: string;
}) {
  const inner = (
    <div className={`bg-gradient-to-br ${gradient} text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg select-none cursor-pointer transition-shadow hover:shadow-xl`}
      style={{ width: CARD_W, height: 140 }}>
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
      {href ? <Link href={href}>{inner}</Link> : <div onClick={onClick}>{inner}</div>}
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

type ActivePanel = "doc" | "topics" | "cv" | null;

export function TestStackingNav() {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<ActivePanel>(null);

  const open = (p: ActivePanel) => { setActive(p); setExpanded(true); };
  const close = () => setActive(null);

  const cards = [
    { label: "Testler", description: "Test kütüphanesini aç", icon: BookOpen, gradient: "from-[#1A2E5A] to-cyan-700", href: "/tests/library" },
    { label: "Belgeden Test Oluştur", description: "Dokümanı seç, AI üretsin", icon: FileSearch, gradient: "from-blue-500 to-blue-700", onClick: () => open("doc") },
    { label: "Konulardan Test Yarat", description: "Prompt ile özel test", icon: BrainCircuit, gradient: "from-emerald-500 to-emerald-700", onClick: () => open("topics") },
    { label: "CV'ye Göre Hazırla", description: "Eğitim ve becerilere özel", icon: FileUser, gradient: "from-orange-400 to-orange-600", onClick: () => open("cv") },
  ];

  return (
    <div className="relative w-fit">
      {active === "doc" && <FromDocPanel onClose={close} />}
      {active === "topics" && <FromTopicsPanel onClose={close} />}
      {active === "cv" && <FromCvPanel onClose={close} />}

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
