"use client";

import React, { useState, useEffect } from "react";
import {
  UserPlus, Users, Link2, ChevronRight, Loader2, Copy, Check, Play,
} from "lucide-react";
import { AbovePanel } from "../ui/AbovePanel";
import { apiClient } from "../../lib/api-client";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode } from "lucide-react";

// ─── Shared ───────────────────────────────────────────────────────────────────

interface TestOption { id: string; title: string }

function useTests() {
  const [tests, setTests] = useState<TestOption[]>([]);
  useEffect(() => {
    apiClient.get<TestOption[]>("/api/tests").then((r) => setTests(r.data)).catch(() => {});
  }, []);
  return tests;
}

const EXPIRY_OPTIONS = [
  { value: "7",  label: "7 gün" },
  { value: "14", label: "14 gün" },
  { value: "30", label: "30 gün" },
  { value: "90", label: "90 gün" },
];

function downloadSVGById(id: string, filename: string) {
  const svg = document.getElementById(id);
  if (!svg) return;
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ─── Panel 1: Tek Aday Davet ──────────────────────────────────────────────────

export function InvitePanel({ onClose }: { onClose: () => void }) {
  const tests = useTests();
  const [testId, setTestId]     = useState("");
  const [email, setEmail]       = useState("");
  const [firstName, setFirst]   = useState("");
  const [lastName, setLast]     = useState("");
  const [expiry, setExpiry]     = useState("14");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied]     = useState(false);

  const handleSend = async () => {
    if (!testId || !email.trim()) { setError("Test ve e-posta zorunludur."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiClient.post<{ url?: string; inviteUrl?: string }>("/api/invitations", {
        testId, email: email.trim(),
        candidateName: [firstName, lastName].filter(Boolean).join(" ") || undefined,
        expiresInDays: Number(expiry),
      });
      setInviteUrl(res.data.url || res.data.inviteUrl || "");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Davet gönderilemedi.");
    } finally { setLoading(false); }
  };

  return (
    <AbovePanel title="Aday Davet Et" icon={UserPlus} iconColor="text-teal-600" onClose={onClose} width={500}>
      {inviteUrl ? (
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Davet Gönderildi!</p>
            <p className="text-xs text-gray-500 text-center max-w-xs">
              Aday QR kodu okutacak, adını yazacak ve testi cevaplayacak.
              Sonuçlar değerlendirmeler ekranında görünecek.
            </p>
          </div>
          <div className="bg-white border-2 border-teal-200 rounded-2xl p-4 shadow-sm">
            <QRCodeSVG id="invite-qr-single" value={inviteUrl} size={200} level="M" />
          </div>
          <div className="flex items-center gap-2 w-full bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
            <p className="flex-1 text-[11px] text-teal-800 font-mono truncate">{inviteUrl}</p>
            <button onClick={() => { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex-shrink-0 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
          <div className="flex gap-2 w-full">
            <button onClick={() => window.open(inviteUrl, "_blank", "noopener,noreferrer")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border border-[#1A2E5A]/20 text-[#1A2E5A] rounded-xl hover:bg-[#1A2E5A]/5 transition-colors">
              <Play className="w-3.5 h-3.5" /> Testi Başlat
            </button>
            <button onClick={() => downloadSVGById("invite-qr-single", `davet-qr-${email.replace(/[^a-z0-9]/gi, "_")}.svg`)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border border-teal-200 text-teal-700 rounded-xl hover:bg-teal-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> QR İndir
            </button>
            <button onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs bg-[#1A2E5A] text-white rounded-xl hover:bg-[#152448] transition-colors">
              Kapat
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ad</label>
              <input type="text" value={firstName} onChange={(e) => setFirst(e.target.value)}
                placeholder="Ayşe" disabled={loading}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Soyad</label>
              <input type="text" value={lastName} onChange={(e) => setLast(e.target.value)}
                placeholder="Yılmaz" disabled={loading}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-posta <span className="text-red-500">*</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="aday@sirket.com" disabled={loading}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Test <span className="text-red-500">*</span></label>
            <select value={testId} onChange={(e) => setTestId(e.target.value)} disabled={loading}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">— Test seçin —</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Geçerlilik Süresi</label>
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setExpiry(o.value)} disabled={loading}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${expiry === o.value ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-teal-400"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <button onClick={handleSend} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" />Davet Gönder ve QR Oluştur<ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}
    </AbovePanel>
  );
}

// ─── Panel 2: Toplu Davet (CSV / çok e-posta) ─────────────────────────────────

export function BulkInvitePanel({ onClose }: { onClose: () => void }) {
  const tests = useTests();
  const [testId, setTestId]   = useState("");
  const [emails, setEmails]   = useState("");
  const [expiry, setExpiry]   = useState("14");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [result, setResult]   = useState<{ sent: number; skipped: number; invitations: { token: string; email: string }[] } | null>(null);

  const parsedEmails = emails.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.includes("@"));

  const webUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleSend = async () => {
    if (!testId || parsedEmails.length === 0) { setError("Test ve en az bir e-posta zorunludur."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiClient.post<{ sent: number; skipped: number; invitations: { token: string; email: string }[] }>("/api/invitations/bulk", {
        testId, emails: parsedEmails, expiresInDays: Number(expiry),
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Toplu davet gönderilemedi.");
    } finally { setLoading(false); }
  };

  return (
    <AbovePanel title="Toplu Aday Daveti" icon={Users} iconColor="text-cyan-600" onClose={onClose} width={600}>
      {result && result.invitations && result.invitations.length > 0 ? (
        <div className="flex flex-col" style={{ maxHeight: "80vh" }}>
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">✓ {result.sent} Davet Gönderildi</p>
              <p className="text-xs text-gray-500 mt-0.5">Her aday QR kodu okutacak, adını yazacak ve testi çözecek.</p>
            </div>
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 bg-[#1A2E5A] text-white rounded-lg hover:bg-[#152448] transition-colors">
              Kapat
            </button>
          </div>
          <div className="overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-4">
              {result.invitations.map((inv) => {
                const invUrl = `${webUrl}/exam/${inv.token}`;
                const qrId = `bulk-qr-${inv.token}`;
                return (
                  <div key={inv.token} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-2">
                    <p className="text-[11px] font-medium text-gray-700 truncate w-full text-center">{inv.email}</p>
                    <div className="bg-white border border-cyan-100 rounded-xl p-2 shadow-sm">
                      <QRCodeSVG id={qrId} value={invUrl} size={140} level="M" />
                    </div>
                    <p className="text-[9px] text-gray-400 font-mono truncate w-full text-center">
                      {invUrl.replace(/^https?:\/\//, "")}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 w-full">
                      <button onClick={() => window.open(invUrl, "_blank", "noopener,noreferrer")}
                        className="flex items-center justify-center gap-1 py-1.5 text-[10px] border border-[#1A2E5A]/20 text-[#1A2E5A] rounded-lg hover:bg-[#1A2E5A]/5 transition-colors">
                        <Play className="w-3 h-3" /> Başla
                      </button>
                      <button onClick={() => downloadSVGById(qrId, `davet-qr-${inv.email.replace(/[^a-z0-9]/gi, "_")}.svg`)}
                        className="flex items-center justify-center gap-1 py-1.5 text-[10px] border border-cyan-200 text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors">
                        <Download className="w-3 h-3" /> İndir
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(invUrl)}
                        className="flex items-center justify-center gap-1 py-1.5 text-[10px] border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <Copy className="w-3 h-3" /> Kopyala
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Test <span className="text-red-500">*</span></label>
            <select value={testId} onChange={(e) => setTestId(e.target.value)} disabled={loading}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">— Test seçin —</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              E-postalar <span className="text-red-500">*</span>
              <span className="text-gray-400 ml-2 font-normal">— satır, virgül veya noktalı virgülle ayırın</span>
            </label>
            <textarea rows={6} value={emails} onChange={(e) => setEmails(e.target.value)} disabled={loading}
              placeholder={"ali@sirket.com\nayse@sirket.com\nveli@sirket.com"}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono" />
            {parsedEmails.length > 0 && (
              <p className="text-[10px] text-cyan-700 mt-0.5">{parsedEmails.length} geçerli e-posta tespit edildi</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Geçerlilik Süresi</label>
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setExpiry(o.value)} disabled={loading}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${expiry === o.value ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-cyan-400"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <button onClick={handleSend} disabled={loading || parsedEmails.length === 0 || !testId}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-xl hover:bg-cyan-700 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><QrCode className="w-4 h-4" />Toplu Gönder + QR Oluştur ({parsedEmails.length})<ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}
    </AbovePanel>
  );
}

// ─── Panel 3: Sınav Linki Oluştur ────────────────────────────────────────────

export function InviteUrlPanel({ onClose }: { onClose: () => void }) {
  const tests = useTests();
  const [testId, setTestId]   = useState("");
  const [expiry, setExpiry]   = useState("30");
  const [url, setUrl]         = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState("");

  const handleGenerate = async () => {
    if (!testId) { setError("Test seçin."); return; }
    setError(""); setLoading(true);
    try {
      const res = await apiClient.post<{ url: string }>("/api/invitations/url", {
        testId, expiresInDays: Number(expiry),
      });
      setUrl(res.data.url);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Link oluşturulamadı.");
    } finally { setLoading(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AbovePanel title="Sınav Linki Oluştur" icon={Link2} iconColor="text-sky-600" onClose={onClose} width={500}>
      <div className="p-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Test <span className="text-red-500">*</span></label>
          <select value={testId} onChange={(e) => setTestId(e.target.value)} disabled={loading}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
            <option value="">— Test seçin —</option>
            {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Geçerlilik Süresi</label>
          <div className="flex gap-2">
            {EXPIRY_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setExpiry(o.value)} disabled={loading}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${expiry === o.value ? "bg-[#1A2E5A] text-white border-[#1A2E5A]" : "bg-white text-gray-600 border-gray-200 hover:border-sky-400"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {url && (
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
            <p className="flex-1 text-xs text-sky-800 font-mono truncate">{url}</p>
            <button onClick={handleCopy}
              className="flex-shrink-0 flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        <button onClick={handleGenerate} disabled={loading || !testId}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><QrCode className="w-4 h-4" />{url ? "Yenile" : "Link + QR Oluştur"}<ChevronRight className="w-4 h-4" /></>}
        </button>
        {url && (
          <div className="flex flex-col items-center gap-2 bg-sky-50 border border-sky-100 rounded-2xl p-4">
            <p className="text-xs font-medium text-sky-700 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" /> QR Kod — Adaylar okutup adını yazacak, testi çözecek
            </p>
            <div className="bg-white border border-sky-200 rounded-xl p-2 shadow-sm">
              <QRCodeSVG id="invite-qr-url" value={url} size={180} level="M" />
            </div>
            <button onClick={() => downloadSVGById("invite-qr-url", "sinav-qr.svg")}
              className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 transition-colors">
              <Download className="w-3 h-3" /> QR İndir
            </button>
            <button onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              className="flex items-center gap-1.5 text-xs text-[#1A2E5A] hover:text-[#152448] transition-colors">
              <Play className="w-3 h-3" /> Testi Başlat
            </button>
          </div>
        )}
      </div>
    </AbovePanel>
  );
}
