"use client";

import { useState } from "react";
import { Save, PackagePlus, Loader2, Search, ArrowLeft, TrendingUp, AlertTriangle, ClipboardList, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrowseWorkOrderModal } from "@/components/BrowseWorkOrderModal";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

export default function CreateHasilProduksiPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    kode: "[AUTO]",
    tanggal: new Date().toISOString().split("T")[0],
    nomorthworkorder: null as number | null,
    wo_kode: "",
    nomormhgudang: null as number | null,
    gudang_nama: "",
    item_id: null as number | null,
    item_nama: "",
    qty_fg: 0,
    qty_afalan: 0,
    keterangan: "",
  });

  const [isWOModalOpen, setIsWOModalOpen] = useState(false);
  const [isGudangModalOpen, setIsGudangModalOpen] = useState(false);
  const [isBarangModalOpen, setIsBarangModalOpen] = useState(false);

  const handleSelectWO = (wo: any) => {
    setHeader({
      ...header,
      nomorthworkorder: wo.nomor,
      wo_kode: wo.kode,
      item_id: wo.item_id,
      item_nama: wo.item_nama
    });
    setIsWOModalOpen(false);
  };

  const handleSelectGudang = (gudang: any) => {
    setHeader({
      ...header,
      nomormhgudang: gudang.nomor,
      gudang_nama: gudang.nama
    });
    setIsGudangModalOpen(false);
  };

  const handleSelectBarang = (barang: any) => {
    setHeader({
      ...header,
      item_id: barang.nomor,
      item_nama: barang.nama
    });
    setIsBarangModalOpen(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!header.item_id || (!header.qty_fg && !header.qty_afalan)) {
        throw new Error("Pilih Produk dan isi Qty hasil produksi.");
      }

      if (!header.nomormhgudang) {
        throw new Error("Pilih gudang simpan.");
      }

      const res = await fetch('/api/ppic/hasilproduksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(header)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menyimpan data");
      }

      router.push('/ppic/hasilproduksi');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
           <button 
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           >
              <ArrowLeft className="h-5 w-5" />
           </button>
           <div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <PackagePlus className="h-6 w-6 text-emerald-600" />
               Lapor Hasil Produksi
             </h2>
             <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">
               Pencatatan output akhir proses manufaktur
             </p>
           </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-indigo-200"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          SIMPAN LAPORAN
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <span className="text-sm font-bold uppercase">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xl font-bold">×</button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-8">
         <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kode Transaksi</label>
              <div className="py-3 px-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 font-bold text-slate-500 text-sm">
                {header.kode}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal Selesai</label>
              <input
                type="date"
                value={header.tanggal}
                onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              />
            </div>

            <div className="space-y-4 md:col-span-2 grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gudang Simpan Hasil</label>
                <div 
                   onClick={() => setIsGudangModalOpen(true)}
                   className="flex items-center justify-between cursor-pointer border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50/50 hover:border-emerald-500 transition-all font-bold text-sm"
                >
                   <div className="flex items-center gap-2">
                     <Store className="h-4 w-4 text-emerald-500" />
                     <span className={header.gudang_nama ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                       {header.gudang_nama || "Pilih Gudang..."}
                     </span>
                   </div>
                   <Search className="h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referensi Work Order</label>
                <div 
                   onClick={() => setIsWOModalOpen(true)}
                   className="flex items-center justify-between cursor-pointer border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50/50 hover:border-emerald-500 transition-all font-bold text-sm"
                >
                   <div className="flex items-center gap-2 text-indigo-500">
                     <ClipboardList className="h-4 w-4" />
                     <span className={header.wo_kode ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                       {header.wo_kode || "Pilih WO..."}
                     </span>
                   </div>
                   <Search className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 p-4 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Barang Hasil Produksi (Realisasi)</label>
              <div 
                 onClick={() => setIsBarangModalOpen(true)}
                 className="mt-2 flex items-center justify-between cursor-pointer border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-4 bg-white dark:bg-slate-900 hover:border-indigo-500 transition-all font-black text-lg shadow-sm"
              >
                 <span className={header.item_nama ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                    {header.item_nama || "Pilih Barang Hasil..."}
                 </span>
                 <Search className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-[9px] font-bold text-indigo-400 mt-2 uppercase italic tracking-wider">* Default sesuai WO, klik untuk ganti grade/jenis barang lain</p>
            </div>

            {/* Input Qty */}
            <div className="bg-emerald-50/30 dark:bg-emerald-950/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-4">
               <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-widest">
                  <TrendingUp className="h-4 w-4" />
                  Barang Jadi (FG)
               </div>
               <div className="space-y-1">
                  <input
                    type="number"
                    value={header.qty_fg}
                    onChange={(e) => setHeader({ ...header, qty_fg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent text-4xl font-black text-slate-900 dark:text-white outline-none"
                  />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Unit Selesai Kondisi Baik</p>
               </div>
            </div>

            <div className="bg-orange-50/30 dark:bg-orange-950/20 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/50 space-y-4">
               <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-black text-xs uppercase tracking-widest">
                  <AlertTriangle className="h-4 w-4" />
                  Afalan / Rejek
               </div>
               <div className="space-y-1">
                  <input
                    type="number"
                    value={header.qty_afalan}
                    onChange={(e) => setHeader({ ...header, qty_afalan: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent text-4xl font-black text-slate-900 dark:text-white outline-none"
                  />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Unit Cacat / Tidak Lolos QC</p>
               </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Keterangan Produksi</label>
              <textarea
                placeholder="Tambahkan catatan jika ada kendala saat produksi..."
                rows={3}
                value={header.keterangan || ""}
                onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
         </div>
      </div>

      <BrowseWorkOrderModal 
         isOpen={isWOModalOpen}
         onClose={() => setIsWOModalOpen(false)}
         onSelect={handleSelectWO}
      />

      <BrowseGudangModal 
         isOpen={isGudangModalOpen}
         onClose={() => setIsGudangModalOpen(false)}
         onSelect={handleSelectGudang}
      />

      <BrowseBarangModal 
         isOpen={isBarangModalOpen}
         onClose={() => setIsBarangModalOpen(false)}
         onSelect={handleSelectBarang}
      />
    </div>
  );
}
