"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FileText, Loader2, Edit, AlertCircle, Trash2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SuratJalanPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async (keyword = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/penjualan/surat-jalan?keyword=${keyword}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch (err) {
      setError("Gagal mengambil data Surat Jalan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(searchQuery);
  };

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    const actionText = action === 'approve' ? 'menyetujui' : action === 'reject' ? 'menolak' : 'menghapus';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} transaksi ini?`)) return;
    
    setIsPending(true);
    try {
      const res = await fetch('/api/penjualan/surat-jalan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      const result = await res.json();
      if (result.success) {
        fetchData(searchQuery);
      } else {
        alert(result.error);
      }
    } catch (error) {
       alert("Terjadi kesalahan sistem");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Surat Jalan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data dokumen Surat Jalan Pengiriman.
          </p>
        </div>
        <Link 
          href="/penjualan/surat-jalan/create"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Buat SJ Baru
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari no SJ, DO atau plat nomor kendaraan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
          <button 
            type="submit"
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cari
          </button>
        </form>
      </div>

      {error && (
         <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4"/> {error}
         </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 uppercase text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">No. SJ</th>
                <th className="px-6 py-4">Ref DO/SO</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Kustomer/Gudang</th>
                <th className="px-6 py-4">Kendaraan</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data Surat Jalan yang ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const isApproved = item.status_disetujui === 1;
                  const isCanceled = item.status_aktif === 0;
                  
                  return (
                    <tr key={item.kode} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {item.kode}
                      </td>
                      <td className="px-6 py-4 text-indigo-600 dark:text-indigo-400 font-medium">
                         {item.kode_delivery_order || item.kode_order_jual || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate">
                         <div>{item.customer}</div>
                         <div className="text-xs text-slate-400">{item.gudang}</div>
                      </td>
                      <td className="px-6 py-4">
                         <div>{item.nomor_kendaraan || '-'}</div>
                         <div className="text-xs text-slate-400">{item.sopir || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                          isCanceled 
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                            : isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                        )}>
                          {isCanceled ? 'Dibatalkan' : isApproved ? 'Disetujui' : 'Menunggu Approval'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/penjualan/surat-jalan/${item.kode}?mode=view`} title="View Detail" className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                             <Search className="h-4 w-4" />
                          </Link>

                           {!isCanceled && !isApproved && (
                              <>
                               <Link href={`/penjualan/surat-jalan/${item.kode}?mode=edit`} title="Edit" className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                                 <Edit className="h-4 w-4" />
                               </Link>
                               <button 
                                 onClick={() => handleAction(item.kode, 'approve')} 
                                 disabled={isPending}
                                 title="Approve" 
                                 className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700 disabled:opacity-50"
                               >
                                  {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4" />}
                               </button>
                               <button 
                                 onClick={() => handleAction(item.kode, 'delete')} 
                                 disabled={isPending}
                                 title="Batalkan" 
                                 className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700 disabled:opacity-50"
                               >
                                  <Trash2 className="h-4 w-4" />
                               </button>
                              </>
                           )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
