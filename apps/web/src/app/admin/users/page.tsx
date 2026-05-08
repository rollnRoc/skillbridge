'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Users, Search, Loader2, Coins, CheckCircle2, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { listAdminUsers, updateUserRole, grantCreditsToUser, type AdminUser } from '../../../lib/admin.api';
import { getUnifiedModalStyle } from '../../../components/ui/modal-layout';

const ROLE_LABELS: Record<string, string> = {
  INDIVIDUAL:      'Bireysel',
  CORPORATE_ADMIN: 'Şirket Admini',
  PLATFORM_ADMIN:  'Platform Admini',
};

const ROLE_COLORS: Record<string, string> = {
  INDIVIDUAL:      'bg-gray-100 text-gray-600',
  CORPORATE_ADMIN: 'bg-blue-50 text-blue-700',
  PLATFORM_ADMIN:  'bg-purple-50 text-purple-700',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Grant modal state
  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [granting, setGranting] = useState(false);

  // Role change state
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const load = () =>
    listAdminUsers()
      .then(setUsers)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (user: AdminUser, role: string) => {
    setChangingRoleId(user.id);
    try {
      const updated = await updateUserRole(user.id, role);
      setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, role: updated.role } : u));
    } finally {
      setChangingRoleId(null);
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantTarget || !grantAmount) return;
    setGranting(true);
    try {
      await grantCreditsToUser(grantTarget.id, Number(grantAmount));
      setUsers((prev) => prev.map((u) =>
        u.id === grantTarget.id ? { ...u, credits: u.credits + Number(grantAmount) } : u
      ));
      setGrantTarget(null);
      setGrantAmount('');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Hata oluştu');
    } finally {
      setGranting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Admin Panel
          </button>
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-[#1A2E5A]">Kullanıcılar</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="İsim veya e-posta ara..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1">
            {(['ALL', 'INDIVIDUAL', 'CORPORATE_ADMIN', 'PLATFORM_ADMIN'] as const).map((role) => (
              <button key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${roleFilter === role ? 'bg-[#1A2E5A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {role === 'ALL' ? 'Tümü' : ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kullanıcı</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Şirket</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kontör</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">E-posta</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kayıt</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, idx) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        disabled={changingRoleId === user.id}
                        className={`text-xs px-2 py-1 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${ROLE_COLORS[user.role]}`}
                      >
                        <option value="INDIVIDUAL">Bireysel</option>
                        <option value="CORPORATE_ADMIN">Şirket Admini</option>
                        <option value="PLATFORM_ADMIN">Platform Admini</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.company?.name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-amber-600 font-semibold text-sm">
                        <Coins className="w-3.5 h-3.5" /> {user.credits}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.emailVerified
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-gray-300" />}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {format(new Date(user.createdAt), 'd MMM yyyy', { locale: tr })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setGrantTarget(user); setGrantAmount(''); }}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          <Coins className="w-3 h-3" /> Kontör Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grant modal */}
        {grantTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <form onSubmit={handleGrant} className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col" style={getUnifiedModalStyle()}>
              <h3 className="font-semibold text-gray-900 mb-1">Kontör Ver</h3>
              <p className="text-sm text-gray-500 mb-4">
                {grantTarget.firstName} {grantTarget.lastName} — mevcut: {grantTarget.credits} kr
              </p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Miktar</label>
                <input
                  type="number" min="1" value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  placeholder="Ör: 50"
                  autoFocus required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setGrantTarget(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  İptal
                </button>
                <button type="submit" disabled={granting}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Onayla'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
