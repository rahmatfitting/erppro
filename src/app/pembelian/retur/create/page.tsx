"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Plus, Trash2, FileX, AlertCircle, Loader2 } from "lucide-react";
import { BrowseNotaModal } from "@/components/BrowseNotaModal";
import { BrowseBarangNotaModal } from "@/components/BrowseBarangNotaModal";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";
import { BrowseValutaModal } from "@/components/BrowseValutaModal";

const fmt = (v: number) => new Intl.NumberFormat('id-ID').format(v || 0);

export default function ReturBeliCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isBrowseNotaOpen, setIsBrowseNotaOpen] = useState(false);
  const [isBrowseBarangOpen, setIsBrowseBarangOpen] = useState(false);
  const [isBrowseGudangOpen, setIsBrowseGudangOpen] = useState(false);
  const [isBrowseValutaOpen, setIsBrowseValutaOpen] = useState(false);
  const [currentNota, setCurrentNota] = useState({ nomor: 0, kode: "" });

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    supplier: "", 
    nomormhsupplier: 0,
    gudang: "",
    nomormhgudang: 0,
    keterangan: "", 
    valuta: "IDR", 
    nomormhvaluta: 1,
    kurs: 1,
    ppnPersen: 0,
  });

  const [items, setItems] = useState<any[]>([]);

  const handleSelectNota = (nota: any) => {
    setFormData({
      ...formData,
      supplier: nota.supplier,
      nomormhsupplier: nota.nomormhsupplier,
      valuta: nota.valuta || "IDR",
      nomormhvaluta: nota.nomormhvaluta || 1,
      kurs: nota.kurs || 1,
    });
    setCurrentNota({ nomor: nota.nomor, kode: nota.kode });
    setIsBrowseNotaOpen(false);
    setIsBrowseBarangOpen(true);
  };

  const handleSelectBarang = (item: any) => {
    // Check if already added
    if (items.find(i => i.nomortdbelinota === item.nomortdbelinota)) {
        setError("Barang dari nota ini sudah ada di daftar");
        setIsBrowseBarangOpen(false);
        return;
    }

    const newItem = {
        nomorthbelinota: item.nomorthbelinota,
        nomortdbelinota: item.nomortdbelinota,
        nomormhbarang: item.nomormhbarang,
        nomormhsatuan: item.nomormhsatuan,
        kode_nota: currentNota.kode,
        kode_barang: item.kode_barang || '',
        nama_barang: item.barang || item.nama_barang,
        satuan: item.satuan,
        jumlah: item.jumlah,
        harga: item.harga || 0,
        diskon_prosentase: 0,
        diskon_nominal: 0,
        netto: item.harga || 0,
        subtotal: item.jumlah * (item.harga || 0),
        keterangan: ''
    };

    setItems(prev => [...prev, newItem]);
    setIsBrowseBarangOpen(false);
  };
  
  const handleSelectGudang = (g: any) => {
    setFormData({ ...formData, gudang: g.nama, nomormhgudang: g.nomor });
    setIsBrowseGudangOpen(false);
  };

  const addItem = () => {
    setIsBrowseNotaOpen(true);
  };

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: string, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: value };
      
      const price = parseFloat(updated.harga || 0);
      const qty = parseFloat(updated.jumlah || 0);
      const discPercent = parseFloat(updated.diskon_prosentase || 0);
      
      const discNom = price * (discPercent / 100);
      updated.diskon_nominal = discNom;
      updated.netto = price - discNom;
      updated.subtotal = qty * updated.netto;
      
      return updated;
    }));
  };

  const handleSelectValuta = (v: any) => {
    setFormData({ ...formData, valuta: v.kode, nomormhvaluta: v.nomor, kurs: v.kurs || 1 });
    setIsBrowseValutaOpen(false);
  };

  const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const dpp = subtotal;
  const ppnNominal = dpp * (formData.ppnPersen / 100);
  const grandTotal = dpp + ppnNominal;
  const grandTotalIDR = grandTotal * formData.kurs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomormhsupplier) { setError("Supplier wajib dipilih"); return; }
    if (items.length === 0) { setError("Item wajib diisi"); return; }
    
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/pembelian/retur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, subtotal, dpp, ppnNominal, grandTotal, items }),
      });
      const d = await res.json();
      if (d.success) router.push(`/pembelian/retur/${d.data.nomor}`);
      else setError(d.error || "Gagal menyimpan");
    } catch { setError("Gagal menghubungi server"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/pembelian/retur" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <FileX className="h-6 w-6 text-orange-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Buat Retur Beli</h1>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

        {/* Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Informasi Header</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tanggal <span className="text-red-500">*</span></label>
              <input type="date" value={formData.tanggal} onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Gudang <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input type="text" value={formData.gudang} readOnly placeholder="Pilih Gudang..."
                  className="flex-1 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 dark:text-white outline-none cursor-default font-semibold" required />
                <button type="button" onClick={() => setIsBrowseGudangOpen(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors">Cari</button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Supplier <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={formData.supplier} 
                  readOnly 
                  placeholder="Pilih Nota terlebih dahulu..."
                  className="flex-1 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 dark:text-white outline-none cursor-default font-semibold" 
                />
                <button 
                  type="button"
                  onClick={() => setIsBrowseNotaOpen(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                >
                  Cari Nota
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Valuta</label>
              <div className="flex gap-2">
                <input 
                    type="text" 
                    value={formData.valuta} 
                    readOnly 
                    className="flex-1 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 dark:text-white outline-none cursor-default font-bold" 
                />
                <button type="button" onClick={() => setIsBrowseValutaOpen(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors">Cari</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kurs</label>
              <input type="number" value={formData.kurs} onChange={e => setFormData({ ...formData, kurs: parseFloat(e.target.value) || 1 })}
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono font-bold" min="1" />
            </div>
            <div className="md:col-span-1 lg:col-span-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Keterangan</label>
              <input type="text" value={formData.keterangan} onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Catatan retur..." className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
        </div>

        {/* Detail Items Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Detail Barang</h2>
            <button type="button" onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-semibold rounded-lg transition-colors">
              <Plus className="h-3.5 w-3.5" /> Tambah dari Nota
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 w-10">#</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-500 w-32 text-[10px]">Ref Nota</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 min-w-[160px]">Barang</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 w-20">Satuan</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 w-20">Jumlah</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 w-28">Harga</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 w-20">Disk %</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 w-28">Netto</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 w-28">Subtotal</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-400 italic">Pilih "Tambah dari Nota" untuk memulai retur</td></tr>
                ) : items.map((item, i) => (
                  <tr key={item.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.kode_nota}</td>
                    <td className="px-3 py-2">
                       <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{item.nama_barang}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.kode_barang}</span>
                       </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600 font-bold">{item.satuan || '-'}</td>
                    <td className="px-3 py-2">
                      <input type="number" value={item.jumlah} onChange={e => updateItem(i, 'jumlah', parseFloat(e.target.value) || 0)} min="0"
                        className="w-16 text-right text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold text-orange-600" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={item.harga} onChange={e => updateItem(i, 'harga', parseFloat(e.target.value) || 0)} min="0"
                        className="w-24 text-right text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={item.diskon_prosentase} onChange={e => updateItem(i, 'diskon_prosentase', parseFloat(e.target.value) || 0)} min="0" max="100"
                        className="w-14 text-right text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded dark:bg-slate-900 dark:text-white focus:outline-none" />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold font-mono text-slate-700 dark:text-slate-200">{fmt(item.netto)}</td>
                    <td className="px-3 py-2 text-right font-bold font-mono text-orange-600">{fmt(item.subtotal)}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="max-w-xs ml-auto space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Subtotal</span>
              <span className="font-bold text-slate-900 dark:text-white">Rp {fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">DPP</span>
              <span className="font-bold text-slate-900 dark:text-white">Rp {fmt(dpp)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium whitespace-nowrap">PPN (%)</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={formData.ppnPersen} 
                  onChange={e => setFormData({ ...formData, ppnPersen: parseFloat(e.target.value) || 0 })}
                  className="w-12 text-right text-xs px-1 py-0.5 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                  min="0" max="100"
                />
                <span className="font-bold text-slate-900 dark:text-white min-w-[80px] text-right">Rp {fmt(ppnNominal)}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
               <div className="flex justify-between text-base">
                <span className="text-slate-900 dark:text-white font-black uppercase tracking-wider">Grand Total</span>
                <span className="font-black text-orange-600 italic tracking-tighter text-lg">
                  Rp {fmt(grandTotal)}
                </span>
              </div>
              <div className="flex justify-between text-[10px] mt-1 text-slate-400 font-mono">
                <span>Total IDR (Kurs {fmt(formData.kurs)})</span>
                <span>Rp {fmt(grandTotalIDR)}</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Modals */}
      <BrowseNotaModal 
        isOpen={isBrowseNotaOpen}
        onClose={() => setIsBrowseNotaOpen(false)}
        onSelect={handleSelectNota}
        filter="remaining_for_return"
      />
      <BrowseBarangNotaModal
        isOpen={isBrowseBarangOpen}
        onClose={() => setIsBrowseBarangOpen(false)}
        onSelect={handleSelectBarang}
        notaNomor={currentNota.nomor}
        notaId={currentNota.kode}
      />
      <BrowseGudangModal
        isOpen={isBrowseGudangOpen}
        onClose={() => setIsBrowseGudangOpen(false)}
        onSelect={handleSelectGudang}
      />
      <BrowseValutaModal
        isOpen={isBrowseValutaOpen}
        onClose={() => setIsBrowseValutaOpen(false)}
        onSelect={handleSelectValuta}
      />
    </div>
  );
}
