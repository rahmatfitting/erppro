"use client";

import { useState } from "react";
import { 
  FileText, 
  SearchCheck, 
  ClipboardList, 
  Loader2, 
  AlertCircle,
  Archive,
  BarChart3,
  PackageOpen,
  Boxes
} from "lucide-react";
import ReportFilterModal from "@/components/ReportFilterModal";
import { exportToPDF, exportToExcel, exportToPivot } from "@/lib/report-utils";

const REPORT_TYPES = [
  { id: 'kartu', title: 'Kartu Stok Barang', desc: 'Histori keluar masuk barang per item dan gudang secara detail.', icon: Archive, color: 'text-blue-600', bg: 'bg-blue-50', showBarang: true, showGudang: true },
  { id: 'posisi', title: 'Posisi Stok', desc: 'Saldo stok barang saat ini per item dan per gudang.', icon: Boxes, color: 'text-indigo-600', bg: 'bg-indigo-50', showGudang: true },
  { id: 'mutasi', title: 'Mutasi Stok', desc: 'Ringkasan saldo awal, masuk, keluar dan saldo akhir per item.', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50', showGudang: true },
];

export default function ReportStokPage() {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [extraInfo, setExtraInfo] = useState<any>(null);

  const handleFilter = async (startDate: string, endDate: string, exportType: 'view' | 'pdf' | 'excel' | 'pivot', options: any = {}) => {
    setLoading(true);
    setError(null);
    try {
      const isExport = exportType !== 'view';
      
      let url = `/api/report/stok?type=${selectedReport.id}&startDate=${startDate}&endDate=${endDate}`;
      if (options.nomormhbarang) url += `&nomormhbarang=${options.nomormhbarang}`;
      if (options.nomormhgudang) url += `&nomormhgudang=${options.nomormhgudang}`;

      const res = await fetch(url);
      const result = await res.json();
      
      if (!result.success) throw new Error(result.error);

      const data = result.data;
      
      if (isExport) {
        let exportData = data;
        let exportColumns = data.length > 0 ? Object.keys(data[0]) : [];

        if (selectedReport.id === 'kartu' && result.extra?.itemName) {
           exportData = data.map((r: any) => ({ 
             nama_barang: result.extra.itemName, 
             ...r 
           }));
           exportColumns = ['nama_barang', ...exportColumns];
        }

        if (exportType === 'pdf') exportToPDF(selectedReport.title, exportColumns, exportData, `${selectedReport.id}_${startDate}_${endDate}`);
        else if (exportType === 'excel') await exportToExcel(exportData, `${selectedReport.id}_${startDate}_${endDate}`);
        else if (exportType === 'pivot') exportToPivot(exportData, `${selectedReport.id}_${startDate}_${endDate}`);
      } else {
        setReportData(data);
        setExtraInfo(result.extra);
      }
      setSelectedReport(null);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Stok</h1>
        <p className="text-slate-500 dark:text-slate-400">Monitoring persediaan barang dan mutasi stok secara real-time.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {!loading && (reportData.length > 0 || extraInfo?.openingBalance !== undefined) && (
         <div className="mt-8 space-y-4 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">Preview Data: {selectedReport?.title}</h3>
                <span className="text-sm font-medium text-slate-500">{reportData.length} records found</span>
            </div>

            {selectedReport?.id === 'kartu' && extraInfo?.openingBalance !== undefined && (
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between items-center border border-slate-200 dark:border-slate-700">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Saldo Awal :</span>
                <span className="text-lg font-mono font-bold text-indigo-600 uppercase">
                  {extraInfo.openingBalance} Qty
                </span>
              </div>
            )}

            {reportData.length === 0 && (
              <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                <p className="text-slate-500 font-medium italic">Tidak ada transaksi dalam periode ini.</p>
              </div>
            )}

            {reportData.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                          <tr>
                              <th className="px-4 py-3 w-10 text-center">No</th>
                              {Object.keys(reportData[0]).map(key => (
                                  <th key={key} className="px-6 py-3 whitespace-nowrap">{key.replace(/_/g, ' ').toUpperCase()}</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                          {reportData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                                  {Object.values(row).map((val: any, vidx) => (
                                      <td key={vidx} className={`px-6 py-3 whitespace-nowrap ${typeof val === 'number' ? 'text-right font-mono' : ''}`}>
                                        {typeof val === 'number' && !keyIncludesDate(Object.keys(row)[vidx]) 
                                          ? new Intl.NumberFormat('id-ID').format(val) 
                                          : (val?.toString() || '-')}
                                      </td>
                                  ))}
                              </tr>
                          ))}
                      </tbody>
                  </table>
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
          showBarang={selectedReport.showBarang}
          showGudang={selectedReport.showGudang}
          showOnlyEndDate={selectedReport.id === 'posisi'}
        />
      )}
    </div>
  );
}

function keyIncludesDate(key: string) {
  const k = key.toLowerCase();
  return k.includes('tanggal') || k.includes('date') || k.includes('tempo');
}
