"use client";

import { useState, useEffect } from "react";
import { 
  Clock, 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Truck, 
  User, 
  MapPin,
  MoreVertical,
  Trash2,
  Ticket,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import BrowseTravelRouteModal from "@/components/travel/BrowseTravelRouteModal";
import BrowseTravelVehicleModal from "@/components/travel/BrowseTravelVehicleModal";
import BrowseTravelDriverModal from "@/components/travel/BrowseTravelDriverModal";

export default function TravelTimetables() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Browse Modals State
  const [isRouteBrowseOpen, setIsRouteBrowseOpen] = useState(false);
  const [isVehicleBrowseOpen, setIsVehicleBrowseOpen] = useState(false);
  const [isDriverBrowseOpen, setIsDriverBrowseOpen] = useState(false);

  // Selected Names for UI
  const [selectedNames, setSelectedNames] = useState({
    route: "",
    vehicle: "",
    driver: ""
  });

  const [formData, setFormData] = useState({
    routeId: "",
    vehicleId: "",
    driverId: "",
    departure: "",
    price: 0
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [date]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/travel/schedule/timetable?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch schedules");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoute = (route: any) => {
    setFormData({ ...formData, routeId: route.nomor.toString() });
    setSelectedNames({ ...selectedNames, route: `${route.origin} → ${route.destination}` });
    setIsRouteBrowseOpen(false);
  };

  const handleSelectVehicle = (vehicle: any) => {
    setFormData({ ...formData, vehicleId: vehicle.nomor.toString() });
    setSelectedNames({ ...selectedNames, vehicle: `${vehicle.name} (${vehicle.plateNumber})` });
    setIsVehicleBrowseOpen(false);
  };

  const handleSelectDriver = (driver: any) => {
    setFormData({ ...formData, driverId: driver.nomor.toString() });
    setSelectedNames({ ...selectedNames, driver: driver.name });
    setIsDriverBrowseOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.routeId || !formData.vehicleId || !formData.driverId) {
      alert("Harap pilih rute, armada, dan driver");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/travel/schedule/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          routeId: parseInt(formData.routeId),
          vehicleId: parseInt(formData.vehicleId),
          driverId: parseInt(formData.driverId),
          departure: new Date(`${date}T${formData.departure}`)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({ routeId: "", vehicleId: "", driverId: "", departure: "", price: 0 });
        setSelectedNames({ route: "", vehicle: "", driver: "" });
        fetchSchedules();
      } else {
        alert(data.error || "Gagal membuat jadwal");
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (nomor: number) => {
    if (!confirm("Hapus jadwal ini?")) return;
    try {
      const res = await fetch(`/api/travel/schedule/timetable/${nomor}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchSchedules();
      }
    } catch (err) {
      alert("Gagal menghapus jadwal");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase italic">Jadwal <span className="text-indigo-600">Keberangkatan</span></h1>
          <p className="text-sm text-slate-500">Atur jadwal operasional harian, armada, dan driver.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-sm uppercase"
        >
          <Plus className="h-4 w-4" /> Buat Jadwal
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none font-bold"
          />
        </div>
      </div>

      {/* Timetable List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />)
        ) : schedules.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
             <Clock className="h-10 w-10 mx-auto text-slate-200 mb-2" />
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Tidak ada jadwal untuk tanggal ini</p>
          </div>
        ) : schedules.map((s) => (
          <div key={s.nomor} className="group bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col md:flex-row items-center gap-8">
            <div className="flex items-center gap-6 flex-1 w-full">
               <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex flex-col items-center justify-center text-indigo-600">
                  <span className="text-lg font-black">{format(new Date(s.departure), "HH:mm")}</span>
               </div>
               <div className="flex-1">
                  <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white uppercase tracking-tight">
                     <span>{s.route.origin}</span>
                     <span className="text-indigo-400">→</span>
                     <span>{s.route.destination}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                     <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                        <Truck className="h-3 w-3" /> {s.vehicle.name}
                     </span>
                     <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                        <User className="h-3 w-3" /> {s.driver.name}
                     </span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 w-full md:w-auto">
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Harga</span>
                  <span className="text-xs font-black text-indigo-600">Rp {s.price.toLocaleString()}</span>
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kapasitas</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{s._count.bookings} / {s.vehicle.capacity} Seats</span>
               </div>
               <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleDelete(s.nomor)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-all">
                    <MoreVertical className="h-4 w-4" />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create Schedule */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
              Buat <span className="text-indigo-600">Jadwal Baru</span>
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pilih Rute</label>
                <button 
                  type="button"
                  onClick={() => setIsRouteBrowseOpen(true)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-left flex justify-between items-center group"
                >
                  <span className={selectedNames.route ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                    {selectedNames.route || "Klik untuk pilih rute..."}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Armada</label>
                  <button 
                    type="button"
                    onClick={() => setIsVehicleBrowseOpen(true)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-left flex justify-between items-center group"
                  >
                    <span className={cn("truncate", selectedNames.vehicle ? "text-slate-900 dark:text-white" : "text-slate-400")}>
                      {selectedNames.vehicle || "Pilih unit..."}
                    </span>
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Driver</label>
                  <button 
                    type="button"
                    onClick={() => setIsDriverBrowseOpen(true)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-left flex justify-between items-center group"
                  >
                    <span className={cn("truncate", selectedNames.driver ? "text-slate-900 dark:text-white" : "text-slate-400")}>
                      {selectedNames.driver || "Pilih driver..."}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Jam Berangkat</label>
                  <input 
                    required
                    type="time" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    value={formData.departure}
                    onChange={(e) => setFormData({...formData, departure: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Harga Tiket</label>
                  <input 
                    required
                    type="number" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                    value={formData.price || ""}
                    onChange={(e) => setFormData({...formData, price: e.target.value === "" ? 0 : parseInt(e.target.value)})}
                  />
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
                  {submitting ? "Memproses..." : "Konfirmasi Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Browse Modals */}
      <BrowseTravelRouteModal 
        isOpen={isRouteBrowseOpen} 
        onClose={() => setIsRouteBrowseOpen(false)} 
        onSelect={handleSelectRoute}
      />
      <BrowseTravelVehicleModal 
        isOpen={isVehicleBrowseOpen} 
        onClose={() => setIsVehicleBrowseOpen(false)} 
        onSelect={handleSelectVehicle}
      />
      <BrowseTravelDriverModal 
        isOpen={isDriverBrowseOpen} 
        onClose={() => setIsDriverBrowseOpen(false)} 
        onSelect={handleSelectDriver}
      />
    </div>
  );
}
