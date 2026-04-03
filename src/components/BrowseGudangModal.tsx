import { useState, useEffect } from "react";
import { Search, X, Loader2, Store, MapPin } from "lucide-react";

type Gudang = {
  nomor: number;
  kode: string;
  nama: string;
  lokasi: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gudang: Gudang) => void;
};

export function BrowseGudangModal({ isOpen, onClose, onSelect }: Props) {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<Gudang[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyword("");
      fetchGudang("");
    }
  }, [isOpen]);

  const fetchGudang = async (search: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/gudang?keyword=${search}&limit=50&filter_akses=1`);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGudang(keyword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[80vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">
            <Store className="h-5 w-5 text-indigo-600" />
            Pilih Gudang
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Cari kode atau nama gudang..."
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white font-bold transition-all"
              />
            </div>
            <button type="submit" className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 hover:opacity-90 text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest shadow-lg">
              Cari
            </button>
          </form>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 dark:bg-slate-950/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Memuat Gudang...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Store className="h-12 w-12 opacity-20" />
              <span className="text-[10px] font-black uppercase tracking-widest">Gudang tidak ditemukan</span>
            </div>
          ) : (
            <div className="grid gap-2">
              {items.map(item => (
                <div 
                  key={item.nomor}
                  onClick={() => onSelect(item)}
                  className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all group active:scale-[0.98]"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded w-fit uppercase tabular-nums">{item.kode}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase">{item.nama}</span>
                    {item.lokasi && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mt-1">
                        <MapPin className="h-3 w-3" />
                        {item.lokasi}
                      </div>
                    )}
                  </div>
                  <div className="h-8 w-8 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all">
                     <Search className="h-3 w-3 text-slate-300 group-hover:text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
