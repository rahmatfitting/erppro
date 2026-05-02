"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, FileText, CheckCircle2, AlertCircle, Building, Building2, Send } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function QuotationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotation`);
      const json = await res.json();
      if (json.success) {
         setData(json.data.filter((q:any) => 
            q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
            q.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.project_name.toLowerCase().includes(searchQuery.toLowerCase())
         ));
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  const updateStatus = async (id: number, status: string) => {
    try {
       await fetch('/api/quotation', {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ id, status })
       });
       fetchData();
    } catch(e) {}
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            Penawaran (Quotation)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Riwayat penawaran harga yang telah dibuat dari RAB.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor penawaran, klien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg">Belum ada penawaran. Buat penawaran dari halaman RAB.</p>
          <Link href="/rab" className="inline-block mt-4 text-orange-600 font-medium hover:underline">Ke Halaman RAB</Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                 <tr>
                    <th className="px-6 py-4 font-semibold">No. Penawaran</th>
                    <th className="px-6 py-4 font-semibold">Tujuan / Klien</th>
                    <th className="px-6 py-4 font-semibold">Detail Proyek</th>
                    <th className="px-6 py-4 font-semibold text-right">Nilai Penawaran</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {data.map(q => (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                       <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 dark:text-white">{q.quotation_number}</div>
                          <div className="text-xs text-slate-400 mt-1">{new Date(q.date).toLocaleDateString('id-ID')}</div>
                       </td>
                       <td className="px-6 py-4 font-medium flex items-center gap-2">
                          <Building className="h-4 w-4 text-slate-400" /> {q.client_name}
                       </td>
                       <td className="px-6 py-4">
                          <div className="text-slate-800 dark:text-slate-200">{q.project_name}</div>
                          <div className="text-xs text-indigo-500 mt-1">Ref: {q.rab_number} v{q.rab_version}</div>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(q.total_amount)}</span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className={cn(
                             "px-2.5 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider",
                             q.status === 'draft' ? "bg-slate-100 text-slate-600 border-slate-200" :
                             q.status === 'sent' ? "bg-blue-100 text-blue-700 border-blue-200" :
                             q.status === 'deal' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                             "bg-red-100 text-red-700 border-red-200"
                          )}>
                             {q.status}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          {q.status === 'draft' && (
                             <button onClick={() => updateStatus(q.id, 'sent')} className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-semibold"><Send className="h-4 w-4 inline mr-1"/>Kirim</button>
                          )}
                          {q.status === 'sent' && (
                             <>
                               <button onClick={() => updateStatus(q.id, 'deal')} className="text-emerald-600 hover:text-emerald-800 mr-3 text-xs font-semibold"><CheckCircle2 className="h-4 w-4 inline mr-1"/>Deal</button>
                               <button onClick={() => updateStatus(q.id, 'rejected')} className="text-red-500 hover:text-red-700 text-xs font-semibold"><AlertCircle className="h-4 w-4 inline mr-1"/>Tolak</button>
                             </>
                          )}
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
