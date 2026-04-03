"use client";

import { useState, useEffect, useMemo } from "react";
import { Store, Loader2, SearchCheck, CheckCircle2, AlertCircle, Banknote, CreditCard, RefreshCw, User, Building, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowseUserModal } from "@/components/BrowseUserModal";
import { BrowsePerusahaanModal } from "@/components/BrowsePerusahaanModal";
import { BrowseCabangModal } from "@/components/BrowseCabangModal";

export default function POSSettlement() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => {
     const d = new Date(); d.setHours(0,0,0,0);
     return d.toISOString().split('T')[0];
  });
  const [fetchSuccess, setFetchSuccess] = useState(false);

  // Fisik/Actual input state
  const [actualCash, setActualCash] = useState<number>(0);
  const [actualTransfer, setActualTransfer] = useState<number>(0);
  const [actualQris, setActualQris] = useState<number>(0);

  const [isClosed, setIsClosed] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedKasir, setSelectedKasir] = useState<any>(null);
  const [showKasirModal, setShowKasirModal] = useState(false);

  const [selectedPerusahaan, setSelectedPerusahaan] = useState<any>(null);
  const [showPerusahaanModal, setShowPerusahaanModal] = useState(false);

  const [selectedCabang, setSelectedCabang] = useState<any>(null);
  const [showCabangModal, setShowCabangModal] = useState(false);

  // Fallback / Initial load checks removed to force explicit user browse selections

  const fetchData = async () => {
    if (!selectedKasir) return;
    setLoading(true);
    setFetchSuccess(false);
    try {
      const [posRes, checkRes] = await Promise.all([
         fetch(`/api/penjualan/pos?keyword=&startDate=${date}&endDate=${date}&kasir=${selectedKasir.nama}`),
         fetch(`/api/penjualan/pos/settlement?date=${date}&user=${selectedKasir.nama}`)
      ]);
      const json = await posRes.json();
      const checkJson = await checkRes.json();

      if (json.success) {
        setData(json.data);
        setFetchSuccess(true);
      }
      
      if (checkJson.success && checkJson.data.length > 0) {
         setIsClosed(true);
         const saved = checkJson.data[0];
         setActualCash(parseFloat(saved.actual_cash));
         setActualTransfer(parseFloat(saved.actual_transfer));
         setActualQris(parseFloat(saved.actual_qris));
      } else {
         setIsClosed(false);
         setActualCash(0);
         setActualTransfer(0);
         setActualQris(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selectedKasir]);

  // Aggregate Expected Totals
  const { expectedCash, expectedTransfer, expectedQris, totalPenjualan } = useMemo(() => {
     let cash = 0;
     let transfer = 0;
     let qris = 0;
     let totalList = 0;

     data.forEach(row => {
        if (row.status_aktif !== 1) return; // Skip voided
        totalList += parseFloat(row.total || 0);

        const pemString = row.pembayaran || '';
        if (pemString === 'Cash' || pemString === '') {
           cash += parseFloat(row.jumlah_bayar || row.total);
           // minus kembalian if cash is the only payment method.
           // Tapi karena kita menyimpan history sudah "pas" di split payments:
           // Sebenarnya "kembalian" hanya untuk Cash. 
           cash -= parseFloat(row.kembalian || 0);
           return;
        }

        const parts = pemString.split(',').map((p:string) => p.trim());
        let currentTxCash = 0;

        for (const p of parts) {
           const match = p.match(/^(Cash|Transfer|QRIS):\s*([\d\.]+)$/i);
           if (match) {
              const method = match[1].toLowerCase();
              const amount = parseFloat(match[2] || '0');
              if (method === 'cash') currentTxCash += amount;
              if (method === 'transfer') transfer += amount;
              if (method === 'qris') qris += amount;
           }
        }

        // Subtract kembalian from cash
        const kembalian = parseFloat(row.kembalian || 0);
        if (currentTxCash > 0) {
           currentTxCash -= kembalian;
           cash += currentTxCash;
        }
     });

     return { expectedCash: cash, expectedTransfer: transfer, expectedQris: qris, totalPenjualan: totalList };
  }, [data]);

  const selisihCash = actualCash - expectedCash;
  const selisihTransfer = actualTransfer - expectedTransfer;
  const selisihQris = actualQris - expectedQris;

  const handleSave = async () => {
     if (!selectedKasir) return alert("Pilih Kasir terlebih dahulu.");
     if (!selectedPerusahaan) return alert("Pilih Perusahaan terlebih dahulu.");
     if (!selectedCabang) return alert("Pilih Cabang terlebih dahulu.");
     if (isClosed) return alert("Shift sudah di-closing untuk tanggal dan kasir ini.");
     if (data.length === 0) return alert("Tidak ada transaksi untuk di-closing hari ini.");
     if (!confirm(`Simpan laporan closing untuk Kasir: ${selectedKasir.nama}? Data tidak bisa diubah lagi untuk hari ini.`)) return;
     
     setSaving(true);
     try {
       const res = await fetch('/api/penjualan/pos/settlement', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           tanggal: date,
           user: selectedKasir.nama,
           nomormhcabang: selectedCabang.nomor,
           nomormhperusahaan: selectedPerusahaan.nomor,
           expected_cash: expectedCash,
           expected_transfer: expectedTransfer,
           expected_qris: expectedQris,
           actual_cash: actualCash,
           actual_transfer: actualTransfer,
           actual_qris: actualQris,
           selisih_cash: selisihCash,
           selisih_transfer: selisihTransfer,
           selisih_qris: selisihQris,
           total_penjualan: totalPenjualan,
           jumlah_transaksi: data.length,
           catatan: ''
         })
       });
       const json = await res.json();
       if (json.success) {
          alert("Closing kasir berhasil disimpan!");
          setIsClosed(true);
       } else {
          alert(json.error || "Gagal menyimpan closing.");
       }
     } catch (e) {
       alert("Terjadi kesalahan sistem saat menyimpan laporan.");
     } finally {
       setSaving(false);
     }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <SearchCheck className="h-6 w-6 text-indigo-600" />
            Closing Kasir / Settlement POS
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Penyesuaian uang fisik/mutasi dengan sistem kasir per tanggal transaksi
          </p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2">
           <Store className="h-4 w-4" /> Cetak Laporan
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 print:bg-white print:border-b-2 print:border-black">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between">
               
               <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                  
                  {/* Kasir Selection */}
                  <div className="flex items-center gap-3">
                     <span className="font-semibold text-slate-700 dark:text-slate-300">Kasir:</span>
                     <button
                        onClick={() => setShowKasirModal(true)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:border-indigo-500 hover:bg-slate-100 flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 print:hidden"
                     >
                        <User className="h-4 w-4 text-indigo-500" />
                        {selectedKasir ? selectedKasir.nama : 'Klik untuk Pilih Kasir'}
                     </button>
                     <span className="hidden print:inline-block font-bold text-lg">{selectedKasir?.nama || '-'}</span>
                  </div>

                  {/* Perusahaan Selection */}
                  <div className="flex items-center gap-3">
                     <span className="font-semibold text-slate-700 dark:text-slate-300">Perusahaan:</span>
                     <button
                        onClick={() => setShowPerusahaanModal(true)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:border-indigo-500 hover:bg-slate-100 flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 print:hidden"
                     >
                        <Building className="h-4 w-4 text-emerald-500" />
                        {selectedPerusahaan ? selectedPerusahaan.nama : 'Pilih Perusahaan'}
                     </button>
                     <span className="hidden print:inline-block font-bold text-lg">{selectedPerusahaan?.nama || '-'}</span>
                  </div>

                  {/* Cabang Selection */}
                  <div className="flex items-center gap-3">
                     <span className="font-semibold text-slate-700 dark:text-slate-300">Cabang:</span>
                     <button
                        onClick={() => setShowCabangModal(true)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:border-indigo-500 hover:bg-slate-100 flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 print:hidden"
                     >
                        <MapPin className="h-4 w-4 text-rose-500" />
                        {selectedCabang ? selectedCabang.nama : 'Pilih Cabang'}
                     </button>
                     <span className="hidden print:inline-block font-bold text-lg">{selectedCabang?.nama || '-'}</span>
                  </div>

               </div>
               
               <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block print:hidden"></div>

               <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Tanggal:</span>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700 print:hidden" 
                  />
                  <span className="hidden print:inline-block font-bold text-lg">{new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  {isClosed && (
                    <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">Sudah Closing</span>
                  )}
               </div>
            </div>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500 print:hidden" />
            ) : (
              <button onClick={fetchData} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition print:hidden" title="Refresh">
                 <RefreshCw className="h-4 w-4" />
              </button>
            )}
           </div>
        </div>

        <div className="p-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Kolom 1: Data Sistem */}
              <div className="space-y-4">
                 <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b pb-2">Catatan Sistem POS</h2>
                 <p className="text-sm text-slate-500">Omzet terbukukan berdasarkan <strong>{data.length}</strong> transaksi sukses hari ini.</p>
                 
                 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4 print:bg-white print:border">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                       <div className="flex gap-2 items-center text-slate-600 dark:text-slate-300 font-medium">
                          <Banknote className="h-5 w-5 text-emerald-500" />
                          <span>Total Tunai (Cash)</span>
                       </div>
                       <span className="font-bold text-lg tracking-tight">Rp {new Intl.NumberFormat('id-ID').format(expectedCash)}</span>
                    </div>

                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                       <div className="flex gap-2 items-center text-slate-600 dark:text-slate-300 font-medium">
                          <CreditCard className="h-5 w-5 text-indigo-500" />
                          <span>Total Transfer</span>
                       </div>
                       <span className="font-bold text-lg tracking-tight">Rp {new Intl.NumberFormat('id-ID').format(expectedTransfer)}</span>
                    </div>

                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                       <div className="flex gap-2 items-center text-slate-600 dark:text-slate-300 font-medium">
                          <CreditCard className="h-5 w-5 text-cyan-500" />
                          <span>Total QRIS</span>
                       </div>
                       <span className="font-bold text-lg tracking-tight">Rp {new Intl.NumberFormat('id-ID').format(expectedQris)}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                       <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">Grand Total Terbukukan</span>
                       <span className="font-black text-2xl text-indigo-600 dark:text-indigo-400">Rp {new Intl.NumberFormat('id-ID').format(totalPenjualan)}</span>
                    </div>
                 </div>
              </div>

              {/* Kolom 2: Input Fisik */}
              <div className="space-y-4">
                 <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b pb-2">Penyesuaian Aktual / Fisik</h2>
                 <p className="text-sm text-slate-500 print:hidden">Masukkan jumlah uang di laci kasir dan bukti mutasi untuk mencek selisih harian.</p>
                 
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-sm print:border-none print:shadow-none">
                    <div className="flex items-center justify-between gap-4">
                       <label className="font-medium text-slate-700 dark:text-slate-300 shrink-0">Tunai Laci</label>
                       <div className="relative w-1/2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-500">Rp</span>
                          <input type="number" readOnly={isClosed} value={actualCash === 0 ? '' : actualCash} onChange={e => setActualCash(parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 font-bold outline-none focus:border-indigo-500 focus:bg-white dark:bg-slate-800 dark:border-slate-700 print:hidden disabled:opacity-50" placeholder="0" />
                          <span className="hidden print:inline-block font-bold pl-10">Rp {new Intl.NumberFormat('id-ID').format(actualCash)}</span>
                       </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                       <label className="font-medium text-slate-700 dark:text-slate-300 shrink-0">Transfer Mutasi</label>
                       <div className="relative w-1/2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-500">Rp</span>
                          <input type="number" readOnly={isClosed} value={actualTransfer === 0 ? '' : actualTransfer} onChange={e => setActualTransfer(parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 font-bold outline-none focus:border-indigo-500 focus:bg-white dark:bg-slate-800 dark:border-slate-700 print:hidden disabled:opacity-50" placeholder="0" />
                          <span className="hidden print:inline-block font-bold pl-10">Rp {new Intl.NumberFormat('id-ID').format(actualTransfer)}</span>
                       </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                       <label className="font-medium text-slate-700 dark:text-slate-300 shrink-0">QRIS Saldo</label>
                       <div className="relative w-1/2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-500">Rp</span>
                          <input type="number" readOnly={isClosed} value={actualQris === 0 ? '' : actualQris} onChange={e => setActualQris(parseFloat(e.target.value) || 0)} className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 font-bold outline-none focus:border-indigo-500 focus:bg-white dark:bg-slate-800 dark:border-slate-700 print:hidden disabled:opacity-50" placeholder="0" />
                          <span className="hidden print:inline-block font-bold pl-10">Rp {new Intl.NumberFormat('id-ID').format(actualQris)}</span>
                       </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                       <div className="flex justify-between items-center text-sm font-medium">
                          <span>Selisih Tunai:</span>
                          <span className={cn(selisihCash < 0 ? "text-red-500" : selisihCash > 0 ? "text-orange-500" : "text-emerald-500")}>
                             {selisihCash > 0 ? '+' : ''}{new Intl.NumberFormat('id-ID').format(selisihCash)} 
                             {selisihCash === 0 && <CheckCircle2 className="inline ml-1 h-4 w-4" />}
                          </span>
                       </div>
                       <div className="flex justify-between items-center text-sm font-medium">
                          <span>Selisih Non-Tunai (TF+QRIS):</span>
                          <span className={cn((selisihTransfer + selisihQris) < 0 ? "text-red-500" : (selisihTransfer + selisihQris) > 0 ? "text-orange-500" : "text-emerald-500")}>
                             {(selisihTransfer + selisihQris) > 0 ? '+' : ''}{new Intl.NumberFormat('id-ID').format(selisihTransfer + selisihQris)}
                             {(selisihTransfer + selisihQris) === 0 && <CheckCircle2 className="inline ml-1 h-4 w-4" />}
                          </span>
                       </div>
                    </div>
                 </div>
              </div>

           </div>
        </div>

        {/* Notifikasi Status Settlement */}
        <div className={cn(
           "p-4 border-t flex justify-center text-sm font-semibold tracking-wide print:hidden transition-colors",
           (selisihCash === 0 && selisihTransfer === 0 && selisihQris === 0 && (expectedCash > 0 || totalPenjualan > 0))
             ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
             : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:border-slate-800"
        )}>
           {(selisihCash === 0 && selisihTransfer === 0 && selisihQris === 0 && (expectedCash > 0 || totalPenjualan > 0)) ? (
             <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> SEMUA METODE BALANCE (COCOK).</span>
           ) : (
             <span className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Pastikan uang fisik dan mutasi sesuai agar Balance.</span>
           )}
        </div>
        
        {/* Save Button */}
        {!isClosed && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 print:hidden flex justify-end">
             <button
               onClick={handleSave}
               disabled={saving || data.length === 0}
               className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <CheckCircle2 className="h-5 w-5" />
               Simpan & Selesaikan Shift Kasir
             </button>
          </div>
        )}
      </div>

      <BrowseUserModal isOpen={showKasirModal} onClose={() => setShowKasirModal(false)} onSelect={(usr) => { setSelectedKasir(usr); setShowKasirModal(false); }} />
      <BrowsePerusahaanModal isOpen={showPerusahaanModal} onClose={() => setShowPerusahaanModal(false)} onSelect={(per) => { setSelectedPerusahaan(per); setShowPerusahaanModal(false); }} />
      <BrowseCabangModal isOpen={showCabangModal} onClose={() => setShowCabangModal(false)} onSelect={(cab) => { setSelectedCabang(cab); setShowCabangModal(false); }} />
    </div>
  );
}
