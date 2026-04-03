"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Save, Receipt, Loader2, ArrowLeft, FileEdit, X, AlertCircle, Printer, History, PackageOpen, QrCode } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import PrintModal from "@/components/PrintModal";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import { QRCodePrintModal } from "@/components/QRCodePrintModal";

export default function NotaBeliLangsungDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [activeTab, setActiveTab ] = useState<"detail" | "history">("detail");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isQRPrintOpen, setIsQRPrintOpen] = useState(false);

  const [header, setHeader] = useState<any>({
    nomor: 0,
    kode: "",
    tanggal: "",
    supplier: "",
    nomormhsupplier: 0,
    nomor_faktur_supplier: "",
    jatuh_tempo: "",
    valuta: "IDR",
    nomormhvaluta: 1,
    kurs: 1,
    keterangan: "",
    status_aktif: 1,
    status_disetujui: 0,
    total: 0,
    total_idr: 0,
    subtotal: 0,
    diskon_nominal: 0,
    dpp: 0,
    ppn_prosentase: 0,
    ppn_nominal: 0
  });

  const [items, setItems] = useState<any[]>([]);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/pembelian/nota-beli-langsung/${id}`);
      const json = await res.json();

      if (json.success) {
        setHeader(json.data);
        setItems(json.data.items || []);
      } else {
        setError(json.error || "Data tidak ditemukan");
      }
    } catch (err: any) {
      setError("Error mengambil data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAction = async (action: 'approve' | 'disapprove' | 'delete') => {
    const actionText = action === 'delete' ? 'menghapus' : action === 'approve' ? 'menyetujui' : 'membatalkan approval';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} data ini?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/pembelian/nota-beli-langsung`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      const result = await res.json();
      if (result.success) {
        if (action === 'delete') {
          router.push('/pembelian/nota-beli-langsung');
        } else {
          fetchData();
        }
      } else {
        alert(result.error || "Gagal melakukan aksi");
      }
    } catch (error) {
       alert("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: any) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: header.valuta || 'IDR', minimumFractionDigits: 0 }).format(Number(amount));
  };

  if (fetching) {
     return (
       <div className="flex justify-center items-center h-48">
         <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
       </div>
     );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/20 shadow-sm p-8 text-center">
        <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-red-600 shadow-sm" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Terjadi Kesalahan</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">{error}</p>
        <Link 
          href="/pembelian/nota-beli-langsung"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md font-bold text-sm hover:scale-[1.02] transition-transform active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar</span>
        </Link>
      </div>
    );
  }

  const getStatusDisplay = (aktif: number, disetujui: number) => {
    if (aktif === 0) return { label: 'Dibatalkan', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' };
    if (disetujui === 1) return { label: 'Disetujui', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
    return { label: 'Menunggu Approval', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
  };

  const statusDisplay = getStatusDisplay(header.status_aktif, header.status_disetujui);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/pembelian/nota-beli-langsung" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
               Nota Beli Langsung
             </Link>
             <span className="text-slate-300 dark:text-slate-600">/</span>
             <span className="text-sm font-medium text-slate-900 dark:text-white">Detail Nota</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Receipt className="h-6 w-6 text-indigo-600" />
            {header.kode}
            <span className={cn(
               "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ml-2",
               statusDisplay.color
             )}>
               {statusDisplay.label}
             </span>
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            <Link 
              href="/pembelian/nota-beli-langsung"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </Link>
            
            {header.status_aktif === 1 && (
                <>
                  {!header.status_disetujui ? (
                    <>
                      <button 
                        onClick={() => handleAction('approve')}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        <span>Approve Nota</span>
                      </button>
                      <Link 
                        href={`/pembelian/nota-beli-langsung/edit/${id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <FileEdit className="h-4 w-4" />
                        <span>Edit Nota</span>
                      </Link>
                      <button 
                        onClick={() => handleAction('delete')}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-900 border border-red-200 text-red-600 px-3 py-2 text-sm font-bold hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Hapus Nota</span>
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleAction('disapprove')}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-900 border border-amber-200 text-amber-600 px-3 py-2 text-sm font-bold hover:bg-amber-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      <span>Batal Approval</span>
                    </button>
                  )}
                </>
            )}

            {header.status_disetujui === 1 && (
              <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsQRPrintOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm hover:bg-amber-100 transition-all active:scale-95"
                >
                    <QrCode className="h-4 w-4" />
                    <span>Cetak QR Code</span>
                </button>
                <button
                    onClick={() => setIsPrintOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shadow-sm hover:bg-indigo-100 transition-all active:scale-95"
                >
                    <Printer className="h-4 w-4" />
                    <span>Cetak Nota</span>
                </button>
              </div>
            )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab("detail")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300", 
            activeTab === "detail" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Detail Nota
        </button>
        <button 
          onClick={() => setActiveTab("history")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2", 
            activeTab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <History className="h-4 w-4" /> History Log
        </button>
      </div>

      {activeTab === "detail" ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400 border-b pb-2">
              Informasi Umum
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. Nota Internal</label>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{header.kode}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. Faktur Supplier</label>
                <div className="text-sm font-bold text-indigo-600">{header.nomor_faktur_supplier || '-'}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier</label>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{header.supplier}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Nota</label>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {new Date(header.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jatuh Tempo</label>
                <div className="text-sm font-bold text-red-600 uppercase">
                   {header.jatuh_tempo ? new Date(header.jatuh_tempo).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valuta & Kurs</label>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                   {header.valuta} @ {Number(header.kurs).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="space-y-1 lg:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keterangan</label>
                <div className="text-sm text-slate-600 dark:text-slate-400 italic">{header.keterangan || 'Tanpa keterangan'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden font-bold">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Detail Transaksi Barang
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100/50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-500 border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">No</th>
                    <th className="px-6 py-4">Barang</th>
                    <th className="px-6 py-4 w-24">Satuan</th>
                    <th className="px-6 py-4 w-24 text-right">Jumlah</th>
                    <th className="px-6 py-4 w-36 text-right">Harga</th>
                    <th className="px-6 py-4 w-24 text-center">Disc%</th>
                    <th className="px-6 py-4 w-40 text-right">Netto/Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, index) => (
                    <tr key={item.nomor} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors">
                      <td className="px-6 py-4 text-center text-slate-400 font-mono italic">{index + 1}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col uppercase">
                          <span className="text-slate-900 dark:text-white font-bold">{item.nama_barang || item.barang_nama}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.kode_barang}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 uppercase text-slate-500 font-bold">{item.satuan || item.satuan_nama}</td>
                      <td className="px-6 py-3 text-right text-indigo-600 font-bold">{Number(item.jumlah).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3 text-right font-mono">{Number(item.harga).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3 text-center text-red-500 font-bold">{item.diskon_prosentase}%</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white bg-slate-50/20">{formatCurrency(item.netto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 font-bold">
              <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">Total Tagihan</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Subtotal</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(header.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-y border-slate-50 dark:border-slate-800">
                  <span className="text-xs text-slate-500">Diskon Global</span>
                  <span className="text-sm text-red-600">-{formatCurrency(header.diskon_nominal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">DPP</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{formatCurrency(header.dpp)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">PPN ({header.ppn_prosentase}%)</span>
                  <span className="text-sm text-slate-900 dark:text-white">{formatCurrency(header.ppn_nominal)}</span>
                </div>
                <div className="pt-6 mt-4 border-t-2 border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[10px] text-indigo-500 uppercase tracking-[0.2em] mb-1">Grand Total</span>
                    <span className="text-3xl text-indigo-600 dark:text-indigo-400 tracking-tighter italic">
                      {formatCurrency(header.total)}
                    </span>
                    {header.valuta !== 'IDR' && (
                       <div className="mt-2 text-xs font-bold text-slate-400 italic font-mono">
                          Rp {Number(header.total_idr).toLocaleString('id-ID')}
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <HistoryLogTab menu="Nota Beli Langsung" nomor_transaksi={header.nomor} />
      )}

      {/* Print Modal Placeholder */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        data={{
          title: "Nota Beli Langsung",
          kode: header.kode,
          tanggal: header.tanggal,
          keterangan: header.keterangan,
          extraHeaders: [
            { label: "Supplier", value: header.supplier },
            { label: "No. Faktur Vendor", value: header.nomor_faktur_supplier },
            { label: "Jatuh Tempo", value: header.jatuh_tempo ? new Date(header.jatuh_tempo).toLocaleDateString('id-ID') : '-' },
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Barang", key: "nama_barang" },
            { header: "Satuan", key: "satuan", width: 15 },
            { header: "Jml", key: "jumlah", width: 15, align: "right" },
            { header: "Harga", key: "harga", width: 30, align: "right", format: (v) => Number(v).toLocaleString('id-ID') },
            { header: "Netto", key: "netto", width: 35, align: "right", format: (v) => Number(v).toLocaleString('id-ID') },
          ],
          rows: items.map((it, idx) => ({ ...it, _no: idx + 1, nama_barang: it.nama_barang || it.barang_nama, satuan: it.satuan || it.satuan_nama })),
          footerRows: [
            { label: "Subtotal", value: header.subtotal.toLocaleString('id-ID') },
            { label: "Diskon", value: `-${header.diskon_nominal.toLocaleString('id-ID')}` },
            { label: "DPP", value: header.dpp.toLocaleString('id-ID') },
            { label: "PPN", value: header.ppn_nominal.toLocaleString('id-ID') },
            { label: "GRAND TOTAL", value: `${header.valuta} ${header.total.toLocaleString('id-ID')}` },
          ]
        }}
      />

      <QRCodePrintModal
        isOpen={isQRPrintOpen}
        onClose={() => setIsQRPrintOpen(false)}
        items={items.map(i => ({
          kode_barang: i.kode_barang || i.master_kode || "",
          nama_barang: i.nama_barang || i.barang_nama || "",
          jumlah: i.jumlah,
          satuan: i.satuan || i.satuan_nama
        }))}
      />
    </div>
  );
}
