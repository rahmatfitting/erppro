"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer, CheckCircle2, FileText, Coins } from "lucide-react";
import QRCode from "react-qr-code";

export default function DetailNotaJualEmas() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paperSize, setPaperSize] = useState<'A4' | 'A5'>('A4');
  
  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/penjualan/nota-emas/${params.id}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          alert(json.error || "Gagal memuat detail nota");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) fetchDetail();
  }, [params.id]);

  // Inject print CSS using visibility approach (works through Next.js DOM nesting)
  useEffect(() => {
    const existingStyle = document.getElementById('print-nota-emas');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'print-nota-emas';
    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #print-area, #print-area * { visibility: visible !important; }
        #print-area {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        @page { margin: 8mm; size: ${paperSize} portrait; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('print-nota-emas');
      if (el) el.remove();
    };
  }, [paperSize]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Menyiapkan Dokumen...</p>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-slate-500">Nota tidak ditemukan.</div>;

  const handleAction = async (id: string, action: 'approve' | 'disapprove' | 'delete') => {
    const actionText = action === 'delete' ? 'membatalkan' : action === 'approve' ? 'menyetujui' : 'membatalkan setuju';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} nota penjualan emas ini?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/penjualan/nota-emas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const result = await res.json();
      if (result.success) {
        // Refresh data
        window.location.reload();
      } else {
        alert(result.error || "Gagal melakukan aksi");
        setLoading(false);
      }
    } catch (error) {
       alert("Terjadi kesalahan sistem");
       setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const verifyUrl = `${window.location.origin}/penjualan/nota-emas/verify/${data.kode}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* ACTION BAR (Hidden on Print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/penjualan/nota-emas" className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </Link>
        <div className="flex items-center gap-2">
           {data.status_aktif === 1 && data.status_disetujui === 0 && (
             <>
               <button 
                 onClick={() => handleAction(data.nomor, 'approve')}
                 className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-sm"
               >
                 Approve Dokumen
               </button>
               <button 
                 onClick={() => handleAction(data.nomor, 'delete')}
                 className="px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-all shadow-sm"
               >
                 Batal / Void
               </button>
             </>
           )}
           {data.status_aktif === 1 && data.status_disetujui === 1 && (
               <button 
                 onClick={() => handleAction(data.nomor, 'disapprove')}
                 className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition-all shadow-sm bg-white"
               >
                 Batal Approve (Revisi)
               </button>
           )}
           {/* Paper Size Selector + Print Button */}
           <div className="flex items-center gap-2 ml-2">
             <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
               <button
                 onClick={() => setPaperSize('A4')}
                 className={`px-3 py-2 text-xs font-bold transition-colors ${paperSize === 'A4' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
               >
                 A4
               </button>
               <button
                 onClick={() => setPaperSize('A5')}
                 className={`px-3 py-2 text-xs font-bold transition-colors ${paperSize === 'A5' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
               >
                 ½ A4
               </button>
             </div>
             <button 
               onClick={handlePrint}
               className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:shadow-lg flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
             >
               <Printer className="h-4 w-4" /> Cetak PDF
             </button>
           </div>
        </div>
      </div>

      {/* INVOICE CARD */}
      <div id="print-area" className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative print:shadow-none print:border-none print:rounded-none">
         
         {/* STATUS BADGE */}
         {data.status_disetujui === 1 && (
            <div className="absolute top-10 right-10 flex flex-col items-center rotate-12 opacity-20 pointer-events-none print:opacity-40">
               <CheckCircle2 className="h-24 w-24 text-emerald-500" />
               <span className="text-emerald-600 font-black text-2xl uppercase tracking-widest mt-2 border-4 border-emerald-500 px-4 py-1 rounded-xl">APPROVED</span>
            </div>
         )}
         {data.status_aktif === 0 && (
            <div className="absolute top-10 right-10 flex flex-col items-center rotate-12 opacity-20 pointer-events-none print:opacity-40">
               <span className="text-rose-600 font-black text-4xl uppercase tracking-widest mt-2 border-8 border-rose-500 px-6 py-2 rounded-2xl">VOID</span>
            </div>
         )}

         {/* INVOICE HEADER */}
         <div className="p-12 pb-8 border-b-4 border-amber-100 print:p-8">
            <div className="flex justify-between items-start">
               <div>
                  <div className="flex items-center gap-3 mb-2">
                     <Coins className="h-10 w-10 text-amber-500" />
                     <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Gold<span className="text-amber-500">ERP</span></h1>
                  </div>
                  <p className="text-slate-500 text-sm font-medium w-64 mt-4">Pusat Transaksi Logam Mulia Emas dan Perhiasan Terpercaya.</p>
               </div>
               <div className="text-right">
                  <h2 className="text-4xl font-black text-slate-200 uppercase tracking-tighter mb-2">INVOICE</h2>
                  <p className="text-lg font-bold text-slate-800">{data.kode}</p>
                  <p className="text-slate-500 text-sm font-medium mt-1">Tanggal: {new Date(data.tanggal).toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' })}</p>
                  <p className="text-slate-500 text-sm font-medium">Jatuh Tempo: {new Date(data.jatuh_tempo).toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' })}</p>
               </div>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-8">
               <div>
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 shadow-sm">Tagihan Kepada:</h3>
                  <p className="text-xl font-bold text-slate-900">{data.customer}</p>
               </div>
               <div className="text-right">
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Mata Uang (Kurs):</h3>
                  <p className="text-lg font-bold text-slate-900">{data.valuta} <span className="font-medium text-slate-500">(@ {data.kurs})</span></p>
               </div>
            </div>
         </div>

         {/* TABLE DETAILS */}
         <div className="p-12 pt-8 print:p-8">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b-2 border-slate-200">
                     <th className="py-4 text-slate-500 text-xs font-bold uppercase tracking-widest">Deskripsi Barang (LM)</th>
                     <th className="py-4 text-slate-500 text-xs font-bold uppercase tracking-widest text-center">Qty</th>
                     <th className="py-4 text-slate-500 text-xs font-bold uppercase tracking-widest text-right">Harga Unit</th>
                     <th className="py-4 text-slate-500 text-xs font-bold uppercase tracking-widest text-right">Diskon</th>
                     <th className="py-4 text-slate-500 text-xs font-bold uppercase tracking-widest text-right">Subtotal</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {data.items.map((it: any, idx: number) => (
                     <tr key={idx}>
                        <td className="py-6">
                           <p className="font-bold text-slate-800 text-lg">{it.nama_barang}</p>
                           <p className="text-sm text-slate-500">{it.kode_barang} {it.keterangan ? `- ${it.keterangan}` : ''}</p>
                        </td>
                        <td className="py-6 text-center font-bold text-slate-700">
                           {it.jumlah} <span className="text-xs font-normal text-slate-500">{it.satuan}</span>
                        </td>
                        <td className="py-6 text-right font-medium text-slate-700">
                           {new Intl.NumberFormat('id-ID').format(it.harga)}
                        </td>
                        <td className="py-6 text-right font-medium text-rose-500">
                           {it.diskon_nominal > 0 ? `-${new Intl.NumberFormat('id-ID').format(it.diskon_nominal)}` : '-'}
                        </td>
                        <td className="py-6 text-right font-bold text-slate-900 text-lg">
                           {new Intl.NumberFormat('id-ID').format(it.subtotal)}
                        </td>
                     </tr>
                  ))}
               </tbody>
               <tfoot>
                  <tr>
                     <td colSpan={3}></td>
                     <td className="pt-8 pb-4 text-right text-slate-500 font-bold uppercase tracking-wider text-xs">Total Tagihan</td>
                     <td className="pt-8 pb-4 text-right font-black text-amber-600 text-3xl">
                        Rp {new Intl.NumberFormat('id-ID').format(data.total)}
                     </td>
                  </tr>
               </tfoot>
            </table>
         </div>

         {/* FOOTER & QR VERIFICATION */}
         <div className="bg-slate-50 p-12 border-t border-slate-100 print:p-8 flex items-center justify-between">
            <div className="max-w-md">
               <p className="text-slate-800 font-bold mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-amber-500" /> Keterangan Tambahan:</p>
               <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {data.keterangan || "Nota ini merupakan bukti sah transaksi fisik logam mulia. Harap simpan dengan baik untuk syarat Buyback."}
               </p>
               <div className="flex gap-16 text-center">
                   <div>
                      <p className="text-slate-400 text-xs mb-8">Dibuat Oleh,</p>
                      <p className="font-bold text-slate-800">{data.dibuat_oleh}</p>
                   </div>
                   <div>
                      <p className="text-slate-400 text-xs mb-8">Disetujui Oleh,</p>
                      <p className="font-bold text-slate-800">{data.disetujui_oleh || '_________________'}</p>
                   </div>
               </div>
            </div>

            <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:border-slate-300">
               <QRCode value={verifyUrl} size={110} level="H" fgColor="#0f172a" />
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-3 text-center w-28">Scan untuk<br/>Keaslian Dokumen</p>
            </div>
         </div>
      </div>
    </div>
  );
}
