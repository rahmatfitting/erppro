"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, CreditCard, RefreshCw, CheckCircle } from "lucide-react";
const fmt = (v: any) => new Intl.NumberFormat('id-ID').format(v || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function NKCList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => { setLoading(true); const p = new URLSearchParams({ jenis: 'NKC', keyword, startDate, endDate }); const r = await fetch(`/api/penjualan/retur?${p}`); const j = await r.json(); if (j.success) setData(j.data); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><CreditCard className="h-6 w-6 text-blue-600" /></div>
          <div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Nota Kredit Customer</h1><p className="text-sm text-slate-500">Daftar NKC penjualan</p></div>
        </div>
        <Link href="/penjualan/nkc/create" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"><Plus className="h-4 w-4" /> Buat NKC</Link>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Kode / Customer..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" />
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg transition-colors"><RefreshCw className="h-4 w-4" /> Cari</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              {['Kode','Tanggal','Customer','Account Tujuan','Total','Status','Aksi'].map(h => <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase text-slate-500 ${h==='Total'?'text-right':h==='Status'?'text-center':'text-left'}`}>{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
              : data.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada data NKC</td></tr>
              : data.map(row => (
                <tr key={row.nomor} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{row.kode}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmtDate(row.tanggal)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{row.customer}</td>
                  <td className="px-4 py-3 text-slate-600">{row.account_tujuan || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">Rp {fmt(row.total)}</td>
                  <td className="px-4 py-3 text-center">{row.status_disetujui ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full"><CheckCircle className="h-3 w-3" /> Approved</span> : <span className="inline-flex px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Pending</span>}</td>
                  <td className="px-4 py-3"><Link href={`/penjualan/nkc/${row.kode}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Detail</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
