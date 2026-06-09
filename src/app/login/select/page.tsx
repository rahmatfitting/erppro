"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  MapPin, 
  Loader2, 
  LogOut, 
  Building, 
  Search, 
  X,
  ShieldCheck,
  ArrowRight,
  Globe
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
        window.location.href = "/home";
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
      <div className="min-h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
            Loading Workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Left Section: Visual/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-600 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800"></div>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        {/* Floating Abstract Shapes */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="relative z-10 text-center p-12 max-w-xl">
           <div className="inline-flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-8">
              <ShieldCheck className="h-12 w-12 text-white" />
           </div>
           <h2 className="text-5xl font-black text-white tracking-tight mb-6">
              Select Your <span className="text-indigo-200">Workspace</span>.
           </h2>
           <p className="text-indigo-100 text-lg font-medium opacity-80 leading-relaxed">
              Choose the operational branch you want to manage. Your permissions and data will be scoped to this selection.
           </p>
        </div>

        {/* Footer info for desktop */}
        <div className="absolute bottom-8 left-0 right-0 text-center text-indigo-200/50 text-xs font-bold uppercase tracking-[0.3em]">
           &copy; 2026 ERP PRO &middot; Global Enterprise Solutions
        </div>
      </div>

      {/* Right Section: Content */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        {/* Subtle background for mobile */}
        <div className="lg:hidden absolute inset-0 z-0">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <div className="flex items-center justify-between mb-10">
            <div className="text-left">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                Active Branches<span className="text-indigo-600">.</span>
              </h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
                You have access to {branches.length} branches.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full transition-colors font-bold text-xs uppercase tracking-widest"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900/50 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
            
            {/* Search Bar */}
            <div className="relative group mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-12 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium"
                placeholder="Search branches or companies..."
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Branch Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 pb-2">
              {filteredBranches.map((branch, idx) => (
                <button
                  key={branch.nomor}
                  disabled={!!submitting}
                  onClick={() => handleSelect(branch.nomor)}
                  className={cn(
                    "group relative flex flex-col text-left p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl transition-all duration-300 hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-500/50 hover:shadow-lg active:scale-[0.98] disabled:opacity-50",
                    submitting === branch.nomor.toString() && "ring-2 ring-indigo-500 bg-white dark:bg-slate-900"
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Building className="h-5 w-5" />
                    </div>
                    
                    <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-500/30 transition-all bg-white dark:bg-slate-900">
                      {submitting === branch.nomor.toString() ? (
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      ) : (
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 mb-4 flex-1">
                    <div className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">
                      {branch.perusahaan_nama}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      {branch.nama}
                    </h3>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[10px] font-bold uppercase truncate">
                      {branch.alamat || 'No address specified'}
                    </span>
                  </div>
                </button>
              ))}

              {filteredBranches.length === 0 && !loading && (
                <div className="sm:col-span-2 py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-sm mb-2">Not Found</h3>
                  <p className="text-slate-500 text-xs font-medium mb-4">No branches match your search query.</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-full transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Footer Branding for Mobile */}
          <div className="lg:hidden mt-12 text-center">
             <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                ERP<span className="text-indigo-600">PRO</span>
             </h3>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Enterprise Management v2.0</p>
          </div>
        </div>
      </div>
      
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
