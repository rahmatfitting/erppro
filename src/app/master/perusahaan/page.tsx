"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Building2, Edit, Trash2, Loader2, Globe, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PerusahaanList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/perusahaan?keyword=${keyword}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Gagal mengambil data perusahaan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus perusahaan ${name}?`)) return;
    try {
      const res = await fetch(`/api/master/perusahaan`, {
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            Master Perusahaan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola entitas perusahaan utama dalam sistem.
          </p>
        </div>
        <Link 
          href="/master/perusahaan/create" 
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Tambah Perusahaan
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="flex gap-3 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Kode atau Nama..." 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border-slate-300 rounded-md outline-none focus:border-indigo-500 focus:ring-1 shadow-sm"
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
                <th className="px-6 py-3 font-semibold">Nama Perusahaan</th>
                <th className="px-6 py-3 font-semibold">Kontak & NPWP</th>
                <th className="px-6 py-3 font-semibold">Alamat</th>
                <th className="px-6 py-3 font-semibold text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 uppercase font-medium text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Building2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    Belum ada data perusahaan.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.nomor} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-indigo-600">{row.kode}</td>
                    <td className="px-6 py-4">
                       <div className="font-bold text-slate-900 text-sm">{row.nama}</div>
                       <div className="text-[10px] text-slate-400 mt-0.5">NPWP: {row.npwp || '-'}</div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                       <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="h-3 w-3" /> {row.telepon || '-'}
                       </div>
                       <div className="flex items-center gap-2 text-slate-600 lowercase">
                          <Mail className="h-3 w-3" /> {row.email || '-'}
                       </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-500">
                       {row.alamat || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          href={`/master/perusahaan/${row.nomor}`}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors border border-transparent hover:border-indigo-100 bg-white shadow-sm"
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
