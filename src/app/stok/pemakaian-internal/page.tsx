"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, PackageOpen, Trash2, CalendarDays, Loader2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PemakaianInternalList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [filters, setFilters] = useState({
    keyword: "",
    startDate: "",
    endDate: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`/api/stok/pemakaian-internal?${queryParams.toString()}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch list:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (id: string, action: 'approve' | 'disapprove' | 'delete') => {
    if (!confirm(`Apakah Anda yakin ingin ${action === 'delete' ? 'menghapus' : action === 'approve' ? 'menyetujui' : 'membatalkan approval'} data ini?`)) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/stok/pemakaian-internal/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert(result.error);
      }
    } catch (error) {
       alert("Terjadi kesalahan sistem");
    } finally {
      setIsPending(false);
    }
  };

  const getStatusDisplay = (aktif: number, disetujui: number) => {
    if (aktif === 0) return { label: 'Dibatalkan', color: 'bg-red-50 text-red-700 border-red-200' };
    if (disetujui === 1) return { label: 'Disetujui', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label: 'Menunggu Approval', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <PackageOpen className="h-6 w-6 text-fuchsia-600 dark:text-fuchsia-500" />
            Pemakaian Internal
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Catat pengeluaran barang untuk keperluan internal perusahaan.
          </p>
        </div>
        <Link 
          href="/stok/pemakaian-internal/create" 
          className="inline-flex items-center justify-center gap-2 rounded-md bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-fuchsia-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Buat Pemakaian Baru
        </Link>
      </div>

      {/* Filter Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pencarian</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Kode atau Gudang..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                className="w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>
          </div>
          <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tgl. Awal</label>
            <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
          </div>
          <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tgl. Akhir</label>
            <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-[800px]">
             <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
               <tr>
                 <th className="px-6 py-4 font-semibold text-fuchsia-800">Kode</th>
                 <th className="px-6 py-4 font-semibold">Tanggal</th>
                 <th className="px-6 py-4 font-semibold">Gudang</th>
                 <th className="px-6 py-4 font-semibold">Keterangan</th>
                 <th className="px-6 py-4 font-semibold text-center">Items</th>
                 <th className="px-6 py-4 font-semibold text-center">Status</th>
                 <th className="px-6 py-4 font-semibold text-center w-24 border-l">Aksi</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {loading ? (
                 <tr><td colSpan={7} className="px-6 py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-fuchsia-500" /></td></tr>
               ) : data.map((item) => (
                 <tr key={item.nomor} className="hover:bg-slate-50/70 group">
                   <td className="px-6 py-4 font-bold text-fuchsia-600 uppercase">{item.kode}</td>
                   <td className="px-6 py-4">{new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                   <td className="px-6 py-4 font-medium text-slate-900">{item.gudang_nama}</td>
                   <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]">{item.keterangan || '-'}</td>
                   <td className="px-6 py-4 text-center font-mono">{item.itemsCount}</td>
                   <td className="px-6 py-4 text-center">
                      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide", getStatusDisplay(item.status_aktif, item.status_disetujui).color)}>
                        {getStatusDisplay(item.status_aktif, item.status_disetujui).label}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/stok/pemakaian-internal/${item.kode}`} className="p-1.5 text-slate-400 hover:text-fuchsia-600 bg-white border border-slate-200 rounded shadow-sm"><Search className="h-4 w-4" /></Link>
                      {item.status_aktif === 1 && item.status_disetujui === 0 && (
                        <>
                          <button 
                            disabled={isPending}
                            onClick={() => handleAction(item.kode, 'approve')} 
                            className="p-1.5 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded shadow-sm disabled:opacity-50"
                          >
                             {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                          </button>
                          <button 
                            disabled={isPending}
                            onClick={() => handleAction(item.kode, 'delete')} 
                            className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded shadow-sm disabled:opacity-50"
                          >
                             {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </>
                      )}
                    </div>
                   </td>
                 </tr>
               ))}
               {!loading && data.length === 0 && (
                 <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Data tidak ditemukan</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
