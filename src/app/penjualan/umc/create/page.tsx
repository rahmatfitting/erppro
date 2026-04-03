"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Banknote, AlertCircle } from "lucide-react";
const fmt = (v: number) => new Intl.NumberFormat('id-ID').format(v || 0);

export default function UMCCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [valutaList, setValutaList] = useState<any[]>([]);
  const [formData, setFormData] = useState({ tanggal: new Date().toISOString().split('T')[0], nomormhrelasi: 0, keterangan: "", nomormhaccount: 0, kode_order_jual: "", nomorthjualorder: 0, valuta: "IDR", kurs: 1, subtotal: 0, ppnNominal: 0, grandTotal: 0 });

  useEffect(() => {
    Promise.all([fetch('/api/master/customer').then(r => r.json()), fetch('/api/master/account').then(r => r.json()), fetch('/api/master/valuta').then(r => r.json()), fetch('/api/penjualan/order').then(r => r.json())])
      .then(([c, a, v, o]) => { if (c.success) setCustomers(c.data); if (a.success) setAccounts(a.data); if (v.success) setValutaList(v.data); if (o.success) setOrders(o.data || []); });
  }, []);

  const recalc = (d: any) => ({ ...d, grandTotal: parseFloat(d.subtotal || 0) + parseFloat(d.ppnNominal || 0) });
  const setField = (k: string, v: any) => setFormData(prev => recalc({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    const res = await fetch("/api/penjualan/umc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
    const d = await res.json();
    if (d.success) router.push(`/penjualan/umc/${d.data.kode}`);
    else { setError(d.error || "Gagal"); setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/penjualan/umc" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex items-center gap-2 flex-1"><Banknote className="h-6 w-6 text-teal-600" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Buat Uang Muka Customer</h1></div>
        <button onClick={handleSubmit} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"><Save className="h-4 w-4" /> {loading ? "Menyimpan..." : "Simpan"}</button>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Tanggal <span className="text-red-500">*</span></label><input type="date" value={formData.tanggal} onChange={e => setField('tanggal', e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" required /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Customer <span className="text-red-500">*</span></label><select value={formData.nomormhrelasi} onChange={e => setField('nomormhrelasi', parseInt(e.target.value))} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" required><option value={0}>-- Pilih Customer --</option>{customers.map(c => <option key={c.nomor} value={c.nomor}>{c.nama}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Account Pembayaran</label><select value={formData.nomormhaccount} onChange={e => setField('nomormhaccount', parseInt(e.target.value))} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"><option value={0}>-- Pilih Account --</option>{accounts.map(a => <option key={a.nomor} value={a.nomor}>{a.kode} - {a.nama}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Kode Order Jual</label><select value={formData.kode_order_jual} onChange={e => { const o = orders.find(x => x.kode === e.target.value); setFormData(prev => recalc({ ...prev, kode_order_jual: e.target.value, nomorthjualorder: o?.nomor || 0 })); }} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"><option value="">-- Pilih Order Jual --</option>{orders.map(o => <option key={o.kode} value={o.kode}>{o.kode}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Valuta</label><select value={formData.valuta} onChange={e => setField('valuta', e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">{valutaList.map(v => <option key={v.kode} value={v.kode}>{v.kode}</option>)}<option value="IDR">IDR</option></select></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Kurs</label><input type="number" value={formData.kurs} onChange={e => setField('kurs', parseFloat(e.target.value) || 1)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" min="1" /></div>
          <div className="md:col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Keterangan</label><textarea value={formData.keterangan} onChange={e => setField('keterangan', e.target.value)} rows={2} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" /></div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Subtotal</label><input type="number" value={formData.subtotal} onChange={e => setField('subtotal', parseFloat(e.target.value) || 0)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">PPN</label><input type="number" value={formData.ppnNominal} onChange={e => setField('ppnNominal', parseFloat(e.target.value) || 0)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Total</label><div className="text-sm px-3 py-2 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg font-bold text-teal-700 dark:text-teal-300">Rp {fmt(formData.grandTotal)}</div></div>
          </div>
          <div className="mt-2 text-right text-sm text-slate-500">Total IDR: <span className="font-semibold text-slate-800 dark:text-white">Rp {fmt(formData.grandTotal * formData.kurs)}</span></div>
        </div>
      </form>
    </div>
  );
}
