"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Printer, AlertCircle, Ban, Loader2, Store, CheckCircle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HistoryLogTab } from "@/components/HistoryLogTab";

export default function POSDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");

  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/penjualan/pos/${id}`);
      const json = await res.json();

      if (json.success && json.data) {
         setData(json.data);
      } else {
         setError(json.error || "Data tidak ditemukan");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal mengambil data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleVoid = async () => {
     if (!confirm(`Apakah Anda yakin ingin MEMBATALKAN transaksi kasir ${data?.kode}? Aksi ini tidak dapat dikembalikan.`)) return;
     
     setLoading(true);
     try {
       const res = await fetch(`/api/penjualan/pos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'void', user: 'Admin' })
       });
       const json = await res.json();
       if (json.success) {
          fetchData(); // Reload data to show canceled status
       } else {
          alert('Gagal membatalkan transaksi: ' + json.error);
       }
     } catch (err: any) {
        alert('Error: ' + err.message);
     } finally {
        setLoading(false);
     }
  };

  if (fetching) {
     return (
        <div className="flex items-center justify-center p-24">
           <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
     );
  }

  if (error || !data) {
     return (
        <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-red-100 flex flex-col items-center justify-center space-y-4">
           <AlertCircle className="h-12 w-12 text-red-500" />
           <p className="text-slate-800 font-medium">{error || "Data tidak ditemukan"}</p>
           <Link href="/penjualan/pos" className="text-indigo-600 hover:underline">Kembali ke Daftar POS</Link>
        </div>
     );
  }

  const isCanceled = data.status_aktif === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/penjualan/pos" className="text-sm font-medium text-slate-500 hover:text-slate-700">
               Point of Sale (POS)
             </Link>
             <span className="text-slate-300">/</span>
             <span className="text-sm font-medium text-slate-900 dark:text-white">Detail Transaksi</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="h-6 w-6 text-indigo-600" />
            {data.kode}
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ml-2",
              isCanceled 
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}>
              {isCanceled ? (
                 <><Ban className="h-3.5 w-3.5 mr-1" /> Dibatalkan</>
              ) : (
                 <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Sukses</>
              )}
            </span>
          </h1>
        </div>
        
        <div className="flex gap-2">
           <Link href="/penjualan/pos" className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
             <ArrowLeft className="h-4 w-4" /> Kembali
           </Link>
           {!isCanceled && (
             <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 text-sm font-medium shadow-sm hover:bg-indigo-100">
               <Printer className="h-4 w-4" /> Cetak Struk
             </button>
           )}
           {!isCanceled && (
             <button onClick={handleVoid} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-red-50 text-red-700 border border-red-200 px-4 py-2 text-sm font-medium shadow-sm hover:bg-red-100 disabled:opacity-50">
               {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Void
             </button>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab("detail")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all", 
            activeTab === "detail" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Detail Transaksi
        </button>
        <button 
          onClick={() => setActiveTab("history")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all", 
            activeTab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          History Log
        </button>
      </div>

      {activeTab === "detail" ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row">
         
         {/* Kiri - Informasi Umum */}
         <div className="p-6 md:p-8 md:w-2/3 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-3 mb-4">Informasi Transaksi</h3>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
               <div>
                  <div className="text-sm text-slate-500 mb-1">Tanggal</div>
                  <div className="font-medium text-slate-900">
                     {new Date(data.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
               </div>
               <div>
                  <div className="text-sm text-slate-500 mb-1">Customer</div>
                  <div className="font-medium text-slate-900">{data.customer}</div>
               </div>
               <div>
                  <div className="text-sm text-slate-500 mb-1">Kasir / Operator</div>
                  <div className="font-medium text-slate-900">{data.dibuat_oleh}</div>
               </div>
               <div>
                  <div className="text-sm text-slate-500 mb-1">Metode Pembayaran</div>
                  <div className="font-semibold text-indigo-700 bg-indigo-50 inline-block px-3 py-1 rounded-md border border-indigo-100">{data.pembayaran}</div>
               </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 border-b pb-3 mt-8 mb-4">Daftar Belanja</h3>
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                     <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Nama Barang</th>
                        <th className="p-3 text-right">Harga</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Disc</th>
                        <th className="p-3 text-right font-semibold">Subtotal</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {data.items?.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                           <td className="p-3 text-center text-slate-500">{i + 1}</td>
                           <td className="p-3">
                              <span className="font-medium text-slate-800">{item.nama_barang}</span>
                              <div className="text-xs text-slate-400">{item.kode_barang}</div>
                           </td>
                           <td className="p-3 text-right">Rp {new Intl.NumberFormat('id-ID').format(item.harga)}</td>
                           <td className="p-3 text-center">{item.jumlah} {item.satuan}</td>
                           <td className="p-3 text-right text-red-500">{item.diskon_nominal > 0 ? `-Rp ${new Intl.NumberFormat('id-ID').format(item.diskon_nominal)}` : '-'}</td>
                           <td className="p-3 text-right font-semibold text-slate-800">Rp {new Intl.NumberFormat('id-ID').format(item.subtotal)}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Kanan - Rincian Pembayaran (Tampilan seperti struk) */}
         <div className="bg-slate-50 md:w-1/3 p-6 md:p-8 flex flex-col justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 relative overflow-hidden">
               {/* Hiasan struk bolong bolong atas */}
               <div className="absolute top-0 left-0 w-full h-2 flex justify-around">
                 {[...Array(12)].map((_, i) => <div key={i} className="w-2 h-2 rounded-b-full bg-slate-50"></div>)}
               </div>

               <h4 className="text-center font-bold text-slate-800 uppercase tracking-widest pt-2 pb-2 border-b-2 border-dashed border-slate-200">Toko Kita</h4>
               
               <div className="space-y-2 text-sm pt-2">
                  <div className="flex justify-between text-slate-600">
                     <span>Subtotal</span>
                     <span>Rp {new Intl.NumberFormat('id-ID').format(data.subtotal)}</span>
                  </div>
                  {parseFloat(data.diskon_nominal) > 0 && (
                     <div className="flex justify-between text-red-600">
                        <span>Diskon Tambahan</span>
                        <span>-Rp {new Intl.NumberFormat('id-ID').format(data.diskon_nominal)}</span>
                     </div>
                  )}
               </div>
               
               <div className="pt-3 border-t-2 border-dashed border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                     <span className="font-bold text-slate-800 text-base">TOTAL TAGIHAN</span>
                     <span className="font-bold text-indigo-700 text-lg">Rp {new Intl.NumberFormat('id-ID').format(data.total)}</span>
                  </div>
               </div>

               <div className="pt-3 border-t-2 border-dashed border-slate-200 space-y-1 text-sm bg-slate-50 -mx-6 px-6 pb-2 pt-4 mt-2">
                  <div className="flex justify-between text-slate-700 font-medium">
                     <span>Bayar ({data.pembayaran})</span>
                     <span>Rp {new Intl.NumberFormat('id-ID').format(data.jumlah_bayar)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-medium">
                     <span>Kembalian</span>
                     <span>Rp {new Intl.NumberFormat('id-ID').format(data.kembalian)}</span>
                  </div>
               </div>

               {/* Hiasan struk bolong bolong bawah */}
               <div className="absolute bottom-0 left-0 w-full h-2 flex justify-around">
                 {[...Array(12)].map((_, i) => <div key={i} className="w-2 h-2 rounded-t-full bg-slate-50"></div>)}
               </div>
            </div>

            {isCanceled && (
               <div className="mt-6 text-center text-red-500 font-bold border-2 border-red-500 rounded-lg p-3 rotate-[-5deg] bg-red-50">
                  TRANSAKSI INI DIBATALKAN
               </div>
            )}
          </div>
       </div>
      ) : (
        <HistoryLogTab menu="POS Kasir" nomor_transaksi={data.nomor} />
      )}
      {/* CSS untuk mode print */}
      <style dangerouslySetInnerHTML={{__html:`
         @media print {
            body * {
               visibility: hidden;
            }
            .max-w-4xl, .max-w-4xl * {
               visibility: visible;
            }
            .max-w-4xl {
               position: absolute;
               left: 0;
               top: 0;
               width: 100%;
            }
            button, a, .text-sm.text-slate-500.hover\\:text-slate-700 {
               display: none !important;
            }
            .bg-slate-50 {
               background-color: transparent !important;
            }
            .shadow-sm {
               box-shadow: none !important;
               border: none !important;
            }
         }
      `}}/>
    </div>
  );
}
