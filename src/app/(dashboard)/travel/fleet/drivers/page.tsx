"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MoreVertical, 
  Trash2, 
  UserPlus,
  Calendar,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FleetDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/travel/fleet/driver");
      const data = await res.json();
      if (data.success) {
        setDrivers(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch drivers");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (driver: any = null) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        name: driver.name,
        phone: driver.phone
      });
    } else {
      setEditingDriver(null);
      setFormData({
        name: "",
        phone: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingDriver 
        ? `/api/travel/fleet/driver/${editingDriver.nomor}` 
        : "/api/travel/fleet/driver";
      const method = editingDriver ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchDrivers();
      } else {
        alert(data.error || "Gagal menyimpan data");
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (nomor: number) => {
    if (!confirm("Hapus driver ini?")) return;
    try {
      const res = await fetch(`/api/travel/fleet/driver/${nomor}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchDrivers();
      }
    } catch (err) {
      alert("Gagal menghapus driver");
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase italic">Manajemen <span className="text-indigo-600">Driver</span></h1>
          <p className="text-sm text-slate-500">Kelola database driver dan jadwal penugasan.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-sm uppercase"
        >
          <UserPlus className="h-4 w-4" /> Tambah Driver
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama driver atau nomor telepon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          />
        </div>
      </div>

      {/* Driver List (Table for better overview) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50 dark:border-slate-800">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Driver</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Kontak</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-6 py-8"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div></td>
                </tr>
              ))
            ) : filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center">
                   <Users className="h-10 w-10 mx-auto text-slate-200 mb-4" />
                   <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Belum ada data driver</p>
                </td>
              </tr>
            ) : filteredDrivers.map((driver) => (
              <tr key={driver.nomor} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs uppercase">
                      {driver.name.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{driver.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Driver ID: #{driver.nomor}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Phone className="h-3 w-3 text-indigo-500" />
                    {driver.phone}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                   <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest">Tersedia</span>
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(driver)}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-all"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(driver.nomor)}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
              {editingDriver ? "Edit" : "Tambah"} <span className="text-indigo-600">Driver</span>
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nama Driver</label>
                <input 
                  required
                  type="text" 
                  placeholder="Contoh: Ahmad Subarjo"
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nomor Telepon / WA</label>
                <input 
                  required
                  type="text" 
                  placeholder="08123456789"
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  disabled={submitting}
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
