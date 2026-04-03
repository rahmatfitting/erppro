"use client";

import { useState, useEffect } from "react";
import { Save, ArrowLeft, Users, AlertCircle, FileEdit, Trash2, X } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SalesDetail() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialMode = searchParams.get('mode') || 'view';
  
  const [isEdit, setIsEdit] = useState(initialMode === 'edit');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    telepon: "",
    email: "",
    status_aktif: 1
  });

  const fetchSales = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/master/sales/${id}`);
      const data = await res.json();
      
      if (data.success) {
        setFormData({
          kode: data.data.kode || "",
          nama: data.data.nama || "",
          telepon: data.data.telepon || "",
          email: data.data.email || "",
          status_aktif: data.data.status_aktif ?? 1
        });
      } else {
        setError(data.error || "Sales tidak ditemukan");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat mengambil data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (id) fetchSales();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEdit) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/master/sales/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setIsEdit(false);
      } else {
        setError(data.error || "Gagal mengupdate data");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirm(`Apakah Anda yakin ingin ${formData.status_aktif === 1 ? 'menonaktifkan' : 'mengaktifkan'} sales ini?`)) return;
    
    try {
      const res = await fetch('/api/master/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status_aktif: formData.status_aktif === 1 ? 0 : 1 })
      });
      const result = await res.json();
      if (result.success) {
         setFormData(prev => ({ ...prev, status_aktif: prev.status_aktif === 1 ? 0 : 1 }));
      } else {
        alert(result.error);
      }
    } catch (error) {
       alert("Terjadi kesalahan sistem");
    }
  };

  if (fetching) {
     return (
        <div className="flex items-center justify-center p-12">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
     );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/master/sales" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
               Master Sales
             </Link>
             <span className="text-slate-300 dark:text-slate-600">/</span>
             <span className="text-sm font-medium text-slate-900 dark:text-white">Detail Sales</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            {formData.kode} - {formData.nama}
            <span className={cn(
               "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ml-2",
               formData.status_aktif === 1 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
            )}>
               {formData.status_aktif === 1 ? "Aktif" : "Nonaktif"}
            </span>
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {!isEdit ? (
            <>
              <Link 
                href="/master/sales"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
              <button 
                onClick={() => setIsEdit(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-50 dark:bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm hover:bg-amber-100 dark:hover:bg-amber-500/30 transition-all"
              >
                <FileEdit className="h-4 w-4" />
                Edit
              </button>
              {formData.status_aktif === 1 ? (
                 <button 
                  onClick={handleToggleStatus}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 shadow-sm hover:bg-red-100 dark:hover:bg-red-500/30 transition-all"
                 >
                   <Trash2 className="h-4 w-4" />
                   Nonaktifkan
                 </button>
              ) : (
                <button 
                  onClick={handleToggleStatus}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-all"
                 >
                   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   Aktifkan
                 </button>
              )}
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setIsEdit(false);
                  fetchSales(); // fetch again to reset data
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <X className="h-4 w-4" />
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-100 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Gagal</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="kode" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Kode Sales <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="kode"
                  name="kode"
                  readOnly
                  value={formData.kode}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-500 outline-none cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="nama" className={cn("block text-sm font-medium", isEdit ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300")}>
                  Nama Sales <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nama"
                  name="nama"
                  readOnly={!isEdit}
                  value={formData.nama}
                  onChange={handleChange}
                  className={cn(
                     "w-full rounded-md px-3 py-2 text-sm outline-none transition-colors",
                     !isEdit 
                        ? "border border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300" 
                        : "border border-indigo-200 bg-indigo-50/30 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-white"
                  )}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="telepon" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  No. Telepon
                </label>
                <input
                  type="text"
                  id="telepon"
                  name="telepon"
                  readOnly={!isEdit}
                  value={formData.telepon}
                  onChange={handleChange}
                  className={cn(
                     "w-full rounded-md px-3 py-2 text-sm outline-none transition-colors",
                     !isEdit 
                        ? "border border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300" 
                        : "border border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  )}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  readOnly={!isEdit}
                  value={formData.email}
                  onChange={handleChange}
                  className={cn(
                     "w-full rounded-md px-3 py-2 text-sm outline-none transition-colors",
                     !isEdit 
                        ? "border border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300" 
                        : "border border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
