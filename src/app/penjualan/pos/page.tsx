"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Store, Loader2, Edit, AlertCircle, Trash2, CheckCircle, Receipt } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function POSIndex() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState(() => {
     const d = new Date(); d.setHours(0,0,0,0);
     return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
     const d = new Date(); d.setHours(23,59,59,999);
     return d.toISOString().split('T')[0];
  });
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/penjualan/pos?keyword=${keyword}&startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="h-6 w-6 text-indigo-600" />
            Riwayat Point of Sale (POS)
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Daftar transaksi kasir dan penjualan langsung
          </p>
        </div>
        <Link 
          href="/penjualan/pos/create" 
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
        >
          <Plus className="h-4 w-4" /> Buka Kasir Baru
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 w-full sm:max-w-xs">
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={e => setStartDate(e.target.value)} 
                 className="w-1/2 px-3 py-2 text-sm border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700" 
               />
               <span className="text-slate-400 self-center">-</span>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={e => setEndDate(e.target.value)} 
                 className="w-1/2 px-3 py-2 text-sm border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700" 
               />
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari nota kasir atau nama customer..." 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 outline-none dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700">
              Filter
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 flex items-center gap-2 text-sm border-b border-red-100">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Nomor Nota</th>
                <th className="px-4 py-3 font-semibold">Tanggal</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Kasir</th>
                <th className="px-4 py-3 font-semibold">Pembayaran</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
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
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Store className="h-10 w-10 text-slate-300 mb-3" />
                      <p>Belum ada transaksi POS</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.kode} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {row.kode}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(row.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.customer}</td>
                    <td className="px-4 py-3 text-slate-600">{row.dibuat_oleh}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {row.pembayaran.split(',').map((p:string, i:number) => (
                           <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold tracking-wide w-max">
                              {p.trim()}
                           </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                      Rp {new Intl.NumberFormat('id-ID').format(row.total || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.status_aktif === 1 ? (
                         <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <CheckCircle className="h-3 w-3" /> Sukses
                         </span>
                      ) : (
                         <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                            <AlertCircle className="h-3 w-3" /> Batal / Void
                         </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          href={`/penjualan/pos/${row.kode}?mode=view`}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                          title="Lihat Detail Transaksi"
                        >
                          <Receipt className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
