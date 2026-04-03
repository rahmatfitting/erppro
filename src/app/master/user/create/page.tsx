"use client";

import { useState, useEffect } from "react";
import { Save, ArrowLeft, Loader2, User, KeyRound, Mail, Phone, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UserCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingGrup, setFetchingGrup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grups, setGrups] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    grup_id: "",
    username: "",
    password: "",
    nama: "",
    email: "",
    no_hp: "",
  });

  useEffect(() => {
    const fetchGrups = async () => {
      try {
        const res = await fetch('/api/master/role');
        const json = await res.json();
        if (json.success) setGrups(json.data);
      } catch (err) {
        console.error("Gagal load grup", err);
      } finally {
        setFetchingGrup(false);
      }
    };
    fetchGrups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Minimal length password
    if (formData.password.length < 5) {
       setError("Password minimal 5 karakter");
       setLoading(false);
       return;
    }

    try {
      const res = await fetch("/api/master/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      router.push(`/master/user/${data.data.id}`);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <Link href="/master/user" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
               <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
               <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                 <User className="h-6 w-6 text-indigo-600" /> Tambah Pengguna
               </h1>
               <p className="text-sm text-slate-500 mt-1">Buat kredensial akun pengguna baru dalam sistem.</p>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Kiri - Data Akun */}
             <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Informasi Akun</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Grup Hak Akses <span className="text-red-500">*</span></label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <ShieldCheck className="h-4 w-4 text-slate-400" />
                     </div>
                     <select 
                       value={formData.grup_id}
                       onChange={e => setFormData({ ...formData, grup_id: e.target.value })}
                       className="w-full pl-10 text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none bg-white"
                       required
                       disabled={fetchingGrup}
                     >
                        <option value="" disabled>{fetchingGrup ? "Memuat..." : "Pilih Grup..."}</option>
                        {grups.map(g => (
                          <option key={g.nomor} value={g.nomor}>{g.nama} ({g.kode})</option>
                        ))}
                     </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username Login <span className="text-red-500">*</span></label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <User className="h-4 w-4 text-slate-400" />
                     </div>
                     <input 
                       type="text" 
                       value={formData.username}
                       onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })}
                       className="w-full pl-10 text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                       placeholder="johndoe" 
                       required 
                     />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Hanya huruf kecil, angka, dot, dan underscore.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <KeyRound className="h-4 w-4 text-slate-400" />
                     </div>
                     <input 
                       type="password" 
                       value={formData.password}
                       onChange={e => setFormData({ ...formData, password: e.target.value })}
                       className="w-full pl-10 text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                       placeholder="Minimal 5 karakter" 
                       required 
                     />
                  </div>
                </div>
             </div>

             {/* Kanan - Profil Pribadi */}
             <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Profil Pribadi</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={formData.nama}
                    onChange={e => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="John Doe" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Email</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Mail className="h-4 w-4 text-slate-400" />
                     </div>
                     <input 
                       type="email" 
                       value={formData.email}
                       onChange={e => setFormData({ ...formData, email: e.target.value })}
                       className="w-full pl-10 text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                       placeholder="john@example.com" 
                     />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Handphone / WhatsApp</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Phone className="h-4 w-4 text-slate-400" />
                     </div>
                     <input 
                       type="tel" 
                       value={formData.no_hp}
                       onChange={e => setFormData({ ...formData, no_hp: e.target.value })}
                       className="w-full pl-10 text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                       placeholder="081234..." 
                     />
                  </div>
                </div>
             </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
             <button
                type="submit"
                disabled={loading || !formData.grup_id || !formData.username || !formData.password || !formData.nama}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
             >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {loading ? "Menyimpan..." : "Simpan Pengguna"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
