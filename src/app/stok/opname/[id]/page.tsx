"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ChevronLeft, 
  FileText, 
  Loader2,
  Calendar,
  Package,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Printer
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import PrintModal from "@/components/PrintModal";

export default function StokOpnameView() {
  const router = useRouter();
  const params = useParams();
  const id = params.id; // Kode SO

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stok/opname/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        alert(json.error);
        router.push("/stok/opname");
      }
    } catch (e) {
      console.error(e);
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
    setIsPending(true);
    try {
      const res = await fetch(`/api/stok/opname/${id}`, {
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
    } finally {
      setIsPending(false);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  if (!data) return null;

  const isApproved = data.status_disetujui === 1;
  const isCancelled = data.status_aktif === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/stok/opname" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{data.kode}</h2>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold border",
                isCancelled ? "bg-red-50 text-red-700 border-red-200" : 
                isApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                {isCancelled ? "DIBATALKAN" : isApproved ? "DISETUJUI" : "MENUNGGU APPROVAL"}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Detail data stok opname.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           {!isCancelled && !isApproved && (
             <>
               <button 
                 onClick={() => handleAction('approve')} 
                 disabled={isPending}
                 className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
               >
                 {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}
                 {isPending ? "Processing..." : "Approve"}
               </button>
               <button 
                 onClick={() => handleAction('delete')} 
                 disabled={isPending}
                 className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-50 transition-all disabled:opacity-50"
               >
                 <Trash2 className="h-4 w-4" /> Batal
               </button>
             </>
           )}
           {isApproved && !isCancelled && (
             <button 
               onClick={() => handleAction('disapprove')} 
               disabled={isPending}
               className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-50 transition-all disabled:opacity-50"
             >
               {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
               {isPending ? "Processing..." : "Batalkan Approval"}
             </button>
           )}
           {isApproved && !isCancelled && (
              <button
                onClick={() => setIsPrintOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-all shadow-sm"
              >
                <Printer className="h-4 w-4" /> Cetak
              </button>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setActiveTab("detail")} className={cn("px-6 py-3 text-sm font-bold border-b-2 transition-all", activeTab === "detail" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}>Detail Transaksi</button>
        <button onClick={() => setActiveTab("history")} className={cn("px-6 py-3 text-sm font-bold border-b-2 transition-all", activeTab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}>History Log</button>
      </div>

      {activeTab === "detail" ? (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
              <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center dark:bg-indigo-900/20"><Calendar className="h-5 w-5" /></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal</p><p className="text-sm font-bold">{new Date(data.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p></div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
              <div className="h-10 w-10 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center dark:bg-sky-900/20"><Package className="h-5 w-5" /></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gudang</p><p className="text-sm font-bold">{data.gudang_nama}</p></div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
              <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center dark:bg-purple-900/20"><Wallet className="h-5 w-5" /></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jenis Penyesuaian</p><p className="text-sm font-bold">{data.penyesuaian_nama || '-'}</p></div>
            </div>
          </div>

          {/* Keterangan */}
          {data.keterangan && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Keterangan</p>
              <p className="text-sm">{data.keterangan}</p>
            </div>
          )}

          {/* Items Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 w-12 text-center">No</th>
                  <th className="px-6 py-3">Barang</th>
                  <th className="px-6 py-3 text-center">Satuan</th>
                  <th className="px-6 py-3 text-right">Tercatat</th>
                  <th className="px-6 py-3 text-right text-indigo-600">Aktual</th>
                  <th className="px-6 py-3 text-right">Perubahan</th>
                  <th className="px-6 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((item: any, idx: number) => (
                  <tr key={item.nomor} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white uppercase">{item.nama_barang}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.kode_barang}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-xs">{item.satuan}</td>
                    <td className="px-6 py-4 text-right">{item.tercatat}</td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-600">{item.aktual}</td>
                    <td className={`px-6 py-4 text-right font-bold ${item.perubahan > 0 ? 'text-emerald-600' : item.perubahan < 0 ? 'text-red-600' : ''}`}>
                      {item.perubahan > 0 ? '+' : ''}{item.perubahan}
                    </td>
                    <td className="px-6 py-4 text-slate-500 italic text-xs">{item.keterangan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <HistoryLogTab menu="Stok Opname" nomor_transaksi={data.nomor} />
      )}

      {/* Print Modal */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        data={{
          title: "Stok Opname",
          kode: data.kode,
          tanggal: data.tanggal,
          keterangan: data.keterangan,
          extraHeaders: [
            { label: "Gudang", value: data.gudang_nama || "-" },
            { label: "Jenis Penyesuaian", value: data.penyesuaian_nama || "-" }
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Barang", key: "nama_barang" },
            { header: "Satuan", key: "satuan", width: 20 },
            { header: "Tercatat", key: "tercatat", width: 20, align: "right" },
            { header: "Aktual", key: "aktual", width: 20, align: "right" },
            { header: "Selisih", key: "perubahan", width: 20, align: "right" },
          ],
          rows: data.items,
        }}
      />
    </div>
  );
}
