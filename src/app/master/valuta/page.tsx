"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Tags, Edit, Loader2, AlertCircle, Ban, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ValutaIndex() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/valuta?keyword=${keyword}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch (err) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan valuta ${name}?`)) return;

    try {
      const res = await fetch(`/api/master/valuta/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData(); // reload
      } else {
        alert(json.error || "Gagal menonaktifkan valuta");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Master Valuta
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Kelola data mata uang asing dan kurs default
          </p>
        </div>
        <Link 
          href="/master/valuta/create" 
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Tambah Valuta
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="flex gap-3 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Mata Uang..." 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border-slate-300 rounded-md outline-none focus:border-indigo-500 focus:ring-1 dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Cari
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border-b border-red-100 flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 font-semibold">Kode</th>
                <th className="px-6 py-3 font-semibold">Nama Valuta</th>
                <th className="px-6 py-3 font-semibold text-right">Default Kurs (IDR)</th>
                <th className="px-6 py-3 font-semibold">Keterangan</th>
                <th className="px-6 py-3 font-semibold text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    Belum ada data Valuta
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.kode} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                      <span className="bg-slate-100 px-2.5 py-1 rounded text-xs font-bold font-mono text-slate-700">{row.kode}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{row.nama}</td>
                    <td className="px-6 py-3 text-slate-600 text-right font-medium">
                      Rp {new Intl.NumberFormat('id-ID').format(row.kurs)}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs truncate max-w-[200px]" title={row.keterangan}>{row.keterangan || '-'}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          href={`/master/valuta/${row.kode}`}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Edit Valuta"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button 
                          onClick={() => handleDeactivate(row.kode, row.nama)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Nonaktifkan Valuta"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
