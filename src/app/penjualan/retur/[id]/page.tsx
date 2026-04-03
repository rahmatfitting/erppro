"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileX, CheckCircle, Clock, Loader2 } from "lucide-react";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import { cn } from "@/lib/utils";
const fmt = (v: any) => new Intl.NumberFormat('id-ID').format(v || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

export default function ReturJualDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");

  useEffect(() => { fetch(`/api/penjualan/retur/${id}`).then(r => r.json()).then(d => { if (d.success) setData(d.data); }).finally(() => setLoading(false)); }, [id]);

  const handleApprove = async () => {
    if (!confirm("Setujui Retur Jual ini?")) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/penjualan/retur/${id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ action: 'approve', user: 'Admin' }) 
      });
      const d = await res.json();
      if (d.success) setData({ ...data, status_disetujui: 1 });
    } catch (e) {
      alert("Terjadi kesalahan");
    } finally {
      setIsPending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16 text-slate-400">Memuat...</div>;
  if (!data) return <div className="p-6 text-red-600">Data tidak ditemukan</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/penjualan/retur" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileX className="h-6 w-6 text-rose-600" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{data.kode}</h1>
            {data.status_disetujui ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full"><CheckCircle className="h-3 w-3" /> Approved</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full"><Clock className="h-3 w-3" /> Pending</span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Retur Jual • {fmtDate(data.tanggal)}</p>
        </div>
        {!data.status_disetujui && (
          <button 
            disabled={isPending}
            onClick={handleApprove} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
             {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
             {isPending ? "Processing..." : "Approve"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab("detail")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all", 
            activeTab === "detail" ? "border-rose-600 text-rose-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Detail Retur
        </button>
        <button 
          onClick={() => setActiveTab("history")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all", 
            activeTab === "history" ? "border-rose-600 text-rose-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          History Log
        </button>
      </div>

      {activeTab === "detail" ? (
        <>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div><p className="text-xs text-slate-500 mb-1">Kode</p><p className="font-mono font-bold text-rose-600">{data.kode}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Tanggal</p><p className="font-medium">{fmtDate(data.tanggal)}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Customer</p><p className="font-medium">{data.customer}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Valuta / Kurs</p><p className="font-medium">{data.valuta} / {fmt(data.kurs)}</p></div>
          <div className="md:col-span-2"><p className="text-xs text-slate-500 mb-1">Keterangan</p><p className="text-slate-700 dark:text-slate-300">{data.keterangan || '-'}</p></div>
        </div>
      </div>

      {data.items && data.items.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Detail Barang</h2>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">#</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Barang</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Jumlah</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Harga</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.items.map((item: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800 dark:text-white">{item.nama_barang}</td>
                  <td className="px-3 py-2 text-right">{item.jumlah} {item.satuan}</td>
                  <td className="px-3 py-2 text-right">Rp {fmt(item.harga)}</td>
                  <td className="px-3 py-2 text-right font-bold text-rose-600">Rp {fmt(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="max-w-xs ml-auto space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>Rp {fmt(data.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">PPN</span><span>Rp {fmt(data.ppn_nominal)}</span></div>
          <div className="flex justify-between border-t pt-2 font-bold text-base"><span>Total</span><span className="text-rose-600">Rp {fmt(data.total)}</span></div>
          <div className="flex justify-between text-slate-500 text-xs"><span>Total IDR</span><span>Rp {fmt(data.total_idr)}</span></div>
        </div>
      </div>
      </>
      ) : (
        <HistoryLogTab menu="Retur Penjualan" nomor_transaksi={data.nomor} />
      )}
    </div>
  );
}
