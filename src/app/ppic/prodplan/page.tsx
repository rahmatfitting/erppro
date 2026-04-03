"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Filter, MoreVertical, 
  Calendar, Clock, CheckCircle2, AlertCircle, 
  ArrowRight, Loader2, Cpu
} from "lucide-react";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

type ProdPlan = {
  nomor: number;
  kode: string;
  tanggal: string;
  item_id: number;
  item_nama: string;
  item_kode: string;
  qty: number;
  status: 'Backlog' | 'Ongoing' | 'Finished';
  keterangan: string;
};

export default function ProductionPlanPage() {
  const [plans, setPlans] = useState<ProdPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBarangModalOpen, setIsBarangModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    kode: "[AUTO]",
    tanggal: new Date().toISOString().split("T")[0],
    item_id: null as number | null,
    item_nama: "",
    qty: 0,
    keterangan: ""
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ppic/prodplan?keyword=${searchTerm}`);
      const json = await res.json();
      if (json.success) {
        setPlans(json.data);
      }
    } catch (error) {
      console.error("Gagal memuat rencana produksi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [searchTerm]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch("/api/ppic/prodplan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
      const json = await res.json();
      if (json.success) fetchPlans();
    } catch (error) {
      alert("Gagal memperbarui status");
    }
  };

  const handleSavePlan = async () => {
    try {
      if (!newPlan.item_id || newPlan.qty <= 0) {
        alert("Pilih produk dan isi kuantitas");
        return;
      }
      const res = await fetch("/api/ppic/prodplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan)
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setNewPlan({
          kode: "[AUTO]",
          tanggal: new Date().toISOString().split("T")[0],
          item_id: null,
          item_nama: "",
          qty: 0,
          keterangan: ""
        });
        fetchPlans();
      }
    } catch (error) {
      alert("Gagal menyimpan rencana");
    }
  };

  const columns = [
    { id: 'Backlog', title: 'Backlog', icon: AlertCircle, color: 'text-slate-400 bg-slate-100' },
    { id: 'Ongoing', title: 'On Progress', icon: Clock, color: 'text-indigo-600 bg-indigo-50' },
    { id: 'Finished', title: 'Finished', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' }
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" />
            Production Planning
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola jadwal dan progres produksi harian</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Buat Plan Baru
        </button>
      </div>

      <div className="flex gap-4 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama produk..."
            className="w-full rounded-lg border-none bg-slate-50 py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
            <Filter className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 grayscale opacity-50">
           <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
           <span className="font-medium">Memuat alur produksi...</span>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
          {columns.map((column) => {
            const columnPlans = plans.filter(p => p.status === column.id);
            return (
              <div key={column.id} className="flex-1 min-w-[320px] flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${column.color}`}>
                       <column.icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs">
                      {column.title}
                    </h3>
                    <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500">
                      {columnPlans.length}
                    </span>
                  </div>
                  <MoreVertical className="h-4 w-4 text-slate-400 cursor-pointer" />
                </div>

                <div className="flex-1 flex flex-col gap-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 p-3 border border-slate-100 dark:border-slate-800 shadow-inner overflow-y-auto max-h-[calc(100vh-280px)]">
                  {columnPlans.map((plan) => (
                    <div 
                      key={plan.nomor}
                      className="group p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                           {plan.kode}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                           <Calendar className="h-3 w-3" />
                           {new Date(plan.tanggal).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-indigo-600 transition-colors">
                        {plan.item_nama}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-3">
                         <span className="font-mono">{plan.item_kode}</span>
                      </div>

                      <div className="flex items-baseline gap-1 mt-auto">
                         <span className="text-xl font-black text-slate-900 dark:text-white">{plan.qty}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Units</span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {column.id === 'Backlog' && (
                           <button 
                             onClick={() => handleUpdateStatus(plan.nomor, 'Ongoing')}
                             className="flex items-center gap-1 text-[10px] font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 shadow-sm"
                           >
                              Start
                              <ArrowRight className="h-3 w-3" />
                           </button>
                         )}
                         {column.id === 'Ongoing' && (
                           <button 
                             onClick={() => handleUpdateStatus(plan.nomor, 'Finished')}
                             className="flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 shadow-sm"
                           >
                              Complete
                              <CheckCircle2 className="h-3 w-3" />
                           </button>
                         )}
                      </div>
                    </div>
                  ))}
                  {columnPlans.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-300 gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                       <Plus className="h-6 w-6" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in transition-all">
           <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in slide-in-from-bottom-4 transition-all">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Jadwal Produksi Baru</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Produk Jadi</label>
                    <div 
                      onClick={() => setIsBarangModalOpen(true)}
                      className="w-full flex items-center justify-between border rounded-xl px-4 py-3 bg-slate-50 cursor-pointer hover:border-indigo-500 transition-colors"
                    >
                       <span className={newPlan.item_nama ? "text-slate-900 font-bold" : "text-slate-400"}>
                          {newPlan.item_nama || "Cari Barang..."}
                       </span>
                       <Search className="h-4 w-4 text-slate-400" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Target</label>
                       <input 
                         type="date" 
                         className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" 
                         value={newPlan.tanggal}
                         onChange={(e) => setNewPlan({...newPlan, tanggal: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Quantity (Unit)</label>
                       <input 
                         type="number" 
                         className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-bold" 
                         value={newPlan.qty}
                         onChange={(e) => setNewPlan({...newPlan, qty: parseFloat(e.target.value) || 0})}
                       />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Keterangan</label>
                    <textarea 
                      className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" 
                      rows={2}
                      value={newPlan.keterangan}
                      onChange={(e) => setNewPlan({...newPlan, keterangan: e.target.value})}
                    />
                 </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                 <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border font-bold text-sm text-slate-600 hover:bg-white transition-colors"
                 >
                    Batal
                 </button>
                 <button 
                  onClick={handleSavePlan}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 shadow-md transition-colors shadow-indigo-200"
                 >
                    Simpan Plan
                 </button>
              </div>
           </div>
        </div>
      )}

      <BrowseBarangModal 
         isOpen={isBarangModalOpen}
         onClose={() => setIsBarangModalOpen(false)}
         onSelect={(barang) => {
           setNewPlan({...newPlan, item_id: barang.nomor, item_nama: barang.nama});
           setIsBarangModalOpen(false);
         }}
      />
    </div>
  );
}

// Tambahkan Icon Activity yang terlewat
import { Activity } from "lucide-react";
