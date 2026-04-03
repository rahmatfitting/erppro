"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, Search, Filter, Eye, 
  RotateCcw, Calendar, Loader2
} from "lucide-react";

export default function KembalibahanListPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ppic/kembalibahan?keyword=${searchTerm}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Gagal memuat Pengembalian Bahan:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-fuchsia-600" />
            Pengembalian Bahan Produksi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pencatatan sisa bahan yang dikembalikan ke gudang</p>
        </div>
        <Link
          href="/ppic/kembalibahan/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all font-bold"
        >
          <Plus className="h-4 w-4" />
          Retur Bahan Baru
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode dokumen atau WO..."
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-950/80 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Kode Retur</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Gudang Tujuan</th>
                <th className="px-6 py-4">Ref. WO</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-black uppercase tracking-widest">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-black uppercase tracking-widest">BELUM ADA DATA PENGEMBALIAN</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.nomor} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{item.kode}</td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(item.tanggal).toLocaleDateString()}
                       </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-fuchsia-600">
                       {item.gudang_nama || "-"}
                    </td>
                    <td className="px-6 py-4">
                       {item.wo_kode ? (
                         <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded border border-indigo-100 uppercase">
                            {item.wo_kode}
                         </span>
                       ) : "-"}
                    </td>
                    <td className="px-6 py-4 truncate max-w-[200px]">{item.keterangan || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Link href={`/ppic/kembalibahan/${item.nomor}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-all">
                          <Eye className="h-4 w-4" />
                        </Link>
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
