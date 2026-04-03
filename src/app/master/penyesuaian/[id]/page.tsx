"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ChevronLeft, 
  Save, 
  Wallet, 
  Loader2,
  BookOpen,
  Search
} from "lucide-react";
import Link from "next/link";
import { BrowseAccountModal } from "@/components/BrowseAccountModal";

export default function PenyesuaianForm() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const isEdit = id && id !== "create";

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [isBrowseAccountOpen, setIsBrowseAccountOpen] = useState(false);

  const [formData, setFormData] = useState({
    nama: "",
    nomormhaccount: null as number | null,
    account_nama: "",
    keterangan: ""
  });

  useEffect(() => {
    if (isEdit) {
      fetchDetail();
    }
  }, [id, isEdit]);

  const fetchDetail = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/master/penyesuaian?nomor=${id}`); // Simple filter for sample
      const json = await res.json();
      if (json.success) {
        // Find the specific item since the mock list API returns all
        const item = json.data.find((d: any) => d.nomor.toString() === id);
        if (item) {
          setFormData({
            nama: item.nama || "",
            nomormhaccount: item.nomormhaccount || null,
            account_nama: item.account_nama || "",
            keterangan: item.keterangan || ""
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) return alert("Nama wajib diisi");

    setLoading(true);
    try {
      const res = await fetch("/api/master/penyesuaian", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          nomor: isEdit ? parseInt(id as string) : undefined
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        router.push("/master/penyesuaian");
      } else {
        alert(json.error);
      }
    } catch (e) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/master/penyesuaian"
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors dark:bg-slate-800 dark:text-slate-400"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isEdit ? "Edit Jenis Penyesuaian" : "Tambah Jenis Penyesuaian"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isEdit ? "Perbarui informasi jenis penyesuaian." : "Masukkan data jenis penyesuaian baru."}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
          <div className="grid grid-cols-1 gap-6">
            
            {/* Nama */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Nama Penyesuaian <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={formData.nama}
                onChange={e => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                placeholder="Contoh: Stok Opname, Kerusakan, dsb."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
              />
            </div>

            {/* Account */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Master Account
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    readOnly
                    value={formData.account_nama}
                    placeholder="Pilih Account..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-lg text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                    onClick={() => setIsBrowseAccountOpen(true)}
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => setIsBrowseAccountOpen(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 transition-colors"
                >
                  Cari
                </button>
              </div>
            </div>

            {/* Keterangan */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Keterangan
              </label>
              <textarea 
                value={formData.keterangan}
                onChange={e => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                placeholder="Tambahkan catatan jika diperlukan..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
              />
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Link 
            href="/master/penyesuaian"
            className="px-6 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Batal
          </Link>
          <button 
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Perubahan
          </button>
        </div>
      </form>

      <BrowseAccountModal 
        isOpen={isBrowseAccountOpen}
        onClose={() => setIsBrowseAccountOpen(false)}
        onSelect={(acc) => {
          setFormData(prev => ({ 
            ...prev, 
            nomormhaccount: acc.nomor, 
            account_nama: acc.nama 
          }));
          setIsBrowseAccountOpen(false);
        }}
      />
    </div>
  );
}
