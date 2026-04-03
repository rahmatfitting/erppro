import { useState, useEffect } from "react";
import { Search, X, Loader2, PackageOpen } from "lucide-react";

type PRItem = {
  id: number;
  nomormhbarang: number;
  nomormhsatuan: number;
  kode_barang: string;
  barang: string;
  satuan: string;
  jumlah: number;
  keterangan: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  prNomor: number | string; // The PR nomor (internal id)
  prId: string; // The PR code (for display)
  onSelect: (item: PRItem) => void;
};

export function BrowseBarangPRModal({ isOpen, onClose, prNomor, prId, onSelect }: Props) {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<PRItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PRItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && prNomor) {
      setKeyword("");
      fetchPRDetails(prNomor.toString());
    }
  }, [isOpen, prNomor]);

  const fetchPRDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pembelian/permintaan/${id}`);
      const json = await res.json();
      if (json.success && json.data.items) {
          const remainingItems = json.data.items.filter((item: any) => item.jumlah_sisa > 0);
          setItems(remainingItems);
          setFilteredItems(remainingItems);
      } else {
         setItems([]);
         setFilteredItems([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
       setFilteredItems(items);
       return;
    }
    const lower = keyword.toLowerCase();
    setFilteredItems(items.filter(i => 
       i.barang.toLowerCase().includes(lower) || 
       (i.kode_barang || '').toLowerCase().includes(lower)
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <PackageOpen className="h-5 w-5 text-indigo-600" />
            Pilih Barang dari PR: {prId}
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
                onChange={e => {
                   setKeyword(e.target.value);
                   // auto search on type
                   const lower = e.target.value.toLowerCase();
                   setFilteredItems(items.filter(i => 
                      i.barang.toLowerCase().includes(lower) || 
                      (i.kode_barang || '').toLowerCase().includes(lower)
                   ));
                }}
                placeholder="Cari item dalam PR..."
                autoFocus
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </form>
        </div>

        {/* Body / List */}
        <div className="flex-1 overflow-y-auto min-h-[300px] p-4 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span>Memuat item PR...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <PackageOpen className="h-10 w-10 text-slate-300" />
              <span>Tidak ada item ditemukan</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{item.barang}</span>
                    <span className="text-xs font-mono text-slate-500">
                       [{item.kode_barang || '-'}] - {item.keterangan || 'Tidak ada ket'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                       Jml: {item.jumlah} {item.satuan}
                     </span>
                     <button className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                       Pilih
                     </button>
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
