'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Tags, Plus, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

interface Sector { id: string; name: string; isActive: boolean; }
interface Occupation { id: string; name: string; sectorId: string; isActive: boolean; }

async function fetchSectors(): Promise<Sector[]> {
  const res = await apiClient.get<Sector[]>('/api/taxonomy/sectors');
  return res.data;
}
async function fetchOccupations(sectorId: string): Promise<Occupation[]> {
  const res = await apiClient.get<Occupation[]>(`/api/taxonomy/sectors/${sectorId}/occupations`);
  return res.data;
}
async function createSector(name: string): Promise<Sector> {
  const res = await apiClient.post<Sector>('/api/taxonomy/sectors', { name });
  return res.data;
}
async function createOccupation(name: string, sectorId: string): Promise<Occupation> {
  const res = await apiClient.post<Occupation>('/api/taxonomy/occupations', { name, sectorId });
  return res.data;
}
async function toggleSector(id: string, isActive: boolean): Promise<Sector> {
  const res = await apiClient.patch<Sector>(`/api/taxonomy/sectors/${id}`, { isActive });
  return res.data;
}

export default function AdminTaxonomyPage() {
  const router = useRouter();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [occupations, setOccupations] = useState<Record<string, Occupation[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOcc, setLoadingOcc] = useState<string | null>(null);

  // Add sector form
  const [newSector, setNewSector] = useState('');
  const [addingSector, setAddingSector] = useState(false);

  // Add occupation form
  const [newOcc, setNewOcc] = useState<Record<string, string>>({});
  const [addingOcc, setAddingOcc] = useState<string | null>(null);

  useEffect(() => {
    fetchSectors()
      .then(setSectors)
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = async (sectorId: string) => {
    if (expanded === sectorId) { setExpanded(null); return; }
    setExpanded(sectorId);
    if (!occupations[sectorId]) {
      setLoadingOcc(sectorId);
      const occs = await fetchOccupations(sectorId).catch(() => []);
      setOccupations((prev) => ({ ...prev, [sectorId]: occs }));
      setLoadingOcc(null);
    }
  };

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSector.trim()) return;
    setAddingSector(true);
    try {
      const s = await createSector(newSector.trim());
      setSectors((prev) => [...prev, s]);
      setNewSector('');
    } finally {
      setAddingSector(false);
    }
  };

  const handleAddOccupation = async (e: React.FormEvent, sectorId: string) => {
    e.preventDefault();
    const name = newOcc[sectorId]?.trim();
    if (!name) return;
    setAddingOcc(sectorId);
    try {
      const occ = await createOccupation(name, sectorId);
      setOccupations((prev) => ({
        ...prev,
        [sectorId]: [...(prev[sectorId] ?? []), occ],
      }));
      setNewOcc((prev) => ({ ...prev, [sectorId]: '' }));
    } finally {
      setAddingOcc(null);
    }
  };

  const handleToggleSector = async (sector: Sector) => {
    const updated = await toggleSector(sector.id, !sector.isActive).catch(() => null);
    if (updated) setSectors((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Admin Panel
          </button>
          <div className="flex items-center gap-3">
            <Tags className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-[#1A2E5A]">Taxonomy Yönetimi</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">Sektör ve meslek/pozisyon listesi</p>
        </div>

        {/* Add sector form */}
        <form onSubmit={handleAddSector} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newSector}
            onChange={(e) => setNewSector(e.target.value)}
            placeholder="Yeni sektör adı..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button type="submit" disabled={addingSector || !newSector.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {addingSector ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Sektör Ekle</>}
          </button>
        </form>

        {/* Sectors list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : sectors.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Henüz sektör eklenmedi.</div>
        ) : (
          <div className="space-y-2">
            {sectors.map((sector) => (
              <div key={sector.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Sector header */}
                <div className="flex items-center px-4 py-3 gap-3">
                  <button
                    onClick={() => handleExpand(sector.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {expanded === sector.id
                      ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className="font-medium text-gray-900">{sector.name}</span>
                    {occupations[sector.id] && (
                      <span className="text-xs text-gray-400 ml-1">({occupations[sector.id].length} meslek)</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleSector(sector)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sector.isActive
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}
                  >
                    {sector.isActive ? 'Aktif' : 'Pasif'}
                  </button>
                </div>

                {/* Occupations (expanded) */}
                {expanded === sector.id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    {loadingOcc === sector.id ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Yükleniyor...
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-1 mb-3">
                          {(occupations[sector.id] ?? []).map((occ) => (
                            <li key={occ.id} className="flex items-center gap-2 text-sm text-gray-700 px-2 py-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                              {occ.name}
                            </li>
                          ))}
                          {(occupations[sector.id] ?? []).length === 0 && (
                            <li className="text-xs text-gray-400 px-2">Henüz meslek eklenmedi.</li>
                          )}
                        </ul>
                        {/* Add occupation */}
                        <form onSubmit={(e) => handleAddOccupation(e, sector.id)} className="flex gap-2">
                          <input
                            type="text"
                            value={newOcc[sector.id] ?? ''}
                            onChange={(e) => setNewOcc((prev) => ({ ...prev, [sector.id]: e.target.value }))}
                            placeholder="Yeni meslek/pozisyon..."
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button type="submit"
                            disabled={addingOcc === sector.id || !newOcc[sector.id]?.trim()}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                            {addingOcc === sector.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" /> Ekle</>}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
