"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, Edit, Trash2, Loader2, Building, Phone } from "lucide-react";

export default function CabangList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/cabang?keyword=${keyword}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Gagal mengambil data cabang");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus cabang ${name}?`)) return;
    try {
      const res = await fetch(`/api/master/cabang`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' })
      });
      const json = await res.json();
      if (json.success) fetchData();
      else alert(json.error);
    } catch (err) {
      alert("Terjadi kesalahan");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-slate-900 group">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-rose-600" />
            Master Cabang
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola unit cabang atau lokasi operasional usaha.
          </p>
        </div>
        <Link 
          href="/master/cabang/create" 
          className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Tambah Cabang
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
          <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="flex gap-3 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Kode atau Nama..." 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border-slate-300 rounded-md outline-none focus:border-rose-500 focus:ring-1 shadow-sm"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              Cari
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold w-24">Kode</th>
                <th className="px-6 py-3 font-semibold">Nama Cabang</th>
                <th className="px-6 py-3 font-semibold text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 uppercase font-medium text-xs">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-rose-500 mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <MapPin className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    Belum ada data cabang.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.nomor} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-rose-600">{row.kode}</td>
                    <td className="px-6 py-4">
                       <div className="font-bold text-slate-900 text-sm">{row.nama}</div>
                       <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-1 uppercase">
                          <span className="flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded tracking-tighter shadow-sm border border-indigo-100">
                             <Building className="h-3 w-3" /> {row.perusahaan_nama}
                          </span>
                          <span className="flex items-center gap-1">
                             <Phone className="h-3 w-3" /> {row.telepon || '-'}
                          </span>
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                             <MapPin className="h-3 w-3" /> {row.alamat || '-'}
                          </span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          href={`/master/cabang/${row.nomor}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors border border-transparent hover:border-rose-100 bg-white shadow-sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(row.nomor, row.nama)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors border border-transparent hover:border-red-100 bg-white shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
