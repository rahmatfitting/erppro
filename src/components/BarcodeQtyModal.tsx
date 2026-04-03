import { useState } from "react";
import { X, QrCode, Hash } from "lucide-react";

interface BarcodeQtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (qty: number) => void;
  itemName: string;
}

export const BarcodeQtyModal: React.FC<BarcodeQtyModalProps> = ({ isOpen, onClose, onConfirm, itemName }) => {
  const [qty, setQty] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty > 0) {
      onConfirm(qty);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <QrCode className="h-5 w-5 text-indigo-600" />
            Cetak Barcode
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{itemName}</p>
            <p className="text-xs text-slate-500 mt-1">Masukkan jumlah label yang ingin dicetak</p>
          </div>

          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="number" 
              min="1" 
              max="100"
              autoFocus
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-center text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
          >
            Lanjutkan Cetak
          </button>
        </form>
      </div>
    </div>
  );
};
