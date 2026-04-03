import { useState, useEffect } from "react";
import { Search, X, Loader2, ClipboardList, Calendar } from "lucide-react";

type WorkOrder = {
  nomor: number;
  kode: string;
  tanggal: string;
  item_id: number;
  item_nama: string;
  qty: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (wo: WorkOrder) => void;
};

export function BrowseWorkOrderModal({ isOpen, onClose, onSelect }: Props) {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyword("");
      fetchWOs("");
    }
  }, [isOpen]);

  const fetchWOs = async (search: string) => {
    setLoading(true);
    try {
      // Hanya ambil Work Order yang statusnya Released
      const res = await fetch(`/api/ppic/workorder?keyword=${search}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.filter((w: any) => w.status === 'Released' || w.status === 'Draft'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWOs(keyword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300 border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            Pilih Work Order (SPK)
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 relative bg-white dark:bg-slate-900">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Cari kode WO atau nama produk..."
                autoFocus
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
              Cari
            </button>
          </form>
        </div>

        {/* Body / List */}
        <div className="flex-1 overflow-y-auto min-h-[300px] p-4 bg-slate-50/30 dark:bg-slate-950/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span>Memuat data WO...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <ClipboardList className="h-10 w-10 text-slate-300" />
              <span>Tidak ada Work Order aktif ditemukan</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {items.map(item => (
                <div 
                  key={item.nomor}
                  onClick={() => onSelect(item)}
                  className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all group"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded w-fit">{item.kode}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{item.item_nama}</span>
                    <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
                       <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.tanggal).toLocaleDateString()}
                       </div>
                       <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-600 dark:text-slate-300">QTY: {item.qty}</span>
                       </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                    Pilih WO
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
