"use client";

import { useState, useMemo } from "react";
import { Star, Globe, Phone, ExternalLink, Download, Sparkles, MapPin, Search, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from 'xlsx';

interface Lead {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  website: string | null;
  phone: string | null;
  address: string;
  maps_url: string;
  hot_score: number;
  status: string;
}

interface LeadTableProps {
  leads: Lead[];
  onAudit: (lead: Lead) => void;
}

export function LeadTable({ leads, onAudit }: LeadTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Filter Logic
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesScore = true;
      if (scoreFilter === "hot") matchesScore = lead.hot_score >= 80;
      else if (scoreFilter === "warm") matchesScore = lead.hot_score >= 50 && lead.hot_score < 80;
      else if (scoreFilter === "cold") matchesScore = lead.hot_score < 50;

      return matchesSearch && matchesScore;
    });
  }, [leads, searchTerm, scoreFilter]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const currentLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLeads, currentPage]);

  const exportToExcel = () => {
    // Export either all or filtered based on user interaction
    const dataToExport = filteredLeads.length > 0 ? filteredLeads : leads;
    
    const data = dataToExport.map(l => ({
      Nama: l.name,
      Kategori: l.category,
      Rating: l.rating,
      Reviews: l.reviews,
      Website: l.website || 'N/A',
      Telepon: l.phone || 'N/A',
      Alamat: l.address,
      'Link Maps': l.maps_url,
      'HOT Score': l.hot_score,
      Status: l.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `prospects_leads_${new Date().getTime()}.xlsx`);
  };

  if (leads.length === 0) return null;

  return (
    <div className="w-full space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 shrink-0">
              <div className="h-2 w-6 bg-indigo-600 rounded-full" />
              Database Prospek
              <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs px-3 py-1 rounded-full font-black">
                {filteredLeads.length} / {leads.length}
              </span>
            </h3>
            
            <div className="relative group flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text"
                placeholder="Cari nama, kategori, atau alamat..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-[0.98] shrink-0"
          >
            <Download className="h-4 w-4" />
            {searchTerm || scoreFilter !== 'all' ? 'EXPORT FILTERED' : 'EXPORT ALL'}
          </button>
        </div>

        {/* Score Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filter Score:</span>
          {[
            { id: 'all', label: 'Semua Data', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600' },
            { id: 'hot', label: '🔥 HOT (>80)', color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' },
            { id: 'warm', label: '⚡ WARM (50-79)', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
            { id: 'cold', label: '❄️ COLD (<50)', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setScoreFilter(f.id);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                scoreFilter === f.id 
                  ? `${f.color} border-indigo-500/50 shadow-md scale-105` 
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop View Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bisnis / Nama</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reputasi</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Info Kontak</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Score</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-6 py-5">
                    <a 
                      href={lead.maps_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col group/link"
                    >
                      <span className="font-black text-slate-800 dark:text-white group-hover/link:text-indigo-600 transition-colors text-sm">
                        {lead.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1 uppercase tracking-tight group-hover/link:text-indigo-400 transition-colors">
                        <MapPin className="h-3 w-3 text-indigo-400" />
                        {lead.address.length > 50 ? lead.address.substring(0, 50) + '...' : lead.address}
                      </span>
                    </a>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-800/50">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-xs font-black">{lead.rating}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{lead.reviews} REVIEWS</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {lead.website ? (
                          <a href={lead.website} target="_blank" className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800/50">
                            <Globe className="h-3 w-3" /> Website
                            <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                          </a>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded border border-rose-100 dark:border-rose-800/50">
                            No Website
                          </span>
                        )}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
                          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded">
                            <Phone className="h-2.5 w-2.5" />
                          </div>
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 shadow-sm transition-all group-hover:scale-110 ${
                        lead.hot_score >= 80 
                          ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-800' 
                          : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                      }`}>
                        {lead.hot_score}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => onAudit(lead)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-[0.95]"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      Audit AI
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View Cards */}
      <div className="md:hidden space-y-4">
        {currentLeads.map((lead) => (
          <div key={lead.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-start">
              <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" className="flex-1 pr-4 hover:opacity-75 transition-opacity">
                <h4 className="font-black text-slate-800 dark:text-white leading-tight">{lead.name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-800/50">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-[10px] font-black">{lead.rating}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{lead.reviews} Reviews</span>
                </div>
              </a>
              <div className={`h-12 w-12 rounded-2xl flex flex-shrink-0 items-center justify-center font-black text-sm border-2 ${
                lead.hot_score >= 80 
                  ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30' 
                  : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800'
              }`}>
                {lead.hot_score}
              </div>
            </div>

            <div className="space-y-2 py-4 border-y border-slate-100 dark:border-slate-800">
               <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                  <MapPin className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                  <span className="font-medium">{lead.address}</span>
               </a>
               {lead.phone && (
                 <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="h-4 w-4 shrink-0 text-indigo-400" />
                    <span className="font-medium">{lead.phone}</span>
                 </div>
               )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
               {lead.website ? (
                  <a href={lead.website} target="_blank" className="text-indigo-500 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
               ) : (
                  <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest">No Website</span>
               )}
               <button
                  onClick={() => onAudit(lead)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-[0.95]"
                >
                  <Sparkles className="h-3 w-3" />
                  Audit AI
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
