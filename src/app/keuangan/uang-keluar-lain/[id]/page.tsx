"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowUpCircle, 
  CheckCircle, 
  Clock, 
  Loader2, 
  History,
  Trash2,
  AlertCircle,
  Printer,
  Edit
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import PrintModal from "@/components/PrintModal";

const fmt = (v: any) => new Intl.NumberFormat('id-ID').format(v || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

export default function UangKeluarLainDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/keuangan/uang-keluar/${id}`);
      const d = await r.json();
      if (d.success) setData(d.data);
      else {
        alert(d.error);
        router.push("/keuangan/uang-keluar-lain");
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

  const handleAction = async (action: 'approve' | 'delete' | 'disapprove') => { 
    const actionLabel = action === 'approve' ? 'Approve' : action === 'delete' ? 'Delete' : 'Batal Setuju';
    if (!confirm(`Apakah Anda yakin ingin melakukan aksi ${actionLabel}?`)) return; 
    setIsPending(true);
    try {
      const res = await fetch(`/api/keuangan/uang-keluar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      }); 
      const d = await res.json(); 
      if(d.success) {
        if (action === 'delete') router.push("/keuangan/uang-keluar-lain");
        else fetchData();
      } else {
        alert(d.error);
      }
    } catch (e) {
      alert("Terjadi kesalahan");
    } finally {
      setIsPending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24 text-slate-400"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;
  if (!data) return <div className="p-6 text-red-600 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Data tidak ditemukan</div>;

  const isApproved = data.status_disetujui === 1;
  const isCancelled = data.status_aktif === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 mt-4 md:mt-0">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/keuangan/uang-keluar-lain" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ArrowLeft className="h-5 w-5"/>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <ArrowUpCircle className="h-6 w-6 text-orange-600"/>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{data.kode}</h1>
                  <span className={cn(
                    "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                    isCancelled ? "bg-red-50 text-red-700 border-red-200" : 
                    isApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                    "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {isCancelled ? "Cancelled" : isApproved ? "Approved" : "Pending Approval"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Uang Keluar Lain • {fmtDate(data.tanggal)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {!isCancelled && !isApproved && (
            <>
              <Link
                href={`/keuangan/uang-keluar-lain/edit/${data.nomor}`}
                className="inline-flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-sm transition-all active:scale-95"
              >
                <Edit className="h-4 w-4" />
                Edit Data
              </Link>
              <button 
                onClick={() => handleAction('approve')} 
                disabled={isPending}
                className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
                {isPending ? "Processing..." : "Approve"}
              </button>
              <button 
                onClick={() => handleAction('delete')} 
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-lg transition-all disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4"/> Batal
              </button>
            </>
          )}
          {isApproved && !isCancelled && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction('disapprove')}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-6 py-2 bg-rose-100 text-rose-700 border border-rose-200 text-sm font-bold rounded-lg shadow-sm hover:bg-rose-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <AlertCircle className="h-4 w-4" />}
                {isPending ? "Processing..." : "Batal Setuju"}
              </button>
              <button
                onClick={() => setIsPrintOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm font-bold rounded-lg shadow-sm hover:bg-indigo-100 transition-all active:scale-95"
              >
                <Printer className="h-4 w-4" /> Cetak
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab("detail")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all", 
            activeTab === "detail" ? "border-orange-600 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Detail Transaksi
        </button>
        <button 
          onClick={() => setActiveTab("history")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2", 
            activeTab === "history" ? "border-orange-600 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <History className="h-4 w-4" /> History Log
        </button>
      </div>

      {activeTab === "detail" ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">Informasi Pembayaran</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-sm">
              {[
                {l:'Metode', v:data.metode?.toUpperCase(), c:'font-black text-slate-700 dark:text-slate-200'},
                {l:'Account Header', v:`${data.account_kode} - ${data.account_nama}`},
                {l:'Valuta / Kurs', v:`${data.valuta} @ ${fmt(data.kurs)}`},
                {l:'Total', v:`Rp ${fmt(data.total)}`, c:'font-black text-rose-600 text-lg md:col-start-4 text-right'},
                {l:'Keterangan', v:data.keterangan || '-', c:'md:col-span-3 italic text-slate-500'}
              ].map((f,i)=>(
                <div key={i} className={f.c || ''}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{f.l}</p>
                  <p className="font-medium truncate" title={String(f.v)}>{f.v}</p>
                </div>
              ))}
            </div>
          </div>

          {data.items?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alokasi Biaya / Keperluan</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-500">
                    <tr className="border-b dark:border-slate-800">
                      <th className="px-6 py-3 w-12 text-center">#</th>
                      <th className="px-6 py-3">Account</th>
                      <th className="px-6 py-3 text-right">Nominal</th>
                      <th className="px-6 py-3 text-right">Nominal IDR</th>
                      <th className="px-6 py-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.items.map((it:any,i:number)=>(
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3 text-slate-400 font-mono text-center">{i+1}</td>
                        <td className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">
                          {it.account_kode} - {it.account_nama}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-400">
                          {fmt(it.nominal)}
                        </td>
                        <td className="px-6 py-3 text-right font-black text-slate-900 dark:text-white">
                          Rp {fmt(it.total_bayar_idr)}
                        </td>
                        <td className="px-6 py-3 text-slate-500 italic max-w-xs truncate">{it.keterangan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <HistoryLogTab menu="Uang Keluar Lain" nomor_transaksi={data.nomor} />
      )}

      {/* Print Modal */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        data={{
          title: "Voucher Pengeluaran Kas/Bank (Lain)",
          kode: data.kode,
          tanggal: data.tanggal,
          keterangan: data.keterangan || "-",
          extraHeaders: [
            { label: "Account Sumber", value: `${data.account_kode} - ${data.account_nama}` },
            { label: "Metode Bayar", value: data.metode?.toUpperCase() || "-" },
            { label: "Valuta", value: `${data.valuta} @ ${fmt(data.kurs)}` }
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Keperluan", key: "account_nama" },
            { header: "Keterangan", key: "keterangan" },
            { header: "Nominal (IDR)", key: "total_bayar_idr", width: 30, align: "right" },
          ],
          rows: data.items,
          footerRows: [
            { label: "TOTAL PENGELUARAN", value: `Rp ${fmt(data.total)}` }
          ]
        }}
      />
    </div>
  );
}
