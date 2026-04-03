"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, BookOpen } from "lucide-react";

export default function AccountCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    kode: "",
    kode_inisial: "",
    nama: "",
    kas: false,
    bank: false,
    giro: false,
    detail: false,
    is_foh: false,
    is_browse_ums: false,
    keterangan: "",
    catatan: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kode || !formData.nama) { setError("Kode dan Nama wajib diisi"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/master/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/master/account/${data.data.kode}`);
      } else {
        setError(data.error || "Gagal menyimpan data");
      }
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const boolField = (key: keyof typeof formData, label: string) => (
    <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <input
        type="checkbox"
        checked={formData[key] as boolean}
        onChange={e => setFormData({ ...formData, [key]: e.target.checked })}
        className="h-4 w-4 accent-indigo-600 rounded"
      />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/master/account" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tambah Account</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kode Account <span className="text-red-500">*</span></label>
              <input type="text" value={formData.kode} onChange={e => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Contoh: 1-0001" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kode Inisial</label>
              <input type="text" value={formData.kode_inisial} onChange={e => setFormData({ ...formData, kode_inisial: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Inisial singkat" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Account <span className="text-red-500">*</span></label>
            <input type="text" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })}
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nama lengkap account" required />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipe Account</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {boolField("kas", "Kas")}
              {boolField("bank", "Bank")}
              {boolField("giro", "Giro")}
              {boolField("detail", "Detail")}
              {boolField("is_foh", "Is FOH")}
              {boolField("is_browse_ums", "Is Browse UMS")}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
            <textarea value={formData.keterangan} onChange={e => setFormData({ ...formData, keterangan: e.target.value })} rows={2}
              className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Keterangan tambahan..." />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" />
              {loading ? "Menyimpan..." : "Simpan Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
