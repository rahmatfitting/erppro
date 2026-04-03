"use client";

import { useState } from "react";
import { FileText, Receipt, SearchCheck, ClipboardList, Loader2, AlertCircle } from "lucide-react";
import ReportFilterModal from "@/components/ReportFilterModal";
import { exportToPDF, exportToExcel, exportToPivot } from "@/lib/report-utils";

const REPORT_TYPES = [
  { id: 'rekap', title: 'Laporan Rekap Pembelian', desc: 'Ringkasan total per nota nota pembelian.', icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'detail', title: 'Laporan Detail Pembelian', desc: 'Rincian barang per nota pembelian.', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'monitoring', title: 'Monitoring Permintaan', desc: 'Lacak status PR ke PO hingga Invoice.', icon: SearchCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'outstanding', title: 'Outstanding Order Beli', desc: 'Daftar PO yang belum diterima barange.', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
];

export default function ReportPembelianPage() {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastFilter, setLastFilter] = useState<{start: string, end: string} | null>(null);

  const handleFilter = async (startDate: string, endDate: string, exportType: 'view' | 'pdf' | 'excel' | 'pivot', options: any = {}) => {
    const page = typeof options === 'number' ? options : 1;
    const filterOptions = typeof options === 'object' ? options : {};
    
    setLoading(true);
    setError(null);
    try {
      const isExport = exportType !== 'view';
      const limit = isExport ? 0 : 50;
      const offset = isExport ? 0 : (page - 1) * 50;

      const res = await fetch(`/api/report/pembelian?type=${selectedReport.id}&startDate=${startDate}&endDate=${endDate}&limit=${limit}&offset=${offset}`);
      const result = await res.json();
      
      if (!result.success) throw new Error(result.error);

      const data = result.data;
      
      if (isExport) {
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        if (exportType === 'pdf') exportToPDF(selectedReport.title, columns, data, `${selectedReport.id}_${startDate}_${endDate}`);
        else if (exportType === 'excel') await exportToExcel(data, `${selectedReport.id}_${startDate}_${endDate}`);
        else if (exportType === 'pivot') exportToPivot(data, `${selectedReport.id}_${startDate}_${endDate}`);
        setSelectedReport(null); 
      } else {
        setReportData(data);
        setTotalCount(result.totalCount);
        setCurrentPage(page);
        setLastFilter({ start: startDate, end: endDate });
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Pembelian</h1>
        <p className="text-slate-500 dark:text-slate-400">Pilih jenis laporan yang ingin Anda cetak atau lihat.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {REPORT_TYPES.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report)}
            disabled={loading}
            className="group flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-500/50 dark:hover:border-indigo-400/50 transition-all duration-300 transform hover:-translate-y-1 text-left relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className={`h-12 w-12 rounded-xl ${report.bg} dark:bg-opacity-20 flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
              <report.icon className={`h-6 w-6 ${report.color}`} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {report.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {report.desc}
            </p>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <report.icon className="h-24 w-24 -mr-8 -mt-8" />
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="text-slate-500 animate-pulse font-medium">Sedang menyiapkan laporan...</p>
        </div>
      )}

      {!loading && reportData.length > 0 && (
         <div className="mt-8 space-y-4 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preview Data</h3>
                <span className="text-sm font-medium text-slate-500">{reportData.length} records found</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                            {Object.keys(reportData[0]).map(key => (
                                <th key={key} className="px-6 py-3 whitespace-nowrap">{key}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                        {reportData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                {Object.values(row).map((val: any, vidx) => (
                                    <td key={vidx} className="px-6 py-3 whitespace-nowrap">{val?.toString() || '-'}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination UI */}
            {totalCount > 50 && lastFilter && (
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-sm text-slate-500">
                        Showing <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * 50 + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * 50, totalCount)}</span> of <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> records
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1 || loading}
                            onClick={() => handleFilter(lastFilter.start, lastFilter.end, 'view', currentPage - 1)}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 font-bold text-sm"
                        >
                            Previous
                        </button>
                        <button
                            disabled={currentPage * 50 >= totalCount || loading}
                            onClick={() => handleFilter(lastFilter.start, lastFilter.end, 'view', currentPage + 1)}
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 font-bold text-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
         </div>
      )}

      {selectedReport && (
        <ReportFilterModal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={selectedReport.title}
          onFilter={handleFilter}
        />
      )}
    </div>
  );
}
