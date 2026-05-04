"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Printer, 
  Download, 
  Calendar as CalendarIcon,
  Truck,
  User as UserIcon,
  Phone,
  Ticket,
  MapPin,
  ChevronRight,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import BrowseTravelRouteModal from "@/components/travel/BrowseTravelRouteModal";

export default function PassengerManifest() {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [manifest, setManifest] = useState<any[]>([]);
  
  // Selection
  const [isRouteBrowseOpen, setIsRouteBrowseOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);

  useEffect(() => {
    if (selectedRoute) fetchSchedules();
  }, [date, selectedRoute]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/travel/schedule/timetable?date=${date}&origin=${selectedRoute.origin}&destination=${selectedRoute.destination}`);
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

  const fetchManifest = async (scheduleId: number) => {
    setLoading(true);
    try {
      // Assuming we have an endpoint for manifest
      const res = await fetch(`/api/travel/booking/manifest?scheduleId=${scheduleId}`);
      const data = await res.json();
      if (data.success) {
        setManifest(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch manifest");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSchedule = (s: any) => {
    setSelectedSchedule(s);
    fetchManifest(s.nomor);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase italic">Manifest <span className="text-indigo-600">Penumpang</span></h1>
          <p className="text-sm text-slate-500">Daftar penumpang per keberangkatan armada.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all font-bold text-xs uppercase">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-xs uppercase">
            <Printer className="h-4 w-4" /> Cetak Manifest
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pilih Tanggal</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="date" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pilih Rute</label>
              <button 
                onClick={() => setIsRouteBrowseOpen(true)}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-left flex justify-between items-center group"
              >
                <span className={cn("truncate", selectedRoute ? "text-slate-900 dark:text-white" : "text-slate-400")}>
                  {selectedRoute ? `${selectedRoute.origin} → ${selectedRoute.destination}` : "Cari rute..."}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Jadwal Tersedia</h3>
             {loading && !selectedSchedule && Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
             {!loading && schedules.length === 0 && selectedRoute && (
               <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Clock className="h-8 w-8 mx-auto text-slate-200 mb-2" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tidak ada jadwal</p>
               </div>
             )}
             {schedules.map(s => (
               <button 
                 key={s.nomor}
                 onClick={() => handleSelectSchedule(s)}
                 className={cn(
                   "w-full p-4 rounded-2xl border-2 text-left transition-all",
                   selectedSchedule?.nomor === s.nomor 
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                    : "bg-white border-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white hover:border-indigo-100"
                 )}
               >
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-black">{format(new Date(s.departure), "HH:mm")}</span>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{s.vehicle.name}</span>
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-bold opacity-70">
                    <Users className="h-3 w-3" /> {s._count.bookings} Penumpang
                 </div>
               </button>
             ))}
          </div>
        </div>

        {/* Manifest Table */}
        <div className="lg:col-span-3">
          {selectedSchedule ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/50">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                       <span className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedSchedule.route.origin} → {selectedSchedule.route.destination}</span>
                       <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase">{format(new Date(selectedSchedule.departure), "HH:mm")}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-4">
                       <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {selectedSchedule.vehicle.name} ({selectedSchedule.vehicle.plateNumber})</span>
                       <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {selectedSchedule.driver.name}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Kursi</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{selectedSchedule.vehicle.capacity}</p>
                     </div>
                     <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terisi</p>
                        <p className="text-xl font-black text-indigo-600">{manifest.length}</p>
                     </div>
                     <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kosong</p>
                        <p className="text-xl font-black text-rose-500">{selectedSchedule.vehicle.capacity - manifest.length}</p>
                     </div>
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Kursi</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Penumpang</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {loading && Array(5).fill(0).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={4} className="p-8"><div className="h-4 bg-slate-50 dark:bg-slate-800 rounded w-full"></div></td></tr>)}
                      {!loading && manifest.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Belum ada penumpang terdaftar</td>
                        </tr>
                      )}
                      {manifest.map((m) => (
                        <tr key={m.nomor} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-8 py-5">
                             <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-900 dark:text-white">
                                {m.seatNumber}
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             <div>
                                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">{m.customerName}</p>
                                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                   <Phone className="h-2.5 w-2.5 text-indigo-500" /> {m.customerPhone}
                                </p>
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             <span className={cn(
                               "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                               m.status === 'PAID' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                             )}>
                               {m.status}
                             </span>
                          </td>
                          <td className="px-8 py-5">
                             <button className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-all">
                                <ChevronRight className="h-4 w-4" />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
               <Users className="h-16 w-16 text-slate-200 mb-4" />
               <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xl">Pilih Jadwal Keberangkatan</h3>
               <p className="text-slate-500 text-sm mt-2 font-medium text-center max-w-sm">Gunakan panel kiri untuk memilih rute dan jam untuk melihat manifest penumpang.</p>
            </div>
          )}
        </div>
      </div>

      <BrowseTravelRouteModal 
        isOpen={isRouteBrowseOpen}
        onClose={() => setIsRouteBrowseOpen(false)}
        onSelect={(r) => {
          setSelectedRoute(r);
          setIsRouteBrowseOpen(false);
          setSelectedSchedule(null);
          setManifest([]);
        }}
      />
    </div>
  );
}
