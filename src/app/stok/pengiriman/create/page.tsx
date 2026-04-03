"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2,
  Calendar,
  Truck,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HistoryLogTab } from "@/components/HistoryLogTab";

export default function TransferGudangView() {
  const router = useRouter();
  const params = useParams();
  const id = params.id; // Kode TR

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stok/pengiriman/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        alert(json.error);
        router.push("/stok/pengiriman");
      }
    } catch (e) {
      alert("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleAction = async (action: 'approve' | 'disapprove' | 'delete') => {
    if (!confirm(`Yakin ingin melakukan aksi ini?`)) return;
    try {
      const res = await fetch(`/api/stok/pengiriman/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert(result.error);
      }
    } catch (e) {
      alert("Terjadi kesalahan");
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>;
  if (!data) return null;

  const isApproved = data.status_disetujui === 1;
  const isCancelled = data.status_aktif === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/stok/pengiriman" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">{data.kode}</h2>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                isCancelled ? "bg-red-50 text-red-700 border-red-200" : 
                isApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                {isCancelled ? "DIBATALKAN" : isApproved ? "DISETUJUI" : "MENUNGGU APPROVAL"}
              </span>
            </div>
            <p className="text-sm text-slate-500">Detail transfer stok barang.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           {!isCancelled && !isApproved && (
             <>
               <button onClick={() => handleAction('approve')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md transition-all"><CheckCircle2 className="h-4 w-4" /> Approve</button>
               <button onClick={() => handleAction('delete')} className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-50 transition-all"><Trash2 className="h-4 w-4" /> Batal</button>
             </>
           )}
           {isApproved && !isCancelled && (
             <button onClick={() => handleAction('disapprove')} className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-50 transition-all"><XCircle className="h-4 w-4" /> Batalkan Approval</button>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab("detail")} className={cn("px-6 py-3 text-sm font-bold border-b-2 transition-all", activeTab === "detail" ? "border-sky-600 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-700")}>Detail Transfer</button>
        <button onClick={() => setActiveTab("history")} className={cn("px-6 py-3 text-sm font-bold border-b-2 transition-all", activeTab === "history" ? "border-sky-600 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-700")}>History Log</button>
      </div>

      {activeTab === "detail" ? (
        <div className="space-y-6">
          {/* Info Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between">
             <div className="flex-1 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar className="h-3 w-3" /> Tanggal Pengiriman</p>
                <p className="text-lg font-bold text-slate-900">{new Date(data.tanggal).toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
             </div>
             
             <div className="flex-[2] flex items-center justify-center gap-6 w-full md:w-auto p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-center flex-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dari Gudang</p>
                   <p className="text-sm font-bold text-sky-700 uppercase">{data.gudang_asal_nama}</p>
                </div>
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
                   <ArrowRight className="h-5 w-5 text-sky-600" />
                </div>
                <div className="text-center flex-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tujuan Gudang</p>
                   <p className="text-sm font-bold text-sky-700 uppercase">{data.gudang_tujuan_nama}</p>
                </div>
             </div>
          </div>

          {data.keterangan && (
             <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                <p className="text-xs font-bold text-sky-700 uppercase mb-1">Keterangan / Catatan</p>
                <p className="text-sm text-slate-700 italic">{data.keterangan}</p>
             </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
             <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 w-12 text-center">No</th>
                    <th className="px-6 py-3">Barang</th>
                    <th className="px-6 py-3 text-center">Satuan</th>
                    <th className="px-6 py-3 text-right">Jumlah Kirim</th>
                    <th className="px-6 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {data.items.map((item: any, idx: number) => (
                     <tr key={item.nomor} className="hover:bg-slate-50/30 transition-colors">
                       <td className="px-6 py-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                       <td className="px-6 py-4">
                         <div className="flex flex-col">
                           <span className="font-bold text-slate-900 uppercase text-xs">{item.nama_barang}</span>
                           <span className="text-[10px] text-slate-400 font-mono">{item.kode_barang}</span>
                         </div>
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-xs">{item.satuan}</td>
                       <td className="px-6 py-4 text-right font-bold text-sky-600">{item.jumlah}</td>
                       <td className="px-6 py-4 text-slate-500 italic text-xs">{item.keterangan || '-'}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : (
        <HistoryLogTab menu="Transfer Gudang" nomor_transaksi={data.nomor} />
      )}
    </div>
  );
}
