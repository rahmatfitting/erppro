"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Loader2, ArrowRight, LogOut, ChevronRight, Building, Search, X } from "lucide-react";

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
           router.push("/login"); // Session might be invalid
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
        // Notify other tabs to refresh session
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
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Menyiapkan lingkungan kerja Anda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 bg-slate-900 overflow-y-auto">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-20%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="w-full max-w-[500px] relative z-10 py-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Header Section */}
        <div className="text-center mb-10 px-4">
           <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl mb-8 group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
              <Building2 className="h-10 w-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
           </div>
           <h1 className="text-3xl font-black text-white tracking-tight sm:text-4xl">
             SELECT <span className="text-indigo-400 font-medium italic">BRANCH</span>
           </h1>
           <p className="mt-4 text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] bg-white/5 py-2 px-4 rounded-full w-fit mx-auto border border-white/5 backdrop-blur-sm">
              Operational Workspace
           </p>
        </div>

        <div className="space-y-6">
          {/* Enhanced Search Input */}
          <div className="group relative px-2 sm:px-0">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-indigo-400">
              <Search className="h-5 w-5" />
            </div>
            <input 
              type="text"
              placeholder="Filter deployment zones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl py-5 pl-14 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium text-sm sm:text-base"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Branch Feed / List */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar px-2 sm:px-0">
             {filteredBranches.map((branch) => (
                <button
                  key={branch.nomor}
                  disabled={!!submitting}
                  onClick={() => handleSelect(branch.nomor)}
                  className="w-full group relative flex items-center gap-5 p-6 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-xl hover:bg-white/15 transition-all active:scale-[0.98] text-left disabled:opacity-50 overflow-hidden"
                >
                  {/* Active Indicator Line */}
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                  
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-white/10">
                    <Building className="h-7 w-7 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-400/10 px-2 py-0.5 rounded-md border border-indigo-400/20">
                          {branch.perusahaan_nama}
                       </span>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight truncate leading-tight group-hover:text-indigo-200 transition-colors">
                      {branch.nama}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 mt-2 truncate max-w-[200px]">
                      <MapPin className="h-3 w-3 text-indigo-500" /> {branch.alamat || 'NO ADDRESS SPECIFIED'}
                    </p>
                  </div>

                  <div className="h-12 w-12 rounded-full flex items-center justify-center bg-white/5 border border-white/5 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-400 transition-all shadow-inner">
                     {submitting === branch.nomor.toString() ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                     ) : (
                        <ChevronRight className="h-7 w-7 transition-transform group-hover:translate-x-1" />
                     )}
                  </div>
                </button>
             ))}

             {filteredBranches.length === 0 && !loading && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 bg-white/5 rounded-[2.5rem] border border-white/5 backdrop-blur-md animate-in fade-in">
                   <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                      <Search className="h-8 w-8 opacity-20" />
                   </div>
                   <p className="font-black uppercase tracking-widest text-[10px]">No active zones detected</p>
                   {searchQuery && (
                     <button 
                       onClick={() => setSearchQuery("")}
                       className="mt-6 text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest border-b border-indigo-400/30 pb-1"
                     >
                       Reset Global Scan
                     </button>
                   )}
                </div>
             )}
          </div>

          {/* Action Footer */}
          <div className="pt-10 flex justify-center">
             <button
               onClick={handleLogout}
               className="group flex items-center gap-3 text-slate-400 hover:text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-white/5 px-8 py-4 rounded-full backdrop-blur-2xl border border-white/5 hover:border-rose-400/20 hover:bg-rose-400/5 shadow-xl"
             >
               <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Deauthenticate Session
             </button>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-6 w-full text-center z-10 pointer-events-none">
         <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em]">SYSTEM CORE V.2026.1</p>
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}}/>
    </div>
  );
}
