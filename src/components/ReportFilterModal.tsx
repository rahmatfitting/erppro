"use client";

import { useState } from "react";
import { X, Calendar, FileText, Download, TableProperties, Eye, Search } from "lucide-react";
import { BrowseSupplierModal } from "./BrowseSupplierModal";
import { BrowseCustomerModal } from "./BrowseCustomerModal";
import { BrowseBarangModal } from "./BrowseBarangModal";
import { BrowseGudangModal } from "./BrowseGudangModal";

interface ReportFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onFilter: (startDate: string, endDate: string, exportType: 'view' | 'pdf' | 'excel' | 'pivot', options?: any) => void;
  showSupplier?: boolean;
  showCustomer?: boolean;
  showBarang?: boolean;
  showGudang?: boolean;
  showOnlyEndDate?: boolean;
}

export default function ReportFilterModal({ 
  isOpen, onClose, title, onFilter, 
  showSupplier, showCustomer, showBarang, showGudang, showOnlyEndDate 
}: ReportFilterModalProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedBarang, setSelectedBarang] = useState<any>(null);
  const [selectedGudang, setSelectedGudang] = useState<any>(null);

  const [isBrowseSupplierOpen, setIsBrowseSupplierOpen] = useState(false);
  const [isBrowseCustomerOpen, setIsBrowseCustomerOpen] = useState(false);
  const [isBrowseBarangOpen, setIsBrowseBarangOpen] = useState(false);
  const [isBrowseGudangOpen, setIsBrowseGudangOpen] = useState(false);

  const handleFilterSubmit = (exportType: 'view' | 'pdf' | 'excel' | 'pivot') => {
    onFilter(startDate, endDate, exportType, {
      nomormhsupplier: selectedSupplier?.nomor,
      nomormhcustomer: selectedCustomer?.nomor,
      nomormhbarang: selectedBarang?.nomor,
      nomormhgudang: selectedGudang?.nomor,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden scale-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className={showOnlyEndDate ? "grid grid-cols-1" : "grid grid-cols-2 gap-4"}>
            {!showOnlyEndDate && (
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
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {showOnlyEndDate ? "Per Tanggal" : "Sampai Tanggal"}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {showSupplier && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Supplier
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedSupplier?.nama || ''}
                  readOnly
                  placeholder="Pilih Supplier"
                  className="flex-grow px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  onClick={() => setIsBrowseSupplierOpen(true)}
                  className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
                {selectedSupplier && (
                  <button
                    onClick={() => setSelectedSupplier(null)}
                    className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {showCustomer && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Customer
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedCustomer?.nama || ''}
                  readOnly
                  placeholder="Pilih Customer"
                  className="flex-grow px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  onClick={() => setIsBrowseCustomerOpen(true)}
                  className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
                {selectedCustomer && (
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {showBarang && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Barang
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedBarang?.nama || ''}
                  readOnly
                  placeholder="Pilih Barang"
                  className="flex-grow px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  onClick={() => setIsBrowseBarangOpen(true)}
                  className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
                {selectedBarang && (
                  <button
                    onClick={() => setSelectedBarang(null)}
                    className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {showGudang && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Gudang
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedGudang?.nama || ''}
                  readOnly
                  placeholder="Pilih Gudang"
                  className="flex-grow px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  onClick={() => setIsBrowseGudangOpen(true)}
                  className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
                {selectedGudang && (
                  <button
                    onClick={() => setSelectedGudang(null)}
                    className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
             <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Aksi</label>
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

      {/* Browse Modals */}
      <BrowseSupplierModal 
        isOpen={isBrowseSupplierOpen} 
        onClose={() => setIsBrowseSupplierOpen(false)} 
        onSelect={(s: any) => { setSelectedSupplier(s); setIsBrowseSupplierOpen(false); }} 
      />
      <BrowseCustomerModal 
        isOpen={isBrowseCustomerOpen} 
        onClose={() => setIsBrowseCustomerOpen(false)} 
        onSelect={(c: any) => { setSelectedCustomer(c); setIsBrowseCustomerOpen(false); }} 
      />
      <BrowseBarangModal 
        isOpen={isBrowseBarangOpen} 
        onClose={() => setIsBrowseBarangOpen(false)} 
        onSelect={(b: any) => { setSelectedBarang(b); setIsBrowseBarangOpen(false); }} 
      />
      <BrowseGudangModal 
        isOpen={isBrowseGudangOpen} 
        onClose={() => setIsBrowseGudangOpen(false)} 
        onSelect={(g: any) => { setSelectedGudang(g); setIsBrowseGudangOpen(false); }} 
      />
    </div>
  );
}
