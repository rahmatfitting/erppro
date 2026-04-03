"use client";

import { useState, useEffect } from "react";
import { Plus, Search, User, Edit, Loader2, AlertCircle, Ban, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function UserIndex() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/user?keyword=${keyword}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch (err) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan user ${name}?`)) return;

    try {
      const res = await fetch(`/api/master/user/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error || "Gagal menonaktifkan user");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <User className="h-6 w-6 text-indigo-600" />
            Master Pengguna
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar profil pengguna sistem dan integrasi role wewenang.
          </p>
        </div>
        <Link 
          href="/master/user/create" 
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Tambah User
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="flex gap-3 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Username atau Nama..." 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border-slate-300 rounded-md outline-none focus:border-indigo-500 focus:ring-1"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Cari
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border-b border-red-100 flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold w-16 text-center">ID</th>
                <th className="px-6 py-3 font-semibold">Profil User</th>
                <th className="px-6 py-3 font-semibold">Grup Hak Akses</th>
                <th className="px-6 py-3 font-semibold">Kontak</th>
                <th className="px-6 py-3 font-semibold">Login Terakhir</th>
                <th className="px-6 py-3 font-semibold text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    Belum ada data Pengguna
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.nomor} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-500 text-center">
                      {row.nomor}
                    </td>
                    <td className="px-6 py-3">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                             {row.nama ? row.nama.substring(0, 2).toUpperCase() : 'U'}
                          </div>
                          <div>
                             <div className="font-bold text-slate-900">{row.nama}</div>
                             <div className="text-xs text-slate-500 font-mono">@{row.username}</div>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-3">
                       <span className="inline-flex items-center gap-1.5 rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 uppercase tracking-wider">
                         <ShieldCheck className="h-3.5 w-3.5" />
                         {row.grup_nama} ({row.grup_kode})
                       </span>
                    </td>
                    <td className="px-6 py-3">
                       <div className="text-slate-600 font-medium">{row.no_hp || '-'}</div>
                       <div className="text-slate-500 text-xs">{row.email || '-'}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                       {row.last_login ? new Date(row.last_login).toLocaleString('id-ID') : 'Belum pernah login'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          href={`/master/user/${row.nomor}`}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {row.username !== 'admin' && (
                          <button 
                            onClick={() => handleDeactivate(row.nomor, row.nama)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Nonaktifkan User"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
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
