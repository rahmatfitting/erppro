"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Save, 
  Loader2,
  Search,
  Plus,
  Trash2,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";
import { BrowseAccountModal } from "@/components/BrowseAccountModal";

export default function PemakaianInternalCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isBrowseGudangOpen, setIsBrowseGudangOpen] = useState(false);
  const [isBrowseBarangOpen, setIsBrowseBarangOpen] = useState(false);
  const [isBrowseAccountOpen, setIsBrowseAccountOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nomormhgudang: null as number | null,
    gudang_nama: "",
    keterangan: "",
    items: [] as any[]
  });

  const handleAddItem = (barang: any) => {
    if (formData.items.some(it => it.nomormhbarang === barang.nomor)) {
      alert("Barang ini sudah ada di daftar");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          nomormhbarang: barang.nomor,
          kode_barang: barang.kode,
          nama_barang: barang.nama,
          nomormhsatuan: barang.nomormhsatuan,
          satuan: barang.satuan_nama || barang.satuan,
          nomormhaccount: null,
          account_nama: "",
          jumlah: 1,
          keterangan: ""
        }
      ]
    }));
    setIsBrowseBarangOpen(false);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const openAccountBrowser = (index: number) => {
    setSelectedItemIndex(index);
    setIsBrowseAccountOpen(true);
  };

  const handleAccountSelect = (acc: any) => {
    if (selectedItemIndex !== null) {
      handleItemChange(selectedItemIndex, "nomormhaccount", acc.nomor);
      handleItemChange(selectedItemIndex, "account_nama", acc.nama);
    }
    setIsBrowseAccountOpen(false);
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomormhgudang) return alert("Pilih Gudang terlebih dahulu");
    if (formData.items.length === 0) return alert("Tambahkan minimal 1 barang");
    
    // Validate each item has an account
    if (formData.items.some(it => !it.nomormhaccount)) {
       return alert("Semua item harus memiliki Master Account pembebanan");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stok/pemakaian-internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        alert("Pemakaian Internal berhasil disimpan");
        router.push("/stok/pemakaian-internal");
      } else {
        alert(json.error);
      }
    } catch (e) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stok/pemakaian-internal" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">Pemakaian Internal Baru</h2>
            <p className="text-sm text-slate-500">Catat penggunaan barang untuk operasional / internal.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tanggal Pemakaian</label>
              <input 
                type="date"
                required
                value={formData.tanggal || ""}
                onChange={e => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gudang Pengeluaran</label>
              <div className="flex gap-2">
                <input 
                  type="text" readOnly placeholder="Pilih Gudang..." value={formData.gudang_nama || ""}
                  onClick={() => setIsBrowseGudangOpen(true)}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none cursor-pointer"
                />
                <button type="button" onClick={() => setIsBrowseGudangOpen(true)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"><Search className="h-4 w-4 text-slate-500" /></button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Keterangan Umum</label>
              <input 
                type="text"
                placeholder="..."
                value={formData.keterangan || ""}
                onChange={e => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-fuchsia-500"
              />
            </div>
          </div>
        </div>

        {/* Details Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
           <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="text-xs font-bold text-fuchsia-700 uppercase tracking-wider">Item Barang & Pembebanan Biaya</h3>
             <button type="button" onClick={() => setIsBrowseBarangOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-fuchsia-600 text-white rounded-md text-xs font-bold hover:bg-fuchsia-700 transition-all shadow-sm"><Plus className="h-3.5 w-3.5" /> Tambah Barang</button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 w-12 text-center">No</th>
                    <th className="px-6 py-3">Barang</th>
                    <th className="px-6 py-3 w-64">Master Account (Beban)</th>
                    <th className="px-6 py-3 w-24 text-center">Satuan</th>
                    <th className="px-6 py-3 w-32 text-right">Jumlah</th>
                    <th className="px-6 py-3">Keterangan Item</th>
                    <th className="px-6 py-3 w-12 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {formData.items.map((item, idx) => (
                     <tr key={item.nomormhbarang} className="hover:bg-slate-50/30">
                       <td className="px-6 py-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                       <td className="px-6 py-4">
                         <div className="flex flex-col">
                           <span className="font-bold text-slate-900 uppercase text-[10px]">{item.nama_barang}</span>
                           <span className="text-[9px] text-slate-400 font-mono">{item.kode_barang}</span>
                         </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex gap-1">
                            <input 
                              type="text" readOnly placeholder="Pilih Akun..." value={item.account_nama || ""}
                              onClick={() => openAccountBrowser(idx)}
                              className="flex-1 bg-fuchsia-50/50 border border-fuchsia-100 rounded px-2 py-1 text-[10px] font-bold text-fuchsia-800 outline-none cursor-pointer"
                            />
                            <button type="button" onClick={() => openAccountBrowser(idx)} className="p-1 text-fuchsia-600 hover:bg-fuchsia-100 rounded"><BookOpen className="h-3 w-3" /></button>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-[10px]">{item.satuan}</td>
                       <td className="px-6 py-4 text-right">
                         <input 
                           type="number" step="any" value={item.jumlah || 0}
                           onChange={e => handleItemChange(idx, "jumlah", e.target.value)}
                           className="w-full text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold"
                         />
                       </td>
                       <td className="px-6 py-4">
                         <input 
                           type="text" value={item.keterangan || ""}
                           onChange={e => handleItemChange(idx, "keterangan", e.target.value)}
                           className="w-full bg-transparent border-b border-dashed border-slate-200 outline-none p-1 text-[10px]"
                           placeholder="..."
                         />
                       </td>
                       <td className="px-6 py-4 text-center">
                          <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                       </td>
                     </tr>
                   ))}
                   {formData.items.length === 0 && (
                     <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Daftar pemakaian masih kosong.</td></tr>
                   )}
                </tbody>
              </table>
           </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
           <Link href="/stok/pemakaian-internal" className="px-6 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Batal</Link>
           <button 
              type="submit" disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-fuchsia-600 text-white rounded-lg text-sm font-bold hover:bg-fuchsia-700 disabled:opacity-50 transition-all shadow-md active:scale-95 shadow-fuchsia-500/20"
           >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Pemakaian
           </button>
        </div>
      </form>

      <BrowseGudangModal 
        isOpen={isBrowseGudangOpen} onClose={() => setIsBrowseGudangOpen(false)} 
        onSelect={(g) => { setFormData(prev => ({ ...prev, nomormhgudang: g.nomor, gudang_nama: g.nama })); setIsBrowseGudangOpen(false); }} 
      />
      <BrowseBarangModal 
        isOpen={isBrowseBarangOpen} onClose={() => setIsBrowseBarangOpen(false)} 
        onSelect={handleAddItem} 
      />
      <BrowseAccountModal
        isOpen={isBrowseAccountOpen}
        onClose={() => setIsBrowseAccountOpen(false)}
        onSelect={handleAccountSelect}
      />
    </div>
  );
}
