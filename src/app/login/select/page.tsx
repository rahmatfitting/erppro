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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-fixed">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
        <div className="text-center mb-10">
           <div className="inline-flex h-16 w-16 bg-white rounded-2xl items-center justify-center shadow-xl mb-4 rotate-3 ring-4 ring-white/10">
              <Building2 className="h-8 w-8 text-indigo-600 -rotate-3" />
           </div>
           <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
             Pilih Unit Kerja
           </h2>
           <p className="mt-3 text-sm text-indigo-100/80 max-w-xs mx-auto">
             Pilih perusahaan dan cabang tempat Anda akan berdinas saat ini.
           </p>
        </div>

        <div className="space-y-6">
          {/* Search Input */}
          <div className="relative z-20">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              <Search className="h-5 w-5" />
            </div>
            <input 
              type="text"
              placeholder="Cari cabang atau perusahaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
             {filteredBranches.map((branch) => (
                <button
                  key={branch.nomor}
                  disabled={!!submitting}
                  onClick={() => handleSelect(branch.nomor)}
                  className="group relative flex items-center gap-4 p-5 bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 text-left disabled:opacity-70 disabled:pointer-events-none active:scale-95 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 transition-all group-hover:w-2"></div>
                  
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Building className="h-6 w-6 text-indigo-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1.5 opacity-80">
                       <span className="bg-indigo-50 px-1.5 py-0.5 rounded">{branch.perusahaan_nama}</span>
                    </div>
                    <div className="text-lg font-black text-slate-800 uppercase tracking-tight truncate leading-tight">
                      {branch.nama}
                    </div>
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1 truncate">
                      <MapPin className="h-3 w-3" /> {branch.alamat || 'Alamat belum diatur'}
                    </div>
                  </div>

                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                     {submitting === branch.nomor.toString() ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                     ) : (
                        <ChevronRight className="h-6 w-6" />
                     )}
                  </div>
                </button>
             ))}

             {filteredBranches.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-white/40 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                   <Search className="h-12 w-12 mb-3 opacity-20" />
                   <p className="font-medium">Tidak ada cabang yang ditemukan.</p>
                   {searchQuery && (
                     <button 
                       onClick={() => setSearchQuery("")}
                       className="mt-4 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
                     >
                       Tampilkan semua cabang
                     </button>
                   )}
                </div>
             )}
          </div>

          <div className="pt-8 flex justify-center">
             <button
               onClick={handleLogout}
               className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-bold transition-colors bg-white/5 px-6 py-2.5 rounded-full backdrop-blur-md border border-white/10"
             >
               <LogOut className="h-4 w-4" /> Keluar & Ganti Akun
             </button>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-6 w-full text-center z-10">
         <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">ERP System Version 2026.1</p>
      </div>
      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}}/>
    </div>
  );
}
