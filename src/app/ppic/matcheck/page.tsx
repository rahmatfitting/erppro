"use client";

import { useState, useEffect } from "react";
import { 
  Search, Calculator, Box, TrendingDown, 
  AlertTriangle, ShoppingCart, Loader2, CheckCircle,
  ArrowRight, SearchCheck
} from "lucide-react";
import { BrowseProdPlanModal } from "@/components/BrowseProdPlanModal";

export default function MaterialCheckPage() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSelectPlan = async (plan: any) => {
     setSelectedPlan(plan);
     setIsPlanModalOpen(false);
     fetchAnalysis(plan.nomor);
  };

  const fetchAnalysis = async (planId: number) => {
    try {
      setLoading(true);
      setSuccessMsg(null);
      const res = await fetch(`/api/ppic/matcheck?planId=${planId}`);
      const json = await res.json();
      if (json.success) {
        setResults(json);
      } else {
        alert(json.error);
        setResults(null);
      }
    } catch (error) {
      console.error("Gagal memuat analisis:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePR = async () => {
    try {
      if (!results || !results.components) return;
      const deficits = results.components.filter((c: any) => c.deficit > 0);
      if (deficits.length === 0) {
        alert("Semua stok terpenuhi, tidak perlu PR.");
        return;
      }
      
      setLoading(true);
      const res = await fetch("/api/ppic/matcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          planId: selectedPlan.nomor,
          deficits 
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Berhasil membuat permintaan pembelian (PR) otomatis untuk kekurangan bahan.");
        fetchAnalysis(selectedPlan.nomor);
      }
    } catch (error) {
      alert("Gagal memproses PR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SearchCheck className="h-6 w-6 text-indigo-600" />
            Material Check & MRP
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Analisis kebutuhan bahan baku vs stok gudang</p>
        </div>
      </div>

      {/* Selector Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-6">
           <div className="flex-1 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Produksi (Production Plan)</label>
              <div 
                 onClick={() => setIsPlanModalOpen(true)}
                 className="flex items-center justify-between cursor-pointer border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-950 hover:border-indigo-500 transition-all shadow-sm"
              >
                 <div className="flex items-center gap-3">
                   <Box className="h-5 w-5 text-slate-400" />
                   <span className={selectedPlan ? "text-slate-900 dark:text-white font-bold" : "text-slate-400"}>
                     {selectedPlan ? `[${selectedPlan.kode}] ${selectedPlan.item_nama}` : "Pilih Plan Produksi untuk dianalisis..."}
                   </span>
                 </div>
                 <Search className="h-4 w-4 text-slate-400" />
              </div>
           </div>
           
           {selectedPlan && (
             <div className="flex items-center gap-4 bg-indigo-50 dark:bg-indigo-900/20 px-6 py-3 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Qty Target</span>
                   <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{selectedPlan.qty} <span className="text-sm font-normal">Units</span></span>
                </div>
                <Calculator className="h-8 w-8 text-indigo-200 dark:text-indigo-800" />
             </div>
           )}
        </div>
      </div>

      {loading && !results && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
           <p className="font-bold text-slate-500">Menganalisis BOM & Menghitung Saldo Stok...</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1 shadow-sm">
           <CheckCircle className="h-5 w-5" />
           <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                 <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                    <ShoppingCart className="h-6 w-6" />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">BOM Terdeteksi</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white truncate" title={results.bom.nama}>{results.bom.kode}</p>
                 </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                 <div className="h-12 w-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
                    <TrendingDown className="h-6 w-6" />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Total Kekurangan</p>
                    <p className="text-xl font-black text-orange-600">
                       {results.components.filter((c: any) => c.deficit > 0).length} <span className="text-sm">Item Terdeteksi</span>
                    </p>
                 </div>
              </div>
              <div className="lg:col-span-1 border-none shadow-none flex items-center justify-end">
                 <button 
                   onClick={handleGeneratePR}
                   disabled={loading || results.components.every((c: any) => c.deficit === 0)}
                   className="w-full lg:w-fit h-fit flex items-center justify-center gap-2 bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-30 disabled:grayscale"
                 >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
                    PESAN KEKURANGAN (PR)
                 </button>
              </div>
           </div>

           {/* Detailed Table */}
           <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <h3 className="font-bold text-slate-800 dark:text-white uppercase text-xs tracking-widest">Gap Analysis Komponen</h3>
                 <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-tighter">Realtime Stock Check</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800">
                       <tr>
                          <th className="px-6 py-4">Nama Komponen</th>
                          <th className="px-6 py-4">Resep / Unit</th>
                          <th className="px-6 py-4">Total Kebutuhan</th>
                          <th className="px-6 py-4">Stok Tersedia</th>
                          <th className="px-6 py-4">Kekurangan (Gap)</th>
                          <th className="px-6 py-4 text-center">Rekomendasi</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {results.components.map((comp: any) => (
                          <tr key={comp.item_id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                             <td className="px-6 py-4">
                                <div className="flex flex-col">
                                   <span className="font-black text-slate-900 dark:text-white">{comp.item_nama}</span>
                                   <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{comp.item_kode}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400">
                                {(comp.needed / results.plan.qty).toFixed(4)} <span className="text-[10px] uppercase">{comp.satuan}</span>
                             </td>
                             <td className="px-6 py-4">
                                <span className="font-black text-slate-900 dark:text-white">{comp.needed}</span> <span className="text-[10px] text-slate-400">{comp.satuan}</span>
                             </td>
                             <td className="px-6 py-4">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{comp.available}</span> <span className="text-[10px] text-slate-400">{comp.satuan}</span>
                             </td>
                             <td className="px-6 py-4">
                                {comp.deficit > 0 ? (
                                   <div className="flex items-center gap-1.5 text-red-600 font-black">
                                      <TrendingDown className="h-4 w-4" />
                                      {comp.deficit}
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-1.5 text-emerald-600 font-black">
                                      <CheckCircle className="h-4 w-4" />
                                      Cukup
                                   </div>
                                )}
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex justify-center">
                                   {comp.deficit > 0 ? (
                                      <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-red-100 uppercase tracking-tighter">
                                         <AlertTriangle className="h-3 w-3" />
                                         Perlu Re-stock
                                      </div>
                                   ) : (
                                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-emerald-100 uppercase tracking-tighter">
                                         <CheckCircle className="h-3 w-3" />
                                         Siap Produksi
                                      </div>
                                   )}
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                 <ArrowRight className="h-3 w-3" />
                 Lakukan pengecekan berkala sebelum memulai Work Order untuk memastikan ketersediaan bahan baku.
              </div>
           </div>
        </div>
      )}

      {!results && !loading && (
        <div className="flex flex-col items-center justify-center py-32 text-slate-300 gap-4">
           <div className="h-20 w-20 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center">
              <SearchCheck className="h-10 w-10 text-slate-200" />
           </div>
           <p className="text-sm font-black uppercase tracking-widest text-slate-400">Silakan pilih Production Plan terlebih dahulu</p>
        </div>
      )}

      <BrowseProdPlanModal 
         isOpen={isPlanModalOpen}
         onClose={() => setIsPlanModalOpen(false)}
         onSelect={handleSelectPlan}
      />
    </div>
  );
}
