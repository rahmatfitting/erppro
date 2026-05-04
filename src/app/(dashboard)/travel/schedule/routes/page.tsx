"use client";

import { useState, useEffect } from "react";
import { 
  Globe, 
  Plus, 
  Search, 
  MapPin, 
  MoreVertical, 
  Trash2,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TravelRoutes() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [formData, setFormData] = useState({
    origin: "",
    destination: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const res = await fetch("/api/travel/schedule/route");
      const data = await res.json();
      if (data.success) {
        setRoutes(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch routes");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (route: any = null) => {
    if (route) {
      setEditingRoute(route);
      setFormData({
        origin: route.origin,
        destination: route.destination
      });
    } else {
      setEditingRoute(null);
      setFormData({
        origin: "",
        destination: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingRoute 
        ? `/api/travel/schedule/route/${editingRoute.nomor}` 
        : "/api/travel/schedule/route";
      const method = editingRoute ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchRoutes();
      } else {
        alert(data.error || "Gagal menyimpan rute");
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (nomor: number) => {
    if (!confirm("Hapus rute ini?")) return;
    try {
      const res = await fetch(`/api/travel/schedule/route/${nomor}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchRoutes();
      }
    } catch (err) {
      alert("Gagal menghapus rute");
    }
  };

  const filteredRoutes = routes.filter(r => 
    r.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase italic">Master <span className="text-indigo-600">Rute Perjalanan</span></h1>
          <p className="text-sm text-slate-500">Kelola rute asal dan tujuan armada travel.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-sm uppercase"
        >
          <Plus className="h-4 w-4" /> Tambah Rute
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari rute asal atau tujuan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))
        ) : filteredRoutes.length === 0 ? (
           <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Globe className="h-12 w-12 mx-auto text-slate-200 mb-4" />
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest">Belum ada rute</h3>
              <p className="text-sm text-slate-500 mt-2">Mulai dengan menambahkan rute perjalanan baru.</p>
           </div>
        ) : filteredRoutes.map((route) => (
          <div key={route.nomor} className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                <span>{route.origin}</span>
                <ArrowRight className="h-4 w-4 text-indigo-500" />
                <span>{route.destination}</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route ID: #{route.nomor}</span>
               <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(route)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(route.nomor)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
              {editingRoute ? "Edit" : "Tambah"} <span className="text-indigo-600">Rute</span>
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Kota Asal</label>
                <input 
                  required
                  type="text" 
                  placeholder="Contoh: Surabaya"
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  value={formData.origin}
                  onChange={(e) => setFormData({...formData, origin: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Kota Tujuan</label>
                <input 
                  required
                  type="text" 
                  placeholder="Contoh: Malang"
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
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
                  {submitting ? "Menyimpan..." : "Simpan Rute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
