"use client";

import { useState, useEffect } from "react";
import { User, MapPin, Building, Plus, Trash2, Loader2, ShieldCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserAksesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [cabangs, setCabangs] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [userAkses, setUserAkses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedCabang, setSelectedCabang] = useState<string>("");
  const [searchUser, setSearchUser] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          fetch("/api/master/user"),
          fetch("/api/master/cabang")
        ]);
        const [uJson, cJson] = await Promise.all([uRes.json(), cRes.json()]);
        if (uJson.success) setUsers(uJson.data);
        if (cJson.success) setCabangs(cJson.data);
      } catch (err) {
        console.error("Gagal memuat data pendukung");
      }
    };
    init();
  }, []);

  const fetchUserAkses = async (userId: string) => {
    if (!userId) {
      setUserAkses([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/setting/user-akses?nomormhuser=${userId}`);
      const json = await res.json();
      if (json.success) setUserAkses(json.data);
      else console.error("API Error:", json.error);
    } catch (err) {
      console.error("Gagal memuat akses user:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAkses(selectedUser);
  }, [selectedUser]);

  const handleAddAkses = async () => {
    if (!selectedUser || !selectedCabang) return;
    setAdding(true);
    try {
      const res = await fetch("/api/setting/user-akses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomormhuser: selectedUser, nomormhcabang: selectedCabang })
      });
      const json = await res.json();
      if (json.success) {
        fetchUserAkses(selectedUser);
        setSelectedCabang("");
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAkses = async (nomor: number) => {
    if (!confirm("Hapus akses ini?")) return;
    try {
      await fetch(`/api/setting/user-akses?nomor=${nomor}`, { method: "DELETE" });
      fetchUserAkses(selectedUser);
    } catch (err) {
      alert("Gagal menghapus akses");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-indigo-600" />
          Pengaturan Akses Cabang
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Tentukan cabang mana saja yang dapat diakses oleh setiap pengguna.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Selection Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-full flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Pilih Pengguna</label>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari user..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[600px]">
              {users.filter(u => 
                u.nama.toLowerCase().includes(searchUser.toLowerCase()) || 
                u.username.toLowerCase().includes(searchUser.toLowerCase())
              ).map(u => (
                <button
                  key={u.nomor}
                  onClick={() => setSelectedUser(u.nomor.toString())}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center gap-3 border border-transparent",
                    selectedUser === u.nomor.toString() 
                      ? "bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10" 
                      : "hover:bg-slate-50 text-slate-700 font-medium"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    selectedUser === u.nomor.toString() ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                  )}>
                    {u.nama.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-bold truncate">{u.nama}</div>
                    <div className="text-[10px] opacity-70 truncate lowercase">@{u.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Access Management Area */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedUser ? (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-20 text-center flex flex-col items-center">
              <User className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium italic">Pilih pengguna di panel kiri untuk mengatur akses.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Add Access Tool */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                   <Plus className="h-4 w-4 text-indigo-600" /> Tambah Akses Cabang
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedCabang}
                    onChange={(e) => setSelectedCabang(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50/50"
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {cabangs.filter(c => !userAkses.some(a => a.nomormhcabang === c.nomor)).map(c => (
                      <option key={c.nomor} value={c.nomor}>
                        {c.perusahaan_nama} - {c.nama} ({c.kode})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddAkses}
                    disabled={adding || !selectedCabang}
                    className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                  >
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tambahkan"}
                  </button>
                </div>
              </div>

              {/* Current Access List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                   <h3 className="font-bold text-slate-800 text-sm">Akses Terdaftar</h3>
                </div>
                <div className="divide-y divide-slate-100 min-h-[200px]">
                  {loading ? (
                    <div className="p-10 text-center flex flex-col items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
                      <p className="text-slate-500 text-sm">Memuat daftar akses...</p>
                    </div>
                  ) : userAkses.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 italic font-medium">
                       Belum ada akses cabang yang diberikan.
                    </div>
                  ) : (
                    userAkses.map(akses => (
                      <div key={akses.nomor} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                           <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center border border-rose-100">
                             <MapPin className="h-5 w-5 text-rose-500" />
                           </div>
                           <div>
                             <div className="font-bold text-slate-900 text-sm uppercase">{akses.cabang_nama}</div>
                             <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-medium uppercase mt-0.5 tracking-tight">
                                <Building className="h-3 w-3" /> {akses.perusahaan_nama}
                             </div>
                           </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAkses(akses.nomor)}
                          className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"
                          title="Hapus Akses"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
