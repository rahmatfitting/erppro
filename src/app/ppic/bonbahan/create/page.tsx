"use client";

import { useState } from "react";
import { Plus, Save, PackageMinus, Loader2, Search, ArrowLeft, Trash2, Calendar, ClipboardList, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrowseWorkOrderModal } from "@/components/BrowseWorkOrderModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";

export default function CreateBonBahanPage() {
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

  // ... (handleSelectWO and other functions)

  const handleSelectGudang = (gudang: any) => {
    setHeader({
      ...header,
      nomormhgudang: gudang.nomor,
      gudang_nama: gudang.nama
    });
    setIsGudangModalOpen(false);
  };

  const handleSelectWO = async (wo: any) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ppic/workorder/${wo.nomor}`);
      const json = await res.json();
      if (json.success) {
        setHeader({
          ...header,
          nomorthworkorder: wo.nomor,
          wo_kode: wo.kode
        });
        // Pre-fill items from BOM components
        setItems(json.components.map((c: any) => ({
           item_id: c.item_id,
           item_kode: c.item_kode,
           item_nama: c.item_nama,
           qty: c.qty_needed,
           satuan_id: c.satuan_id,
           satuan_nama: c.satuan_nama,
           keterangan: `Kebutuhan WO ${wo.kode}`
        })));
      }
    } catch (e) {
      alert("Gagal mengambil detail Work Order");
    } finally {
      setLoading(false);
      setIsWOModalOpen(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (items.length === 0) {
        throw new Error("Pilih setidaknya satu item bahan.");
      }

      const res = await fetch('/api/ppic/bonbahan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...header, items })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menyimpan data");
      }

      router.push('/ppic/bonbahan');
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
      keterangan: ""
    }]);
    setIsBarangModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
               <PackageMinus className="h-6 w-6 text-indigo-600" />
               Buat Bon Pengambilan Bahan
             </h2>
             <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
               Dokumen pengeluaran bahan baku dari gudang
             </p>
           </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-indigo-200"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          SIMPAN BON BAHAN
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in shake-1">
          <span className="text-sm font-bold uppercase tracking-tighter">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xl font-bold">×</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left: Metadata */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kode Transaksi</label>
                <div className="py-3 px-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 font-black text-indigo-600 text-sm">
                  {header.kode}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal Pengeluaran</label>
                <input
                  type="date"
                  value={header.tanggal}
                  onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gudang Asal (Stok)</label>
                <div 
                   onClick={() => setIsGudangModalOpen(true)}
                   className="flex items-center justify-between cursor-pointer border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-white dark:bg-slate-950 hover:border-indigo-500 transition-all font-bold text-sm"
                >
                   <span className={header.gudang_nama ? "text-indigo-600 uppercase" : "text-slate-400"}>
                     {header.gudang_nama || "Pilih Gudang..."}
                   </span>
                   <Store className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ref. Work Order (SPK)</label>
                <div 
                   onClick={() => setIsWOModalOpen(true)}
                   className="flex items-center justify-between cursor-pointer border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 bg-white dark:bg-slate-950 hover:border-indigo-500 transition-all font-bold text-sm"
                >
                   <span className={header.wo_kode ? "text-indigo-600" : "text-slate-400"}>
                     {header.wo_kode || "Pilih Work Order..."}
                   </span>
                   <Search className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catatan / Keterangan</label>
                <textarea
                  placeholder="..."
                  rows={3}
                  value={header.keterangan || ""}
                  onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-950 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
           </div>
        </div>

        {/* Right: Items Table */}
        <div className="lg:col-span-3">
           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Daftar Bahan Yang Dikeluarkan</h3>
                 <button 
                   onClick={() => setIsBarangModalOpen(true)}
                   className="flex items-center gap-2 text-[10px] font-black bg-slate-900 text-white dark:bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-800 transition-all shadow-md"
                 >
                    <Plus className="h-3 w-3" />
                    TAMBAH MANUAL
                 </button>
              </div>

              <div className="overflow-x-auto flex-1">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-slate-800">
                       <tr>
                          <th className="px-6 py-4">Bahan Baku / Komponen</th>
                          <th className="px-6 py-4 text-center">QTY Dikeluarkan</th>
                          <th className="px-6 py-4">Satuan</th>
                          <th className="px-6 py-4">Keterangan</th>
                          <th className="px-6 py-4 text-center">Hapus</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {items.map((item, index) => (
                          <tr key={index} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors animate-in slide-in-from-left-2 duration-300">
                             <td className="px-6 py-4">
                                <div className="flex flex-col">
                                   <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{item.item_nama}</span>
                                   <span className="text-[10px] font-mono text-slate-400">{item.item_kode}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4 w-32">
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[index].qty = parseFloat(e.target.value) || 0;
                                    setItems(newItems);
                                  }}
                                  className="w-full text-center py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg font-black bg-white dark:bg-slate-950 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                             </td>
                             <td className="px-6 py-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase">{item.satuan_nama || 'UNIT'}</span>
                             </td>
                             <td className="px-6 py-4">
                                <input
                                  type="text"
                                  placeholder="Catatan..."
                                  value={item.keterangan}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[index].keterangan = e.target.value;
                                    setItems(newItems);
                                  }}
                                  className="w-full py-2 px-3 bg-transparent border-none text-xs text-slate-500 outline-none focus:ring-0"
                                />
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex justify-center">
                                   <button 
                                     onClick={() => setItems(items.filter((_, i) => i !== index))}
                                     className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                                   >
                                      <Trash2 className="h-4 w-4" />
                                   </button>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {items.length === 0 && (
                         <tr>
                            <td colSpan={5} className="py-20 text-center">
                               <div className="flex flex-col items-center gap-3 text-slate-300">
                                  <ClipboardList className="h-12 w-12" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">Silakan pilih Work Order atau tambah material secara manual</p>
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
