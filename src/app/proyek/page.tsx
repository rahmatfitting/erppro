"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Loader2, Briefcase, Calendar, MapPin, DollarSign, Target, ChevronRight, X, AlertCircle, Save } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ProyekListPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nomor: "",
    project_name: "",
    client_id: "",
    location: "",
    start_date: "",
    end_date: "",
    budget_total: 0
  });

  const [customers, setCustomers] = useState<any[]>([]);

  const fetchData = async (keyword = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proyek?keyword=${keyword}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch (err) {
      setError("Gagal mengambil data proyek");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      // 999 limit to get all for dropdown
      const res = await fetch('/api/master/customer?limit=999'); 
      const json = await res.json();
      if (json.success) setCustomers(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(searchQuery);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_name) return alert("Nama Proyek wajib diisi!");

    setSubmitting(true);
    try {
      const res = await fetch('/api/proyek', {
        method: editMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        setEditMode(false);
        setFormData({ nomor: "", project_name: "", client_id: "", location: "", start_date: "", end_date: "", budget_total: 0 });
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

  const openEditModal = (p: any) => {
     setFormData({
        nomor: p.nomor,
        project_name: p.project_name || "",
        client_id: p.client_id || "",
        location: p.location || "",
        start_date: p.start_date ? p.start_date.split('T')[0] : "",
        end_date: p.end_date ? p.end_date.split('T')[0] : "",
        budget_total: p.budget_total || 0,
     });
     setEditMode(true);
     setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'ongoing': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      case 'finished': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Daftar Proyek
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau semua proyek lapangan, timeline, dan progress report.
          </p>
        </div>
        <div>
            <button 
              onClick={() => {
                 setEditMode(false);
                 setFormData({ nomor: "", project_name: "", client_id: "", location: "", start_date: "", end_date: "", budget_total: 0 });
                 setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Buat Proyek Baru
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama proyek..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
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

      {/* Grid Proyek */}
      {loading ? (
         <div className="flex justify-center p-12">
           <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
         </div>
      ) : data.length === 0 ? (
         <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
            <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">Belum ada proyek yang dibuat.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map(p => (
              <div key={p.nomor} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                     <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded">
                       {p.project_code}
                     </span>
                     <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', getStatusColor(p.status))}>
                       {p.status}
                     </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 line-clamp-2">{p.project_name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-1">{p.client_name || 'Internal/No Client'}</p>
                  
                  <div className="space-y-2 mb-4">
                     <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                        <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="truncate">{p.location || '-'}</span>
                     </div>
                     <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                        <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                        <span>{p.start_date || '?'} s/d {p.end_date || '?'}</span>
                     </div>
                  </div>

                  <div>
                     <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Progress</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{parseFloat(p.progress_percentage).toFixed(1)}%</span>
                     </div>
                     <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, parseFloat(p.progress_percentage)))}%` }}
                        ></div>
                     </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/30 grid grid-cols-2 gap-2">
                   <button
                     onClick={() => openEditModal(p)}
                     className="w-full flex items-center justify-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 shadow-sm"
                   >
                     Edit Proyek
                   </button>
                   <Link 
                     href={`/proyek/${p.nomor}`} 
                     className="w-full flex items-center justify-center gap-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors py-2 rounded-lg shadow-sm"
                   >
                     Lihat Proyek
                   </Link>
                </div>
              </div>
            ))}
         </div>
      )}


      {/* Modal Add Proyek */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editMode ? "Edit Proyek" : "Tambah Proyek"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Proyek *</label>
                <input 
                  type="text" required
                  value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Misal: Pembangunan Gudang"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Klien (Customer)</label>
                <select 
                  value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Internal / Tanpa Klien --</option>
                  {customers.map(c => (
                     <option key={c.nomor} value={c.nomor}>{c.nama} - {c.kode}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lokasi Proyek</label>
                <input 
                  type="text" 
                  value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Misal: Kawasan Industri..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tgl Mulai</label>
                    <input 
                    type="date" 
                    value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tgl Selesai</label>
                    <input 
                    type="date" 
                    value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Budget Total (Rp)</label>
                <input 
                  type="number" 
                  value={formData.budget_total || ''} onChange={e => setFormData({...formData, budget_total: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                />
              </div>
              
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Proyek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
