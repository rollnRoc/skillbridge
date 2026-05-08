"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3, GitCompare, UserCheck, Loader2, ChevronRight, Sparkles, Plus, Trash2, Check,
} from "lucide-react";
import { AbovePanel } from "../ui/AbovePanel";
import { Coins } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { listUserSessions, requestAIAnalysis, type SessionResult } from "../../lib/sessions.api";

// ─── Panel 1: AI Sonuç Analizi ────────────────────────────────────────────────

export function AiAnalysisPanel({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading]    = useState(false);
  const [result, setResult]      = useState<Awaited<ReturnType<typeof requestAIAnalysis>>["aiAnalysis"] | null>(null);
  const [error, setError]        = useState("");

  useEffect(() => {
    listUserSessions().then((s) => setSessions(s.filter((r) => r.completedAt))).catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (!sessionId) { setError("Oturum seçin."); return; }
    setError(""); setLoading(true);
    try {
      const res = await requestAIAnalysis(sessionId);
      setResult(res.aiAnalysis);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Analiz yapılamadı.");
    } finally { setLoading(false); }
  };

  return (
    <AbovePanel title="AI Sonuç Analizi" icon={BarChart3} iconColor="text-amber-600"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />10 kontör</span>}
      onClose={onClose} width={680}>
      <div className="flex" style={{ minHeight: 340 }}>
        {/* Left */}
        <div className="w-60 flex-shrink-0 border-r border-gray-100 p-4 bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tamamlanan Oturum <span className="text-red-500">*</span></label>
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={loading}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">— Seçin —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.test.title} ({s.score ?? "—"} puan)
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <button onClick={handleAnalyze} disabled={loading || !sessionId}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Analiz Et</>}
          </button>
        </div>
        {/* Right */}
        <div className="flex-1 overflow-y-auto p-4">
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-300">
              <BarChart3 className="w-10 h-10 mb-2" />
              <p className="text-sm text-gray-400">Oturum seçip Analiz Et'e basın.</p>
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
              <p className="mt-2 text-sm text-gray-600">Claude analiz yapıyor…</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 text-xs text-gray-700">
              <div>
                <p className="font-semibold text-sm text-[#1A2E5A] mb-1">Genel Değerlendirme</p>
                <p className="leading-relaxed">{result.overallFeedback}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="font-semibold text-green-800 mb-1">Güçlü Alanlar</p>
                  <ul className="space-y-0.5">
                    {result.strengthAreas.map((s, i) => <li key={i} className="text-green-700">• {s}</li>)}
                  </ul>
                </div>
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="font-semibold text-orange-800 mb-1">Gelişim Alanları</p>
                  <ul className="space-y-0.5">
                    {result.improvementAreas.map((s, i) => <li key={i} className="text-orange-700">• {s}</li>)}
                  </ul>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="font-semibold text-blue-800 mb-1">Kariyer Rehberliği</p>
                <p className="text-blue-700 leading-relaxed">{result.careerGuidance}</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Gelişim Önerileri</p>
                <ul className="space-y-0.5">
                  {result.developmentSuggestions.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
              <p className="text-[10px] text-gray-400 italic">Yeterlilik Seviyesi: {result.competencyLevel}</p>
            </div>
          )}
        </div>
      </div>
    </AbovePanel>
  );
}

// ─── Panel 2: 360° Değerlendirme ─────────────────────────────────────────────

interface Evaluator { name: string; email: string; relation: "manager" | "peer" | "subordinate" }

const RELATIONS = [
  { value: "manager",     label: "Yönetici" },
  { value: "peer",        label: "Eş Düzey" },
  { value: "subordinate", label: "Ast" },
];

export function Assessment360Panel({ onClose }: { onClose: () => void }) {
  const [evaluateeName, setName]  = useState("");
  const [evaluateeEmail, setEmail] = useState("");
  const [evaluators, setEvals]    = useState<Evaluator[]>([
    { name: "", email: "", relation: "manager" },
  ]);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  const addEval = () => setEvals((prev) => [...prev, { name: "", email: "", relation: "peer" }]);
  const removeEval = (i: number) => setEvals((prev) => prev.filter((_, idx) => idx !== i));
  const updateEval = (i: number, patch: Partial<Evaluator>) =>
    setEvals((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const handleSubmit = async () => {
    if (!evaluateeName.trim() || !evaluateeEmail.trim()) { setError("Değerlendirilen kişi bilgileri zorunludur."); return; }
    const valid = evaluators.filter((e) => e.email.trim().includes("@"));
    if (valid.length === 0) { setError("En az bir değerlendirici e-postası ekleyin."); return; }
    setError(""); setLoading(true);
    try {
      await apiClient.post("/api/evaluations/360", {
        evaluatee: { name: evaluateeName, email: evaluateeEmail },
        evaluators: valid,
      });
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Değerlendirme başlatılamadı.");
    } finally { setLoading(false); }
  };

  return (
    <AbovePanel title="360° Değerlendirme Başlat" icon={UserCheck} iconColor="text-violet-600" onClose={onClose} width={640}>
      <div className="p-5 space-y-4">
        {/* Evaluatee */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Değerlendirilen Kişi</p>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={evaluateeName} onChange={(e) => setName(e.target.value)}
              placeholder="Ad Soyad" disabled={loading}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <input type="email" value={evaluateeEmail} onChange={(e) => setEmail(e.target.value)}
              placeholder="eposta@sirket.com" disabled={loading}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
        {/* Evaluators */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Değerlendiriciler</p>
            <button onClick={addEval} disabled={loading}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Ekle
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {evaluators.map((ev, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={ev.name} onChange={(e) => updateEval(i, { name: e.target.value })}
                  placeholder="Ad Soyad" disabled={loading}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <input type="email" value={ev.email} onChange={(e) => updateEval(i, { email: e.target.value })}
                  placeholder="eposta@sirket.com" disabled={loading}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <select value={ev.relation} onChange={(e) => updateEval(i, { relation: e.target.value as Evaluator["relation"] })}
                  disabled={loading}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {RELATIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button onClick={() => removeEval(i)} disabled={loading || evaluators.length === 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        <button onClick={handleSubmit} disabled={loading || success}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <><Check className="w-4 h-4" />Başlatıldı!</> : <><UserCheck className="w-4 h-4" />Değerlendirme Başlat<ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </AbovePanel>
  );
}

// ─── Panel 3: CV + JD Eşleştirme ─────────────────────────────────────────────

interface MatchResult {
  matchScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

export function CvJdMatchPanel({ onClose }: { onClose: () => void }) {
  const [cvText, setCv]       = useState("");
  const [jdText, setJd]       = useState("");
  const [language, setLang]   = useState<"TR" | "EN">("TR");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<MatchResult | null>(null);
  const [error, setError]     = useState("");

  const handleMatch = async () => {
    if (!cvText.trim() || !jdText.trim()) { setError("CV ve iş tanımı zorunludur."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiClient.post<MatchResult>("/api/ai/cv-jd-match", { cvText, jdText, language });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Eşleştirme yapılamadı.");
    } finally { setLoading(false); }
  };

  return (
    <AbovePanel title="CV + İş Tanımı Eşleştirme" icon={GitCompare} iconColor="text-rose-500"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />10 kontör</span>}
      onClose={onClose} width={820}>
      <div className="flex" style={{ minHeight: 380 }}>
        {/* Left: inputs */}
        <div className="w-72 flex-shrink-0 border-r border-gray-100 p-4 bg-gray-50 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CV İçeriği <span className="text-red-500">*</span></label>
            <textarea rows={7} value={cvText} onChange={(e) => setCv(e.target.value)} disabled={loading}
              placeholder="CV metnini yapıştırın…"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">İş Tanımı (JD) <span className="text-red-500">*</span></label>
            <textarea rows={7} value={jdText} onChange={(e) => setJd(e.target.value)} disabled={loading}
              placeholder="İş ilanı / pozisyon tanımını yapıştırın…"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Analiz Dili</label>
            <div className="flex gap-2">
              {(["TR", "EN"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} disabled={loading}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-rose-400"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <button onClick={handleMatch} disabled={loading || !cvText.trim() || !jdText.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500 text-white text-sm font-medium rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Eşleştir<ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
        {/* Right: result */}
        <div className="flex-1 overflow-y-auto p-4">
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-300">
              <GitCompare className="w-10 h-10 mb-2" />
              <p className="text-sm text-gray-400">CV ve iş tanımını girin, AI eşleştirsin.</p>
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Sparkles className="w-8 h-8 text-rose-400 animate-pulse" />
              <p className="mt-2 text-sm text-gray-600">Claude analiz ediyor…</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 text-xs text-gray-700">
              {/* Score */}
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center w-20 h-20 rounded-full"
                  style={{ background: `conic-gradient(${result.matchScore >= 70 ? "#22c55e" : result.matchScore >= 40 ? "#f59e0b" : "#ef4444"} ${result.matchScore * 3.6}deg, #f3f4f6 0deg)` }}>
                  <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                    <span className="text-xl font-black text-[#1A2E5A]">{result.matchScore}<span className="text-xs">%</span></span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#1A2E5A]">Uyum Skoru</p>
                  <p className="text-gray-500 leading-snug mt-0.5">{result.summary}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="font-semibold text-green-800 mb-1">Güçlü Yönler</p>
                  <ul className="space-y-0.5">
                    {result.strengths.map((s, i) => <li key={i} className="text-green-700">• {s}</li>)}
                  </ul>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="font-semibold text-red-800 mb-1">Eksikler / Boşluklar</p>
                  <ul className="space-y-0.5">
                    {result.gaps.map((g, i) => <li key={i} className="text-red-700">• {g}</li>)}
                  </ul>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="font-semibold text-blue-800 mb-1">Öneri</p>
                <p className="text-blue-700 leading-relaxed">{result.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AbovePanel>
  );
}
