import { useState, useEffect } from "react";
import { Search, X, Loader2, Package } from "lucide-react";

type ItemNota = {
  id: number;
  nomortdbelinota: number;
  nomorthbelinota: number;
  nomormhbarang: number;
  nomormhsatuan: number;
  kode_barang: string;
  barang: string;
  nama_barang?: string;
  satuan: string;
  jumlah: number;
  returned_jumlah: number;
  remaining_jumlah: number;
  harga: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: ItemNota) => void;
  notaNomor: number | null;
  notaId: string;
};

export function BrowseBarangNotaModal({ isOpen, onClose, onSelect, notaNomor, notaId }: Props) {
  const [items, setItems] = useState<ItemNota[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && (notaNomor || notaId)) {
        fetchNotaDetails(notaNomor || notaId);
    }
  }, [isOpen, notaNomor, notaId]);

  const fetchNotaDetails = async (id: number | string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pembelian/nota/${id}`);
      const json = await res.json();
      if (json.success && json.data.items) {
          // Map details
          const mappedItems = json.data.items.map((it: any) => ({
              ...it,
              nomortdbelinota: it.id,
              nomorthbelinota: it.nomorthbelinota || id,
          }));
          setItems(mappedItems);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Package className="h-5 w-5 text-rose-600" />
              Pilih Barang dari Nota
            </div>
            <span className="text-xs text-slate-500 font-medium ml-7">Ref: {notaId}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body / List */}
        <div className="flex-1 overflow-y-auto min-h-[300px] p-4 bg-white/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              <span>Memuat detail item nota...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
              <Package className="h-10 w-10 text-slate-300" />
              <span>Tidak ada item tersedia di Nota ini</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-700 font-bold">
                  <tr>
                    <th className="px-4 py-3">Nama Barang</th>
                    <th className="px-4 py-3 w-24">Satuan</th>
                    <th className="px-4 py-3 w-24 text-right">Qty</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 border-b">
                  {items.filter(i => i.remaining_jumlah > 0).map(item => (
                    <tr 
                      key={item.id}
                      className="hover:bg-rose-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                           <span className="font-bold text-slate-900">{item.barang || item.nama_barang}</span>
                           <span className="text-[10px] font-mono text-slate-500">{item.kode_barang}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded">{item.satuan}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                            <span className="font-black text-slate-900">{item.remaining_jumlah}</span>
                            {item.returned_jumlah > 0 && <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">Ori: {item.jumlah}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => onSelect({ ...item, jumlah: item.remaining_jumlah })}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded hover:bg-rose-700 transition-colors shadow-sm"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
