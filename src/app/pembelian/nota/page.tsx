"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Receipt, MoreHorizontal, FileEdit, Trash2, CalendarDays, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { Printer } from "lucide-react";
import ReportFilterModal from "@/components/ReportFilterModal";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

export default function NotaBeliList() {
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;

  // Filters State
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    supplier: "",
    keyword: ""
  });
  const [isBrowseSupplierOpen, setIsBrowseSupplierOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (pageNum: number, isLoadMore = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        keyword: filters.keyword,
        startDate: filters.startDate,
        endDate: filters.endDate,
        supplier: filters.supplier
      });

      const response = await fetch(`/api/pembelian/nota?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        if (isLoadMore) {
          setData(prev => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }
        
        // If we get fewer items than requested, we've hit the end
        setHasMore(result.data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error("Failed to fetch Nota list:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, ITEMS_PER_PAGE]);

  // Initial Load & Filter Changes (debounce could be added here)
  useEffect(() => {
    setPage(1);
    fetchData(1, false);
  }, [filters, fetchData]);

  const handleAction = async (id: string, action: 'approve' | 'disapprove' | 'delete') => {
    const actionText = action === 'delete' ? 'menghapus' : action === 'approve' ? 'menyetujui' : 'menolak';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} data ini?`)) return;
    
    setIsPending(true);
    try {
      const res = await fetch(`/api/pembelian/nota`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      const result = await res.json();
      if (result.success) {
        fetchData(1, false);
      } else {
        alert(result.error || "Gagal melakukan aksi");
      }
    } catch (error) {
       alert("Terjadi kesalahan sistem");
    } finally {
      setIsPending(false);
    }
  };

  // Lazy Load more data handler
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, true);
  }, [page, hasMore, loading, fetchData]);

  // Intersection Observer for Infinite Scroll
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
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [loadMore, hasMore, loading]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusDisplay = (aktif: number, disetujui: number) => {
    if (aktif === 0) return { label: 'Dibatalkan', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' };
    if (disetujui === 1) return { label: 'Disetujui', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
    return { label: 'Menunggu Approval', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
  };

  const handleExport = async (startDate: string, endDate: string, exportType: 'view' | 'pdf' | 'excel' | 'pivot') => {
    try {
      if (exportType === 'view') {
        setFilters(prev => ({ ...prev, startDate, endDate }));
        setIsReportModalOpen(false);
        return;
      }

      setLoading(true);
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        limit: "999999",
        keyword: filters.keyword,
        supplier: filters.supplier
      });

      const response = await fetch(`/api/pembelian/nota?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        const exportColumns = [
          { header: "No", key: "_no" },
          { header: "No. Nota", key: "kode" },
          { header: "Tgl Nota", key: "tanggal", format: (v: any) => new Date(v).toLocaleDateString('id-ID') },
          { header: "Supplier", key: "supplier" },
          { header: "Jatuh Tempo", key: "jatuh_tempo", format: (v: any) => new Date(v).toLocaleDateString('id-ID') },
          { header: "Nilai Tagihan", key: "total", format: (v: any) => formatCurrency(v) },
          { header: "Status", key: "status_disetujui", format: (v: any) => v === 1 ? "Disetujui" : "Pending" }
        ];

        const config = {
          title: "Laporan Nota Pembelian (Invoice)",
          subtitle: `Periode: ${startDate} s/d ${endDate}`,
          fileName: `Laporan_Nota_${startDate}_${endDate}`,
          columns: exportColumns,
          data: result.data
        };

        if (exportType === 'pdf') {
          exportToPDF(config);
        } else {
          await exportToExcel(config, exportType === 'pivot');
        }
      }
      setIsReportModalOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      alert("Gagal melakukan export data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-rose-600 dark:text-rose-500" />
            Nota Beli (Invoice)
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Daftar tagihan dari supplier berdasarkan penerimaan barang.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
                <Printer className="h-4 w-4" />
                Cetak Laporan
            </button>
            <Link 
            href="/pembelian/nota/create" 
            className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
            >
            <Plus className="h-4 w-4" />
            Buat Nota Beli
            </Link>
        </div>
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
                placeholder="No. Nota Internal/Supplier..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                className="w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
          
          <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tgl. Awal</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tgl. Akhir</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="w-full md:w-56 space-y-1.5">
             <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Supplier</label>
             <div className="relative">
                <input
                  type="text"
                  readOnly
                  placeholder="Semua Supplier..."
                  value={filters.supplier}
                  onClick={() => setIsBrowseSupplierOpen(true)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none cursor-pointer focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
                {filters.supplier && (
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, supplier: "" }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 relative min-w-[900px]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-950 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">No. Nota</th>
                <th className="px-6 py-4 font-semibold">Tgl Nota</th>
                <th className="px-6 py-4 font-semibold">Supplier</th>
                <th className="px-6 py-4 font-semibold">Jatuh Tempo</th>
                <th className="px-6 py-4 font-semibold text-right">Nilai Tagihan</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {data.map((item) => (
                <tr key={item.nomor} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <Link href="#" className="font-medium text-rose-600 dark:text-rose-400 hover:underline">{item.kode}</Link>
                      <span className="text-xs text-slate-400 font-mono mt-0.5">{item.nomor_faktur_supplier}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">
                    {item.supplier}
                  </td>
                  <td className="px-6 py-4">
                     <span className={cn(
                        "text-sm",
                        (item.status_aktif === 1 && item.status_disetujui === 0 && (Date.now() - new Date(item.jatuh_tempo).getTime() > 0)) ? "text-rose-600 font-medium dark:text-rose-400" : ""
                     )}>
                        {new Date(item.jatuh_tempo).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-200">
                    {formatCurrency(item.total)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider",
                      getStatusDisplay(item.status_aktif, item.status_disetujui).color
                    )}>
                      {getStatusDisplay(item.status_aktif, item.status_disetujui).label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/pembelian/nota/${item.nomor}`} title="View" className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                        <Search className="h-4 w-4" />
                      </Link>
                      
                      {item.status_aktif === 1 && item.status_disetujui === 0 && (
                        <>
                          <button 
                            onClick={() => handleAction(item.nomor, 'approve')}
                            disabled={isPending}
                            title="Approve" 
                            className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700 disabled:opacity-50"
                          >
                             {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                          </button>
                          <button 
                            onClick={() => handleAction(item.nomor, 'disapprove')}
                            disabled={isPending}
                            title="Disapprove" 
                            className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700 disabled:opacity-50"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                          <button 
                            onClick={() => handleAction(item.nomor, 'delete')}
                            disabled={isPending}
                            title="Delete" 
                            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {data.length === 0 && (
                <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                         <Search className="h-8 w-8 mb-3 opacity-20" />
                         <p>Tidak ada data Nota Beli yang ditemukan.</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Lazy Loading Indicator */}
        {hasMore && (
           <div ref={observerTarget} className="p-6 flex justify-center items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
             {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-600 object-top border-t-transparent dark:border-rose-500"></div>
                  Memuat data...
                </>
             ) : (
                "Scroll untuk melihat lebih banyak"
             )}
           </div>
        )}
        {!hasMore && data.length > 0 && (
           <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/50">
              Semua data telah ditampilkan ({data.length} transaksi)
           </div>
        )}
      </div>
      <BrowseSupplierModal 
        isOpen={isBrowseSupplierOpen}
        onClose={() => setIsBrowseSupplierOpen(false)}
        onSelect={(supplier) => {
          setFilters(prev => ({ ...prev, supplier: supplier.nama }));
          setIsBrowseSupplierOpen(false);
        }}
      />

      <ReportFilterModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Print Laporan Nota Beli"
        onFilter={handleExport}
      />
    </div>
  );
}
