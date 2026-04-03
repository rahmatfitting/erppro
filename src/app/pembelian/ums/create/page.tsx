"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Banknote, AlertCircle, Search } from "lucide-react";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { BrowseAccountModal } from "@/components/BrowseAccountModal";
import { BrowsePOModal } from "@/components/BrowsePOModal";

const fmt = (v: number) => new Intl.NumberFormat('id-ID').format(v || 0);

export default function UMSCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valutaList, setValutaList] = useState<any[]>([]);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [accountName, setAccountName] = useState("");

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nomormhrelasi: 0, supplier: "",
    keterangan: "",
    nomormhaccount: 0,
    kode_order_beli: "", nomorthbeliorder: 0,
    valuta: "IDR", kurs: 1,
    subtotal: 0, ppnNominal: 0, grandTotal: 0,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/master/valuta').then(r => r.json()),
    ]).then(([v]) => {
      if (v.success) setValutaList(v.data);
    });
  }, []);

  const recalc = (data: any) => ({
    ...data,
    grandTotal: parseFloat(data.subtotal || 0) + parseFloat(data.ppnNominal || 0)
  });

  const setField = (key: string, value: any) => setFormData(prev => recalc({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/pembelian/ums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const d = await res.json();
      if (d.success) router.push(`/pembelian/ums/${d.data.nomor}`);
      else setError(d.error || "Gagal menyimpan");
    } catch { setError("Gagal menghubungi server"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/pembelian/ums" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <Banknote className="h-6 w-6 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Buat Uang Muka Supplier</h1>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          <Save className="h-4 w-4" /> {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kode</label>
            <input readOnly value="(Auto UMS-YYYYMM-XXX)" className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tanggal <span className="text-red-500">*</span></label>
            <input type="date" value={formData.tanggal} onChange={e => setField('tanggal', e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
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
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Pembayaran</label>
            <div className="flex gap-2">
              <input readOnly value={accountName || "Pilih Account..."} 
                className="flex-1 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" />
              <button type="button" onClick={() => setIsAccountModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors">
                <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kode Order Beli</label>
            <div className="flex gap-2">
              <input readOnly value={formData.kode_order_beli || "Pilih Order Beli..."} 
                className="flex-1 text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" />
              <button type="button" onClick={() => setIsPOModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors">
                <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Valuta</label>
            <select value={formData.valuta} onChange={e => setField('valuta', e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {valutaList.map(v => <option key={v.kode} value={v.kode}>{v.kode} - {v.nama}</option>)}
              <option value="IDR">IDR - Rupiah</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kurs</label>
            <input type="number" value={formData.kurs} onChange={e => setField('kurs', parseFloat(e.target.value) || 1)} min="1"
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Keterangan</label>
            <textarea value={formData.keterangan} onChange={e => setField('keterangan', e.target.value)} rows={2}
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Subtotal</label>
              <input type="number" value={formData.subtotal} onChange={e => setField('subtotal', parseFloat(e.target.value) || 0)} min="0"
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">PPN</label>
              <input type="number" value={formData.ppnNominal} onChange={e => setField('ppnNominal', parseFloat(e.target.value) || 0)} min="0"
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total</label>
              <div className="text-sm px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg font-bold text-emerald-700 dark:text-emerald-300">
                Rp {fmt(formData.grandTotal)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-right text-sm text-slate-500">
            Total IDR: <span className="font-semibold text-slate-800 dark:text-white">Rp {fmt(formData.grandTotal * formData.kurs)}</span>
          </div>
        </div>
      </form>

      <BrowseSupplierModal 
        isOpen={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)}
        onSelect={(s) => {
          setFormData(prev => recalc({ ...prev, nomormhrelasi: s.nomor, supplier: s.nama }));
          setIsSupplierModalOpen(false);
        }}
      />

      <BrowseAccountModal 
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSelect={(a) => {
          setFormData(prev => recalc({ ...prev, nomormhaccount: a.nomor }));
          setAccountName(`${a.kode} - ${a.nama}`);
          setIsAccountModalOpen(false);
        }}
      />

      <BrowsePOModal 
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        onSelect={(po) => {
          setFormData(prev => recalc({ ...prev, kode_order_beli: po.kode, nomorthbeliorder: po.nomor }));
          setIsPOModalOpen(false);
        }}
      />
    </div>
  );
}
