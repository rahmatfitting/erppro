"use client";

import { useState, useEffect } from "react";
import { Search, X, Layers, Check } from "lucide-react";

interface Kategori {
  nomor: number;
  kode: string;
  nama: string;
}

interface BrowseKategoriModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (kategori: Kategori) => void;
}

export default function BrowseKategoriModal({ isOpen, onClose, onSelect }: BrowseKategoriModalProps) {
  const [data, setData] = useState<Kategori[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, keyword]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/kategori?keyword=${keyword}&limit=10`);
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Pilih Kategori Barang</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Cari kode atau nama kategori..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
            {loading && data.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Memuat data...</div>
            ) : data.length > 0 ? (
              data.map((item) => (
                <button
                  key={item.nomor}
                  onClick={() => onSelect(item)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all text-left group"
                >
                  <div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.kode}</div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{item.nama}</div>
                  </div>
                  <Check className="h-4 w-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium italic">Tidak ada kategori ditemukan.</div>
            )}
          </div>
        </div>
        
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Tutup</button>
        </div>
      </div>
    </div>
  );
}
