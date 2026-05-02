"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Loader2, HardHat, AlertCircle, Save, X, Edit, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MasterSubkontraktorPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nomor: "",
    name: "",
    phone: "",
    specialization: "",
    address: ""
  });

  const fetchData = async (keyword = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/subkontraktor?keyword=${keyword}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch (err) {
      setError("Gagal mengambil data subkontraktor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(searchQuery);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Nama wajib diisi!");

    setSubmitting(true);
    try {
      const res = await fetch('/api/master/subkontraktor', {
        method: editMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        setEditMode(false);
        setFormData({ nomor: "", name: "", phone: "", specialization: "", address: "" });
        fetchData(searchQuery);
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <HardHat className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            Master Subkontraktor
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data vendor spesialis untuk proyek lapangan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => {
                setEditMode(false);
                setViewMode(false);
                setFormData({ nomor: "", name: "", phone: "", specialization: "", address: "" });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Tambah Subkon
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau spesialisasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
            />
          </div>
          <button 
            type="submit"
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cari
          </button>
        </form>
      </div>

      {error && (
         <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4"/> {error}
         </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 uppercase text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Nomor</th>
                <th className="px-6 py-4">Nama Subkontraktor</th>
                <th className="px-6 py-4">Spesialisasi</th>
                <th className="px-6 py-4">Telepon</th>
                <th className="px-6 py-4">Alamat</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-orange-600" />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada data subkontraktor yang ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.nomor} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      SUB-{item.nomor.toString().padStart(4, '0')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.name}</td>
                    <td className="px-6 py-4 text-orange-600 dark:text-orange-400 font-medium">{item.specialization || '-'}</td>
                    <td className="px-6 py-4">{item.phone || '-'}</td>
                    <td className="px-6 py-4">{item.address || '-'}</td>
                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                       <button onClick={() => {
                          setFormData({ nomor: item.nomor, name: item.name, phone: item.phone, specialization: item.specialization, address: item.address });
                          setViewMode(true);
                          setEditMode(false);
                          setIsModalOpen(true);
                       }} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white rounded-md transition-colors" title="View Detail">
                           <Eye className="h-4 w-4" />
                       </button>
                       <button onClick={() => {
                          setFormData({ nomor: item.nomor, name: item.name, phone: item.phone, specialization: item.specialization, address: item.address });
                          setViewMode(false);
                          setEditMode(true);
                          setIsModalOpen(true);
                       }} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-orange-600 dark:hover:bg-slate-800 dark:hover:text-orange-400 rounded-md transition-colors" title="Edit Subkontraktor">
                           <Edit className="h-4 w-4" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Subkon */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                 {viewMode ? "Detail Subkontraktor" : editMode ? "Edit Subkontraktor" : "Tambah Subkontraktor"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Subkontraktor *</label>
                <input 
                  type="text" required disabled={viewMode}
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 disabled:opacity-75"
                  placeholder="Misal: CV Jaya Abadi"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Spesialisasi</label>
                <select 
                  disabled={viewMode}
                  value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 disabled:opacity-75"
                >
                  <option value="">-- Pilih --</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Listrik">Listrik</option>
                  <option value="Interior">Interior / Furniture</option>
                  <option value="Atap / Kanopi">Atap & Kanopi</option>
                  <option value="Tukang Sipil">Sipil / Konstruksi Umum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telepon</label>
                <input 
                  type="text" disabled={viewMode}
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 disabled:opacity-75"
                  placeholder="0812xxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alamat Lengkap</label>
                <textarea 
                  rows={3} disabled={viewMode}
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 disabled:opacity-75"
                  placeholder="Jalan..."
                />
              </div>
              
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-md transition-colors"
                >
                  {viewMode ? "Tutup" : "Batal"}
                </button>
                {!viewMode && (
                   <button 
                     type="submit" disabled={submitting}
                     className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors disabled:opacity-70"
                   >
                     {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                     Simpan
                   </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
