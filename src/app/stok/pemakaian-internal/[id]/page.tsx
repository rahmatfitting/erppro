"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2,
  Calendar,
  PackageOpen,
  BookOpen,
  CheckCircle2,
  XCircle,
  Trash2,
  Printer
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import PrintModal from "@/components/PrintModal";

export default function PemakaianInternalView() {
  const router = useRouter();
  const params = useParams();
  const id = params.id; // Kode PI

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stok/pemakaian-internal/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        alert(json.error);
        router.push("/stok/pemakaian-internal");
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
    setIsPending(true);
    try {
      const res = await fetch(`/api/stok/pemakaian-internal/${id}`, {
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

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-fuchsia-500" /></div>;
  if (!data) return null;

  const isApproved = data.status_disetujui === 1;
  const isCancelled = data.status_aktif === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/stok/pemakaian-internal" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 uppercase tracking-tighter">{data.kode}</h2>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                isCancelled ? "bg-red-50 text-red-700 border-red-200" : 
                isApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                {isCancelled ? "DIBATALKAN" : isApproved ? "DISETUJUI" : "MENUNGGU APPROVAL"}
              </span>
            </div>
            <p className="text-sm text-slate-500">Detail pemakaian barang internal.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {!isCancelled && !isApproved && (
              <>
                <button 
                  onClick={() => handleAction('approve')} 
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50"
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
      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab("detail")} className={cn("px-6 py-3 text-sm font-bold border-b-2 transition-all", activeTab === "detail" ? "border-fuchsia-600 text-fuchsia-600" : "border-transparent text-slate-500 hover:text-slate-700")}>Detail Pemakaian</button>
        <button onClick={() => setActiveTab("history")} className={cn("px-6 py-3 text-sm font-bold border-b-2 transition-all", activeTab === "history" ? "border-fuchsia-600 text-fuchsia-600" : "border-transparent text-slate-500 hover:text-slate-700")}>History Log</button>
      </div>

      {activeTab === "detail" ? (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-6">
                <div className="h-12 w-12 bg-fuchsia-50 rounded-full flex items-center justify-center border border-fuchsia-100"><Calendar className="h-6 w-6 text-fuchsia-600" /></div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tanggal Transaksi</p>
                   <p className="text-base font-bold text-slate-900">{new Date(data.tanggal).toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                </div>
             </div>
             <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-6">
                <div className="h-12 w-12 bg-sky-50 rounded-full flex items-center justify-center border border-sky-100"><PackageOpen className="h-6 w-6 text-sky-600" /></div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gudang Pengeluaran</p>
                   <p className="text-base font-bold text-slate-900 uppercase tracking-tighter">{data.gudang_nama}</p>
                </div>
             </div>
          </div>

          {data.keterangan && (
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Keterangan Umum</p>
                <p className="text-sm text-slate-700">{data.keterangan}</p>
             </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
             <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 w-12 text-center">No</th>
                    <th className="px-6 py-3">Barang</th>
                    <th className="px-6 py-3">Pembebanan Akun</th>
                    <th className="px-6 py-3 text-center">Satuan</th>
                    <th className="px-6 py-3 text-right">Jumlah</th>
                    <th className="px-6 py-3">Keterangan Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {data.items.map((item: any, idx: number) => (
                     <tr key={item.nomor} className="hover:bg-slate-50/30 transition-colors">
                       <td className="px-6 py-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                       <td className="px-6 py-4 font-bold text-slate-900 uppercase text-[11px]">{item.nama_barang}</td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <BookOpen className="h-3 w-3 text-fuchsia-400" />
                             <span className="text-xs font-bold text-fuchsia-800">{item.account_nama}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-center font-bold text-xs">{item.satuan}</td>
                       <td className="px-6 py-4 text-right font-bold text-fuchsia-600">{item.jumlah}</td>
                       <td className="px-6 py-4 text-slate-500 italic text-xs">{item.keterangan || '-'}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : (
        <HistoryLogTab menu="Pemakaian Internal" nomor_transaksi={data.nomor} />
      )}

      {/* Print Modal */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        data={{
          title: "Pemakaian Internal",
          kode: data.kode,
          tanggal: data.tanggal,
          keterangan: data.keterangan,
          extraHeaders: [
            { label: "Gudang", value: data.gudang_nama || "-" }
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Barang", key: "nama_barang" },
            { header: "Satuan", key: "satuan", width: 20 },
            { header: "Jumlah", key: "jumlah", width: 20, align: "right" },
            { header: "Beban Akun", key: "account_nama" },
            { header: "Keterangan", key: "keterangan" }
          ],
          rows: data.items,
        }}
      />
    </div>
  );
}
