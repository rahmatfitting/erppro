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
  Package,
  ArrowDown
} from "lucide-react";
import Link from "next/link";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

export default function TransformasiBarangCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isBrowseGudangOpen, setIsBrowseGudangOpen] = useState(false);
  const [isBrowseHasilOpen, setIsBrowseHasilOpen] = useState(false);
  const [isBrowseAsalOpen, setIsBrowseAsalOpen] = useState(false);

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nomormhgudang: null as number | null,
    gudang_nama: "",
    nomormhbarang_tujuan: null as number | null,
    kode_barang_tujuan: "",
    nama_barang_tujuan: "",
    jumlah_tujuan: 1,
    keterangan: "",
    items: [] as any[]
  });

  const handleSelectHasil = (barang: any) => {
    setFormData(prev => ({
      ...prev,
      nomormhbarang_tujuan: barang.nomor,
      kode_barang_tujuan: barang.kode,
      nama_barang_tujuan: barang.nama
    }));
    setIsBrowseHasilOpen(false);
  };

  const handleAddAsal = (barang: any) => {
    if (formData.items.some(it => it.nomormhbarang_asal === barang.nomor)) {
      alert("Barang asal ini sudah ada");
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          nomormhbarang_asal: barang.nomor,
          kode_barang_asal: barang.kode,
          nama_barang_asal: barang.nama,
          nomormhsatuan: barang.nomormhsatuan,
          satuan: barang.satuan_nama || barang.satuan,
          jumlah: 1,
          keterangan: ""
        }
      ]
    }));
    setIsBrowseAsalOpen(false);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomormhgudang || !formData.nomormhbarang_tujuan) return alert("Data header belum lengkap");
    if (formData.items.length === 0) return alert("Tambahkan minimal 1 barang asal / komponen");

    setLoading(true);
    try {
      const res = await fetch("/api/stok/ubah-bentuk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        alert("Transformasi berhasil disimpan");
        router.push("/stok/ubah-bentuk");
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
          <Link href="/stok/ubah-bentuk" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight">Transformasi Barang Baru</h2>
            <p className="text-sm text-slate-500">Proses assembly atau perubahan wujud produk.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tanggal Proses</label>
                    <input type="date" value={formData.tanggal || ""} onChange={e => setFormData(prev => ({ ...prev, tanggal: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none" required />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gudang Pengerjaan</label>
                    <div className="flex gap-2">
                       <input type="text" readOnly placeholder="Pilih Gudang..." value={formData.gudang_nama || ""} onClick={() => setIsBrowseGudangOpen(true)} className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none cursor-pointer" />
                       <button type="button" onClick={() => setIsBrowseGudangOpen(true)} className="p-2 bg-slate-100 rounded-lg border border-slate-200"><Search className="h-4 w-4 text-slate-500" /></button>
                    </div>
                 </div>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                 <label className="text-[10px] font-bold text-orange-700 uppercase tracking-widest block">Barang Hasil (Target)</label>
                 <div className="flex gap-3 items-center">
                    <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center border border-orange-200 shadow-sm"><Package className="h-5 w-5 text-orange-600" /></div>
                    <div className="flex-1">
                       {formData.nama_barang_tujuan ? (
                         <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 uppercase">{formData.nama_barang_tujuan}</span>
                            <span className="text-[10px] text-slate-500 font-mono italic">{formData.kode_barang_tujuan}</span>
                         </div>
                       ) : (
                         <span className="text-sm text-orange-400 italic">Klik pilih barang hasil transformations...</span>
                       )}
                    </div>
                    <div className="w-24">
                       <label className="text-[10px] font-bold text-orange-700 uppercase tracking-widest block mb-1">Qty Hasil</label>
                       <input 
                         type="number" step="any"
                         value={formData.jumlah_tujuan || 0} 
                         onChange={e => setFormData(prev => ({ ...prev, jumlah_tujuan: parseFloat(e.target.value) }))}
                         className="w-full text-right bg-white border border-orange-200 rounded px-2 py-1 text-sm font-bold text-orange-700 outline-none"
                       />
                    </div>
                    <button type="button" onClick={() => setIsBrowseHasilOpen(true)} className="px-4 py-2 bg-white text-orange-600 border border-orange-200 rounded-lg text-xs font-bold hover:bg-orange-600 hover:text-white transition-all">Pilih Barang</button>
                 </div>
              </div>
           </div>

           <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Keterangan Produksi</label>
              <textarea 
                rows={4} value={formData.keterangan || ""} onChange={e => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-orange-500"
                placeholder="Misal: Batch produksi harian..."
              />
           </div>
        </div>

        {/* Components Section */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
           <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                 <ArrowDown className="h-4 w-4 text-orange-600" />
                 <h3 className="text-xs font-bold text-slate-500 uppercase">Input Bahan / Komponen (Asal)</h3>
              </div>
              <button type="button" onClick={() => setIsBrowseAsalOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-md text-xs font-bold hover:bg-slate-900 transition-all"><Plus className="h-3.5 w-3.5" /> Tambah Bahan</button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 w-12 text-center">No</th>
                      <th className="px-6 py-3">Bahan Asal</th>
                      <th className="px-6 py-3 w-24 text-center">Satuan</th>
                      <th className="px-6 py-3 w-40 text-right">Jumlah Pakai</th>
                      <th className="px-6 py-3">Keterangan</th>
                      <th className="px-6 py-3 w-12 text-center"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item, idx) => (
                      <tr key={item.nomormhbarang_asal} className="hover:bg-slate-50/30">
                         <td className="px-6 py-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                         <td className="px-6 py-4 font-bold text-slate-800 text-xs uppercase">{item.nama_barang_asal}</td>
                         <td className="px-6 py-4 text-center font-bold text-[10px] text-slate-500">{item.satuan}</td>
                         <td className="px-6 py-4 text-right">
                            <input type="number" step="any" value={item.jumlah || 0} onChange={e => handleItemChange(idx, "jumlah", e.target.value)} className="w-full text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-bold text-orange-700 outline-none" />
                         </td>
                         <td className="px-6 py-4">
                            <input type="text" value={item.keterangan || ""} onChange={e => handleItemChange(idx, "keterangan", e.target.value)} className="w-full bg-transparent border-b border-dashed border-slate-200 outline-none p-1 text-[10px]" placeholder="..." />
                         </td>
                         <td className="px-6 py-4 text-center">
                            <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                         </td>
                      </tr>
                    ))}
                    {formData.items.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic">Tambahkan bahan-bahan asal yang akan ditransformasikan.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end gap-3 pt-4">
           <Link href="/stok/ubah-bentuk" className="px-6 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</Link>
           <button type="submit" disabled={loading} className="flex items-center gap-2 px-10 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50 shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Selesaikan Transformasi
           </button>
        </div>
      </form>

      <BrowseGudangModal isOpen={isBrowseGudangOpen} onClose={() => setIsBrowseGudangOpen(false)} onSelect={(g) => { setFormData(prev => ({ ...prev, nomormhgudang: g.nomor, gudang_nama: g.nama })); setIsBrowseGudangOpen(false); }} />
      <BrowseBarangModal isOpen={isBrowseHasilOpen} onClose={() => setIsBrowseHasilOpen(false)} onSelect={handleSelectHasil} />
      <BrowseBarangModal isOpen={isBrowseAsalOpen} onClose={() => setIsBrowseAsalOpen(false)} onSelect={handleAddAsal} />
    </div>
  );
}
