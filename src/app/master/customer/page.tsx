"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Building2, Loader2, Edit, AlertCircle, Printer } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ReportFilterModal from "@/components/ReportFilterModal";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

export default function MasterCustomerPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchData = async (keyword = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/customer?keyword=${keyword}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch (err) {
      setError("Gagal mengambil data customer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(searchQuery);
  };

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
        keyword: searchQuery
      });

      const response = await fetch(`/api/master/customer?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        const exportColumns = [
          { header: "No", key: "_no" },
          { header: "Kode", key: "kode" },
          { header: "Nama Customer", key: "nama" },
          { header: "Telepon", key: "telepon" },
          { header: "Kontak Person", key: "kontak_person" },
          { header: "Status", key: "status_aktif", format: (v: any) => v === 1 ? 'Aktif' : 'Nonaktif' }
        ];

        const config = {
          title: "Master Data Customer",
          subtitle: `Periode Input: ${startDate} s/d ${endDate}`,
          fileName: `Master_Customer_${startDate}_${endDate}`,
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

  const handleToggleStatus = async (id: string, currentStatus: number) => {
    if (!confirm(`Apakah Anda yakin ingin ${currentStatus === 1 ? 'menonaktifkan' : 'mengaktifkan'} customer ini?`)) return;
    
    try {
      const res = await fetch('/api/master/customer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status_aktif: currentStatus === 1 ? 0 : 1 })
      });
      const result = await res.json();
      if (result.success) {
        fetchData(searchQuery);
      } else {
        alert(result.error);
      }
    } catch (error) {
       alert("Terjadi kesalahan sistem");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Master Customer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data pelanggan untuk transaksi penjualan.
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
            href="/master/customer/create"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            >
            <Plus className="h-4 w-4" />
            Tambah Customer
            </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
          <button 
            type="submit"
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cari
          </button>
        </form>
      </div>

      {error && (
         <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4"/> {error}
         </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 uppercase text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Customer</th>
                <th className="px-6 py-4">Telepon</th>
                <th className="px-6 py-4">Kontak Person</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data customer yang ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.nomor} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {item.kode}
                    </td>
                    <td className="px-6 py-4">{item.nama}</td>
                    <td className="px-6 py-4">{item.telepon || '-'}</td>
                    <td className="px-6 py-4">{item.kontak_person || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        item.status_aktif === 1 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                      }`}>
                        {item.status_aktif === 1 ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/master/customer/${item.nomor}?mode=view`} title="View" className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                          <Search className="h-4 w-4" />
                        </Link>
                        <Link href={`/master/customer/${item.nomor}?mode=edit`} title="Edit" className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                          <Edit className="h-4 w-4" />
                        </Link>
                        {item.status_aktif === 1 ? (
                           <button onClick={() => handleToggleStatus(item.nomor, 1)} title="Nonaktifkan" className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                             <Trash2 className="h-4 w-4" />
                           </button>
                        ) : (
                           <button onClick={() => handleToggleStatus(item.nomor, 0)} title="Aktifkan" className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                           </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReportFilterModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Print Master Customer"
        onFilter={handleExport}
      />
    </div>
  );
}
