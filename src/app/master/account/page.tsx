"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, BookOpen, CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function AccountList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/account?keyword=${encodeURIComponent(keyword)}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch {
      setError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Master Account</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Daftar akun keuangan perusahaan</p>
          </div>
        </div>
        <Link
          href="/master/account/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Tambah Account
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode, inisial, nama..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchData()}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" /> Cari
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && <div className="p-4 text-red-600 text-sm">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Kode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Inisial</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Nama Account</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Kas</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Bank</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Detail</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">UMS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada data account</td></tr>
              ) : data.map(row => (
                <tr key={row.nomor} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{row.kode}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.kode_inisial}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{row.nama}</td>
                  <td className="px-4 py-3 text-center">
                    {row.kas ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.bank ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.detail ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.is_browse_ums ? <CheckCircle className="h-4 w-4 text-indigo-500 mx-auto" /> : <XCircle className="h-4 w-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/master/account/${row.kode}`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
