"use client";

import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, RefreshCcw, Loader2, DollarSign, ArrowUpRight, TrendingDown, Info, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GoldPricesDashboard() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<any[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/gold-prices/history?limit=30');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/gold-prices/sync');
      const json = await res.json();
      if (json.success) {
        if ('Notification' in window && Notification.permission !== 'granted') {
          await Notification.requestPermission();
        }
        await fetchHistory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Memuat Data Emas Antam...</p>
      </div>
    );
  }

  const latest = data.length > 0 ? data[data.length - 1] : { price_1g: 0, prev_price: 0, diff: 0, fetch_date: '-' };
  const isUp = latest.price_1g > latest.prev_price;
  const isDown = latest.price_1g < latest.prev_price;
  const colorTheme = isUp ? 'text-emerald-500' : isDown ? 'text-rose-500' : 'text-slate-500';
  const IconTrend = isUp ? ArrowUpRight : isDown ? TrendingDown : Info;

  const chartData = data.map(item => ({
    date: item.time_label || item.fetch_date,
    price: parseFloat(item.price_1g),
    diff: parseFloat(item.diff)
  }));

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <DollarSign className="h-8 w-8" />
            </div>
            Harga Emas <span className="text-amber-500">Antam</span>
            <span className="text-[10px] font-black px-2 py-1 bg-amber-100 text-amber-600 rounded-lg ml-2 uppercase tracking-widest animate-pulse">L I V E</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-bold uppercase tracking-widest italic">
            Monitoring Pergerakan Harga Emas 1 Gram
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if ('Notification' in window) Notification.requestPermission();
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            <Bell className="h-4 w-4" /> Notifikasi
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Sync Data Terbaru
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2.5rem] p-8 shadow-lg shadow-amber-500/20 text-white transition-all hover:-translate-y-1">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
          
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Harga 1 Gram Saat Ini</p>
          <h3 className="text-3xl font-black tracking-tighter mb-4">{formatIDR(latest.price_1g)}</h3>
          
          <div className="pt-4 mt-2 border-t border-white/20 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Harga Sebelumnya</p>
              <p className="text-lg font-bold tracking-tight opacity-90">{formatIDR(latest.prev_price)}</p>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest bg-black/20 w-max px-2 py-1 rounded-full">
              {latest.fetch_date}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm transition-all hover:-translate-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Perubahan Harga</p>
          <div className="flex items-center gap-4">
            <h3 className={cn("text-3xl font-black tracking-tighter", colorTheme)}>
              {isUp ? "+" : isDown ? "-" : ""}{formatIDR(latest.diff)}
            </h3>
            <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", 
              isUp ? "bg-emerald-100 text-emerald-600" : isDown ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
            )}>
              <IconTrend className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-4">
            Berubah dari <span className="text-slate-600 dark:text-slate-200">{formatIDR(latest.prev_price)}</span>
          </p>
        </div>

        <div className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm transition-all hover:-translate-y-1">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Trend 30 Hari</p>
           <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">Grafik Tren Ringkas</h3>
           <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ display: 'none' }} />
                  <Area type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
             <h3 className="text-xl font-black text-slate-900 dark:text-white">Pergerakan Historis (30 Hari Terakhir)</h3>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Rp / Gram</p>
          </div>
          <TrendingUp className="h-6 w-6 text-slate-300" />
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickMargin={10} />
              <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(value) => `Rp ${value / 1000}k`} />
              <Tooltip 
                 contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                 formatter={(value: any) => [formatIDR(value), 'Harga 1 Gram']}
                 labelStyle={{ fontWeight: 900, color: '#475569', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorPrice)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
