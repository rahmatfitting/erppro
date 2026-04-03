"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Edit, Trash2, Eye, FileText, Cpu } from "lucide-react";

export default function BOMListPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ppic/bom?keyword=${searchTerm}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Gagal memuat BOM:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleDelete = async (id: number) => {
    if (!confirm("Anda yakin ingin menghapus BOM ini?")) return;
    try {
      const res = await fetch(`/api/ppic/bom/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error);
      }
    } catch (error) {
      alert("Terjadi kesalahan saat menghapus");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bill of Materials (BOM)</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola resep dan struktur produk manufaktur</p>
        </div>
        <Link
          href="/ppic/bom/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
        >
          <Plus className="h-4 w-4" />
          Tambah BOM Baru
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode, nama, atau produk..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Filter className="h-4 w-4 text-slate-400" />
          Filter
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-semibold">Kode BOM</th>
                <th className="px-6 py-4 font-semibold">Nama Struktur</th>
                <th className="px-6 py-4 font-semibold">Produk Jadi</th>
                <th className="px-6 py-4 font-semibold">Keterangan</th>
                <th className="px-6 py-4 text-center font-semibold text-slate-900 dark:text-white">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex justify-center flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                        <span>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 grayscale opacity-50">
                        <Cpu className="h-12 w-12" />
                        <span>Belum ada data BOM</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.nomor} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {item.kode}
                    </td>
                    <td className="px-6 py-4">{item.nama}</td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="h-8 w-8 rounded bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Cpu className="h-4 w-4" />
                           </div>
                           <span className="font-semibold">{item.item_nama}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 truncate max-w-xs">{item.keterangan || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Link
                          href={`/ppic/bom/${item.nomor}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 transition-all"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/ppic/bom/create?id=${item.nomor}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.nomor)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
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
