"use client";

import { useState, useEffect } from "react";
import { 
  Truck, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  Gauge, 
  History,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FleetMaintenance() {
  const [fleetStatus, setFleetStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/travel/maintenance");
      const data = await res.json();
      if (data.success) {
        setFleetStatus(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch maintenance status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase italic">Monitoring <span className="text-indigo-600">Servis & Pemeliharaan</span></h1>
          <p className="text-sm text-slate-500">Pantau kesehatan armada dan jadwal servis rutin otomatis.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-sm uppercase">
          <History className="h-4 w-4" /> Riwayat Servis
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
               <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Armada Sehat</p>
               <p className="text-2xl font-black text-slate-900 dark:text-white">8 <span className="text-sm font-bold text-slate-500">Unit</span></p>
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600">
               <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Segera Servis</p>
               <p className="text-2xl font-black text-slate-900 dark:text-white">2 <span className="text-sm font-bold text-slate-500">Unit</span></p>
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600">
               <AlertCircle className="h-6 w-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Overdue (Telat)</p>
               <p className="text-2xl font-black text-slate-900 dark:text-white">0 <span className="text-sm font-bold text-slate-500">Unit</span></p>
            </div>
         </div>
      </div>

      {/* Fleet Maintenance List */}
      <div className="space-y-4">
         <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-2">Detail Status Armada</h2>
         <div className="grid grid-cols-1 gap-4">
            {loading ? (
               Array(3).fill(0).map((_, i) => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-[2rem] animate-pulse" />)
            ) : fleetStatus.length === 0 ? (
               <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                  <Wrench className="h-10 w-10 mx-auto text-slate-200 mb-2" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Belum ada data armada untuk dimonitor</p>
               </div>
            ) : fleetStatus.map((vehicle) => (
               <div key={vehicle.nomor} className="group bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col md:flex-row items-center gap-8">
                  <div className="flex items-center gap-6 flex-1 w-full">
                     <div className={cn(
                        "h-16 w-16 rounded-[1.5rem] flex items-center justify-center shrink-0",
                        vehicle.maintenanceStatus === 'OVERDUE' ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30" :
                        vehicle.maintenanceStatus === 'WARNING' ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30" :
                        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                     )}>
                        <Truck className="h-8 w-8" />
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{vehicle.name}</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{vehicle.plateNumber}</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-12 w-full md:w-auto">
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                           <Gauge className="h-3 w-3" /> Odometer
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">{vehicle.currentKm.toLocaleString()} KM</span>
                     </div>

                     <div className="flex flex-col gap-1 min-w-[120px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                           <History className="h-3 w-3" /> Status Servis
                        </span>
                        <div className="flex flex-col">
                           <span className={cn(
                              "text-xs font-black uppercase tracking-tighter",
                              vehicle.maintenanceStatus === 'OVERDUE' ? "text-rose-600" :
                              vehicle.maintenanceStatus === 'WARNING' ? "text-amber-600" :
                              "text-emerald-600"
                           )}>
                              {vehicle.maintenanceStatus}
                           </span>
                           {vehicle.issues && vehicle.issues.length > 0 && (
                             <span className="text-[9px] text-slate-500 font-medium truncate max-w-[150px]">
                                {vehicle.issues[0]}
                             </span>
                           )}
                        </div>
                     </div>

                     <button className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100">
                        <Wrench className="h-5 w-5" />
                     </button>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
