"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Save, 
  FileText, 
  Loader2,
  PackageOpen,
  Search,
  Plus,
  Trash2,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";
import { BrowsePenyesuaianModal } from "@/components/BrowsePenyesuaianModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

export default function StokOpnameCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isBrowseGudangOpen, setIsBrowseGudangOpen] = useState(false);
  const [isBrowsePenyesuaianOpen, setIsBrowsePenyesuaianOpen] = useState(false);
  const [isBrowseBarangOpen, setIsBrowseBarangOpen] = useState(false);

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nomormhgudang: null as number | null,
    gudang_nama: "",
    nomormhpenyesuaian: null as number | null,
    penyesuaian_nama: "",
    keterangan: "",
    items: [] as any[]
  });

  const handleAddItem = (barang: any) => {
    // Check if duplicate
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
          tercatat: 0,
          aktual: 0,
          perubahan: 0,
          keterangan: ""
        }
      ]
    }));
    setIsBrowseBarangOpen(false);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === "aktual" || field === "tercatat") {
      const aktual = parseFloat(newItems[index].aktual || 0);
      const tercatat = parseFloat(newItems[index].tercatat || 0);
      newItems[index].perubahan = aktual - tercatat;
    }
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomormhgudang) return alert("Pilih Gudang terlebih dahulu");
    if (formData.items.length === 0) return alert("Tambahkan minimal 1 barang");

    setLoading(true);
    try {
      const res = await fetch("/api/stok/opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        alert("Stok Opname berhasil disimpan");
        router.push("/stok/opname");
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
          <Link 
            href="/stok/opname"
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Buat Stok Opname</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Input hasil cek fisik stok di gudang.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tanggal <span className="text-red-500">*</span></label>
              <input 
                type="date"
                required
                value={formData.tanggal || ""}
                onChange={e => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Gudang <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  readOnly
                  placeholder="Pilih Gudang..."
                  value={formData.gudang_nama || ""}
                  onClick={() => setIsBrowseGudangOpen(true)}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none cursor-pointer dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
                <button type="button" onClick={() => setIsBrowseGudangOpen(true)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors dark:bg-slate-800 dark:border-slate-700"><Search className="h-4 w-4 text-slate-500" /></button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Jenis Penyesuaian</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  readOnly
                  placeholder="Pilih Jenis..."
                  value={formData.penyesuaian_nama || ""}
                  onClick={() => setIsBrowsePenyesuaianOpen(true)}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none cursor-pointer dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
                <button type="button" onClick={() => setIsBrowsePenyesuaianOpen(true)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors dark:bg-slate-800 dark:border-slate-700"><Search className="h-4 w-4 text-slate-500" /></button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Keterangan</label>
              <input 
                type="text"
                placeholder="Catatan tambahan..."
                value={formData.keterangan || ""}
                onChange={e => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Details Area */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
             <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Daftar Barang Penyesuaian</h3>
             <button 
                type="button"
                onClick={() => setIsBrowseBarangOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
             >
                <Plus className="h-3.5 w-3.5" />
                Tambah Barang
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-[1000px]">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 w-12 text-center text-slate-500">No</th>
                  <th className="px-4 py-3">Barang</th>
                  <th className="px-4 py-3 w-24 text-center">Satuan</th>
                  <th className="px-4 py-3 w-32 text-right">Tercatat</th>
                  <th className="px-4 py-3 w-32 text-right">Aktual</th>
                  <th className="px-4 py-3 w-32 text-right">Perubahan</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 w-16 text-center">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {formData.items.map((item, idx) => (
                  <tr key={item.nomormhbarang} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white uppercase text-xs">{item.nama_barang}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.kode_barang}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">{item.satuan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number"
                        step="any"
                        value={item.tercatat || 0}
                        onChange={e => handleItemChange(idx, "tercatat", e.target.value)}
                        className="w-full text-right bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none p-1 text-sm dark:border-slate-700"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number"
                        step="any"
                        value={item.aktual || 0}
                        onChange={e => handleItemChange(idx, "aktual", e.target.value)}
                        className="w-full text-right bg-indigo-50/30 border border-indigo-100 rounded focus:border-indigo-500 outline-none p-1.5 text-sm dark:bg-indigo-950/20 dark:border-indigo-900/30"
                      />
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${item.perubahan > 0 ? 'text-emerald-600' : item.perubahan < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {item.perubahan > 0 ? '+' : ''}{item.perubahan}
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="text"
                        value={item.keterangan || ""}
                        onChange={e => handleItemChange(idx, "keterangan", e.target.value)}
                        className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none p-1 text-sm dark:border-slate-700"
                        placeholder="..."
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                       <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {formData.items.length === 0 && (
                   <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">Belum ada barang dipilih. Klik tombol &quot;Tambah Barang&quot;</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-8">
           <Link href="/stok/opname" className="px-6 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-800 dark:text-slate-400">Batal</Link>
           <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
           >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Stok Opname
           </button>
        </div>
      </form>

      <BrowseGudangModal 
        isOpen={isBrowseGudangOpen} 
        onClose={() => setIsBrowseGudangOpen(false)} 
        onSelect={(g) => {
          setFormData(prev => ({ ...prev, nomormhgudang: g.nomor, gudang_nama: g.nama }));
          setIsBrowseGudangOpen(false);
        }} 
      />
      <BrowsePenyesuaianModal 
        isOpen={isBrowsePenyesuaianOpen} 
        onClose={() => setIsBrowsePenyesuaianOpen(false)} 
        onSelect={(p) => {
          setFormData(prev => ({ ...prev, nomormhpenyesuaian: p.nomor, penyesuaian_nama: p.nama }));
          setIsBrowsePenyesuaianOpen(false);
        }} 
      />
      <BrowseBarangModal 
        isOpen={isBrowseBarangOpen} 
        onClose={() => setIsBrowseBarangOpen(false)} 
        onSelect={handleAddItem} 
      />
    </div>
  );
}
