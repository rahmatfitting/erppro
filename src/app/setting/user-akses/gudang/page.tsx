"use client";

import { useState, useEffect } from "react";
import { Users, Store, Save, Loader2, Search, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingAksesGudang() {
  const [users, setUsers] = useState<any[]>([]);
  const [gudangs, setGudangs] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [userAkses, setUserAkses] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingAkses, setFetchingAkses] = useState(false);
  const [searchGudang, setSearchGudang] = useState("");
  const [searchUser, setSearchUser] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchGudangs();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserAkses(selectedUserId as number);
    } else {
      setUserAkses([]);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/master/user');
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (e) { console.error(e); }
  };

  const fetchGudangs = async () => {
    try {
      const res = await fetch('/api/master/gudang?limit=100');
      const json = await res.json();
      if (json.success) setGudangs(json.data);
    } catch (e) { console.error(e); }
  };

  const fetchUserAkses = async (userId: number) => {
    setFetchingAkses(true);
    try {
      const res = await fetch(`/api/setting/user-akses/gudang?userId=${userId}`);
      const json = await res.json();
      if (json.success) {
        setUserAkses(json.data.map((item: any) => item.nomormhgudang));
      }
    } catch (e) { console.error(e); }
    finally { setFetchingAkses(false); }
  };

  const toggleGudang = (gudangId: number) => {
    setUserAkses(prev => 
      prev.includes(gudangId) 
        ? prev.filter(id => id !== gudangId) 
        : [...prev, gudangId]
    );
  };

  const selectAll = () => {
    setUserAkses(gudangs.map(g => g.nomor));
  };

  const deselectAll = () => {
    setUserAkses([]);
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/setting/user-akses/gudang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, gudangIds: userAkses })
      });
      const json = await res.json();
      if (json.success) {
        alert("Akses gudang berhasil disimpan");
      } else {
        alert(json.error);
      }
    } catch (e) {
      alert("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const filteredGudangs = gudangs.filter(g => 
    g.nama.toLowerCase().includes(searchGudang.toLowerCase()) || 
    g.kode.toLowerCase().includes(searchGudang.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
          <ShieldCheck className="h-7 w-7 text-indigo-600" />
          Setting Akses Gudang User
        </h1>
        <p className="text-slate-500 dark:text-slate-400">Batasi akses gudang untuk tiap-tiap user.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Selection */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                <h2 className="font-bold text-slate-800 dark:text-white uppercase text-xs tracking-widest">Pilih User</h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari user..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                />
              </div>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
               <div className="space-y-1">
                 {users.filter(u => 
                   u.nama.toLowerCase().includes(searchUser.toLowerCase()) || 
                   u.username.toLowerCase().includes(searchUser.toLowerCase())
                 ).map(u => (
                   <button
                    key={u.nomor}
                    onClick={() => setSelectedUserId(u.nomor)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center gap-3 border border-transparent",
                      selectedUserId === u.nomor
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none font-bold" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                    )}
                   >
                     <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-[10px] uppercase shrink-0 font-black",
                        selectedUserId === u.nomor ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      )}>
                        {u.nama.substring(0, 2)}
                      </div>
                      <div className="truncate">
                        <div>{u.nama}</div>
                        <div className={cn("text-[8px] opacity-60 font-medium", selectedUserId === u.nomor ? "text-indigo-100" : "text-slate-400")}>@{u.username}</div>
                      </div>
                   </button>
                 ))}
               </div>
            </div>
          </div>

          {selectedUserId && (
             <div className="p-6 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200 dark:shadow-none animate-in zoom-in duration-300">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                        {users.find(u => u.nomor === selectedUserId)?.nama?.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest leading-none mb-1">Editing Akses Untuk</div>
                        <div className="text-lg font-black">{users.find(u => u.nomor === selectedUserId)?.nama}</div>
                    </div>
                </div>
                <div className="p-3 bg-white/10 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="text-indigo-200 font-medium">Gudang Terpilih</span>
                        <span>{userAkses.length} / {gudangs.length}</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                            className="bg-white h-full transition-all duration-500" 
                            style={{ width: `${(userAkses.length / gudangs.length) * 100}%` }}
                        />
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full mt-6 py-3 bg-white text-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    SIMPAN PERUBAHAN
                </button>
             </div>
          )}
        </div>

        {/* Warehouse Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-indigo-500" />
                <h2 className="font-bold text-slate-800 dark:text-white uppercase text-xs tracking-widest">Daftar Gudang</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors">Pilih Semua</button>
                <span className="text-slate-300">|</span>
                <button onClick={deselectAll} className="text-[10px] font-black uppercase text-red-600 hover:text-red-800 transition-colors">Hapus Semua</button>
              </div>
            </div>

            <div className="p-4 border-b border-slate-50 dark:border-slate-800">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari gudang..."
                    value={searchGudang}
                    onChange={(e) => setSearchGudang(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-indigo-500"
                  />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {!selectedUserId ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-4">
                  <Users className="h-16 w-16 stroke-[1]" />
                  <p className="font-bold uppercase tracking-widest text-[10px]">Silahkan pilih user terlebih dahulu</p>
                </div>
              ) : fetchingAkses ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                  <p className="font-bold uppercase tracking-widest text-[10px]">Mengambil akses user...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredGudangs.map(g => {
                    const isSelected = userAkses.includes(g.nomor);
                    return (
                      <div 
                        key={g.nomor}
                        onClick={() => toggleGudang(g.nomor)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] group",
                          isSelected 
                            ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800" 
                            : "bg-white border-slate-100 hover:border-indigo-200 dark:bg-slate-900 dark:border-slate-800"
                        )}
                      >
                         <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                              isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            )}>
                               <Store className="h-5 w-5" />
                            </div>
                            <div>
                               <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1 group-hover:text-indigo-400">{g.kode}</div>
                               <div className={cn("text-sm font-black uppercase tabular-nums", isSelected ? "text-indigo-900 dark:text-white" : "text-slate-700 dark:text-slate-300")}>{g.nama}</div>
                            </div>
                         </div>
                         {isSelected && <CheckCircle2 className="h-5 w-5 text-indigo-600 animate-in zoom-in duration-300" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #1e293b; }
      `}}/>
    </div>
  );
}
