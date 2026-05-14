"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Star, MoreVertical, MessageSquare, Phone, TrendingUp, MapPin } from "lucide-react";

const STAGES = [
  { id: "new", label: "New Leads", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { id: "interested", label: "Interested", color: "bg-indigo-500" },
  { id: "negotiation", label: "Negotiation", color: "bg-purple-500" },
  { id: "closed", label: "Closed / Deal", color: "bg-emerald-500" },
];

interface Lead {
  id: string;
  name: string;
  hot_score: number;
  status: string;
  category: string;
  maps_url?: string;
}

interface PipelineProps {
  initialLeads: Lead[];
}

export function Pipeline({ initialLeads }: PipelineProps) {
  const [leads, setLeads] = useState(initialLeads);

  const moveLead = async (id: string, newStatus: string) => {
    // Update local state for optimistic UI
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    
    // API call to update status
    await fetch("/api/leads/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-8 min-h-[600px]">
      {STAGES.map((stage) => (
        <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col">
          {/* Column Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-6 rounded-full", stage.color)} />
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs">
                {stage.label}
              </h3>
            </div>
            <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {leads.filter(l => l.status === stage.id).length}
            </span>
          </div>

          {/* Cards Container */}
          <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl p-3 space-y-3 border border-slate-200/50 dark:border-slate-800/50">
            {leads.filter(l => l.status === stage.id).map((lead) => (
              <div
                key={lead.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-900 transition-all cursor-grab active:cursor-grabbing group"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("leadId", lead.id);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{lead.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{lead.category}</span>
                  </div>
                  <div className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded border",
                    lead.hot_score > 80 ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-slate-50 border-slate-100 text-slate-400"
                  )}>
                    {lead.hot_score}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex -space-x-2">
                    <a 
                      href={lead.maps_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border-2 border-white dark:border-slate-800 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                      title="Buka di Google Maps"
                    >
                      <MapPin className="h-4 w-4 text-indigo-500" />
                    </a>
                  </div>
                  
                  <div className="flex gap-1">
                    <button className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md transition-colors">
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Drop Zone */}
            <div
              className="h-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs font-bold"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const leadId = e.dataTransfer.getData("leadId");
                moveLead(leadId, stage.id);
              }}
            >
              Drop here to move
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
