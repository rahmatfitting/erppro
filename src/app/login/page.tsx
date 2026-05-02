"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User, KeyRound, Building2, ArrowRight, ShieldCheck } from "lucide-react";

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.hasMultiBranch) {
          router.push("/login/select");
        } else if (data.singleBranch) {
          await fetch("/api/auth/select", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branchId: data.singleBranch.nomor })
          });
          window.location.href = "/";
        } else {
          window.location.href = "/";
        }
      } else {
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

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
              Empower Your <span className="text-indigo-200">Business</span> Workflow.
           </h2>
           <p className="text-indigo-100 text-lg font-medium opacity-80 leading-relaxed">
              Managing enterprise resources has never been this seamless. Access your unified dashboard anywhere, anytime.
           </p>
        </div>

        {/* Footer info for desktop */}
        <div className="absolute bottom-8 left-0 right-0 text-center text-indigo-200/50 text-xs font-bold uppercase tracking-[0.3em]">
           &copy; 2026 ERP PRO &middot; Global Enterprise Solutions
        </div>
      </div>

      {/* Right Section: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        {/* Subtle background for mobile */}
        <div className="lg:hidden absolute inset-0 z-0">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-[420px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center lg:text-left mb-10">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
              Welcome Back<span className="text-indigo-600">.</span>
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
              Please enter your credentials to access the system.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all hover:shadow-2xl hover:shadow-indigo-500/5">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-widest mb-2.5 pl-1">
                  Username / Identity
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-widest mb-2.5 pl-1">
                  Access Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-shake">
                  <Lock className="h-5 w-5 text-rose-500 shrink-0" />
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-200 leading-tight">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden py-4.5 px-6 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white font-black uppercase tracking-widest text-xs transition-all hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-slate-900/10 dark:shadow-indigo-500/20 mt-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-2 py-0.5">
                    Sign In <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-2">
                  <input id="rem" type="checkbox" className="rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-indigo-600 focus:ring-indigo-600/20 w-4 h-4" />
                  <label htmlFor="rem" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter cursor-pointer">Stay Logged In</label>
               </div>
               <button className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 uppercase tracking-tighter transition-colors">
                  Need Help?
               </button>
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
    </div>
  );
}
