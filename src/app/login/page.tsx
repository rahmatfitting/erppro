"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User, KeyRound, Building2 } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2629&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6 drop-shadow-lg">
           <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center rotate-3 shadow-xl">
              <Building2 className="h-8 w-8 text-indigo-600 -rotate-3" />
           </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
          Portal ERP System
        </h2>
        <p className="mt-2 text-center text-sm text-indigo-100">
          Masuk ke akun Anda untuk melanjutkan
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl py-10 px-6 sm:px-10 shadow-2xl rounded-2xl border border-white/20">
          
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50/80 backdrop-blur-md border-l-4 border-red-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Lock className="h-5 w-5 text-red-500" aria-hidden="true" />
                  </div>
                  <div className="ml-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Username
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm bg-slate-50/50 transition-all font-medium text-slate-900"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm bg-slate-50/50 transition-all font-medium text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer">
                  Ingat Saya
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                  Lupa password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Sedang Memproses...
                  </span>
                ) : (
                  "Masuk ke Sistem"
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
             <p className="text-center text-xs text-slate-500 font-medium">
               Gunakan <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">admin</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">admin</code> untuk login default.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
