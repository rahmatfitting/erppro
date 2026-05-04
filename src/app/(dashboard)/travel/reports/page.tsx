"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  MapPin, 
  Users, 
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";

export default function TravelReports() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for initial view
    setReportData({
      totalRevenue: 25750000,
      count: 142,
      byRoute: [
        { name: "Surabaya - Malang", value: 12500000 },
        { name: "Malang - Surabaya", value: 10200000 },
        { name: "Surabaya - Kediri", value: 3050000 },
      ],
      byDriver: [
        { name: "Ahmad Subarjo", value: 8500000 },
        { name: "Budi Santoso", value: 9200000 },
        { name: "Setyo", value: 8050000 },
      ]
    });
    setLoading(false);
  }, []);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase italic">Laporan <span className="text-indigo-600">Finansial Travel</span></h1>
          <p className="text-sm text-slate-500">Analisis pendapatan per rute, driver, dan performa bisnis.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg font-bold text-sm uppercase">
          <Download className="h-4 w-4" /> Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] rounded-full"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Total Revenue</p>
            <h3 className="text-3xl font-black mt-2">Rp 25.7M</h3>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-100">
               <TrendingUp className="h-4 w-4" /> +12% from last month
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Bookings</p>
            <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white">142</h3>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-500">
               <ArrowUpRight className="h-4 w-4" /> 89% fill rate average
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active Units</p>
            <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white">10</h3>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-500">
               <Calendar className="h-4 w-4" /> 42 trips scheduled this week
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Revenue by Route */}
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tight flex items-center gap-2">
               <MapPin className="h-5 w-5 text-indigo-500" />
               Revenue by Route
            </h2>
            <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.byRoute} layout="vertical" margin={{ left: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                     <XAxis type="number" hide />
                     <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        fontSize={10} 
                        fontWeight="bold" 
                        width={100}
                     />
                     <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                        formatter={(val: any) => `Rp ${val?.toLocaleString()}`}
                     />
                     <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                        {reportData?.byRoute.map((entry: any, index: number) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Revenue by Driver */}
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tight flex items-center gap-2">
               <Users className="h-5 w-5 text-indigo-500" />
               Driver Performance
            </h2>
            <div className="h-80 w-full flex items-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={reportData?.byDriver}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                     >
                        {reportData?.byDriver.map((entry: any, index: number) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                        formatter={(val: any) => `Rp ${val?.toLocaleString()}`}
                     />
                  </PieChart>
               </ResponsiveContainer>
               <div className="space-y-4 pr-8">
                  {reportData?.byDriver.map((d: any, i: number) => (
                     <div key={i} className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <div>
                           <p className="text-[10px] font-black uppercase text-slate-400">{d.name}</p>
                           <p className="text-xs font-bold text-slate-900 dark:text-white">Rp {d.value.toLocaleString()}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
