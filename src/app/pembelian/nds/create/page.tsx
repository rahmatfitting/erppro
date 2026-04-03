"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, FileText, AlertCircle, Search } from "lucide-react";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { BrowseAccountModal } from "@/components/BrowseAccountModal";
import { BrowseNotaModal } from "@/components/BrowseNotaModal";

const fmt = (v: number) => new Intl.NumberFormat('id-ID').format(v || 0);

export default function NDSCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valutaList, setValutaList] = useState<any[]>([]);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    jenis: 'NDS',
    tanggal: new Date().toISOString().split('T')[0],
    supplier: "", nomormhsupplier: 0,
    keterangan: "",
    nomormhaccount: 0, account_tujuan: "",
    kode_nota_beli: "",
    valuta: "IDR", kurs: 1,
    subtotal: 0, ppnNominal: 0, pph: 0, pphnominal: 0, grandTotal: 0,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/master/valuta').then(r => r.json()),
    ]).then(([v]) => {
      if (v.success) setValutaList(v.data);
    });
  }, []);

  const recalc = (data: any) => {
    const grandTotal = parseFloat(data.subtotal || 0) + parseFloat(data.ppnNominal || 0) - parseFloat(data.pphnominal || 0);
    return { ...data, grandTotal };
  };

  const setField = (key: string, value: any) => {
    setFormData(prev => recalc({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier) { setError("Supplier wajib diisi"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/pembelian/nota-kredit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const d = await res.json();
      if (d.success) router.push(`/pembelian/nds/${d.data.nomor}`);
      else setError(d.error || "Gagal menyimpan");
    } catch { setError("Gagal menghubungi server"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/pembelian/nds" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <FileText className="h-6 w-6 text-purple-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Buat Nota Debet Supplier (NDS)</h1>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          <Save className="h-4 w-4" /> {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kode</label>
            <input readOnly value="(Auto)" className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tanggal <span className="text-red-500">*</span></label>
            <input type="date" value={formData.tanggal} onChange={e => setField('tanggal', e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Supplier <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input readOnly value={formData.supplier || "Pilih Supplier..."} 
                className="flex-1 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" />
              <button type="button" onClick={() => setIsSupplierModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors">
                <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Tujuan</label>
            <div className="flex gap-2">
              <input readOnly value={formData.account_tujuan || "Pilih Account..."} 
                className="flex-1 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" />
              <button type="button" onClick={() => setIsAccountModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors">
                <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kode Nota Beli</label>
            <div className="flex gap-2">
              <input readOnly value={formData.kode_nota_beli || "Pilih Nota Beli..."} 
                className="flex-1 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" />
              <button type="button" onClick={() => setIsNotaModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors">
                <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Valuta</label>
            <select value={formData.valuta} onChange={e => setField('valuta', e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
              {valutaList.map(v => <option key={v.kode} value={v.kode}>{v.kode} - {v.nama}</option>)}
              <option value="IDR">IDR - Rupiah</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kurs</label>
            <input type="number" value={formData.kurs} onChange={e => setField('kurs', parseFloat(e.target.value) || 1)} min="1"
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Keterangan</label>
            <textarea value={formData.keterangan} onChange={e => setField('keterangan', e.target.value)} rows={2}
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Subtotal</label>
              <input type="number" value={formData.subtotal} onChange={e => setField('subtotal', parseFloat(e.target.value) || 0)} min="0"
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">PPN</label>
              <input type="number" value={formData.ppnNominal} onChange={e => setField('ppnNominal', parseFloat(e.target.value) || 0)} min="0"
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">PPh %</label>
              <input type="number" value={formData.pph} onChange={e => {
                const pph = parseFloat(e.target.value) || 0;
                const pphnominal = formData.subtotal * (pph / 100);
                setFormData(prev => recalc({ ...prev, pph, pphnominal }));
              }} min="0" max="100" step="0.01"
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">PPh Nominal</label>
              <input type="number" value={formData.pphnominal} onChange={e => setField('pphnominal', parseFloat(e.target.value) || 0)} min="0"
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-6 text-sm">
            <div className="text-right">
              <span className="text-slate-500">Total: </span>
              <span className="text-xl font-bold text-purple-700 dark:text-purple-300">Rp {fmt(formData.grandTotal)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-xs">Total IDR: </span>
              <span className="font-semibold text-slate-800 dark:text-white">Rp {fmt(formData.grandTotal * formData.kurs)}</span>
            </div>
          </div>
        </div>
      </form>

      <BrowseSupplierModal 
        isOpen={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)}
        onSelect={(s) => {
          setFormData(prev => recalc({ ...prev, nomormhsupplier: s.nomor, supplier: s.nama }));
          setIsSupplierModalOpen(false);
        }}
      />

      <BrowseAccountModal 
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSelect={(a) => {
          setFormData(prev => recalc({ ...prev, nomormhaccount: a.nomor, account_tujuan: `${a.kode} - ${a.nama}` }));
          setIsAccountModalOpen(false);
        }}
      />

      <BrowseNotaModal 
        isOpen={isNotaModalOpen}
        onClose={() => setIsNotaModalOpen(false)}
        filter="approved"
        onSelect={(n) => {
          setFormData(prev => recalc({ ...prev, kode_nota_beli: n.kode }));
          setIsNotaModalOpen(false);
        }}
      />
    </div>
  );
}
