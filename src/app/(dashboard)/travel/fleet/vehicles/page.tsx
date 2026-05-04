"use client";

import { useState, useEffect } from "react";
import { 
  Truck, 
  Plus, 
  Search, 
  MoreVertical, 
  Settings2, 
  Trash2, 
  AlertCircle,
  Layout,
  Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FleetVehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    plateNumber: "",
    capacity: 7,
    status: "ACTIVE"
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/travel/fleet/vehicle");
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (vehicle: any = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        name: vehicle.name,
        plateNumber: vehicle.plateNumber,
        capacity: vehicle.capacity,
        status: vehicle.status
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        name: "",
        plateNumber: "",
        capacity: 7,
        status: "ACTIVE"
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingVehicle 
        ? `/api/travel/fleet/vehicle/${editingVehicle.nomor}` 
        : "/api/travel/fleet/vehicle";
      const method = editingVehicle ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchVehicles();
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
    if (!confirm("Hapus armada ini?")) return;
    try {
      const res = await fetch(`/api/travel/fleet/vehicle/${nomor}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchVehicles();
      }
    } catch (err) {
      alert("Gagal menghapus armada");
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase italic">Armada <span className="text-indigo-600">Kendaraan</span></h1>
          <p className="text-sm text-slate-500">Kelola unit kendaraan travel dan layout kursi.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-sm uppercase"
        >
          <Plus className="h-4 w-4" /> Tambah Armada
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari armada atau plat nomor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          />
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))
        ) : filteredVehicles.length === 0 ? (
           <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Truck className="h-12 w-12 mx-auto text-slate-200 mb-4" />
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest">Belum ada armada</h3>
              <p className="text-sm text-slate-500 mt-2">Mulai dengan menambahkan unit kendaraan baru.</p>
           </div>
        ) : filteredVehicles.map((vehicle) => (
          <div key={vehicle.nomor} className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Truck className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border",
                  vehicle.status === 'ACTIVE' 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900"
                    : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900"
                )}>
                  {vehicle.status}
                </span>
                <button 
                  onClick={() => handleOpenModal(vehicle)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{vehicle.name}</h3>
              <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">{vehicle.plateNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Layout className="h-3 w-3" /> Kapasitas
                </span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{vehicle.capacity} Seats</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Odometer
                </span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{(vehicle.currentKm || 0).toLocaleString()} KM</span>
              </div>
            </div>
            
            <div className="mt-6 flex gap-2">
               <button 
                onClick={() => handleOpenModal(vehicle)}
                className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
               >
                  Edit Data
               </button>
               <button 
                onClick={() => handleDelete(vehicle.nomor)}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 transition-all"
               >
                  <Trash2 className="h-4 w-4" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
              {editingVehicle ? "Edit" : "Tambah"} <span className="text-indigo-600">Armada</span>
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nama Armada</label>
                <input 
                  required
                  type="text" 
                  placeholder="Contoh: Avanza Luxury"
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Plat Nomor</label>
                <input 
                  required
                  type="text" 
                  placeholder="L 1234 AB"
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({...formData, plateNumber: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Kapasitas Kursi</label>
                  <input 
                    required
                    type="number" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    value={formData.capacity || ""}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value === "" ? 0 : parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Status</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="MAINTENANCE">Servis</option>
                    <option value="INACTIVE">Non-Aktif</option>
                  </select>
                </div>
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
                  {submitting ? "Menyimpan..." : "Simpan Armada"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
