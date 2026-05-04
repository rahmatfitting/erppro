"use client";

import { useState, useEffect } from "react";
import { Search, Truck, X, Layout } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (vehicle: any) => void;
}

export default function BrowseTravelVehicleModal({ isOpen, onClose, onSelect }: Props) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) fetchVehicles();
  }, [isOpen]);

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/travel/fleet/vehicle");
      const data = await res.json();
      if (data.success) {
        // Filter only active vehicles
        setVehicles(data.data.filter((v: any) => v.status === 'ACTIVE'));
      }
    } catch (err) {} finally {
      setLoading(false);
    }
  };

  const filtered = vehicles.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.plateNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Pilih <span className="text-indigo-600">Armada</span></h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"><X className="h-5 w-5" /></button>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              autoFocus
              type="text" 
              placeholder="Cari armada..."
              className="w-full bg-white dark:bg-slate-900 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading fleet...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Armada aktif tidak ditemukan</div>
          ) : filtered.map(v => (
            <button 
              key={v.nomor}
              onClick={() => onSelect(v)}
              className="w-full p-4 flex items-center gap-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all group text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">{v.name}</p>
                  <span className="text-[10px] font-black text-indigo-500 uppercase">{v.plateNumber}</span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium flex items-center gap-1 mt-0.5">
                  <Layout className="h-2.5 w-2.5" /> {v.capacity} Seats
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
