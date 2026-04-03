"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Building2, AlertCircle, FileEdit, Trash2, X } from "lucide-react";

export default function SupplierDetail() {
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
    alamat: "",
    telepon: "",
    email: "",
    kontak_person: ""
  });

  const fetchData = async () => {
    setFetching(true);
    try {
      const resSupplier = await fetch(`/api/master/supplier/${id}`);
      const dataSupplier = await resSupplier.json();

      if (dataSupplier.success) {
        const item = dataSupplier.data;
        setFormData({
          kode: item.kode || "",
          nama: item.nama || "",
          alamat: item.alamat || "",
          telepon: item.telepon || "",
          email: item.email || "",
          kontak_person: item.kontak_person || ""
        });
      } else {
        setError("Supplier tidak ditemukan");
      }
    } catch (err: any) {
      setError("Error mengambil data");
      console.error("Error fetching", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!formData.nama) {
      setError("Nama Perusahaan wajib diisi");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/master/supplier/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setIsEdit(false);
      } else {
        setError(result.error || "Terjadi kesalahan saat mengupdate Supplier");
      }
    } catch (err: any) {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus supplier ini?")) return;
    try {
      const res = await fetch('/api/master/supplier', {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id, action: 'delete' })
      });
      const result = await res.json();
      if (result.success) {
         router.push('/master/supplier');
      } else {
         setError(result.error || "Gagal menghapus supplier");
      }
    } catch (error) {
      setError("Terjadi kesalahan sistem");
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
            <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href="/master/supplier" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
                Master Supplier
              </Link>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">Detail Supplier</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {formData.kode} - {formData.nama}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isEdit ? (
            <>
              <Link 
                href="/master/supplier"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
              <button 
                type="button"
                onClick={() => setIsEdit(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm hover:bg-amber-100 dark:hover:bg-amber-500/30 transition-all"
              >
                <FileEdit className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button 
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 shadow-sm hover:bg-red-100 dark:hover:bg-red-500/30 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                <span>Hapus</span>
              </button>
            </>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => setIsEdit(false)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Batal</span>
              </button>
              <button 
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-4 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Terjadi Kesalahan</h3>
            <div className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          
          <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm">1</span>
              Profil Perusahaan / Vendor
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <div className="space-y-2">
              <label htmlFor="kode" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Kode Supplier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="kode"
                value={formData.kode}
                readOnly
                className="block w-full rounded-md border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-2.5 text-sm shadow-sm text-slate-500 dark:text-slate-400 cursor-not-allowed uppercase"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="nama" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nama Perusahaan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nama"
                name="nama"
                value={formData.nama || ""}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                readOnly={!isEdit}
                className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                  !isEdit 
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed" 
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-indigo-500 focus:ring-indigo-500 dark:text-white"
                }`}
              />
            </div>
          </div>

          <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm">2</span>
              Informasi Kontak
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
             <div className="space-y-2 md:col-span-2">
               <label htmlFor="alamat" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                 Alamat Lengkap
               </label>
               <textarea
                 id="alamat"
                 rows={3}
                 value={formData.alamat || ""}
                 onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                 readOnly={!isEdit}
                 className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                  !isEdit 
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed" 
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-indigo-500 focus:ring-indigo-500 dark:text-white"
                }`}
               />
             </div>

             <div className="space-y-2">
               <label htmlFor="telepon" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                 No. Telepon / HP
               </label>
               <input
                 type="text"
                 id="telepon"
                 value={formData.telepon || ""}
                 onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                 readOnly={!isEdit}
                 className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                  !isEdit 
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed" 
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-indigo-500 focus:ring-indigo-500 dark:text-white"
                }`}
               />
             </div>

             <div className="space-y-2">
               <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                 Email Perusahaan
               </label>
               <input
                 type="email"
                 id="email"
                 value={formData.email || ""}
                 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                 readOnly={!isEdit}
                 className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                  !isEdit 
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed" 
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-indigo-500 focus:ring-indigo-500 dark:text-white"
                }`}
               />
             </div>
             
             <div className="space-y-2">
               <label htmlFor="kontak_person" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                 Kontak Person (PIC)
               </label>
               <input
                 type="text"
                 id="kontak_person"
                 value={formData.kontak_person || ""}
                 onChange={(e) => setFormData({ ...formData, kontak_person: e.target.value })}
                 readOnly={!isEdit}
                 className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                  !isEdit 
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed" 
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-indigo-500 focus:ring-indigo-500 dark:text-white"
                }`}
               />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
