"use client";

import { useState, useEffect } from "react";
import { SearchCheck, Loader2, AlertCircle, Calendar, CheckCircle2, Edit2, X, Save } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function POSSettlementHistory() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [editRow, setEditRow] = useState<any>(null);
  const [editActualCash, setEditActualCash] = useState(0);
  const [editActualTransfer, setEditActualTransfer] = useState(0);
  const [editActualQris, setEditActualQris] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/penjualan/pos/settlement`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError("Gagal mengambil data history settlement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditModal = (row: any) => {
     setEditRow(row);
     setEditActualCash(parseFloat(row.actual_cash || 0));
     setEditActualTransfer(parseFloat(row.actual_transfer || 0));
     setEditActualQris(parseFloat(row.actual_qris || 0));
  };

  const closeEditModal = () => {
     setEditRow(null);
  };

  const handleSaveEdit = async () => {
     if (!editRow) return;
     setSavingEdit(true);
     try {
       const res = await fetch(`/api/penjualan/pos/settlement/${editRow.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            actual_cash: editActualCash,
            actual_transfer: editActualTransfer,
            actual_qris: editActualQris,
            user: "Admin" // Replace with currentUser context if available
         })
       });
       const json = await res.json();
       if (json.success) {
          alert('Data settlement berhasil diperbarui.');
          closeEditModal();
          fetchData();
       } else {
          alert(json.error || 'Gagal menyimpan perubahan.');
       }
     } catch (e) {
        alert('Terjadi kesalahan pada sistem.');
     } finally {
        setSavingEdit(false);
     }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" />
            Riwayat Settlement POS
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Daftar closing kasir harian yang sudah diselesaikan
          </p>
        </div>
        <Link 
          href="/penjualan/pos/settlement" 
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-all"
        >
          <SearchCheck className="h-4 w-4" /> Buka Kalkulator Settlement
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 flex items-center gap-2 text-sm border-b border-red-100">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Tgl Transaksi</th>
                <th className="px-4 py-3 font-semibold">Kasir</th>
                <th className="px-4 py-3 font-semibold">Waktu Closing</th>
                <th className="px-4 py-3 font-semibold">Total Omzet</th>
                <th className="px-4 py-3 font-semibold text-center">Selisih Tunai</th>
                <th className="px-4 py-3 font-semibold text-center">Selisih Non-Tunai</th>
                <th className="px-4 py-3 font-semibold text-center">Balance</th>
                <th className="px-4 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <SearchCheck className="h-10 w-10 text-slate-300 mb-3" />
                      <p>Belum ada riwayat closing kasir.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                   const selisihNonTunai = parseFloat(row.selisih_transfer) + parseFloat(row.selisih_qris);
                   const selisihTunai = parseFloat(row.selisih_cash);
                   const isBalanced = selisihTunai === 0 && selisihNonTunai === 0;

                   return (
                     <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                       <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                         {new Date(row.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                       </td>
                       <td className="px-4 py-3 text-slate-600 font-semibold">{row.dibuat_oleh}</td>
                       <td className="px-4 py-3 text-slate-500">
                         {new Date(row.waktu_closing).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                       </td>
                       <td className="px-4 py-3 font-semibold text-indigo-600">
                         Rp {new Intl.NumberFormat('id-ID').format(row.total_penjualan || 0)}
                         <div className="text-[10px] text-slate-400 font-normal">{row.jumlah_transaksi} Nota</div>
                       </td>
                       <td className="px-4 py-3 text-center font-medium">
                          <span className={cn(selisihTunai < 0 ? "text-red-500" : selisihTunai > 0 ? "text-orange-500" : "text-slate-400")}>
                             {selisihTunai > 0 ? '+' : ''}{new Intl.NumberFormat('id-ID').format(selisihTunai)}
                          </span>
                       </td>
                       <td className="px-4 py-3 text-center font-medium">
                          <span className={cn(selisihNonTunai < 0 ? "text-red-500" : selisihNonTunai > 0 ? "text-orange-500" : "text-slate-400")}>
                             {selisihNonTunai > 0 ? '+' : ''}{new Intl.NumberFormat('id-ID').format(selisihNonTunai)}
                          </span>
                       </td>
                       <td className="px-4 py-3 text-center">
                         {isBalanced ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                               <CheckCircle2 className="h-3 w-3" /> OK
                            </span>
                         ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                               <AlertCircle className="h-3 w-3" /> Selisih
                            </span>
                         )}
                       </td>
                       <td className="px-4 py-3 text-center">
                          <button 
                             onClick={() => openEditModal(row)}
                             className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-md transition"
                             title="Edit Settlement Fisik"
                          >
                             <Edit2 className="h-4 w-4" />
                          </button>
                       </td>
                     </tr>
                   )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <h3 className="font-bold text-lg flex items-center gap-2">
                   <Edit2 className="h-5 w-5 text-indigo-600" />
                   Edit Settlement Aktual
                </h3>
                <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 transition"><X className="h-5 w-5"/></button>
             </div>
             <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs leading-relaxed">
                   <strong>Perhatian:</strong> Mengubah jumlah fisik akan menghitung ulang status selisih dan balance. Omzet sistem tidak akan berubah. (Catatan: Kasir = {editRow.dibuat_oleh})
                </div>
                
                <div className="space-y-3">
                   <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-slate-600">Tunai Laci (Actual Cash)</label>
                      <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                         <input type="number" value={editActualCash === 0 ? '' : editActualCash} onChange={e => setEditActualCash(parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="text-[10px] text-slate-400">Harusnya: Rp {new Intl.NumberFormat('id-ID').format(editRow.expected_cash)}</div>
                   </div>

                   <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-slate-600">Mutasi Rekening (Transfer)</label>
                      <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                         <input type="number" value={editActualTransfer === 0 ? '' : editActualTransfer} onChange={e => setEditActualTransfer(parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="text-[10px] text-slate-400">Harusnya: Rp {new Intl.NumberFormat('id-ID').format(editRow.expected_transfer)}</div>
                   </div>

                   <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-slate-600">Saldo Mutasi (QRIS)</label>
                      <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                         <input type="number" value={editActualQris === 0 ? '' : editActualQris} onChange={e => setEditActualQris(parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="text-[10px] text-slate-400">Harusnya: Rp {new Intl.NumberFormat('id-ID').format(editRow.expected_qris)}</div>
                   </div>
                </div>
             </div>
             <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 flex justify-end gap-3">
                <button onClick={closeEditModal} className="px-4 py-2 bg-white border border-slate-300 rounded-md font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button onClick={handleSaveEdit} disabled={savingEdit} className="px-4 py-2 bg-indigo-600 rounded-md font-semibold text-white hover:bg-indigo-700 flex items-center gap-2">
                   {savingEdit ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>} Simpan Perubahan
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
