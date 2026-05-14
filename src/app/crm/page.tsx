"use client";

import { useState, useEffect } from "react";
import { Pipeline } from "@/components/crm/Pipeline";
import { Briefcase, TrendingUp, Users, CheckCircle, Loader2 } from "lucide-react";

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("/api/leads/list");
        const data = await res.json();
        if (data.leads) {
          setLeads(data.leads);
        }
      } catch (err) {
        console.error("Failed to fetch leads:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const stats = [
    { label: "Total Leads", value: leads.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Hot Leads", value: leads.filter(l => l.hot_score >= 80).length, icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Contacted", value: leads.filter(l => l.status === 'contacted').length, icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Closed Deal", value: leads.filter(l => l.status === 'closed').length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Lead Management <span className="text-indigo-600">Pipeline</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Kelola prospek bisnis Anda dan pantau proses closing secara real-time.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl ${stat.bg} dark:bg-slate-800 flex items-center justify-center`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Board */}
      <div className="mt-4">
        {loading ? (
          <div className="h-[400px] flex items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
             <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat Pipeline...</span>
             </div>
          </div>
        ) : (
          <Pipeline initialLeads={leads} />
        )}
      </div>
    </div>
  );
}
