"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, FileX, RefreshCw, CheckCircle, Printer, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ReportFilterModal from "@/components/ReportFilterModal";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

const fmt = (v: any) => new Intl.NumberFormat('id-ID').format(v || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function ReturBeliList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams({ keyword, startDate, endDate });
    const res = await fetch(`/api/pembelian/retur?${params}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  };

  const handleExport = async (sDate: string, eDate: string, exportType: 'view' | 'pdf' | 'excel' | 'pivot') => {
    try {
      if (exportType === 'view') {
        setStartDate(sDate);
        setEndDate(eDate);
        setIsReportModalOpen(false);
        setTimeout(() => fetchData(), 100); 
        return;
      }

      setLoading(true);
      const queryParams = new URLSearchParams({
        startDate: sDate,
        endDate: eDate,
        limit: "999999",
        keyword
      });

      const response = await fetch(`/api/pembelian/retur?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        const exportColumns = [
          { header: "No", key: "_no" },
          { header: "Kode", key: "kode" },
          { header: "Tanggal", key: "tanggal", format: (v: any) => fmtDate(v) },
          { header: "Supplier", key: "supplier" },
          { header: "Total", key: "total", format: (v: any) => "Rp " + fmt(v) },
          { header: "Status", key: "status_disetujui", format: (v: any) => v ? "Approved" : "Pending" }
        ];

        const config = {
          title: "Laporan Retur Pembelian",
          subtitle: `Periode: ${sDate} s/d ${eDate}`,
          fileName: `Laporan_Retur_${sDate}_${eDate}`,
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

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <FileX className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Retur Beli</h1>
            <p className="text-sm text-slate-500">Daftar retur pembelian barang</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
                <Printer className="h-4 w-4" />
                Cetak Laporan
            </button>
            <Link href="/pembelian/retur/create" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus className="h-4 w-4" /> Buat Retur
            </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Kode / Supplier..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" /> Cari
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Kode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Supplier</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada data</td></tr>
              ) : data.map(row => (
                <tr key={row.nomor} className={cn("hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors", row.status_aktif === 0 && "opacity-50 select-none grayscale")}>
                  <td className={cn("px-4 py-3 font-mono font-semibold text-orange-600", row.status_aktif === 0 && "line-through text-slate-400")}>{row.kode}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmtDate(row.tanggal)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{row.supplier}</td>
                  <td className="px-4 py-3 text-right font-semibold">Rp {fmt(row.total)}</td>
                  <td className="px-4 py-3 text-center flex flex-col items-center gap-1 justify-center min-h-[50px]">
                    {row.status_aktif === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-full border border-red-200">Deleted</span>
                    ) : row.status_disetujui ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full"><CheckCircle className="h-3 w-3" /> Approved</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/pembelian/retur/${row.nomor}`} className="text-sm text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap">Lihat Detail</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReportFilterModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Print Laporan Retur Beli"
        onFilter={handleExport}
      />
    </div>
  );
}
