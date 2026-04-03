"use client";

import { useState, useEffect } from "react";
import { X, Calendar, FileText, Download, TableProperties, Eye, Search, Building2, Layers } from "lucide-react";

interface LabaRugiFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilter: (data: any) => void;
}

export default function LabaRugiFilterModal({ isOpen, onClose, onFilter }: LabaRugiFilterModalProps) {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [comparison, setComparison] = useState<'branch' | 'period'>('branch');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
    }
  }, [isOpen]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/master/cabang');
      const result = await res.json();
      if (result.success) {
        setBranches(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch branches", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBranch = (id: number) => {
    setSelectedBranches(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleFilterSubmit = (exportType: 'view' | 'pdf' | 'excel' | 'pivot') => {
    onFilter({
      startDate,
      endDate,
      comparison,
      nomormhcabang: selectedBranches.join(','),
      exportType
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden scale-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            Filter Laporan Laba Rugi
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Comparison Mode */}
          <div className="space-y-3">
             <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Mode Perbandingan</label>
             <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
                <button 
                    onClick={() => setComparison('branch')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${comparison === 'branch' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Per Cabang
                </button>
                <button 
                    onClick={() => setComparison('period')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${comparison === 'period' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Per Periode (Bulan)
                </button>
             </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Cabang Multi-Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Pilih Cabang (Multi-select)
            </label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 max-h-40 overflow-y-auto">
              {branches.map(cabang => (
                <button
                  key={cabang.nomor}
                  onClick={() => toggleBranch(cabang.nomor)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${selectedBranches.includes(cabang.nomor) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800'}`}
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${selectedBranches.includes(cabang.nomor) ? 'border-white bg-white/20' : 'border-slate-300'}`}>
                    {selectedBranches.includes(cabang.nomor) && <div className="h-2 w-2 bg-white rounded-full" />}
                  </div>
                  {cabang.nama}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-medium italic">Kosongi untuk memilih semua cabang</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
             <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleFilterSubmit('view')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                  <Eye className="h-4 w-4" />
                  View Report
                </button>
                <button
                  onClick={() => handleFilterSubmit('pdf')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-95"
                >
                  <FileText className="h-4 w-4" />
                  Print PDF
                </button>
                <button
                  onClick={() => handleFilterSubmit('excel')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  Excel
                </button>
                <button
                  onClick={() => handleFilterSubmit('pivot')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-200 dark:shadow-none transition-all active:scale-95"
                >
                  <TableProperties className="h-4 w-4" />
                  Excel Pivot
                </button>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
