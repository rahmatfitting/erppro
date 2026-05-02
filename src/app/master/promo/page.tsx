"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Ticket, FileEdit, Trash2, Filter, Clock, Calendar, CheckCircle2, XCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PromoList() {
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [filters, setFilters] = useState({
    keyword: "",
    status: "active"
  });

  const observerTarget = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 20;

  const fetchData = useCallback(async (pageNum: number, isLoadMore = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        keyword: filters.keyword,
        status: filters.status
      });

      const response = await fetch(`/api/master/promo?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        if (isLoadMore) {
          setData(prev => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }
        setHasMore(result.data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error("Failed to fetch Promo list:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, ITEMS_PER_PAGE]);

  useEffect(() => {
    setPage(1);
    fetchData(1, false);
  }, [filters, fetchData]);

  const handleToggleStatus = async (id: number, currentStatus: number) => {
    if (!confirm(`Apakah Anda yakin ingin ${currentStatus ? 'Menonaktifkan' : 'Mengaktifkan'} promo ini?`)) return;
    try {
      const res = await fetch(`/api/master/promo/${id}`, {
        method: 'DELETE', // Our DELETE logic currently just toggles status to 0
      });
      const result = await res.json();
      if (result.success) {
        fetchData(1, false);
      }
    } catch (error) {
      alert("Gagal mengubah status promo");
    }
  };

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, true);
  }, [page, hasMore, loading, fetchData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [loadMore, hasMore, loading]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Ticket className="h-6 w-6 text-indigo-600" />
            Manajemen Promosi
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Atur berbagai jenis diskon, promo bundling, dan penawaran khusus.
          </p>
        </div>
        <Link
          href="/master/promo/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Buat Promo Baru
        </Link>
      </div>

      {/* Filter Area */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Cari Promo</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Nama promo atau kode..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
            >
              <option value="active">Sedang Aktif</option>
              <option value="inactive">Non-Aktif</option>
              <option value="all">Semua</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((promo) => (
          <div key={promo.nomor} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col">
            {/* Promo Type Badge */}
            <div className="absolute top-4 right-4 z-10">
               <span className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter",
                  promo.jenis_promo === 'PERCENT' ? "bg-amber-100 text-amber-700" :
                  promo.jenis_promo === 'NOMINAL' ? "bg-emerald-100 text-emerald-700" :
                  "bg-indigo-100 text-indigo-700"
               )}>
                  {promo.jenis_promo}
               </span>
            </div>

            <div className="p-6 flex-1">
               <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                     <Ticket className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                     <h3 className="font-bold text-slate-900 dark:text-white truncate" title={promo.nama}>{promo.nama}</h3>
                     <p className="text-xs font-mono text-slate-400">{promo.kode}</p>
                  </div>
               </div>

               <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                     <Calendar className="h-4 w-4 text-slate-400" />
                     <span>{promo.tanggal_mulai || 'Always'} - {promo.tanggal_selesai || 'Always'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                     <Clock className="h-4 w-4 text-slate-400" />
                     <span>{promo.jam_mulai.substring(0,5)} - {promo.jam_selesai.substring(0,5)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                     <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Keuntungan</p>
                     <p className="font-bold text-indigo-600 text-lg">
                        {promo.jenis_promo === 'PERCENT' ? `${promo.nilai_promo}% OFF` : 
                         promo.jenis_promo === 'NOMINAL' ? `${formatCurrency(promo.nilai_promo)} OFF` : 
                         promo.jenis_promo}
                     </p>
                     {promo.min_pembelian > 0 && <p className="text-[10px] text-slate-500">Min. Belanja: {formatCurrency(promo.min_pembelian)}</p>}
                  </div>
               </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <button 
                     onClick={() => handleToggleStatus(promo.nomor, promo.status_aktif)}
                     className={cn(
                        "flex items-center gap-1 text-xs font-bold transition-colors",
                        promo.status_aktif ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-slate-600"
                     )}
                  >
                     {promo.status_aktif ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                     {promo.status_aktif ? "Aktif" : "Non-aktif"}
                  </button>
               </div>
               <div className="flex items-center gap-1">
                  <Link href={`/master/promo/${promo.nomor}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200">
                     <Eye className="h-4 w-4" />
                  </Link>
                  <Link href={`/master/promo/${promo.nomor}/edit`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200">
                     <FileEdit className="h-4 w-4" />
                  </Link>
                  <button onClick={() => handleToggleStatus(promo.nomor, 1)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200">
                     <Trash2 className="h-4 w-4" />
                  </button>
               </div>
            </div>
            
            {/* Priority Indicator */}
            {promo.prioritas > 0 && (
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
            )}
          </div>
        ))}

        {data.length === 0 && !loading && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400">
             <Ticket className="h-16 w-16 mb-4 opacity-10" />
             <p className="font-bold text-lg">Tidak ada promo ditemukan</p>
             <p className="text-sm">Klik tombol "Buat Promo Baru" untuk memulai.</p>
          </div>
        )}
        
        {loading && (
           <div className="col-span-full py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
           </div>
        )}
      </div>

      <div ref={observerTarget} className="h-10"></div>
    </div>
  );
}
