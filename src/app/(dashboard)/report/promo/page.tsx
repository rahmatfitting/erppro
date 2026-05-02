"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from "recharts";
import { Calendar, Search, Ticket, TrendingUp, DollarSign, Users, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PromoReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters);
      const res = await fetch(`/api/report/promo?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { notation: "compact", maximumFractionDigits: 1 }).format(amount);
  };

  if (loading && !data) return <div className="flex items-center justify-center p-24"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Analisis Efektivitas Promo</h2>
          <p className="text-sm text-slate-500">Pantau performa dan dampak promo terhadap penjualan.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
           <input 
              type="date" 
              value={filters.startDate} 
              onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-1.5 text-xs font-bold outline-none border-none bg-transparent"
           />
           <span className="text-slate-300">-</span>
           <input 
              type="date" 
              value={filters.endDate} 
              onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-1.5 text-xs font-bold outline-none border-none bg-transparent"
           />
           <button onClick={fetchData} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">
              <Search className="h-4 w-4" />
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
               <Ticket className="h-6 w-6" />
            </div>
            <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Penggunaan</p>
               <h4 className="text-2xl font-black text-slate-800">{data?.stats?.total_usage || 0} kali</h4>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
               <DollarSign className="h-6 w-6" />
            </div>
            <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Diskon Diberikan</p>
               <h4 className="text-2xl font-black text-slate-800">Rp {new Intl.NumberFormat('id-ID').format(data?.stats?.total_discount || 0)}</h4>
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
               <TrendingUp className="h-6 w-6" />
            </div>
            <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Promo Aktif</p>
               <h4 className="text-2xl font-black text-slate-800">{data?.stats?.distinct_promos || 0} jenis</h4>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Trend Chart */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-500" /> Tren Penggunaan Promo</h3>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.overTime}>
                     <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#94a3b8'}}
                        tickFormatter={(val: string) => new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short'})}
                     />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                     />
                     <Area type="monotone" dataKey="count" name="Jumlah" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Promo Ranking */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-emerald-500" /> Promo Paling Efektif</h3>
            <div className="space-y-4">
               {data?.byPromo.map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-all">
                     <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-sm">
                           #{idx + 1}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-800">{p.nama}</p>
                           <p className="text-[10px] font-mono text-slate-400">{p.kode}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-slate-800">{p.usage_count}x</p>
                        <p className="text-[10px] text-emerald-600 font-bold">Rp {new Intl.NumberFormat('id-ID').format(p.total_discount)}</p>
                     </div>
                  </div>
               ))}
               {(data?.byPromo.length === 0) && (
                  <div className="py-20 text-center text-slate-400">Belum ada data penggunaan promo.</div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
