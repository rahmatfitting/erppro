"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Search, MapPin, Filter, Loader2, Star, Globe, Phone, ExternalLink, Download, ChevronDown, CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LeadFinderProps {
  onLeadsFound: (leads: any[]) => void;
}

export function LeadFinder({ onLeadsFound }: LeadFinderProps) {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState(4);
  const [minReviews, setMinReviews] = useState(100);
  const [filterNoWebsite, setFilterNoWebsite] = useState(true);
  const [engine, setEngine] = useState("google");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;

    setLoading(true);
    try {
      const response = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          location,
          minRating,
          minReviews,
          filterNoWebsite,
          engine,
        }),
      });

      const data = await response.json();
      if (data.leads && data.leads.length > 0) {
        toast.success(`Berhasil! Ditemukan ${data.leads.length} prospek potensial.`);
        onLeadsFound(data.leads);
      } else {
        toast.warning("Tidak ditemukan data yang cocok dengan kriteria Anda.");
      }
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Gagal melakukan pencarian. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300">
      {/* Header with Premium Gradient */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-8 py-6 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-white font-black text-xl flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Search className="h-5 w-5" />
            </div>
            Lead Finder AI
          </h2>
          <p className="text-indigo-100 text-xs font-medium mt-2 opacity-90">
            Scanning Google Maps for untapped business opportunities.
          </p>
        </div>
        {/* Decorative circle */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </div>

      <form onSubmit={handleSearch} className="p-8 space-y-6">
        <div className="flex flex-col gap-6">
          {/* Keyword Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Niche / Industri</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Katering, Klinik, dll..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full h-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                required
              />
            </div>
          </div>

          {/* Location Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Lokasi Kota</label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Contoh: Surabaya"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Engine Choice */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Screening Engine</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'google', label: 'Standard API', desc: 'Cepat & Stabil', icon: Globe },
              { id: 'crawlee', label: 'Deep Scan', desc: 'Bebas Biaya API', icon: Sparkles },
            ].map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEngine(e.id)}
                className={cn(
                  "flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group",
                  engine === e.id 
                    ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md" 
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <e.icon className={cn("h-4 w-4", engine === e.id ? "text-indigo-600" : "text-slate-400")} />
                  <span className={cn("text-xs font-black", engine === e.id ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                    {e.label}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">{e.desc}</span>
                {engine === e.id && (
                  <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500 text-white flex items-center justify-center rounded-bl-xl">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Filters Card */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
              <Filter className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Quality Screening</span>
          </div>

          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Min. Rating</label>
              <div className="relative max-w-xs">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" />
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                >
                  {[3, 3.5, 4, 4.5].map(v => <option key={v} value={v}>{v}+ Bintang</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                   <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Min. Reviews</label>
              <div className="max-w-xs">
                <input
                  type="number"
                  value={minReviews}
                  onChange={(e) => setMinReviews(Number(e.target.value))}
                  className="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Website Filter</label>
              <button
                type="button"
                onClick={() => setFilterNoWebsite(!filterNoWebsite)}
                className={cn(
                  "flex items-center gap-2 h-10 px-4 rounded-xl border transition-all duration-300 w-fit min-w-[160px]",
                  filterNoWebsite 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                  filterNoWebsite ? "bg-white" : "bg-slate-200 dark:bg-slate-700"
                )}>
                  {filterNoWebsite && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                </div>
                <span className="text-xs font-bold whitespace-nowrap text-left">Tanpa Website</span>
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all duration-300 active:scale-[0.98] overflow-hidden"
        >
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          
          <div className="relative flex items-center justify-center gap-3">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="tracking-tight">MENGANALISA DATA...</span>
              </>
            ) : (
              <>
                <Search className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span className="tracking-tight uppercase">Mulai Cari Prospek</span>
              </>
            )}
          </div>
        </button>
      </form>

      {/* Full Screen Loading Overlay using Portal */}
      {loading && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="relative">
            {/* Outer spinning ring */}
            <div className="h-24 w-24 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            {/* Inner pulsing logo/icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/50 flex items-center justify-center animate-pulse">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          <div className="mt-8 text-center space-y-2">
            <h3 className="text-xl font-black text-white tracking-widest uppercase">Scanning Google Maps</h3>
            <p className="text-indigo-200/70 text-sm font-bold animate-pulse">AI sedang memproses data prospek terbaik untuk Anda...</p>
          </div>
          
          {/* Progress simulation bar */}
          <div className="mt-8 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 animate-[loading_2s_infinite]" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
