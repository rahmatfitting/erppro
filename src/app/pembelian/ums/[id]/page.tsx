"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Banknote, CheckCircle, Clock, Loader2 } from "lucide-react";

const fmt = (v: any) => new Intl.NumberFormat('id-ID').format(v || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

export default function UMSDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    fetch(`/api/pembelian/ums/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!confirm("Setujui Uang Muka Supplier ini?")) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/pembelian/ums/${id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ action: 'approve' }) 
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

  const sisa = (data.total || 0) - (data.total_terpakai || 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/pembelian/ums" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Banknote className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{data.kode}</h1>
            {data.status_disetujui ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full"><CheckCircle className="h-3 w-3" /> Approved</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full"><Clock className="h-3 w-3" /> Pending</span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Uang Muka Supplier • {fmtDate(data.tanggal)}</p>
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

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div><p className="text-xs text-slate-500 mb-1">Kode</p><p className="font-mono font-bold text-emerald-600">{data.kode}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Tanggal</p><p className="font-medium">{fmtDate(data.tanggal)}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Keterangan</p><p className="text-slate-700 dark:text-slate-300">{data.keterangan || '-'}</p></div>
          <div><p className="text-xs text-slate-500 mb-1">Valuta / Kurs</p><p className="font-medium">{data.valuta || 'IDR'} / {fmt(data.kurs)}</p></div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="max-w-xs ml-auto space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>Rp {fmt(data.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">PPN</span><span>Rp {fmt(data.ppn_nominal)}</span></div>
          <div className="flex justify-between border-t pt-2 font-bold text-base"><span>Total</span><span className="text-emerald-600">Rp {fmt(data.total)}</span></div>
          <div className="flex justify-between text-slate-500 text-xs"><span>Total IDR</span><span>Rp {fmt(data.total_idr)}</span></div>
          <div className="flex justify-between text-xs pt-2 border-t"><span className="text-slate-500">Terbayar</span><span>Rp {fmt(data.total_terbayar)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Terpakai</span><span>Rp {fmt(data.total_terpakai)}</span></div>
          <div className="flex justify-between text-sm font-bold text-emerald-600 border-t pt-2"><span>Sisa</span><span>Rp {fmt(sisa)}</span></div>
        </div>
      </div>
    </div>
  );
}
