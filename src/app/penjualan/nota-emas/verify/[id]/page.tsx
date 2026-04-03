"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Coins, ShieldCheck } from "lucide-react";

export default function VerifyNotaJualEmas() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/penjualan/nota-emas/${params.id}`);
        const json = await res.json();
        if (json.success && json.data.status_aktif === 1 && json.data.status_disetujui === 1) {
          setData(json.data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) fetchDetail();
  }, [params.id]);

  if (loading) {
    return (
     <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Memvalidasi Dokumen...</p>
     </div>
    );
  }

  if (error || !data) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
          <div className="bg-white p-10 rounded-3xl shadow-xl flex flex-col items-center text-center max-w-sm w-full">
              <XCircle className="h-24 w-24 text-rose-500 mb-6" />
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dokumen Tidak Valid</h1>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                 Nota ini belum disetujui, sudah dibatalkan, atau kode QR tidak ditemukan dalam database resmi kami.
              </p>
          </div>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
       <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl shadow-emerald-500/10 overflow-hidden">
          <div className="bg-emerald-500 p-8 flex flex-col items-center text-center text-white relative overflow-hidden">
             <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
             <ShieldCheck className="h-20 w-20 mb-4" />
             <h1 className="text-2xl font-black tracking-widest uppercase">TERVERIFIKASI</h1>
             <p className="opacity-90 mt-1 text-sm font-medium">Dokumen ini otentik & sah dikeluarkan oleh sistem Gold ERP.</p>
          </div>
          
          <div className="p-8 space-y-6">
             <div className="flex items-center gap-3 justify-center mb-8 border-b border-slate-100 pb-8">
                <Coins className="h-8 w-8 text-amber-500" />
                <h2 className="text-xl font-black text-slate-900 tracking-tighter">Gold<span className="text-amber-500">ERP</span></h2>
             </div>

             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No. Dokumen</span>
                <span className="font-bold text-slate-800 font-mono bg-slate-100 px-3 py-1 rounded-md">{data.kode}</span>
             </div>
             
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Customer</span>
                <span className="font-bold text-slate-800">{data.customer}</span>
             </div>

             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Tanggal Cetak</span>
                <span className="font-bold text-slate-800">{new Date(data.tanggal).toLocaleDateString('id-ID')}</span>
             </div>

             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Total Item</span>
                <span className="font-bold text-slate-800">{data.items.reduce((s:number, i:any)=>s+i.jumlah, 0)} Pcs / Gram</span>
             </div>

             <div className="mt-8 pt-8 border-t border-slate-100 border-dashed text-center">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Grand Total Transaksi</p>
                <p className="text-4xl font-black text-amber-600 tracking-tighter">
                   <span className="text-lg">Rp</span> {new Intl.NumberFormat('id-ID').format(data.total)}
                </p>
             </div>
          </div>
       </div>
    </div>
  );
}
