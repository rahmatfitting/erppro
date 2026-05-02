"use client";

import { useState, useEffect } from "react";
import { Search, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrowseCabangModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cabang: any) => void;
}

export const BrowseCabangModal = ({ isOpen, onClose, onSelect }: BrowseCabangModalProps) => {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`/api/master/cabang?keyword=${search}&limit=50`)
        .then(res => res.json())
        .then(json => {
          if (json.success) setData(json.data);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Store className="h-5 w-5 text-indigo-600" /> Pilih Cabang / Outlet
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama cabang..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div></div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-slate-400">Tidak ada cabang ditemukan</div>
          ) : (
            data.map(cabang => (
              <button
                key={cabang.nomor}
                onClick={() => onSelect(cabang)}
                className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
              >
                <div className="font-bold text-slate-800 group-hover:text-indigo-700">{cabang.nama}</div>
                <div className="text-xs text-slate-500">{cabang.kode} • {cabang.alamat || 'No address'}</div>
              </button>
            ))
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}}/>
    </div>
  );
};
