"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  MapPin, 
  Loader2, 
  LogOut, 
  ChevronRight, 
  Building, 
  Search, 
  X,
  LayoutDashboard,
  Globe,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SelectBranch() {
  const router = useRouter();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAvailableBranches = async () => {
      try {
        const res = await fetch("/api/auth/branches");
        const json = await res.json();
        if (json.success) {
          setBranches(json.data);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Gagal memuat cabang");
      } finally {
        setLoading(false);
      }
    };
    fetchAvailableBranches();
  }, [router]);

  const filteredBranches = useMemo(() => {
    if (!searchQuery) return branches;
    const lowerQ = searchQuery.toLowerCase();
    return branches.filter(b =>
      b.nama.toLowerCase().includes(lowerQ) ||
      b.perusahaan_nama.toLowerCase().includes(lowerQ)
    );
  }, [branches, searchQuery]);

  const handleSelect = async (branchId: number) => {
    setSubmitting(branchId.toString());
    try {
      const res = await fetch("/api/auth/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId })
      });
      const json = await res.json();
      if (json.success) {
        const channel = new BroadcastChannel('erp-session-sync');
        channel.postMessage('REFRESH_SESSION');
        channel.close();
        window.location.href = "/";
      } else {
        alert(json.error);
        setSubmitting("");
      }
    } catch (err) {
      alert("Terjadi kesalahan");
      setSubmitting("");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center">
            <div className="h-16 w-16 mb-6 relative">
                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">
                Initializing Workspace
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex flex-col bg-slate-950 text-slate-200 overflow-x-hidden selection:bg-indigo-500/30">
      {/* ── BACKGROUND LAYER ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Mesh Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.15),transparent_50%)]"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full"></div>
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-violet-600/5 blur-[100px] rounded-full"></div>
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      </div>

      {/* ── NAVIGATION / HEADER ── */}
      <nav className="relative z-20 w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="block text-sm font-black tracking-tighter text-white uppercase">ERP Pro</span>
            <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest">Enterprise Core</span>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 rounded-full transition-all duration-300 active:scale-95"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-500 group-hover:text-rose-500 transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-rose-500 transition-colors">Logout</span>
        </button>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">
              Select <span className="text-indigo-500">Workspace</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-medium tracking-wide max-w-md mx-auto leading-relaxed">
              Choose the operational branch you want to manage. Your permissions and data will be scoped to this selection.
            </p>
          </div>

          {/* Search & Stats Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search branches or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-white placeholder:text-slate-500 outline-none transition-all focus:ring-4 focus:ring-indigo-500/10"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl whitespace-nowrap">
              <Globe className="h-4 w-4 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {filteredBranches.length} Active Branches
              </span>
            </div>
          </div>

          {/* Branch Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBranches.map((branch, idx) => (
              <button
                key={branch.nomor}
                disabled={!!submitting}
                onClick={() => handleSelect(branch.nomor)}
                className={cn(
                  "group relative flex flex-col text-left p-6 bg-white/5 border border-white/10 rounded-3xl transition-all duration-500 hover:bg-white/[0.08] hover:border-indigo-500/30 active:scale-[0.98] disabled:opacity-50 overflow-hidden",
                  submitting === branch.nomor.toString() && "ring-2 ring-indigo-500"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Hover Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/10 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                    <Building className="h-6 w-6" />
                  </div>
                  
                  <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                    {submitting === branch.nomor.toString() ? (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    ) : (
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <div className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">
                    {branch.perusahaan_nama}
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase group-hover:text-indigo-100 transition-colors">
                    {branch.nama}
                  </h3>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2 text-slate-500 group-hover:text-slate-400 transition-colors">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-[10px] font-bold uppercase truncate">
                    {branch.alamat || 'No address specified'}
                  </span>
                </div>
              </button>
            ))}

            {filteredBranches.length === 0 && !loading && (
              <div className="md:col-span-2 py-24 flex flex-col items-center justify-center text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem]">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <Search className="h-8 w-8 text-slate-600" />
                </div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">No results found</h3>
                <p className="text-slate-500 text-xs font-medium mb-8">Try adjusting your search query or reset filters.</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-8 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-20 w-full px-6 py-10 border-t border-white/5 mt-12 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
            SYSTEM CORE V.2026.1
          </div>
          <div className="flex gap-8">
            <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Status</span>
                <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    Secure Environment
                </span>
            </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
