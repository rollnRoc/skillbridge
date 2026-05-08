'use client';

import React, { useState, useEffect } from 'react';
import { PlayCircle, Loader2, Building2, User, Briefcase, Building } from 'lucide-react';
import { CenteredModal } from '../ui/CenteredModal';
import { useAuthStore } from '../../store/auth.store';

export function TestProfilePanel({ onClose }: { onClose: () => void }) {
  const { user, updateProfile, fetchMe } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [occupation, setOccupation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setDepartment(user.department ?? '');
    setOccupation(user.occupation ?? '');
  }, [user]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        department: department.trim() || null,
        occupation: occupation.trim() || null,
      });
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error ?? 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <CenteredModal
        title="Testi çöz — bilgilerim"
        icon={PlayCircle}
        iconColor="text-cyan-600"
        onClose={onClose}
        width={520}
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Kullanıcı bilgisi yüklenemedi. API sunucusunun çalıştığından emin olun ve sayfayı yenileyin.
          </p>
          <button
            type="button"
            onClick={() => void fetchMe()}
            className="w-full py-2.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            Yeniden dene
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-xl hover:bg-cyan-700"
          >
            Kapat
          </button>
        </div>
      </CenteredModal>
    );
  }

  return (
    <CenteredModal
      title="Testi çöz — bilgilerim"
      icon={PlayCircle}
      iconColor="text-cyan-600"
      onClose={onClose}
      width={520}
    >
      <div className="p-5 space-y-4 max-h-[min(80vh,560px)] overflow-y-auto">
        <p className="text-xs text-gray-500 leading-relaxed">
          Sınav çözerken üst bantta görünecek ad, soyad, şirket, departman ve meslek bilgilerinizi buradan
          düzenleyebilirsiniz.
        </p>

        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-500">Şirket</span>
            <span className="text-gray-800">{user.company?.name ?? '—'}</span>
          </div>
          <p className="text-[10px] text-gray-400 pl-6">Şirket adı hesabınıza bağlıdır; buradan değişmez.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
              <User className="w-3.5 h-3.5" /> Ad <span className="text-red-500">*</span>
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
              <User className="w-3.5 h-3.5" /> Soyad <span className="text-red-500">*</span>
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
            <Building className="w-3.5 h-3.5" /> Departman
          </label>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Örn: İnsan Kaynakları"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
            <Briefcase className="w-3.5 h-3.5" /> Meslek
          </label>
          <input
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Örn: Uzman, Müdür, Mühendis"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !firstName.trim() || !lastName.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-xl hover:bg-cyan-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          Kaydet
        </button>
      </div>
    </CenteredModal>
  );
}
