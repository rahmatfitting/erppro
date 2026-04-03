"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Wallet, FileEdit, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PenyesuaianList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        keyword: keyword
      });

      const response = await fetch(`/api/master/penyesuaian?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch Penyesuaian list:", error);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (nomor: number) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data ini?`)) return;
    try {
      const res = await fetch('/api/master/penyesuaian', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomor, action: 'delete' })
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert(result.error || "Gagal menghapus data");
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600 dark:text-indigo-500" />
            Jenis Penyesuaian
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Kelola kategori penyesuaian stok untuk stok opname.
          </p>
        </div>
        <Link 
          href="/master/penyesuaian/create" 
          className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tambah Baru
        </Link>
      </div>

      {/* Filter Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pencarian</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Nama atau Keterangan..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 relative min-w-[800px]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-950 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Nama</th>
                <th className="px-6 py-4 font-semibold">Account</th>
                <th className="px-6 py-4 font-semibold">Keterangan</th>
                <th className="px-6 py-4 font-semibold text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                      <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : data.map((item) => (
                <tr key={item.nomor} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                     {item.nama}
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-col">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{item.account_nama || '-'}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 italic">
                     {item.keterangan || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/master/penyesuaian/${item.nomor}`} title="Edit" className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                        <FileEdit className="h-4 w-4" />
                      </Link>
                      <button title="Delete" onClick={() => handleDelete(item.nomor)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {!loading && data.length === 0 && (
                <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                         <Search className="h-8 w-8 mb-3 opacity-20" />
                         <p>Tidak ada data yang ditemukan.</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
