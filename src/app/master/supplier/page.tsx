"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Users, FileEdit, Trash2, Printer, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import ReportFilterModal from "@/components/ReportFilterModal";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

export default function SupplierList() {
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // Filters State
  const [filters, setFilters] = useState({
    keyword: ""
  });

  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (pageNum: number, isLoadMore = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        keyword: filters.keyword
      });

      const response = await fetch(`/api/master/supplier?${queryParams.toString()}`);
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
      console.error("Failed to fetch Supplier list:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, ITEMS_PER_PAGE]);

  useEffect(() => {
    setPage(1);
    fetchData(1, false);
  }, [filters, fetchData]);

  const handleAction = async (id: string, action: 'delete') => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data supplier ini?`)) return;
    try {
      const res = await fetch('/api/master/supplier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      const result = await res.json();
      if (result.success) {
         fetchData(1, false);
      } else {
         alert(result.error || "Gagal menghapus supplier");
      }
    } catch (error) {
       alert("Terjadi kesalahan sistem");
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

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [loadMore, hasMore, loading]);

  const handleExport = async (startDate: string, endDate: string, exportType: 'view' | 'pdf' | 'excel' | 'pivot') => {
    try {
      if (exportType === 'view') {
        setIsReportModalOpen(false);
        return;
      }

      setLoading(true);
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        limit: "999999",
        keyword: filters.keyword
      });

      const response = await fetch(`/api/master/supplier?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        const exportColumns = [
          { header: "No", key: "_no" },
          { header: "Kode", key: "kode" },
          { header: "Nama Supplier", key: "nama" },
          { header: "Kontak Person", key: "kontak_person" },
          { header: "Telepon", key: "telepon" },
          { header: "Email", key: "email" },
          { header: "Alamat", key: "alamat" }
        ];

        const config = {
          title: "Master Data Supplier",
          subtitle: `Periode Input: ${startDate} s/d ${endDate}`,
          fileName: `Master_Supplier_${startDate}_${endDate}`,
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
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Master Supplier
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Kelola data vendor, pemasok, dan mitra bisnis.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
                <Printer className="h-4 w-4" />
                Print List
            </button>
            <Link
            href="/master/supplier/create"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
            <Plus className="h-4 w-4" />
            Tambah Supplier Baru
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
                placeholder="Cari Kode, Nama Supplier, atau PIC..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                className="w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
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
                <th className="px-6 py-4 font-semibold w-32">Kode</th>
                <th className="px-6 py-4 font-semibold">Nama Supplier</th>
                <th className="px-6 py-4 font-semibold">Kontak</th>
                <th className="px-6 py-4 font-semibold w-64">Alamat</th>
                <th className="px-6 py-4 font-semibold text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {data.map((item) => (
                <tr key={item.nomor} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-200">
                     {item.kode}
                  </td>
                  <td className="px-6 py-4">
                     <div className="font-medium text-slate-900 dark:text-slate-200">{item.nama}</div>
                     {item.kontak_person && (
                        <div className="text-xs text-slate-500 mt-1">PIC: {item.kontak_person}</div>
                     )}
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-col gap-1.5 text-xs">
                        {item.telepon ? (
                           <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <Phone className="h-3 w-3" /> {item.telepon}
                           </div>
                        ) : null}
                        {item.email ? (
                           <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <Mail className="h-3 w-3" /> {item.email}
                           </div>
                        ) : null}
                        {!item.telepon && !item.email && <span className="text-slate-400 italic">Kosong</span>}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs truncate max-w-[200px]" title={item.alamat}>
                     {item.alamat || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/master/supplier/${item.nomor}`} title="View" className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                        <Search className="h-4 w-4" />
                      </Link>
                      <button title="Delete" onClick={() => handleAction(item.nomor, 'delete')} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {data.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                         <Search className="h-8 w-8 mb-3 opacity-20" />
                         <p>Tidak ada Master Supplier yang ditemukan.</p>
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
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 object-top border-t-transparent dark:border-indigo-500"></div>
                  Memuat data...
                </>
             ) : (
                "Scroll untuk melihat lebih banyak"
             )}
           </div>
        )}
      </div>

      <ReportFilterModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Print Master Supplier"
        onFilter={handleExport}
      />
    </div>
  );
}
