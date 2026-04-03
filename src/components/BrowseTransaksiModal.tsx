import { useState, useEffect } from "react";
import { Search, X, Loader2, FileText } from "lucide-react";

type Transaksi = {
  nomor: number;
  kode: string;
  tanggal: string;
  partner_nama: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: Transaksi) => void;
  type: string;
  title?: string;
};

export function BrowseTransaksiModal({ isOpen, onClose, onSelect, type, title }: Props) {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && type) {
      setKeyword("");
      fetchData("");
    }
  }, [isOpen, type]);

  const fetchData = async (search: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/keuangan/browse-transaksi?type=${type}&keyword=${search}`);
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
    fetchData(keyword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
            <FileText className="h-5 w-5 text-indigo-600" />
            {title || `Pilih Transaksi (${type})`}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Cari kode atau nama..." autoFocus className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none dark:bg-slate-950 dark:text-white" />
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Cari</button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500"><Loader2 className="h-8 w-8 animate-spin" /><span>Memuat data...</span></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500"><span>Tidak ada data ditemukan</span></div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {items.map(item => (
                <div key={item.nomor} onClick={() => onSelect(item)} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-500 cursor-pointer group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">{item.kode}</span>
                    <span className="text-xs text-slate-500">{new Date(item.tanggal).toLocaleDateString('id-ID')} - {item.partner_nama}</span>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded opacity-0 group-hover:opacity-100">Pilih</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
