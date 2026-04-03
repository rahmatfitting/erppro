"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  TrendingUp, 
  Package, 
  Settings2,
  ArrowUpRight,
  TrendingDown,
  ShoppingCart,
  Wallet,
  AlertCircle,
  Factory,
  ArrowLeft,
  Loader2,
  RefreshCcw,
  Calendar,
  Layers,
  Search,
  ChevronRight
} from "lucide-react";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Drill-down State
  const [view, setView] = useState<'summary' | 'revenue_branch' | 'revenue_daily' | 'revenue_transactions'>('summary');
  const [drillData, setDrillData] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats?view=summary');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchCharts = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/charts');
      const data = await res.json();
      if (data.success) setCharts(data.data);
    } catch (err) { console.error(err); }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchCharts()]);
    setLoading(false);
  }, [fetchStats, fetchCharts]);

  useEffect(() => {
    initData();
    // Realtime Polling (every 30 seconds)
    const interval = setInterval(() => {
      fetchStats();
      fetchCharts();
    }, 30000);
    return () => clearInterval(interval);
  }, [initData, fetchStats, fetchCharts]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchCharts()]);
    setRefreshing(false);
  };

  const handleDrillDown = async (type: string, id?: string, label?: string) => {
     setDrillLoading(true);
     setDrillTitle(label || type);
     
     let url = `/api/dashboard/stats?view=${type}`;
     if (id) url += `&cabangId=${id}`;
     if (type === 'revenue_transactions' && label) url += `&date=${label}`;

     try {
       const res = await fetch(url);
       const data = await res.json();
       if (data.success) {
         setDrillData(data.data);
         setView(type as any);
       }
     } catch (err) { console.error(err); }
     finally { setDrillLoading(false); }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
         <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
         <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Menyiapkan Dashboard Real-time...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
               Overview <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Analytics</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 uppercase font-bold tracking-widest">Pusat Komando & Monitoring Real-time</p>
         </div>
         <div className="flex items-center gap-2">
            <div className="bg-white dark:bg-slate-900 rounded-full px-4 py-2 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Live System</span>
            </div>
            <button 
              onClick={handleManualRefresh}
              className={cn(
                "p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all text-slate-600 shadow-sm",
                refreshing && "animate-spin text-indigo-600"
              )}
            >
               <RefreshCcw className="h-4 w-4" />
            </button>
         </div>
      </div>

      {view === 'summary' ? (
        <>
          {/* KPI Groups */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KPICard 
              title="Revenue" 
              value={formatIDR(stats?.revenue)} 
              icon={<TrendingUp />} 
              trend="+12%" 
              color="blue"
              onClick={() => handleDrillDown('revenue_branch', undefined, 'Revenue per Cabang')}
            />
            <KPICard 
              title="Profit / Margin" 
              value={formatIDR(stats?.profit)} 
              icon={<Wallet />} 
              trend="+8.4%" 
              color="emerald"
            />
            <KPICard 
              title="Total Order" 
              value={`${stats?.orders} Transaksi`} 
              icon={<ShoppingCart />} 
              trend="+15%" 
              color="violet"
            />
            <KPICard 
              title="Inventory Value" 
              value={formatIDR(stats?.inventory)} 
              icon={<Package />} 
              trend="-2.1%" 
              color="orange"
            />
            <KPICard 
              title="Piutang Overdue" 
              value={formatIDR(stats?.overdue)} 
              icon={<AlertCircle />} 
              trend="+1.2%" 
              color="rose"
            />
            <KPICard 
              title="Prod. Output" 
              value={`${stats?.production?.toLocaleString()} Unit`} 
              icon={<Factory />} 
              trend="+5.6%" 
              color="indigo"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 lg:grid-cols-2">
             <ChartContainer title="Sales Trend (Last 30 Days)" icon={<TrendingUp className="text-indigo-500" />}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={charts?.salesTrend}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${val/1000000}M`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatIDR(val), 'Sales']}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#4f46e5" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
             </ChartContainer>

             <ChartContainer title="Cashflow Activity (7 Days)" icon={<Wallet className="text-emerald-500" />}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts?.cashflow}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${val/1000}rb`} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                       formatter={(val: number) => formatIDR(val)}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                    <Bar dataKey="inflow" name="Uang Masuk" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="outflow" name="Uang Keluar" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
             </ChartContainer>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-3">
             <ChartContainer title="Top 5 Products" icon={<Package className="text-violet-500" />} className="lg:col-span-1">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={charts?.topProducts}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts?.topProducts?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
             </ChartContainer>

             <ChartContainer title="Sales Per Branch" icon={<Layers className="text-orange-500" />} className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={250}>
                   <BarChart layout="vertical" data={charts?.salesBranch}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={100} />
                      <Tooltip 
                         cursor={{ fill: 'transparent' }}
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                         formatter={(val: number) => formatIDR(val)}
                      />
                      <Bar dataKey="value" fill="#f59e0b" radius={[0, 10, 10, 0]} barSize={15} />
                   </BarChart>
                </ResponsiveContainer>
             </ChartContainer>
          </div>
        </>
      ) : (
        /* DRILL DOWN VIEW */
        <div className="space-y-6">
           <div className="flex items-center gap-4">
              <button 
                 onClick={() => setView('summary')}
                 className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 transition-all"
              >
                 <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                 <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{drillTitle}</h2>
                 <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest italic">{view === 'revenue_transactions' ? `Detail transaksi tanggal ${drillTitle}` : `Analisis pendapatan berdasarkan ${view.split('_').pop()}`}</p>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                       type="text" 
                       placeholder="Cari data..."
                       className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-9 pr-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 w-64 font-bold"
                    />
                 </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                 {drillLoading ? (
                   <div className="p-20 text-center"><Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto" /></div>
                 ) : drillData.length === 0 ? (
                   <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Data tidak ditemukan</div>
                 ) : (
                   drillData.map((item, idx) => (
                     <div 
                        key={idx} 
                        onClick={() => {
                          if (view === 'revenue_branch') handleDrillDown('revenue_daily', item.id, item.label);
                          if (view === 'revenue_daily') handleDrillDown('revenue_transactions', undefined, item.label);
                        }}
                        className={cn(
                          "group p-5 flex items-center justify-between transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/50",
                          (view === 'revenue_branch' || view === 'revenue_daily') && "cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-4">
                           <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-black text-xs">
                              {idx + 1}
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.label || item.kode}</p>
                              {item.customer && <p className="text-[10px] text-slate-400 font-bold uppercase">{item.customer}</p>}
                           </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-sm font-black text-slate-900 dark:text-white">{formatIDR(item.value)}</p>
                              <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-emerald-500 uppercase">
                                 <TrendingUp className="h-2.5 w-2.5" />
                                 100% Volume
                              </div>
                           </div>
                           {(view === 'revenue_branch' || view === 'revenue_daily') && (
                             <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                               <ChevronRight className="h-4 w-4" />
                             </div>
                           )}
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// Support Components
function KPICard({ title, value, icon, trend, color, onClick }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-white p-5 border border-slate-200/60 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 dark:border-slate-800 cursor-pointer",
        onClick && "hover:border-indigo-400 dark:hover:border-indigo-600"
      )}
    >
      <div className="flex flex-col gap-4 relative z-10">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border transition-all group-hover:scale-110", colorMap[color])}>
           {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight line-clamp-1">{value}</h3>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={cn(
               "flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full",
               trend.startsWith('+') ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" : "text-rose-600 bg-rose-50 dark:bg-rose-500/10"
            )}>
              {trend.startsWith('+') ? <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> : <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
              {trend}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartContainer({ title, icon, children, className }: any) {
  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 p-6 shadow-sm dark:border-slate-800", className)}>
       <div className="flex items-center gap-2 mb-8">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">{icon}</div>
          <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">{title}</h3>
       </div>
       {children}
    </div>
  );
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
