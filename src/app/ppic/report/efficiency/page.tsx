"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, PieChart, TrendingUp, AlertCircle, 
  ArrowLeft, Search, Loader2, CheckCircle2, XCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function EfficiencyReportPage() {
  const router = useRouter();
  const [wos, setWos] = useState<any[]>([]);
  const [selectedWo, setSelectedWo] = useState<string>("");
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWos, setLoadingWos] = useState(true);

  useEffect(() => {
    fetchWOs();
  }, []);

  const fetchWOs = async () => {
    try {
      const res = await fetch('/api/ppic/report/efficiency');
      const json = await res.json();
      if (json.success) setWos(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWos(false);
    }
  };

  const fetchReport = async (woId: string) => {
    if (!woId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ppic/report/efficiency?wo_id=${woId}`);
      const json = await res.json();
      if (json.success) setReportData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
           <button 
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           >
              <ArrowLeft className="h-5 w-5" />
           </button>
           <div>
             <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
               <BarChart3 className="h-6 w-6 text-indigo-600" />
               Analisis Efisiensi Produksi (Waste)
             </h2>
             <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">
               Perbandingan Standar (BOM) vs Aktual (Bon Bahan)
             </p>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
         <div className="w-full sm:w-auto flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm appearance-none"
              value={selectedWo}
              onChange={(e) => {
                 setSelectedWo(e.target.value);
                 fetchReport(e.target.value);
              }}
            >
               <option value="">Pilih Work Order untuk dinalisis...</option>
               {wos.map(wo => (
                  <option key={wo.nomor} value={wo.nomor}>
                     {wo.kode} - {wo.fg_nama} (Target: {wo.target_qty})
                  </option>
               ))}
            </select>
         </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400 font-black uppercase tracking-widest">
           <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
           MENGHITUNG VARIANSI...
        </div>
      ) : selectedWo && reportData.length > 0 ? (
        <div className="grid gap-6 animate-in slide-in-from-bottom-4 duration-500">
           {/* Summary Cards */}
           <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                 <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Item Komponen</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{reportData.length}</p>
                 </div>
              </div>

              {/* Find Max Waste */}
              {(() => {
                 const wastes = reportData.filter(d => d.variance > 0);
                 const totalWastePct = wastes.length / reportData.length * 100;
                 return (
                   <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                      <div className={`p-4 ${totalWastePct > 30 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'} rounded-2xl`}>
                         <AlertCircle className={`h-6 w-6 ${totalWastePct > 30 ? 'text-red-600' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Boros Material</p>
                         <p className="text-2xl font-black text-slate-900 dark:text-white">{wastes.length} Items</p>
                      </div>
                   </div>
                 )
              })()}
           </div>

           {/* Table */}
           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                       <th className="px-6 py-5">Komponen Bahan Baku</th>
                       <th className="px-6 py-5 text-right">Standar (BOM)</th>
                       <th className="px-6 py-5 text-right">Aktual (Bon)</th>
                       <th className="px-6 py-5 text-right">Selisih</th>
                       <th className="px-6 py-5 text-center">Efisiensi %</th>
                       <th className="px-6 py-5 text-center">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-bold">
                    {reportData.map((row, idx) => (
                       <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="text-slate-900 dark:text-white uppercase tracking-tighter">{row.item_nama}</span>
                                <span className="text-[10px] font-mono text-slate-400">{row.item_id}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">{row.total_std_qty.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">{row.actual_qty.toLocaleString()}</td>
                          <td className={`px-6 py-4 text-right font-black ${row.variance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                             {row.variance > 0 ? `+${row.variance.toLocaleString()}` : row.variance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                             <div className="flex flex-col items-center gap-1">
                                <span className={`text-[10px] font-black ${row.efficiency > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
                                   {Math.round(row.efficiency)}%
                                </span>
                                <div className="w-20 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                   <div 
                                      className={`h-full ${row.efficiency > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                      style={{ width: `${Math.min(row.efficiency, 100)}%` }}
                                   />
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <div className="flex justify-center">
                                {row.variance <= 0 ? (
                                   <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Hemat
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase">
                                      <XCircle className="h-3 w-3" />
                                      Boros
                                   </div>
                                )}
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      ) : selectedWo ? (
        <div className="py-20 text-center text-slate-400 italic">Data efisiensi tidak ditemukan untuk WO ini</div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center gap-6 opacity-30 grayscale pointer-events-none">
           <BarChart3 className="h-24 w-24" />
           <p className="text-sm font-black uppercase tracking-[0.3em]">SILAKAN PILIH WORK ORDER DAHULU</p>
        </div>
      )}
    </div>
  );
}
