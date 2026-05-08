'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, BookOpen, Loader2, Trash2, Eye, Coins,
  CheckCircle2, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { listTests, type TestDraft } from '../../lib/tests.api';
import { apiClient } from '../../lib/api-client';

type TestRow = TestDraft & {
  isPublished: boolean;
  _count: { questions: number };
  parameters: Record<string, unknown>;
};

async function deleteTest(id: string): Promise<void> {
  await apiClient.delete(`/api/tests/${id}`);
}

export default function TestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listTests()
      .then((data) => setTests(data as TestRow[]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" silinsin mi?`)) return;
    setDeletingId(id);
    try {
      await deleteTest(id);
      setTests((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1A2E5A] mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Geri
          </button>
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-[#1A2E5A]" />
            <div>
              <h1 className="text-2xl font-bold text-[#1A2E5A]">Test Kütüphanesi</h1>
              <p className="text-gray-500 text-sm mt-0.5">AI ile oluşturduğunuz tüm testler</p>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Henüz test oluşturulmadı.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-10">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sektör</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Meslek</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Konu (Test Adı)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Soru</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fiyat</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test, idx) => {
                  const params = (test.parameters ?? {}) as Record<string, string>;
                  return (
                    <tr key={test.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {format(new Date(test.createdAt), 'd MMM yyyy', { locale: tr })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {params.sectorName ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{params.sectorName}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {params.occupationName ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">{params.occupationName}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px] truncate">{test.title}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {test._count.questions}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-amber-600 text-xs">
                          <Coins className="w-3.5 h-3.5" />
                          50
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {test.isPublished ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> Yayında
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Taslak</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Görüntüle"
                            onClick={() => router.push(`/tests/${test.id}`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Sil"
                            onClick={() => handleDelete(test.id, test.title)}
                            disabled={deletingId === test.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          >
                            {deletingId === test.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
