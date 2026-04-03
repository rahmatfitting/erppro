import { useState, useEffect } from "react";
import { Search, X, Loader2, Receipt, BadgeInfo } from "lucide-react";

type Invoice = {
  nomor: number;
  kode: string;
  tanggal: string;
  customer: string;
  tipe: string; // 'Nota' or 'POS'
  total: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (invoice: Invoice) => void;
  nomormhcustomer?: number;
};

export function BrowseNotaJualModal({ isOpen, onClose, onSelect, nomormhcustomer }: Props) {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyword("");
      fetchInvoices("");
    }
  }, [isOpen]);

  const fetchInvoices = async (search: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/penjualan/browse-nota?keyword=${search}${nomormhcustomer ? `&nomormhcustomer=${nomormhcustomer}` : ''}`);
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
    fetchInvoices(keyword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tighter">
            <Receipt className="h-5 w-5 text-indigo-600" />
            Pilih Nota Jual / POS
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
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
                placeholder="Cari kode nota atau customer..."
                autoFocus
                className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
              Cari
            </button>
          </form>
        </div>

        {/* Body / List */}
        <div className="flex-1 overflow-y-auto min-h-[300px] p-4 bg-slate-50/50 dark:bg-slate-950/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span>Memuat data nota...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Receipt className="h-10 w-10 text-slate-300" />
              <span>Tidak ada Nota Penjualan / POS ditemukan</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {items.map(item => (
                <div 
                  key={`${item.tipe}-${item.nomor}`}
                  onClick={() => onSelect(item)}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-indigo-500 hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase">{item.kode}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${item.tipe === 'POS' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{item.tipe}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.tanggal).toLocaleDateString('id-ID')} - {item.customer}</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">Total: Rp {new Intl.NumberFormat('id-ID').format(item.total)}</span>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
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
