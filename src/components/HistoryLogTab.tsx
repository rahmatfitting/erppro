"use client";

import { useState, useEffect } from "react";
import { Clock, User, Loader2 } from "lucide-react";

type HistoryItem = {
  nomor: number;
  menu: string;
  nomor_transaksi: number;
  aksi: string;
  user: string;
  waktu: string;
  keterangan: string;
};

type Props = {
  menu: string;
  nomor_transaksi: number | string;
};

export function HistoryLogTab({ menu, nomor_transaksi }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (nomor_transaksi) {
      fetchHistory();
    }
  }, [menu, nomor_transaksi]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?menu=${menu}&nomor_transaksi=${nomor_transaksi}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (aksi: string) => {
    switch (aksi) {
      case "CREATE": return "bg-green-100 text-green-700";
      case "EDIT": return "bg-blue-100 text-blue-700";
      case "DELETE": return "bg-red-100 text-red-700";
      case "APPROVE": return "bg-indigo-100 text-indigo-700";
      case "DISAPPROVE": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6 pt-4">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
           <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
           <span>Memuat history log...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-500 italic">
           Belum ada data history untuk transaksi ini.
        </div>
      ) : (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent dark:before:via-slate-800">
          {items.map((item) => (
            <div key={item.nomor} className="relative flex items-start gap-6 pl-12 group">
              {/* Dot icon indicator */}
              <div className="absolute left-0 mt-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-white ring-8 ring-white dark:bg-slate-900 dark:ring-slate-950 shadow-sm border border-slate-200 dark:border-slate-800 transition-all group-hover:scale-110 group-hover:shadow-md">
                <Clock className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              
              <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionColor(item.aksi)}`}>
                      {item.aksi}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <User className="h-3 w-3" />
                      {item.user}
                    </div>
                  </div>
                  <time className="text-xs text-slate-400 font-mono">
                    {new Date(item.waktu).toLocaleString('id-ID', { 
                      dateStyle: 'medium', 
                      timeStyle: 'short' 
                    })}
                  </time>
                </div>
                
                {item.keterangan && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed italic border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                    {item.keterangan}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
