"use client";

import { useState } from "react";
import { Save, ArrowLeft, Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ValutaCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    kurs: 1,
    keterangan: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/master/valuta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      router.push(`/master/valuta/${formData.kode}`);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <Link href="/master/valuta" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
               <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
               <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                 <Wallet className="h-6 w-6 text-indigo-600" /> Tambah Mata Uang
               </h1>
               <p className="text-sm text-slate-500 mt-1">Buat data Valuta dan kurs baru ke dalam sistem.</p>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kode Valuta <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.kode}
                  onChange={e => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                  maxLength={10}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="IDR, USD, EUR..." 
                  required 
                />
             </div>
             
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Mata Uang <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Rupiah, US Dollar..." 
                  required 
                />
             </div>
             
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nilai Kurs Tengah (Terhadap Rupiah) <span className="text-red-500">*</span></label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <span className="text-slate-500 sm:text-sm font-bold">Rp</span>
                   </div>
                   <input 
                     type="number" 
                     value={formData.kurs}
                     onChange={e => setFormData({ ...formData, kurs: parseFloat(e.target.value) || 0 })}
                     step="0.01"
                     className="w-full pl-10 text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                     required 
                   />
                </div>
             </div>
             
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Tambahan</label>
                <textarea 
                  value={formData.keterangan}
                  onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                  rows={3}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Catatan..." 
                />
             </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
             <button
                type="submit"
                disabled={loading || !formData.kode || !formData.nama}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
             >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {loading ? "Menyimpan..." : "Simpan Valuta"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
