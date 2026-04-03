"use client";

import { useState } from "react";
import { Plus, Save, FileText, Loader2, Search, ClipboardList, ArrowLeft, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrowseProdPlanModal } from "@/components/BrowseProdPlanModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    kode: "[AUTO]",
    tanggal: new Date().toISOString().split("T")[0],
    nomorthprodplan: null as number | null,
    prodplan_kode: "",
    item_id: null as number | null,
    item_nama: "",
    qty: 0,
    keterangan: "",
  });

  // Modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isBarangModalOpen, setIsBarangModalOpen] = useState(false);

  const handleSelectPlan = (plan: any) => {
    setHeader({
      ...header,
      nomorthprodplan: plan.nomor,
      prodplan_kode: plan.kode,
      item_id: plan.item_id,
      item_nama: plan.item_nama,
      qty: plan.qty
    });
    setIsPlanModalOpen(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!header.item_id || header.qty <= 0) {
        throw new Error("Pilih Produk dan isi Qty Produksi");
      }

      const res = await fetch('/api/ppic/workorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(header)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menyimpan data");
      }

      router.push('/ppic/workorder');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <button 
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           >
              <ArrowLeft className="h-5 w-5" />
           </button>
           <div>
             <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
               <ClipboardList className="h-6 w-6 text-indigo-600" />
               Buat Work Order (WO)
             </h2>
             <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
               Generate instruksi kerja produksi dari rencana yang ada.
             </p>
           </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? "Menyimpan..." : "Simpan Work Order"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1">
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xl font-bold">×</button>
        </div>
      )}

      <div className="grid gap-6">
        {/* Left: Document Info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
           <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                  <FileText className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Informasi Work Order
              </h3>
           </div>
           
           <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kode WO</label>
                <input
                  type="text"
                  value={header.kode}
                  readOnly
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal WO</label>
                <input
                  type="date"
                  value={header.tanggal}
                  onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ref. Production Plan (Opsional)</label>
                <div 
                   onClick={() => setIsPlanModalOpen(true)}
                   className="flex items-center justify-between cursor-pointer border border-slate-200 rounded-xl px-4 py-3 bg-white hover:border-indigo-500 transition-all font-bold text-sm"
                >
                   <span className={header.prodplan_kode ? "text-indigo-600" : "text-slate-400"}>
                     {header.prodplan_kode || "Ambil dari Plan..."}
                   </span>
                   <Search className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Quantity Produksi</label>
                <input
                  type="number"
                  value={header.qty}
                  onChange={(e) => setHeader({ ...header, qty: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Produk Yang Diproduksi</label>
                <div 
                   onClick={() => setIsBarangModalOpen(true)}
                   className="flex items-center justify-between cursor-pointer border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/50 hover:border-indigo-500 transition-all font-bold text-sm"
                >
                   <span className={header.item_nama ? "text-slate-900" : "text-slate-400"}>
                     {header.item_nama || "Pilih Produk..."}
                   </span>
                   <Search className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Keterangan / Instruksi Khusus</label>
                <textarea
                  placeholder="Tambahkan catatan untuk tim produksi..."
                  rows={3}
                  value={header.keterangan || ""}
                  onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
           </div>
        </div>
      </div>

      <BrowseProdPlanModal 
         isOpen={isPlanModalOpen}
         onClose={() => setIsPlanModalOpen(false)}
         onSelect={handleSelectPlan}
      />

      <BrowseBarangModal 
         isOpen={isBarangModalOpen}
         onClose={() => setIsBarangModalOpen(false)}
         onSelect={(barang) => setHeader({...header, item_id: barang.nomor, item_nama: barang.nama})}
      />
    </div>
  );
}
