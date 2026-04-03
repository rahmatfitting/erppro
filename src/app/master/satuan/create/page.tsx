"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Tags, AlertCircle } from "lucide-react";

export default function SatuanCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    kode: "",
    nama: ""
  });

  const generateKode = () => {
    return 'UOM' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  };

  const handleSave = async () => {
    if (!formData.kode || !formData.nama) {
      setError("Kode dan Nama wajb diisi");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/master/satuan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/master/satuan/${result.data.nomor}`);
      } else {
        setError(result.error || "Terjadi kesalahan saat menyimpan Satuan");
      }
    } catch (err: any) {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center border border-purple-200 dark:border-purple-800/50">
            <Tags className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href="/master/satuan" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
                Master Satuan
              </Link>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">Form Baru</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Tambah Satuan
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link 
            href="/master/satuan"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali</span>
          </Link>
          <button 
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{loading ? 'Menyimpan...' : 'Simpan Satuan'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-4 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Gagal Menyimpan</h3>
            <div className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Form Container */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm">1</span>
              Informasi Satuan UoM
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <label htmlFor="kode" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Kode Satuan <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="kode"
                  name="kode"
                  value={formData.kode || ""}
                  onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                  className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:text-white uppercase"
                  placeholder="Contoh: PCS"
                />
                <button 
                  type="button" 
                  onClick={() => setFormData({ ...formData, kode: generateKode() })}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  Auto
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Kode unik satuan barang</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="nama" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nama Lengkap Satuan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nama"
                name="nama"
                value={formData.nama || ""}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:text-white"
                placeholder="Contoh: Pieces"
              />
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
