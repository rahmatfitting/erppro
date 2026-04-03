"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Building2, ShieldCheck, MapPin, Phone, Mail, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PerusahaanForm() {
  const router = useRouter();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    alamat: "",
    telepon: "",
    email: "",
    npwp: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      const fetchData = async () => {
        try {
          const res = await fetch(`/api/master/perusahaan/${id}`);
          const json = await res.json();
          if (json.success) setFormData(json.data);
          else {
            alert(json.error);
            router.push("/master/perusahaan");
          }
        } catch (err) {
          alert("Gagal mengambil data");
        } finally {
          setFetching(false);
        }
      };
      fetchData();
    }
  }, [id, isEdit, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(isEdit ? `/api/master/perusahaan/${id}` : "/api/master/perusahaan", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        router.push("/master/perusahaan");
        router.refresh();
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/master/perusahaan" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              {isEdit ? "Edit Perusahaan" : "Tambah Perusahaan Baru"}
            </h1>
            <p className="text-xs text-slate-500">Lengkapi informasi legalitas dan identitas perusahaan.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-400" /> Kode Perusahaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT-ABC"
                  value={formData.kode}
                  onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 text-sm border-slate-200 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" /> Nama Perusahaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap PT/CV"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2 text-sm border-slate-200 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-400" /> No. NPWP
                </label>
                <input
                  type="text"
                  placeholder="00.000.000.0-000.000"
                  value={formData.npwp}
                  onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                  className="w-full px-4 py-2 text-sm border-slate-200 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" /> No. Telepon
                </label>
                <input
                  type="text"
                  placeholder="021-xxxxxx"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className="w-full px-4 py-2 text-sm border-slate-200 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" /> Email Resmi
                </label>
                <input
                  type="email"
                  placeholder="info@perusahaan.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 text-sm border-slate-200 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" /> Alamat Lengkap
                </label>
                <textarea
                  rows={3}
                  placeholder="Alamat kantor pusat..."
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-4 py-2 text-sm border-slate-200 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
            <Link 
              href="/master/perusahaan" 
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Simpan Perubahan" : "Tambah Perusahaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
