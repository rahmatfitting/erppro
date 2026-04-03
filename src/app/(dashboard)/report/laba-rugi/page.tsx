"use client";

import { useState } from "react";
import { 
  BarChart3, 
  Loader2, 
  AlertCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Layers,
  Filter
} from "lucide-react";
import LabaRugiFilterModal from "@/components/LabaRugiFilterModal";
import { exportToPDF, exportToExcel } from "@/lib/report-utils";
import { cn } from "@/lib/utils";

export default function LabaRugiPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterInfo, setFilterInfo] = useState<any>(null);

  const handleFilter = async (filterData: any) => {
    setLoading(true);
    setError(null);
    setFilterInfo(filterData);
    try {
      const isExport = filterData.exportType !== 'view';
      
      let url = `/api/report/laba-rugi?startDate=${filterData.startDate}&endDate=${filterData.endDate}&comparison=${filterData.comparison}`;
      if (filterData.nomormhcabang) url += `&nomormhcabang=${filterData.nomormhcabang}`;

      const res = await fetch(url);
      const result = await res.json();
      
      if (!result.success) throw new Error(result.error);

      const data = result.data;
      const cols = result.columns;
      
      if (isExport) {
        if (filterData.exportType === 'pdf') {
            const pdfCols = ['KODE', 'NAMA AKUN', ...cols];
            const pdfRows = data.map((r: any) => {
                if (r.isHeader) return [r.name, '', ...cols.map(() => '')];
                return [r.kode || '', r.name, ...cols.map((c: string) => r[c])];
            });
            exportToPDF("LAPORAN LABA RUGI", pdfCols, pdfRows, `laba_rugi_${filterData.startDate}_${filterData.endDate}`);
        } else if (filterData.exportType === 'excel') {
            await exportToExcel(data, `laba_rugi_${filterData.startDate}_${filterData.endDate}`);
        }
      } else {
        setReportData(data);
        setColumns(cols);
      }
      setIsFilterModalOpen(false);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-600" />
            Laporan Laba Rugi
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Analisis pendapatan dan beban untuk memantau performa keuangan.</p>
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
        >
          <Filter className="h-5 w-5" />
          Filter Laporan
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {!loading && reportData.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Layers className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-400">Belum ada data laporan</h3>
            <p className="text-slate-400 max-w-xs text-center mt-1">Gunakan tombol filter di atas untuk menampilkan laporan laba rugi.</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 animate-pulse font-medium text-lg">Menghitung performa keuangan...</p>
        </div>
      )}

      {!loading && reportData.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
           {filterInfo && (
             <div className="flex flex-wrap gap-3">
                <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                    <FileText className="h-3.5 w-3.5" />
                    PERIODE: {filterInfo.startDate} - {filterInfo.endDate}
                </div>
                <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2 border border-slate-200 dark:border-slate-700 uppercase">
                    <TrendingUp className="h-3.5 w-3.5" />
                    MODE: {filterInfo.comparison === 'branch' ? 'Per Cabang' : 'Per Periode'}
                </div>
             </div>
           )}

           <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
             <table className="w-full text-sm text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                   <th className="px-6 py-4 font-bold text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">NAMA AKUN</th>
                   {columns.map(col => (
                     <th key={col} className="px-6 py-4 font-bold text-slate-900 dark:text-white text-right uppercase tracking-wider min-w-[150px]">{col}</th>
                   ))}
                   <th className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400 text-right uppercase tracking-wider min-w-[150px] bg-indigo-50/30 dark:bg-indigo-900/10">TOTAL</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {reportData.map((row, idx) => {
                   // Calculate Total for the row
                   const rowTotal = columns.reduce((sum, col) => sum + (Number(row[col]) || 0), 0);

                   if (row.isHeader) {
                     return (
                       <tr key={idx} className="bg-slate-50/80 dark:bg-slate-800/30">
                         <td colSpan={columns.length + 2} className="px-6 py-3 font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px] border-l-4 border-indigo-500">
                           {row.name}
                         </td>
                       </tr>
                     );
                   }

                   if (row.isSubtotal) {
                     return (
                       <tr key={idx} className="bg-slate-50/50 dark:bg-slate-800/20 font-bold">
                         <td className="px-6 py-4 text-slate-900 dark:text-white italic sticky left-0 bg-slate-50 dark:bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{row.name}</td>
                         {columns.map(col => (
                           <td key={col} className="px-6 py-4 text-right text-slate-900 dark:text-white underline decoration-dotted underline-offset-4">
                             {formatCurrency(row[col])}
                           </td>
                         ))}
                         <td className="px-6 py-4 text-right text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10">
                           {formatCurrency(rowTotal)}
                         </td>
                       </tr>
                     );
                   }

                   if (row.isTotal) {
                     return (
                       <tr key={idx} className={cn(
                           "font-black text-base border-t-2 border-slate-300 dark:border-slate-700",
                           row.id === 'net_profit' ? "bg-indigo-600 text-white dark:bg-indigo-700" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                       )}>
                         <td className={cn(
                             "px-6 py-5 sticky left-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)]",
                             row.id === 'net_profit' ? "bg-indigo-600 dark:bg-indigo-700" : "bg-slate-100 dark:bg-slate-800"
                         )}>
                            <div className="flex items-center gap-2">
                                {row.id === 'net_profit' && <TrendingUp className="h-5 w-5" />}
                                {row.name}
                            </div>
                         </td>
                         {columns.map(col => (
                           <td key={col} className="px-6 py-5 text-right font-mono">
                             {formatCurrency(row[col])}
                           </td>
                         ))}
                         <td className={cn(
                             "px-6 py-5 text-right font-mono",
                             row.id === 'net_profit' ? "bg-indigo-700/50" : "bg-indigo-50/50 dark:bg-indigo-900/20"
                         )}>
                           {formatCurrency(rowTotal)}
                         </td>
                       </tr>
                     );
                   }

                   return (
                     <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                       <td className="px-10 py-3 text-slate-600 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          <div className="flex flex-col">
                            <span className="font-medium">{row.nama}</span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">{row.kode}</span>
                          </div>
                       </td>
                       {columns.map(col => (
                         <td key={col} className="px-6 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                           {formatCurrency(row[col])}
                         </td>
                       ))}
                       <td className="px-6 py-3 text-right font-mono text-slate-900 dark:text-white font-bold bg-slate-50/30 dark:bg-slate-800/30">
                         {formatCurrency(rowTotal)}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>

           <div className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50">
                <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-400">Ringkasan Laba Rugi Berhasil Dimuat</h4>
                    <p className="text-sm text-indigo-700 dark:text-indigo-500/80">Analisis di atas menampilkan perhitungan pendapatan dikurangi beban berdasarkan filter yang Anda pilih.</p>
                </div>
           </div>
        </div>
      )}

      <LabaRugiFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onFilter={handleFilter}
      />
    </div>
  );
}
