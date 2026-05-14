"use client";

import { useState, useEffect } from "react";
import { LeadFinder } from "@/components/leads/LeadFinder";
import { LeadTable } from "@/components/leads/LeadTable";
import { AuditModal } from "@/components/leads/AuditModal";
import { Sparkles, History, Search, Target } from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Fetch existing leads on mount
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("/api/leads/list");
        const data = await res.json();
        if (data.leads) {
          setLeads(data.leads);
        }
      } catch (err) {
        console.error("Failed to fetch leads history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchLeads();
  }, []);

  const handleLeadsFound = (newLeads: any[]) => {
    // Prepend new leads and avoid duplicates
    setLeads(prev => {
      const existingIds = new Set(prev.map(l => l.place_id));
      const filteredNew = newLeads.filter(l => !existingIds.has(l.place_id));
      return [...filteredNew, ...prev];
    });
  };

  const handleAudit = (lead: any) => {
    setSelectedLead(lead);
    setShowAudit(true);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-10 shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-3">
            <Sparkles className="h-4 w-4" />
            <span>AI POWERED MODULE</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight sm:text-4xl">
            Lead Finder <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">& Prospecting</span>
          </h1>
          <p className="mt-4 max-w-2xl text-slate-400 text-lg leading-relaxed">
            Temukan ribuan bisnis potensial dari Google Maps secara otomatis. Filter berdasarkan rating, review, dan ketiadaan website untuk mencari target closing terbaik.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-64 w-64 bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 h-64 w-64 bg-violet-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Search Panel */}
        <div className="lg:col-span-1 sticky top-4">
          <LeadFinder onLeadsFound={handleLeadsFound} />
          
          {/* Quick Stats / Info */}
          <div className="mt-6 p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800">
            <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-4">Tips Pencarian</h4>
            <ul className="space-y-3">
              {[
                { icon: Search, text: "Gunakan kata kunci spesifik (e.g. 'Katering Wedding')" },
                { icon: Target, text: "Fokus pada bisnis dengan rating tinggi tapi belum ada website" },
                { icon: History, text: "Data akan tersimpan otomatis di database CRM" }
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <item.icon className="h-4 w-4 shrink-0 text-indigo-500" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {loadingHistory ? (
            <div className="h-64 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat Riwayat...</span>
              </div>
            </div>
          ) : (
            <LeadTable leads={leads} onAudit={handleAudit} />
          )}
        </div>
      </div>

      {showAudit && selectedLead && (
        <AuditModal 
          lead={selectedLead} 
          onClose={() => {
            setShowAudit(false);
            setSelectedLead(null);
          }} 
        />
      )}
    </div>
  );
}
