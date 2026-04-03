"use client";

import { useState } from "react";
import { Save, ArrowLeft, Home, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateGudangPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    lokasi: "",
    penanggung_jawab: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/master/gudang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/master/gudang/${data.data.nomor}`);
      } else {
        setError(data.error || "Gagal menyimpan data");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/master/gudang" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
               Master Gudang
             </Link>
             <span className="text-slate-300 dark:text-slate-600">/</span>
             <span className="text-sm font-medium text-slate-900 dark:text-white">Tambah Gudang</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Home className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Tambah Gudang Baru
          </h1>
        </div>
        <Link 
          href="/master/gudang"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-100 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Gagal menyimpan data</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="kode" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Kode Gudang <span className="text-red-500">*</span>
                </label>
                <input
                  readOnly
                  type="text"
                  id="kode"
                  name="kode"
                  value={formData.kode || "AUTO"}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors font-mono font-semibold text-indigo-600 cursor-not-allowed"
                  placeholder="Auto Generated"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="nama" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nama Gudang <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nama"
                  name="nama"
                  required
                  value={formData.nama}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="Masukkan nama gudang"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="penanggung_jawab" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Penanggung Jawab 
                </label>
                <input
                  type="text"
                  id="penanggung_jawab"
                  name="penanggung_jawab"
                  value={formData.penanggung_jawab}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="Nama PIC"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lokasi" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Lokasi
                </label>
                <textarea
                  id="lokasi"
                  name="lokasi"
                  rows={4}
                  value={formData.lokasi}
                  onChange={handleChange}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                  placeholder="Alamat Detail Gudang"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {loading ? "Menyimpan..." : "Simpan Gudang"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
