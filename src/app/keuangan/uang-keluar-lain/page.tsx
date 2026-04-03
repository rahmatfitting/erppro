"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, ArrowUpCircle, RefreshCw, CheckCircle, FileText, FileSpreadsheet, Edit, Printer, Loader2 } from "lucide-react";
import PrintModal from "@/components/PrintModal";
const fmt = (v: any) => new Intl.NumberFormat('id-ID').format(v || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function UangKeluarLainList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(""); const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState("");
  const [printData, setPrintData] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const fetchData = async () => { setLoading(true); const p = new URLSearchParams({ jenis: '0', keyword, startDate, endDate }); const r = await fetch(`/api/keuangan/uang-keluar?${p}`); const j = await r.json(); if (j.success) setData(j.data); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  const handlePrintRow = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/keuangan/uang-keluar/detail?id=${id}`);
      const d = await res.json();
      if (d.success) {
        setPrintData({
          title: "Voucher Pengeluaran Kas/Bank (Lain)",
          kode: d.header.kode,
          tanggal: d.header.tanggal,
          keterangan: d.header.keterangan || "-",
          extraHeaders: [
            { label: "Account Pembayar", value: `${d.header.account_kode} - ${d.header.account_nama}` },
            { label: "Metode Bayar", value: d.header.metode?.toUpperCase() || "-" },
            { label: "Valuta", value: `${d.header.valuta} @ ${fmt(d.header.kurs)}` }
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Account", key: "account_nama" },
            { header: "Keterangan", key: "keterangan" },
            { header: "Nominal (IDR)", key: "total_bayar_idr", width: 30, align: "right", format: (v: any) => fmt(v) },
          ],
          rows: d.items,
          footerRows: [
            { label: "TOTAL PENGELUARAN", value: `Rp ${fmt(d.header.total)}` }
          ]
        });
        setIsPrintModalOpen(true);
      }
    } catch (e) {
      alert("Gagal memuat data print");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (type: 'pdf' | 'excel') => {
    window.open(`/api/keuangan/uang-keluar/export?jenis=0&type=${type}&keyword=${keyword}&startDate=${startDate}&endDate=${endDate}`, '_blank');
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><ArrowUpCircle className="h-6 w-6 text-orange-600"/></div><div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Uang Keluar Lain</h1><p className="text-sm text-slate-500">Pengeluaran kas/bank non-transaksi</p></div></div>
        <div className="flex items-center gap-2">
          <button onClick={() => handlePrint('pdf')} className="inline-flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 text-sm font-semibold rounded-lg border border-rose-100"><FileText className="h-4 w-4" /> PDF</button>
          <button onClick={() => handlePrint('excel')} className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 text-sm font-semibold rounded-lg border border-emerald-100"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
          <Link href="/keuangan/uang-keluar-lain/create" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg"><Plus className="h-4 w-4"/> Buat UKL</Link>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/><input type="text" placeholder="Kode / Keterangan..." value={keyword} onChange={e=>setKeyword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchData()} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"/></div>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none"/>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none"/>
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg"><RefreshCw className="h-4 w-4"/> Cari</button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">{['Kode','Tanggal','Metode','Account','Total','Total IDR','Status','Aksi'].map(h=><th key={h} className={`px-4 py-3 text-xs font-semibold uppercase text-slate-500 ${['Total','Total IDR'].includes(h)?'text-right':'text-left'}`}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading?<tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
            :data.length===0?<tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Belum ada data</td></tr>
            :data.map(row=>(
              <tr key={row.nomor} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-mono font-semibold text-orange-600">{row.kode}</td>
                <td className="px-4 py-3 text-slate-600">{fmtDate(row.tanggal)}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.metode==='bank'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{row.metode?.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.account_nama||'-'}</td>
                <td className="px-4 py-3 text-right font-semibold">Rp {fmt(row.total)}</td>
                <td className="px-4 py-3 text-right text-slate-500 text-xs">Rp {fmt(row.total_idr)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {row.status_disetujui ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full w-fit"><CheckCircle className="h-3 w-3"/>Approved</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full w-fit">Pending</span>
                    )}
                    {row.status_aktif === 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full w-fit uppercase">Deleted</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/keuangan/uang-keluar-lain/${row.nomor}`} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="Detail"><Search className="h-4 w-4" /></Link>
                    {(!row.status_disetujui && row.status_aktif !== 0) && (
                      <Link href={`/keuangan/uang-keluar-lain/edit/${row.nomor}`} className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" title="Edit"><Edit className="h-4 w-4" /></Link>
                    )}
                    <button onClick={() => handlePrintRow(row.nomor)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors" title="Print PDF"><Printer className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {printData && (
        <PrintModal 
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          data={printData}
        />
      )}
    </div>
  );
}
