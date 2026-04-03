"use client";

import { useState } from "react";
import { Plus, Save, RotateCcw, Loader2, Search, ArrowLeft, Trash2, Calendar, ClipboardList, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrowseWorkOrderModal } from "@/components/BrowseWorkOrderModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";

export default function CreateKembalibahanPage() {
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
    keterangan: "",
  });

  const [items, setItems] = useState<any[]>([]);

  // Modal states
  const [isWOModalOpen, setIsWOModalOpen] = useState(false);
  const [isBarangModalOpen, setIsBarangModalOpen] = useState(false);
  const [isGudangModalOpen, setIsGudangModalOpen] = useState(false);

  const handleSelectWO = (wo: any) => {
    setHeader({
      ...header,
      nomorthworkorder: wo.nomor,
      wo_kode: wo.kode
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

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (items.length === 0) {
        throw new Error("Pilih setidaknya satu item bahan yang dikembalikan.");
      }

      const res = await fetch('/api/ppic/kembalibahan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...header, items })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menyimpan data");
      }

      router.push('/ppic/kembalibahan');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (barang: any) => {
    setItems([...items, {
      item_id: barang.nomor,
      item_kode: barang.kode,
      item_nama: barang.nama,
      qty: 0,
      satuan_id: barang.satuan_id || null,
      satuan_nama: barang.satuan_nama || 'UNIT',
    }]);
    setIsBarangModalOpen(false);
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
               <RotateCcw className="h-6 w-6 text-fuchsia-600" />
               Input Pengembalian Bahan
             </h2>
             <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">
               Retur sisa material produksi ke gudang stok
             </p>
           </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-fuchsia-700 px-6 py-2.5 text-sm font-black text-white shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          SIMPAN RETUR
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center justify-between shadow-sm font-black text-xs uppercase animate-pulse">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xl">×</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left: Metadata */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal Retur</label>
                <input
                  type="date"
                  value={header.tanggal}
                  onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none font-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gudang Tujuan (Retur)</label>
                <div 
                   onClick={() => setIsGudangModalOpen(true)}
                   className="flex items-center justify-between cursor-pointer border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-white dark:bg-slate-950 hover:border-fuchsia-500 transition-all font-black text-sm"
                >
                   <span className={header.gudang_nama ? "text-fuchsia-600 uppercase" : "text-slate-400"}>
                     {header.gudang_nama || "Pilih Gudang..."}
                   </span>
                   <Store className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ref. Work Order (Opsional)</label>
                <div 
                   onClick={() => setIsWOModalOpen(true)}
                   className="flex items-center justify-between cursor-pointer border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-white dark:bg-slate-950 hover:border-fuchsia-500 transition-all font-black text-sm"
                >
                   <span className={header.wo_kode ? "text-fuchsia-600 uppercase" : "text-slate-400"}>
                     {header.wo_kode || "Pilih WO..."}
                   </span>
                   <Search className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catatan Retur</label>
                <textarea
                  placeholder="Alasan pengembalian..."
                  rows={4}
                  value={header.keterangan || ""}
                  onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none font-bold"
                />
              </div>
           </div>
        </div>

        {/* Right: Items Table */}
        <div className="lg:col-span-3">
           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-fuchsia-50/10">
                 <h3 className="text-xs font-black uppercase tracking-widest text-fuchsia-600 dark:text-fuchsia-400 flex items-center gap-2 underline underline-offset-4">
                    <RotateCcw className="h-3 w-3" />
                    Daftar Bahan Yang Dikembalikan
                 </h3>
                 <button 
                   onClick={() => setIsBarangModalOpen(true)}
                   className="flex items-center gap-2 text-[10px] font-black bg-fuchsia-600 text-white px-4 py-2 rounded-lg hover:bg-fuchsia-500 transition-all shadow-md active:scale-95"
                 >
                    <Plus className="h-3 w-3" />
                    PILIH BAHAN
                 </button>
              </div>

              <div className="overflow-x-auto flex-1 p-2">
                 <table className="w-full text-sm text-left">
                    <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                       <tr>
                          <th className="px-6 py-4">Nama Bahan</th>
                          <th className="px-6 py-4 text-center">QTY Kembali</th>
                          <th className="px-6 py-4">Satuan</th>
                          <th className="px-6 py-4 text-center">Aksi</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {items.map((item, index) => (
                          <tr key={index} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all animate-in slide-in-from-right-4 duration-300">
                             <td className="px-6 py-4">
                                <div className="flex flex-col">
                                   <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{item.item_nama}</span>
                                   <span className="text-[10px] font-mono text-slate-400">{item.item_kode}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4 w-40">
                                <div className="relative">
                                   <input
                                     type="number"
                                     value={item.qty}
                                     onChange={(e) => {
                                       const newItems = [...items];
                                       newItems[index].qty = parseFloat(e.target.value) || 0;
                                       setItems(newItems);
                                     }}
                                     className="w-full text-center py-2 px-3 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-black bg-white dark:bg-slate-950 dark:text-white focus:border-fuchsia-500 outline-none transition-colors"
                                   />
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{item.satuan_nama || 'UNIT'}</span>
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex justify-center">
                                   <button 
                                     onClick={() => setItems(items.filter((_, i) => i !== index))}
                                     className="p-2 text-slate-200 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                                   >
                                      <Trash2 className="h-4 w-4" />
                                   </button>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {items.length === 0 && (
                         <tr>
                            <td colSpan={4} className="py-24 text-center">
                               <div className="flex flex-col items-center gap-4 text-slate-200 dark:text-slate-800">
                                  <RotateCcw className="h-16 w-16 opacity-20" />
                                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">BARANG BELUM DIPILIH</p>
                               </div>
                            </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>
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
         onSelect={addItem}
      />
    </div>
  );
}
