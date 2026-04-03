"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, Search, Filter, Edit, Eye, 
  ClipboardList, Calendar, CheckCircle, 
  Clock, AlertCircle, XCircle, FileText 
} from "lucide-react";

export default function WorkOrderListPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ppic/workorder?keyword=${searchTerm}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Gagal memuat Work Order:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft': return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> Draft</span>;
      case 'Released': return <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><AlertCircle className="h-3 w-3" /> Released</span>;
      case 'Completed': return <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle className="h-3 w-3" /> Completed</span>;
      case 'Cancelled': return <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" /> Cancelled</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            Work Order (SPK)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Instruksi kerja resmi untuk departemen produksi</p>
        </div>
        <Link
          href="/ppic/workorder/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all font-bold"
        >
          <Plus className="h-4 w-4" />
          Buat WO Baru
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode WO, Plan, atau produk..."
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <Filter className="h-4 w-4 text-slate-400" />
          Filter Data
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-950/80 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Kode WO</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Ref. Prod Plan</th>
                <th className="px-6 py-4">Produk / Item</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                     Memuat data Work Order...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                     Belum ada Work Order tersedia.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.nomor} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {item.kode}
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(item.tanggal).toLocaleDateString()}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       {item.prodplan_kode ? (
                         <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-100">
                            {item.prodplan_kode}
                         </span>
                       ) : "-"}
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-white">{item.item_nama}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{item.item_kode}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                      {item.qty}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Link
                          href={`/ppic/workorder/${item.nomor}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all font-bold"
                          title="Print SPK"
                        >
                           <FileText className="h-4 w-4" />
                        </button>
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
