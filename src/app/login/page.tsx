"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User, KeyRound, Building2, ArrowRight } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.hasMultiBranch) {
           router.push("/login/select");
        } else if (data.singleBranch) {
           // Auto select if only one branch
           await fetch("/api/auth/select", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ branchId: data.singleBranch.nomor })
           });
           window.location.href = "/";
        } else {
           // No branches assigned
           window.location.href = "/";
        }
      } else {
        setError(data.error || "Gagal masuk. Periksa kembali username dan password Anda.");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-y-auto bg-slate-900">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px] animate-pulse delay-700"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2629&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
      </div>

      <div className="w-full max-w-[440px] relative z-10 animate-in fade-in zoom-in duration-700">
        {/* Logo / Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl mb-6 relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <Building2 className="h-10 w-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl">
            ERP<span className="text-indigo-400">PRO</span>
          </h1>
          <p className="mt-3 text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px]">
             Secure Enterprise Access
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden group">
          {/* Subtle inner glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 pl-1">
                Identity Profile
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-400 text-slate-500">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                  placeholder="Username"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 pl-1">
                Access Token
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-400 text-slate-500">
                  <KeyRound className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                  placeholder="Password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <Lock className="h-5 w-5 text-rose-500 shrink-0" />
                <p className="text-xs font-bold text-rose-200 leading-tight">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden py-4 px-6 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(79,70,229,0.3)]"
              >
                {loading ? (
                   <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Establish Session <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-2">
                <input id="rem" type="checkbox" className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/50" />
                <label htmlFor="rem" className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter cursor-pointer">Remember Access</label>
             </div>
             <a href="#" className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-tighter transition-colors">
                Recover Credentials?
             </a>
          </div>
        </div>
      </div>
    </div>
  );
}
