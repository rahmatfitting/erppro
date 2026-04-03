"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Wallet,
  Activity,
  Calendar,
  RefreshCcw,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  TrendingDown,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Search
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { cn } from "@/lib/utils";

export default function DashboardV2() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/v2/stats?startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
    // Real-time synchronization (every 30 seconds)
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Menyiapkan Analytics V2...</p>
      </div>
    );
  }

  const periods = [
    { label: "Hari Ini", key: "today" },
    { label: "Minggu Ini", key: "week" },
    { label: "Bulan Ini", key: "month" },
    { label: "Custom Range", key: "custom" }
  ];

  const currentRevenue = Number(data?.custom?.revenue ?? data?.month?.revenue ?? 0);
  const currentMargin = Number(data?.custom?.margin ?? data?.month?.margin ?? 0);
  const currentTransactions = Number(data?.custom?.transactions ?? data?.month?.transactions ?? 0);
  const currentAOV = Number(data?.custom?.aov ?? data?.month?.aov ?? 0);

  const revScore = Math.min((currentRevenue / 100000000) * 100, 100) * 0.4;
  const margScore = Math.min((currentMargin / 30) * 100, 100) * 0.4;
  const txScore = Math.min((currentTransactions / 100) * 100, 100) * 0.2;
  const operationalHealth = (revScore + margScore + txScore).toFixed(1);
  
  const healthColorText = parseFloat(operationalHealth) >= 80 ? 'text-emerald-500' : parseFloat(operationalHealth) >= 50 ? 'text-amber-500' : 'text-rose-500';
  const healthColorBg = parseFloat(operationalHealth) >= 80 ? 'bg-emerald-500' : parseFloat(operationalHealth) >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  const aovStatus = currentAOV > 500000 ? "EXCELLENT" : currentAOV > 200000 ? "PROFITABLE" : currentAOV > 100000 ? "AVERAGE" : "NEEDS WORK";
  const aovColor = currentAOV > 500000 ? "text-emerald-500" : currentAOV > 200000 ? "text-indigo-500" : currentAOV > 100000 ? "text-amber-500" : "text-rose-500";


  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-indigo-600" />
            Dashboard <span className="text-indigo-600">V2</span>
            <span className="text-xs font-black px-2 py-1 bg-indigo-100 text-indigo-600 rounded-lg ml-2 uppercase tracking-widest">Analytics PRO</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-bold uppercase tracking-widest italic">
            Monitoring Kinerja Penjualan & Profitabilitas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r dark:border-slate-800">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-200"
            />
            <span className="text-slate-300 mx-1">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-200"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
            Sync Data
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIV2Card
          title="Omzet (Revenue)"
          value={formatIDR(data?.custom?.revenue ?? data?.month?.revenue ?? 0)}
          subValue={`Target: ${formatIDR(100000000)}`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="indigo"
          percentage={((data?.custom?.revenue ?? data?.month?.revenue ?? 0) / 100000000) * 100}
          trendValue={data?.trends?.revenue}
        />
        <KPIV2Card
          title="Profit Bersih"
          value={formatIDR(data?.custom?.profit ?? data?.month?.profit ?? 0)}
          subValue={`Margin: ${(data?.custom?.margin ?? data?.month?.margin ?? 0).toFixed(1)}%`}
          icon={<Wallet className="h-6 w-6" />}
          color="emerald"
          percentage={(data?.custom?.margin ?? data?.month?.margin ?? 0)}
          trendValue={data?.trends?.profit}
        />
        <KPIV2Card
          title="Total Transaksi"
          value={data?.custom?.transactions ?? data?.month?.transactions ?? 0}
          subValue="Invoices processed"
          icon={<ShoppingCart className="h-6 w-6" />}
          color="amber"
          percentage={Math.min(100, Math.max(0, 50 + (data?.trends?.transactions || 0) / 2))}
          trendValue={data?.trends?.transactions}
        />
        <KPIV2Card
          title="Average Order (AOV)"
          value={formatIDR(data?.custom?.aov ?? data?.month?.aov ?? 0)}
          subValue="Revenue per transaction"
          icon={<BarChart3 className="h-6 w-6" />}
          color="rose"
          percentage={Math.min(100, Math.max(0, 50 + (data?.trends?.aov || 0) / 2))}
          trendValue={data?.trends?.aov}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Multiperiod Performance</h3>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">Snapshot Overview</p>
            </div>
            <Activity className="h-5 w-5 text-indigo-500 opacity-50" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Periode</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Omzet</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Transactions</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Profit</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {periods.map((p) => (
                  <tr key={p.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        p.key === 'custom' ? "bg-amber-100 text-amber-600 ring-2 ring-amber-100" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {p.label}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-black text-slate-700 dark:text-slate-200">{formatIDR(data?.[p.key]?.revenue || 0)}</td>
                    <td className="px-8 py-5 font-bold text-slate-500 italic">{data?.[p.key]?.transactions || 0} Invoices</td>
                    <td className="px-8 py-5 font-black text-emerald-600">{formatIDR(data?.[p.key]?.profit || 0)}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-700 dark:text-slate-200">{(data?.[p.key]?.margin || 0).toFixed(1)}%</span>
                        <div className="h-1.5 w-12 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(data?.[p.key]?.margin || 0, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel Stats */}
        <div className="space-y-6">


          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Efficiency</h3>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-400 uppercase font-black mb-1">AOV Status</p>
                <p className={cn("text-lg font-black", aovColor)}>{aovStatus}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Avg. Margin</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{(data?.custom?.margin || data?.month?.margin || 0).toFixed(1)}%</p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase">Operational health</p>
                <span className={cn("text-xs font-black", healthColorText)}>{operationalHealth}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-1000", healthColorBg)} style={{ width: `${operationalHealth}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Performance Comparison */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8 text-center sm:text-left">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Branch Performance</h3>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-tighter italic">Comparison of revenue across all locations</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Filter className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(data?.custom?.branches || data?.month?.branches || []).map((branch: any, idx: number) => {
            const maxRevenue = Math.max(...(data?.custom?.branches || data?.month?.branches || []).map((b: any) => parseFloat(b.revenue || 0)), 1);
            const percentage = (parseFloat(branch.revenue || 0) / maxRevenue) * 100;

            return (
              <div key={idx} className="relative p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group shadow-sm hover:shadow-xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm",
                      idx === 0 ? "bg-indigo-100 text-indigo-600 border border-indigo-200" : "bg-white dark:bg-slate-800 text-slate-400"
                    )}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">{branch.branch_name}</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-none whitespace-nowrap">{formatIDR(branch.revenue)}</p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none">Leader</span>
                  )}
                </div>

                <div className="space-y-2 mt-6">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                    <span>Performance</span>
                    <span className={idx === 0 ? "text-indigo-600" : ""}>{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-[1px]">
                    <div
                      style={{ width: `${percentage}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        idx === 0 ? "bg-gradient-to-r from-indigo-500 to-violet-600" : "bg-slate-400"
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t dark:border-slate-800 mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic tracking-tighter">{branch.transactions} Invoices</p>
                    <div className={cn(
                      "p-1 rounded-lg",
                      idx === 0 ? "bg-emerald-50 text-emerald-500" : "bg-slate-100 text-slate-300"
                    )}>
                      <ArrowUpRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KPIV2Card({ title, value, subValue, icon, color, percentage, trendValue = 0 }: any) {
  const colors: any = {
    indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-600 border-indigo-100",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 border-emerald-100",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-600 border-amber-100",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-600 border-rose-100"
  };

  const ringColors: any = {
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600"
  };

  return (
    <div className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 p-8 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2">
      {/* Background Glow */}
      <div className={cn("absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-3xl opacity-20", colors[color])}></div>

      <div className="relative z-10 flex items-start justify-between">
        <div className={cn("p-4 rounded-3xl border shadow-sm transition-transform group-hover:scale-110", colors[color])}>
          {icon}
        </div>
        <div className="relative h-12 w-12 flex items-center justify-center">
          <svg className="h-full w-full transform -rotate-90">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-100 dark:text-slate-800" />
            <circle
              cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
              strokeDasharray={125.6}
              strokeDashoffset={125.6 - (125.6 * Math.min(percentage, 100)) / 100}
              strokeLinecap="round"
              className={cn(ringColors[color], "transition-all duration-1000 ease-out")}
            />
          </svg>
          <span className="absolute text-[8px] font-black">{Math.round(percentage)}%</span>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter line-clamp-1">{value}</h3>
        <p className="text-xs font-bold text-slate-500 mt-2 italic flex items-center gap-1.5 uppercase tracking-tighter">
          {subValue}
        </p>
      </div>

      {/* Interactive Micro-trend */}
      <div className="mt-6 flex items-center justify-between pt-6 border-t dark:border-slate-800">
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black uppercase",
          trendValue >= 0 ? "text-emerald-500" : "text-rose-500"
        )}>
          {trendValue >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{Math.abs(trendValue).toFixed(1)}%</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn("w-1 rounded-full", i === 5 ? "h-4 bg-indigo-500" : "h-2 bg-slate-200 dark:bg-slate-700")} />
          ))}
        </div>
      </div>
    </div>
  );
}
