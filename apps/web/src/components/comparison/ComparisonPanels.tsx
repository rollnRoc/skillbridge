"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Loader2, Sparkles, Plus, Trash2, ChevronRight, Trophy, Crown,
  Users, GitCompare, ClipboardCheck, Coins,
} from "lucide-react";
import { CenteredModal } from "../ui/CenteredModal";
import { apiClient } from "../../lib/api-client";
import { listUserSessions, type SessionResult } from "../../lib/sessions.api";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const sz = size === "sm" ? 56 : 72;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0"
      style={{
        width: sz, height: sz, borderRadius: "50%",
        background: `conic-gradient(${color} ${score * 3.6}deg, #f3f4f6 0deg)`,
      }}>
      <div className="absolute inset-[3px] bg-white rounded-full flex items-center justify-center">
        <span className={`font-black text-[#1A2E5A] ${size === "sm" ? "text-sm" : "text-lg"}`}>{score}<span className="text-[10px]">%</span></span>
      </div>
    </div>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-gray-700">{children}</div>;
}

function Loading({ label = "Claude analiz ediyor…" }: { label?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse mb-2" />
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function Empty({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-300">
      <Icon className="w-10 h-10 mb-2" />
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

function allowOfflineFallback(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_OFFLINE_FALLBACK !== "false";
}

function isApiUnavailable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  return !err.response || status === 404 || status === 502 || status === 503 || status === 504;
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const stopWords = new Set([
    "ve", "ile", "bir", "için", "olan", "gibi", "daha", "çok", "the", "and", "for", "with", "from", "that", "this",
    "biri", "olarak", "veya", "ama", "gore", "göre", "gibi", "alan", "uzerine", "üzerine", "tecrube", "tecrübe",
  ]);

  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function uniqueTokens(value: string): string[] {
  return Array.from(new Set(tokenize(value)));
}

function getTopKeywords(value: string, limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(value)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function overlapScore(source: string, target: string): number {
  const sourceTokens = uniqueTokens(source);
  const targetSet = new Set(uniqueTokens(target));
  if (sourceTokens.length === 0 || targetSet.size === 0) return 0;

  const overlap = sourceTokens.filter((token) => targetSet.has(token)).length;
  return overlap / Math.max(sourceTokens.length, 1);
}

function extractStrengths(source: string, target: string, limit = 4): string[] {
  const targetSet = new Set(uniqueTokens(target));
  const strengths = getTopKeywords(source, 12).filter((keyword) => targetSet.has(keyword));
  return strengths.slice(0, limit);
}

function extractGaps(source: string, target: string, limit = 4): string[] {
  const sourceSet = new Set(uniqueTokens(source));
  const gaps = getTopKeywords(target, 12).filter((keyword) => !sourceSet.has(keyword));
  return gaps.slice(0, limit);
}

function keywordLabel(keyword: string, language: "TR" | "EN"): string {
  if (!keyword) return language === "TR" ? "Genel uyum" : "General fit";
  return keyword.charAt(0).toLocaleUpperCase(language === "TR" ? "tr-TR" : "en-US") + keyword.slice(1);
}

function toPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function generateGeminiJson<T>(prompt: string): Promise<T | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") return null;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        topP: 0.9,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) return null;
  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

// ─── Panel 1: Görev Tanımı + Çoklu CV ─────────────────────────────────────────

interface CvEntry { name: string; text: string; }
interface MultiResult {
  winner: string;
  rankings: { rank: number; name: string; score: number; summary: string; strengths: string[]; gaps: string[] }[];
  verdict: string;
}

function buildOfflineCvJdMultiResult(jdText: string, cvs: CvEntry[], language: "TR" | "EN"): MultiResult {
  const rankings = cvs.map((cv, index) => {
    const fit = overlapScore(cv.text, jdText);
    const coverage = overlapScore(jdText, cv.text);
    const score = toPercent(fit * 55 + coverage * 45 + Math.min(uniqueTokens(cv.text).length / 40, 1) * 8);
    const strengths = extractStrengths(cv.text, jdText).map((item) => keywordLabel(item, language));
    const gaps = extractGaps(cv.text, jdText).map((item) => keywordLabel(item, language));

    return {
      rank: index + 1,
      name: cv.name.trim() || (language === "TR" ? `Aday ${index + 1}` : `Candidate ${index + 1}`),
      score,
      summary:
        language === "TR"
          ? `CV, görev tanımındaki ana beklentilerin yaklaşık %${toPercent(coverage * 100)} kadarını karşılıyor.`
          : `The CV covers roughly ${toPercent(coverage * 100)}% of the key expectations in the job description.`,
      strengths: strengths.length > 0 ? strengths : [language === "TR" ? "Temel alan uyumu" : "Core domain fit"],
      gaps: gaps.length > 0 ? gaps : [language === "TR" ? "Ek yetkinlik detayına ihtiyaç var" : "Needs more detail on supporting skills"],
    };
  }).sort((a, b) => b.score - a.score).map((item, idx) => ({ ...item, rank: idx + 1 }));

  const winner = rankings[0]?.name ?? (language === "TR" ? "Aday bulunamadı" : "No candidate found");
  const verdict =
    language === "TR"
      ? `${winner}, görev tanımındaki anahtar beklentilerle en yüksek örtüşmeyi gösteriyor. Son karar öncesinde boşluk kalan yetkinlikler için kısa bir mülakat önerilir.`
      : `${winner} shows the strongest alignment with the core job requirements. A short interview is recommended to validate any remaining gaps.`;

  return { winner, rankings, verdict };
}

async function buildCvJdMultiResult(jdText: string, cvs: CvEntry[], language: "TR" | "EN"): Promise<MultiResult> {
  const fallback = buildOfflineCvJdMultiResult(jdText, cvs, language);
  const prompt = [
    language === "TR"
      ? "Aşağıdaki görev tanımı ve aday CV'leri için JSON formatında objektif bir sıralama üret. Yalnızca JSON döndür."
      : "Produce an objective ranking for the following job description and candidate CVs in JSON. Return JSON only.",
    language === "TR"
      ? 'Biçim: {"winner":"...","rankings":[{"rank":1,"name":"...","score":82,"summary":"...","strengths":["..."],"gaps":["..."]}],"verdict":"..."}'
      : 'Format: {"winner":"...","rankings":[{"rank":1,"name":"...","score":82,"summary":"...","strengths":["..."],"gaps":["..."]}],"verdict":"..."}',
    `JD:\n${jdText}`,
    `CVS:\n${JSON.stringify(cvs)}`,
  ].join("\n\n");

  const gemini = await generateGeminiJson<MultiResult>(prompt).catch(() => null);
  if (!gemini || !Array.isArray(gemini.rankings) || gemini.rankings.length === 0) return fallback;

  const normalized = gemini.rankings
    .map((item, idx) => ({
      rank: idx + 1,
      name: item.name || fallback.rankings[idx]?.name || (language === "TR" ? `Aday ${idx + 1}` : `Candidate ${idx + 1}`),
      score: toPercent(item.score),
      summary: item.summary || fallback.rankings[idx]?.summary || "",
      strengths: Array.isArray(item.strengths) && item.strengths.length > 0 ? item.strengths.slice(0, 4) : fallback.rankings[idx]?.strengths || [],
      gaps: Array.isArray(item.gaps) && item.gaps.length > 0 ? item.gaps.slice(0, 4) : fallback.rankings[idx]?.gaps || [],
    }))
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return {
    winner: normalized[0]?.name ?? fallback.winner,
    rankings: normalized,
    verdict: gemini.verdict || fallback.verdict,
  };
}

export function CvJdMultiPanel({ onClose }: { onClose: () => void }) {
  const [jdText, setJd] = useState("");
  const [cvs, setCvs]   = useState<CvEntry[]>([
    { name: "Aday 1", text: "" },
    { name: "Aday 2", text: "" },
  ]);
  const [language, setLang] = useState<"TR" | "EN">("TR");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MultiResult | null>(null);
  const [error, setError] = useState("");

  const addCv = () => setCvs((p) => [...p, { name: `Aday ${p.length + 1}`, text: "" }]);
  const removeCv = (i: number) => setCvs((p) => p.filter((_, idx) => idx !== i));
  const updateCv = (i: number, patch: Partial<CvEntry>) =>
    setCvs((p) => p.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const handleCompare = async () => {
    if (!jdText.trim()) { setError("Görev tanımını girin."); return; }
    if (cvs.some((c) => !c.text.trim())) { setError("Tüm CV alanlarını doldurun."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiClient.post<MultiResult>("/api/ai/cv-jd-multi", { jdText, cvs, language });
      setResult(res.data);
    } catch (e: any) {
      if (allowOfflineFallback() && isApiUnavailable(e)) {
        const fallback = await buildCvJdMultiResult(jdText, cvs, language);
        setResult(fallback);
        setError("");
      } else {
        setError(e?.response?.data?.error || "Karşılaştırma yapılamadı.");
      }
    } finally { setLoading(false); }
  };

  const rankColor = (rank: number) =>
    rank === 1 ? "border-amber-300 bg-amber-50" : rank === 2 ? "border-gray-300 bg-gray-50" : "border-gray-100 bg-white";

  return (
    <CenteredModal title="Görev Tanımı + Çoklu CV Karşılaştırma" icon={Users} iconColor="text-indigo-600"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />10 kontör</span>}
      onClose={onClose} width={1100}>
      <div className="flex flex-1 overflow-hidden">

        {/* Left: JD + CV inputs */}
        <div className="w-80 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Görev Tanımı (JD) <span className="text-red-500">*</span></label>
            <textarea rows={6} value={jdText} onChange={(e) => setJd(e.target.value)} disabled={loading}
              placeholder="İş ilanı veya pozisyon tanımını yapıştırın…"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Aday CV'leri ({cvs.length})</label>
              <button onClick={addCv} disabled={loading || cvs.length >= 6}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Ekle
              </button>
            </div>
            <div className="space-y-3">
              {cvs.map((cv, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input type="text" value={cv.name} onChange={(e) => updateCv(i, { name: e.target.value })}
                      disabled={loading} placeholder={`Aday ${i + 1}`}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    {cvs.length > 2 && (
                      <button onClick={() => removeCv(i)} disabled={loading}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea rows={4} value={cv.text} onChange={(e) => updateCv(i, { text: e.target.value })}
                    disabled={loading} placeholder="CV metnini yapıştırın…"
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-1.5">
            {(["TR", "EN"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} disabled={loading}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400"}`}>
                {l}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

          <button onClick={handleCompare} disabled={loading || !jdText.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Karşılaştır<ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>

        {/* Right: result */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {loading && <Loading label="Adaylar karşılaştırılıyor…" />}
          {!loading && !result && <Empty icon={Users} label="JD ve CV'leri girin, AI en uygun adayı bulsun." />}
          {!loading && result && (
            <ResultCard>
              {/* Winner banner */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4">
                <Crown className="w-8 h-8 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-600 font-medium">En Uygun Aday</p>
                  <p className="text-lg font-black text-[#1A2E5A]">{result.winner}</p>
                </div>
              </div>
              {/* Rankings */}
              <div className="space-y-3">
                {result.rankings.map((r) => (
                  <div key={r.rank} className={`border rounded-2xl p-3.5 ${rankColor(r.rank)}`}>
                    <div className="flex items-start gap-3">
                      <ScoreBadge score={r.score} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold text-gray-400">#{r.rank}</span>
                          <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed">{r.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.strengths.map((s, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{s}</span>)}
                          {r.gaps.map((g, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">{g}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Verdict */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <p className="font-semibold text-indigo-800 mb-1 text-xs">Genel Değerlendirme</p>
                <p className="text-indigo-700 leading-relaxed text-xs">{result.verdict}</p>
              </div>
            </ResultCard>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}

// ─── Panel 2: CV vs CV ─────────────────────────────────────────────────────────

interface CvVsCvResult {
  winner: string;
  scores: { A: number; B: number };
  summary: string;
  cvA: { strengths: string[]; weaknesses: string[] };
  cvB: { strengths: string[]; weaknesses: string[] };
  verdict: string;
}

function buildOfflineCvVsCvResult(
  cv1: { name: string; text: string },
  cv2: { name: string; text: string },
  position: string,
  language: "TR" | "EN"
): CvVsCvResult {
  const context = position.trim() || `${cv1.text}\n${cv2.text}`;
  const scoreA = toPercent(overlapScore(cv1.text, context) * 70 + Math.min(uniqueTokens(cv1.text).length / 35, 1) * 30);
  const scoreB = toPercent(overlapScore(cv2.text, context) * 70 + Math.min(uniqueTokens(cv2.text).length / 35, 1) * 30);
  const winnerName = scoreA >= scoreB ? (cv1.name.trim() || (language === "TR" ? "Aday A" : "Candidate A")) : (cv2.name.trim() || (language === "TR" ? "Aday B" : "Candidate B"));

  return {
    winner: winnerName,
    scores: { A: scoreA, B: scoreB },
    summary:
      language === "TR"
        ? `Karşılaştırma, pozisyon sinyalleri ve metin kapsamı üzerinden yapıldı. ${winnerName} daha güçlü bir içerik yoğunluğu gösteriyor.`
        : `The comparison is based on position signals and content coverage. ${winnerName} shows stronger overall profile density.`,
    cvA: {
      strengths: extractStrengths(cv1.text, context).map((item) => keywordLabel(item, language)).slice(0, 4),
      weaknesses: extractGaps(cv1.text, context).map((item) => keywordLabel(item, language)).slice(0, 4),
    },
    cvB: {
      strengths: extractStrengths(cv2.text, context).map((item) => keywordLabel(item, language)).slice(0, 4),
      weaknesses: extractGaps(cv2.text, context).map((item) => keywordLabel(item, language)).slice(0, 4),
    },
    verdict:
      language === "TR"
        ? `${winnerName}, karşılaştırma bağlamında daha dengeli ve pozisyona yakın bir profil sunuyor.`
        : `${winnerName} presents a more balanced and position-aligned profile in this comparison.`,
  };
}

async function buildCvVsCvResult(
  cv1: { name: string; text: string },
  cv2: { name: string; text: string },
  position: string,
  language: "TR" | "EN"
): Promise<CvVsCvResult> {
  const fallback = buildOfflineCvVsCvResult(cv1, cv2, position, language);
  const prompt = [
    language === "TR"
      ? "Aşağıdaki iki CV'yi karşılaştır ve yalnızca JSON döndür."
      : "Compare the following two CVs and return JSON only.",
    language === "TR"
      ? 'Biçim: {"winner":"...","scores":{"A":80,"B":74},"summary":"...","cvA":{"strengths":["..."],"weaknesses":["..."]},"cvB":{"strengths":["..."],"weaknesses":["..."]},"verdict":"..."}'
      : 'Format: {"winner":"...","scores":{"A":80,"B":74},"summary":"...","cvA":{"strengths":["..."],"weaknesses":["..."]},"cvB":{"strengths":["..."],"weaknesses":["..."]},"verdict":"..."}',
    `POSITION:\n${position || "N/A"}`,
    `CV_A:\n${JSON.stringify(cv1)}`,
    `CV_B:\n${JSON.stringify(cv2)}`,
  ].join("\n\n");

  const gemini = await generateGeminiJson<CvVsCvResult>(prompt).catch(() => null);
  if (!gemini || !gemini.scores) return fallback;

  return {
    winner: gemini.winner || fallback.winner,
    scores: {
      A: toPercent(gemini.scores.A),
      B: toPercent(gemini.scores.B),
    },
    summary: gemini.summary || fallback.summary,
    cvA: {
      strengths: Array.isArray(gemini.cvA?.strengths) && gemini.cvA.strengths.length > 0 ? gemini.cvA.strengths.slice(0, 4) : fallback.cvA.strengths,
      weaknesses: Array.isArray(gemini.cvA?.weaknesses) && gemini.cvA.weaknesses.length > 0 ? gemini.cvA.weaknesses.slice(0, 4) : fallback.cvA.weaknesses,
    },
    cvB: {
      strengths: Array.isArray(gemini.cvB?.strengths) && gemini.cvB.strengths.length > 0 ? gemini.cvB.strengths.slice(0, 4) : fallback.cvB.strengths,
      weaknesses: Array.isArray(gemini.cvB?.weaknesses) && gemini.cvB.weaknesses.length > 0 ? gemini.cvB.weaknesses.slice(0, 4) : fallback.cvB.weaknesses,
    },
    verdict: gemini.verdict || fallback.verdict,
  };
}

export function CvVsCvPanel({ onClose }: { onClose: () => void }) {
  const [cv1, setCv1] = useState({ name: "", text: "" });
  const [cv2, setCv2] = useState({ name: "", text: "" });
  const [position, setPosition] = useState("");
  const [language, setLang] = useState<"TR" | "EN">("TR");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CvVsCvResult | null>(null);
  const [error, setError] = useState("");

  const handleCompare = async () => {
    if (!cv1.text.trim() || !cv2.text.trim()) { setError("Her iki CV'yi de doldurun."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiClient.post<CvVsCvResult>("/api/ai/cv-vs-cv", { cv1, cv2, position, language });
      setResult(res.data);
    } catch (e: any) {
      if (allowOfflineFallback() && isApiUnavailable(e)) {
        const fallback = await buildCvVsCvResult(cv1, cv2, position, language);
        setResult(fallback);
        setError("");
      } else {
        setError(e?.response?.data?.error || "Karşılaştırma yapılamadı.");
      }
    } finally { setLoading(false); }
  };

  return (
    <CenteredModal title="CV vs CV Karşılaştırma" icon={GitCompare} iconColor="text-violet-600"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />10 kontör</span>}
      onClose={onClose} width={1100}>
      <div className="flex flex-1 overflow-hidden">

        {/* Left: inputs */}
        <div className="w-72 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pozisyon (isteğe bağlı)</label>
            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} disabled={loading}
              placeholder="Ör: Satış Müdürü"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          {/* CV A */}
          <div className="bg-white border border-indigo-100 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">CV A</p>
            <input type="text" value={cv1.name} onChange={(e) => setCv1((p) => ({ ...p, name: e.target.value }))}
              disabled={loading} placeholder="Aday A adı"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <textarea rows={7} value={cv1.text} onChange={(e) => setCv1((p) => ({ ...p, text: e.target.value }))}
              disabled={loading} placeholder="A adayının CV metnini yapıştırın…"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          {/* CV B */}
          <div className="bg-white border border-rose-100 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">CV B</p>
            <input type="text" value={cv2.name} onChange={(e) => setCv2((p) => ({ ...p, name: e.target.value }))}
              disabled={loading} placeholder="Aday B adı"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400" />
            <textarea rows={7} value={cv2.text} onChange={(e) => setCv2((p) => ({ ...p, text: e.target.value }))}
              disabled={loading} placeholder="B adayının CV metnini yapıştırın…"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>
          <div className="flex gap-1.5">
            {(["TR", "EN"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} disabled={loading}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-200 hover:border-violet-400"}`}>
                {l}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <button onClick={handleCompare} disabled={loading || !cv1.text.trim() || !cv2.text.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Karşılaştır<ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>

        {/* Right: result */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {loading && <Loading label="CV'ler karşılaştırılıyor…" />}
          {!loading && !result && <Empty icon={GitCompare} label="İki CV'yi girin, AI kimin daha üstün olduğunu belirlesin." />}
          {!loading && result && (
            <ResultCard>
              {/* Scores comparison */}
              <div className="flex items-center justify-around bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="text-center">
                  <ScoreBadge score={result.scores.A} />
                  <p className="mt-2 text-xs font-semibold text-gray-700">{cv1.name || "Aday A"}</p>
                  {result.winner === cv1.name && <Trophy className="w-4 h-4 text-amber-500 mx-auto mt-1" />}
                </div>
                <div className="text-gray-300 text-2xl font-bold">vs</div>
                <div className="text-center">
                  <ScoreBadge score={result.scores.B} />
                  <p className="mt-2 text-xs font-semibold text-gray-700">{cv2.name || "Aday B"}</p>
                  {result.winner === cv2.name && <Trophy className="w-4 h-4 text-amber-500 mx-auto mt-1" />}
                </div>
              </div>
              {/* Summary */}
              <p className="text-gray-600 text-xs leading-relaxed">{result.summary}</p>
              {/* Side by side analysis */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase">{cv1.name || "Aday A"}</p>
                  <div className="bg-green-50 rounded-xl p-2.5">
                    <p className="text-[10px] font-semibold text-green-800 mb-1">Güçlü Yönler</p>
                    {result.cvA.strengths.map((s, i) => <p key={i} className="text-green-700 text-[10px]">• {s}</p>)}
                  </div>
                  <div className="bg-red-50 rounded-xl p-2.5">
                    <p className="text-[10px] font-semibold text-red-700 mb-1">Zayıf Yönler</p>
                    {result.cvA.weaknesses.map((w, i) => <p key={i} className="text-red-600 text-[10px]">• {w}</p>)}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-rose-500 uppercase">{cv2.name || "Aday B"}</p>
                  <div className="bg-green-50 rounded-xl p-2.5">
                    <p className="text-[10px] font-semibold text-green-800 mb-1">Güçlü Yönler</p>
                    {result.cvB.strengths.map((s, i) => <p key={i} className="text-green-700 text-[10px]">• {s}</p>)}
                  </div>
                  <div className="bg-red-50 rounded-xl p-2.5">
                    <p className="text-[10px] font-semibold text-red-700 mb-1">Zayıf Yönler</p>
                    {result.cvB.weaknesses.map((w, i) => <p key={i} className="text-red-600 text-[10px]">• {w}</p>)}
                  </div>
                </div>
              </div>
              {/* Verdict */}
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                <p className="font-semibold text-violet-800 mb-1 text-xs">Sonuç</p>
                <p className="text-violet-700 leading-relaxed text-xs">{result.verdict}</p>
              </div>
            </ResultCard>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}

// ─── Panel 3: Test Cevapları Karşılaştırma ────────────────────────────────────

interface SessionRanking {
  rank: number;
  name: string;
  systemScore: number;
  aiScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}
interface SessionCompareResult {
  winner: string;
  rankings: SessionRanking[];
  verdict: string;
}

function buildOfflineSessionCompareResult(items: SessionResult[], language: "TR" | "EN"): SessionCompareResult {
  const rankings = items.map((session, idx) => {
    const systemScore = session.score ?? 0;
    const answerCount = session.answers.length;
    const aiScore = toPercent(systemScore * 0.8 + Math.min(answerCount * 4, 20));
    const correctCount = session.answers.filter((answer) => answer.response === answer.question.correctAnswer).length;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (systemScore >= 70) strengths.push(language === "TR" ? "Yüksek doğruluk" : "High accuracy");
    if (answerCount >= 5) strengths.push(language === "TR" ? "Geniş cevap kapsamı" : "Broad answer coverage");
    if (correctCount >= Math.max(2, Math.floor(answerCount / 2))) strengths.push(language === "TR" ? "Tutarlı performans" : "Consistent performance");

    if (systemScore < 70) weaknesses.push(language === "TR" ? "Ek tekrar gerekli" : "Needs more review");
    if (answerCount < 5) weaknesses.push(language === "TR" ? "Sınırlı veri" : "Limited data");
    if (correctCount < Math.max(1, Math.floor(answerCount / 3))) weaknesses.push(language === "TR" ? "Zor sorularda düşüş" : "Drops on harder questions");

    return {
      rank: idx + 1,
      name: `${session.test.title} #${idx + 1}`,
      systemScore,
      aiScore,
      summary:
        language === "TR"
          ? `${answerCount} cevap üzerinden değerlendirildi; doğru cevap oranı yaklaşık %${answerCount > 0 ? toPercent((correctCount / answerCount) * 100) : 0}.`
          : `Evaluated across ${answerCount} answers with an approximate correct-answer rate of ${answerCount > 0 ? toPercent((correctCount / answerCount) * 100) : 0}%.`,
      strengths: strengths.length > 0 ? strengths : [language === "TR" ? "Temel katılım" : "Baseline participation"],
      weaknesses: weaknesses.length > 0 ? weaknesses : [language === "TR" ? "Daha fazla veri gerekli" : "More data needed"],
    };
  }).sort((a, b) => b.aiScore - a.aiScore).map((item, idx) => ({ ...item, rank: idx + 1 }));

  const winner = rankings[0]?.name ?? (language === "TR" ? "Oturum bulunamadı" : "No session found");
  const verdict =
    language === "TR"
      ? `${winner}, mevcut test verilerine göre en yüksek toplam performansı gösteriyor.`
      : `${winner} shows the strongest overall performance based on the available test data.`;

  return { winner, rankings, verdict };
}

export function SessionComparePanel({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [selected, setSelected] = useState<string[]>(["", ""]);
  const [language, setLang] = useState<"TR" | "EN">("TR");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [result, setResult] = useState<SessionCompareResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listUserSessions()
      .then((s) => setSessions(s.filter((r) => r.completedAt)))
      .finally(() => setFetching(false));
  }, []);

  const addSlot = () => setSelected((p) => [...p, ""]);
  const removeSlot = (i: number) => setSelected((p) => p.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, val: string) => setSelected((p) => p.map((s, idx) => idx === i ? val : s));

  const handleCompare = async () => {
    const ids = selected.filter(Boolean);
    if (ids.length < 2) { setError("En az 2 oturum seçin."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiClient.post<SessionCompareResult>("/api/ai/compare-sessions", { sessionIds: ids, language });
      setResult(res.data);
    } catch (e: any) {
      if (allowOfflineFallback() && isApiUnavailable(e)) {
        const picked = sessions.filter((session) => ids.includes(session.id));
        setResult(buildOfflineSessionCompareResult(picked, language));
        setError("");
      } else {
        setError(e?.response?.data?.error || "Karşılaştırma yapılamadı.");
      }
    } finally { setLoading(false); }
  };

  const rankBg = (rank: number) =>
    rank === 1 ? "bg-amber-50 border-amber-200" : rank === 2 ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100";

  return (
    <CenteredModal title="Test Cevabı Karşılaştırma" icon={ClipboardCheck} iconColor="text-teal-600"
      badge={<span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Coins className="w-3 h-3" />10 kontör</span>}
      onClose={onClose} width={1050}>
      <div className="flex flex-1 overflow-hidden">

        {/* Left: session selectors */}
        <div className="w-72 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Oturum Seçimi</p>

          {fetching ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Yükleniyor…
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-gray-400">Tamamlanmış oturum bulunamadı.</p>
          ) : (
            <>
              <div className="space-y-2">
                {selected.map((val, i) => (
                  <div key={i} className="flex gap-1.5">
                    <select value={val} onChange={(e) => updateSlot(i, e.target.value)} disabled={loading}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="">— Oturum {i + 1} —</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id} disabled={selected.includes(s.id) && val !== s.id}>
                          {s.test.title} — {s.score ?? "?"} puan
                        </option>
                      ))}
                    </select>
                    {selected.length > 2 && (
                      <button onClick={() => removeSlot(i)} disabled={loading}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {selected.length < 5 && (
                <button onClick={addSlot} disabled={loading}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Oturum Ekle
                </button>
              )}
            </>
          )}

          <div className="flex gap-1.5">
            {(["TR", "EN"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} disabled={loading}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${language === l ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-400"}`}>
                {l}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

          <button onClick={handleCompare} disabled={loading || selected.filter(Boolean).length < 2}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Karşılaştır<ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>

        {/* Right: result */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {loading && <Loading label="Cevaplar analiz ediliyor…" />}
          {!loading && !result && <Empty icon={ClipboardCheck} label="Karşılaştırmak istediğiniz oturumları seçin." />}
          {!loading && result && (
            <ResultCard>
              {/* Winner */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-4">
                <Trophy className="w-8 h-8 text-teal-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-teal-600 font-medium">En Başarılı Aday</p>
                  <p className="text-lg font-black text-[#1A2E5A]">{result.winner}</p>
                </div>
              </div>
              {/* Rankings */}
              <div className="space-y-3">
                {result.rankings.map((r) => (
                  <div key={r.rank} className={`border rounded-2xl p-3.5 ${rankBg(r.rank)}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-center">
                        <ScoreBadge score={r.aiScore} size="sm" />
                        <p className="text-[10px] text-gray-400 mt-1">Sistem: {r.systemScore ?? "—"}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold text-gray-400">#{r.rank}</span>
                          <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed">{r.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.strengths.map((s, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded">{s}</span>)}
                          {r.weaknesses.map((w, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">{w}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Verdict */}
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                <p className="font-semibold text-teal-800 mb-1 text-xs">Genel Değerlendirme</p>
                <p className="text-teal-700 leading-relaxed text-xs">{result.verdict}</p>
              </div>
            </ResultCard>
          )}
        </div>
      </div>
    </CenteredModal>
  );
}
