'use client';

import { useState } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Save,
  ChevronRight,
  Coins,
  FileText,
} from 'lucide-react';
import { useTaxonomy, TaxonomyBlock } from '../ui/taxonomy';
import { generateDocument, saveGeneratedDocument } from '../../lib/ai-document.api';
import { getUnifiedModalStyle } from '../ui/modal-layout';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

type Step = 'form' | 'generating' | 'preview';

const ACCENT = 'focus:ring-blue-500';
const ACCENT_CB = 'bg-blue-600 border-blue-600';

export function AiDocumentModal({ onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [topic, setTopic] = useState('');
  const [detailNotes, setDetailNotes] = useState('');
  const [language, setLanguage] = useState<'TR' | 'EN'>('TR');
  const tax = useTaxonomy();
  const [editableContent, setEditableContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const buildAdditionalContext = () => {
    const parts: string[] = [];
    if (detailNotes.trim()) parts.push(`Kullanıcının detaylı açıklaması:\n${detailNotes.trim()}`);
    const tx = tax.buildContext();
    if (tx) parts.push(`Taksonomi seçimi:\n${tx}`);
    return parts.join('\n\n') || undefined;
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Konu alanı zorunludur.');
      return;
    }
    setError('');
    setStep('generating');

    try {
      const result = await generateDocument({
        topic: topic.trim(),
        language,
        sector: tax.sectorName || undefined,
        occupation: tax.occupationName || undefined,
        additionalContext: buildAdditionalContext(),
      });
      setEditableContent(result.content);
      setTitle(topic.slice(0, 80));
      setStep('preview');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Doküman üretilirken hata oluştu.');
      setStep('form');
    }
  };

  const handleRegenerate = async () => {
    setStep('generating');
    setError('');
    try {
      const result = await generateDocument({
        topic: topic.trim(),
        language,
        sector: tax.sectorName || undefined,
        occupation: tax.occupationName || undefined,
        additionalContext: buildAdditionalContext(),
      });
      setEditableContent(result.content);
      setStep('preview');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Hata oluştu.');
      setStep('preview');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGeneratedDocument({
        title,
        content: editableContent,
        language,
        category: 'AI Doküman',
        description: detailNotes.trim().slice(0, 2000) || undefined,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Kaydetme sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl flex flex-col" style={getUnifiedModalStyle()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-[#1A2E5A]">AI ile Doküman Oluştur</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <Coins className="w-3.5 h-3.5" />
              50 kontör
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left: Form Panel */}
          <div className="w-80 flex-shrink-0 border-r border-gray-100 p-5 overflow-y-auto bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Parametreler</h3>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Konu <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Örn: İK süreçlerinde dijital dönüşüm ve veri gizliliği"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={step === 'generating'}
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Dokümanla ilgili detaylı bilgi
              </label>
              <textarea
                rows={4}
                placeholder="Kapsam, hedef rol, özel başlıklar… (isteğe bağlı)"
                value={detailNotes}
                onChange={(e) => setDetailNotes(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={step === 'generating'}
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dil</label>
              <div className="flex gap-2">
                {(['TR', 'EN'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                      language === lang
                        ? 'bg-[#1A2E5A] text-white border-[#1A2E5A]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    }`}
                    disabled={step === 'generating'}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <TaxonomyBlock
              tax={tax}
              disabled={step === 'generating'}
              accentClass={`${ACCENT} ${ACCENT_CB}`}
            />
            <p className="text-[10px] text-gray-400 mt-2 leading-snug">
              Taksonomiden seçilen sektör, meslek ve yetkinlikler üretim prompt&apos;una eklenir.
            </p>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-3 mt-3">{error}</p>
            )}

            {step === 'form' ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
              >
                <Sparkles className="w-4 h-4" />
                Üret
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={step === 'generating'}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors mt-2"
              >
                <RefreshCw className={`w-4 h-4 ${step === 'generating' ? 'animate-spin' : ''}`} />
                Yeniden Üret (+50 kontör)
              </button>
            )}
          </div>

          {/* Right: Preview / Editor */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {step === 'form' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <FileText className="w-16 h-16 mb-4 text-gray-200" />
                <p className="font-medium text-gray-500">
                  Önce konuyu yazın; isteğe bağlı detay ve taksonomi ekleyip Üret&apos;e tıklayın.
                </p>
                <p className="text-sm mt-2 max-w-md">
                  Claude, konu ve bağlama uygun yapılandırılmış bir taslak oluşturur; belge türünü model bağlama göre seçer.
                </p>
              </div>
            )}

            {step === 'generating' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="relative">
                  <Sparkles className="w-12 h-12 text-blue-500 animate-pulse" />
                </div>
                <p className="mt-4 font-medium text-gray-700">Claude üretiyor...</p>
                <p className="text-sm text-gray-400 mt-1">Bu işlem 10-20 saniye sürebilir.</p>
              </div>
            )}

            {step === 'preview' && (
              <>
                <div className="px-5 pt-4 pb-2 border-b border-gray-100 flex-shrink-0">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-base font-semibold text-gray-900 border-0 border-b border-transparent focus:border-blue-500 focus:outline-none pb-1"
                    placeholder="Doküman başlığı..."
                  />
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    className="w-full h-full min-h-[200px] p-5 text-sm text-gray-800 font-mono resize-none focus:outline-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    İçeriği düzenleyebilirsiniz. Onaylayınca kütüphaneye kaydedilir.
                  </p>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Kaydediliyor...' : 'Onayla ve Kaydet'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
