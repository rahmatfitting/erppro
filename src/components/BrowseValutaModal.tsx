import { useState, useEffect } from "react";
import { Search, X, Loader2, Coins } from "lucide-react";

type Valuta = {
  nomor: number;
  kode: string;
  nama: string;
  kurs: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (valuta: Valuta) => void;
};

export function BrowseValutaModal({ isOpen, onClose, onSelect }: Props) {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<Valuta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyword("");
      fetchValuta("");
    }
  }, [isOpen]);

  const fetchValuta = async (search: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/valuta?keyword=${search}`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchValuta(keyword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[80vh] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Coins className="h-5 w-5 text-amber-500" />
            Pilih Valuta / Mata Uang
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 relative">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Cari kode atau nama mata uang..."
                autoFocus
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-200">
              Cari
            </button>
          </form>
        </div>

        {/* Body / List */}
        <div className="flex-1 overflow-y-auto min-h-[300px] p-4 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <span>Memuat data valuta...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Coins className="h-10 w-10 text-slate-300" />
              <span>Tidak ada Valuta ditemukan</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {items.map(item => (
                <div 
                  key={item.nomor}
                  onClick={() => onSelect(item)}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-amber-500 hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 font-bold text-lg">
                      {item.kode}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{item.nama}</span>
                      <span className="text-xs text-slate-500 font-mono tracking-tight">Kurs Standar: {new Intl.NumberFormat('id-ID').format(item.kurs)}</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Pilih
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
