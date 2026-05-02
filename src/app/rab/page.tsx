"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Loader2, ClipboardList, AlertCircle, Calendar, ChevronRight, Copy, FileText, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function RABPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    project_id: "",
    template_type: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rab`);
      const json = await res.json();
      if (json.success) {
         setData(json.data.filter((r:any) => 
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            r.rab_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.project_name && r.project_name.toLowerCase().includes(searchQuery.toLowerCase()))
         ));
      } else setError(json.error);

      // Fetch projects for modal
      const pRes = await fetch('/api/proyek');
      const pJson = await pRes.json();
      if (pJson.success) setProjects(pJson.data);

    } catch (err) {
      setError("Gagal mengambil data RAB");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Nama RAB wajib diisi!");

    setSubmitting(true);
    try {
      const res = await fetch('/api/rab', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        router.push(`/rab/${result.data.id}`);
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Rencana Anggaran Biaya (RAB)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola rincian biaya proyek, tahapan pekerjaan, dan penawaran.
          </p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setIsModalOpen(true)}
             className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
           >
             <Plus className="h-4 w-4" /> Buat RAB Baru
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama RAB atau proyek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && (
         <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4"/> {error}
         </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg">Belum ada RAB ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {data.map(r => (
             <Link href={`/rab/${r.id}`} key={r.id} className="block group">
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all overflow-hidden flex flex-col h-full relative">
                 {r.status === 'history' && <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-[1px] z-10 pointers-events-none"></div>}
                 
                 <div className="p-5 flex-1 relative z-20">
                   <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {r.rab_number}
                      </span>
                      <span className={cn(
                        "text-xs font-medium px-2.5 py-1 rounded-full border",
                        r.status === 'draft' ? "bg-slate-100 text-slate-700 border-slate-200" :
                        r.status === 'approved' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        "bg-amber-100 text-amber-700 border-amber-200"
                      )}>
                        {r.status === 'history' ? 'Histori' : r.status.toUpperCase()}
                      </span>
                   </div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2">
                     {r.name} <span className="text-indigo-500 ml-1">v{r.version}</span>
                   </h3>
                   <p className="text-sm text-slate-500 mt-1 line-clamp-1">{r.project_name || 'Tidak tertaut proyek'}</p>
                   
                   <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                      <span className="text-xs text-slate-500 uppercase font-semibold">Total Anggaran</span>
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(r.total_amount)}</span>
                   </div>
                   {r.quotation_id && (
                     <div className="mt-3 inline-flex items-center text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded gap-1">
                        <FileText className="h-3 w-3" /> Penawaran Deals
                     </div>
                   )}
                 </div>
               </div>
             </Link>
           ))}
        </div>
      )}

      {/* Modal Add RAB */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Buat RAB Baru</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
               <div>
                  <label className="block text-sm font-medium mb-1">Nama RAB *</label>
                  <input required autoFocus type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" placeholder="Misal: RAB Pembangunan Tahap 1" />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Lingkup Proyek (Opsional)</label>
                  <select value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700">
                     <option value="">-- Tanpa Proyek --</option>
                     {projects.map(p => <option key={p.nomor} value={p.nomor}>{p.project_name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Pilih Template</label>
                  <select value={formData.template_type} onChange={e => setFormData({...formData, template_type: e.target.value})} className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700">
                     <option value="">RAB Kosong (Mulai dari Nol)</option>
                     <option value="rumah_1_lantai">Template Rumah 1 Lantai</option>
                     <option value="rumah_2_lantai">Template Rumah 2 Lantai</option>
                  </select>
               </div>
               <div className="pt-4 border-t flex justify-end gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-md">Batal</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-md flex items-center gap-2">
                     {submitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                     Buat Draft
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
