"use client";

import { useState, useEffect } from "react";
import { Save, ArrowLeft, Loader2, Wallet, AlertCircle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function ValutaEdit() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    kurs: 1,
    keterangan: "",
    status_aktif: 1
  });

  useEffect(() => {
    const fetchValuta = async () => {
       try {
          const res = await fetch(`/api/master/valuta/${id}`);
          const json = await res.json();
          if (json.success && json.data) {
              setFormData({
                kode: json.data.kode || "",
                nama: json.data.nama || "",
                kurs: json.data.kurs ?? 1,
                keterangan: json.data.keterangan || "",
                status_aktif: json.data.status_aktif ?? 1
              });
          } else {
             setError("Data tidak ditemukan");
          }
       } catch (err: any) {
          setError(err.message || "Gagal memuat data valuta");
       } finally {
          setFetching(false);
       }
    };
    if (id) fetchValuta();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/master/valuta/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      router.push("/master/valuta");
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data");
      setLoading(false);
    }
  };

  if (fetching) {
     return <div className="flex justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <Link href="/master/valuta" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
               <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
               <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                 <Wallet className="h-6 w-6 text-indigo-600" /> Edit Mata Uang
               </h1>
               <p className="text-sm text-slate-500 mt-1">Perbarui master valuta {id}.</p>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-100 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> {error}
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
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md bg-slate-50"
                  readOnly 
                />
                <span className="text-xs text-slate-400 mt-1">Kode tidak dapat diubah</span>
             </div>
             
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Mata Uang <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

             <div className="flex items-center gap-4 py-2">
                <label className="block text-sm font-medium text-slate-700 mt-1">Status Aktif</label>
                <div className="flex items-center gap-4 border border-slate-200 px-4 py-2 rounded-lg bg-slate-50">
                   <label className="flex items-center gap-2 text-sm text-slate-800 font-medium whitespace-nowrap">
                      <input type="radio" checked={formData.status_aktif === 1} onChange={() => setFormData({...formData, status_aktif: 1})} className="accent-indigo-600" />
                      Aktif
                   </label>
                   <label className="flex items-center gap-2 text-sm text-slate-800 font-medium whitespace-nowrap">
                      <input type="radio" checked={formData.status_aktif === 0} onChange={() => setFormData({...formData, status_aktif: 0})} className="accent-indigo-600" />
                      Non-Aktif
                   </label>
                </div>
             </div>
             
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Tambahan</label>
                <textarea 
                  value={formData.keterangan}
                  onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                  rows={3}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
             </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
             <button
                type="submit"
                disabled={loading || !formData.nama}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
             >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {loading ? "Menyimpan..." : "Perbarui Valuta"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
