"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Save, ChevronLeft, Building2, Copy, FileText, CheckCircle2, History, AlertCircle, X, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function RABDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [rab, setRab] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");

  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [quotationForm, setQuotationForm] = useState({ client_name: "", project_name: "" });

  const fetchData = async () => {
    try {
      const [rabRes, matRes] = await Promise.all([
        fetch(`/api/rab/${id}`),
        fetch(`/api/master/barang`) // Fetching materials to bind
      ]);
      const rabJson = await rabRes.json();
      const matJson = await matRes.json();

      if (rabJson.success) setRab(rabJson.data);
      else setError(rabJson.error);

      if (matJson.success) setMaterials(matJson.data);

    } catch (err) {
      setError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const addSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName) return;
    try {
       const res = await fetch('/api/rab/section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rab_id: id, name: sectionName, order_number: rab.sections.length + 1 })
       });
       if(res.ok) {
          setIsSectionModalOpen(false);
          setSectionName("");
          fetchData();
       }
    } catch(err) {}
  };

  const deleteSection = async (secId: number) => {
    if(!confirm("Yakin hapus pekerjaan ini beserta isinya?")) return;
    try {
      await fetch(`/api/rab/section?id=${secId}`, { method: 'DELETE' });
      fetchData();
    } catch(e){}
  }

  const addItemToSection = async (secId: number) => {
    try {
      await fetch('/api/rab/item', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            section_id: secId,
            item_name: "Item Pekerjaan Baru",
            category: "material",
            volume: 1,
            unit: "ls",
            unit_price: 0
         })
      });
      fetchData();
    } catch(err) {}
  };

  const updateItem = async (itemId: number, field: string, value: any) => {
    // Find item
    const sec = rab.sections.find((s:any) => s.items.some((i:any) => i.id === itemId));
    const item = sec.items.find((i:any) => i.id === itemId);
    const updated = { ...item, [field]: value };

    // Optimistic UI
    const newRab = {...rab};
    const sIdx = newRab.sections.findIndex((s:any) => s.id === sec.id);
    const iIdx = newRab.sections[sIdx].items.findIndex((i:any) => i.id === itemId);
    newRab.sections[sIdx].items[iIdx] = updated;

    // Calc subtotal optimistically
    updated.subtotal = parseFloat(updated.volume || 0) * parseFloat(updated.unit_price || 0);
    newRab.sections[sIdx].subtotal = newRab.sections[sIdx].items.reduce((a:number, i:any) => a + i.subtotal, 0);
    newRab.total_amount = newRab.sections.reduce((a:number, s:any) => a + s.subtotal, 0);
    setRab(newRab);

    // Call API
    try {
      await fetch('/api/rab/item', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id: itemId, ...updated })
      });
    } catch(e) {}
  };

  const deleteItem = async (itemId: number) => {
    try {
      await fetch(`/api/rab/item?id=${itemId}`, { method: 'DELETE' });
      fetchData();
    } catch(e){}
  }

  const generateNewVersion = async () => {
    if(!confirm("Yakin ingin mencetak versi baru? Versi saat ini akan menjadi Histori yang tak bisa diubah.")) return;
    try {
       const res = await fetch(`/api/rab/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ action: 'NEW_VERSION' })
       });
       const json = await res.json();
       if(json.success) {
          router.push(`/rab/${json.newId}`);
       } else alert(json.error);
    } catch(e) {}
  };

  const createQuotation = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
        const res = await fetch('/api/quotation', {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({
              rab_id: id,
              total_amount: rab.total_amount,
              ...quotationForm
           })
        });
        const json = await res.json();
        if(json.success) {
           router.push('/penawaran');
        } else alert(json.error);
     } catch(e){}
  };

  const setStatus = async (status: string) => {
     try {
       await fetch(`/api/rab/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status })
       });
       setSuccess(`Status diubah menjadi ${status}`);
       fetchData();
     } catch (e) {}
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  if (loading) return <div className="p-12 text-center text-slate-500">Memuat RAB...</div>;
  if (!rab) return <div className="p-12 text-center text-red-500">RAB tidak ditemukan atau terjadi kesalahan</div>;

  const isReadonly = rab.status === 'history' || rab.status === 'approved';

  return (
    <div className="space-y-6 pb-20">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        
        {rab.status === 'history' && (
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
        )}

        <div>
          <Link href="/rab" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium mb-3">
             <ChevronLeft className="h-4 w-4 mr-1" /> Kembali ke Daftar
          </Link>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
               {rab.name} 
             </h1>
             <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">v{rab.version}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
             <span className="flex items-center"><Building2 className="h-4 w-4 mr-1" /> {rab.project_name || 'Tanpa Proyek'}</span>
             <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider",
                  rab.status === 'draft' ? "bg-slate-100 text-slate-600 border-slate-200" :
                  rab.status === 'history' ? "bg-amber-100 text-amber-700 border-amber-200" :
                  "bg-emerald-100 text-emerald-700 border-emerald-200"
               )}>
                Status: {rab.status}
             </span>
             {rab.quotation_id && (
                <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                   <CheckCircle2 className="h-4 w-4 mr-1"/> Penawaran Linked
                </span>
             )}
          </div>
        </div>

        <div className="flex flex-col items-end">
           <span className="text-sm font-semibold text-slate-500 uppercase">Total RAB</span>
           <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(rab.total_amount)}</span>
           
           <div className="flex gap-2 mt-4">
              {rab.status === 'draft' && (
                 <button onClick={() => setStatus('approved')} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 font-medium text-sm rounded border border-emerald-200 hover:bg-emerald-100 transition flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1"/> Approve Draft
                 </button>
              )}
              {rab.status === 'approved' && !rab.quotation_id && (
                 <button onClick={() => setIsQuotationModalOpen(true)} className="px-3 py-1.5 bg-orange-50 text-orange-600 font-medium text-sm rounded border border-orange-200 hover:bg-orange-100 transition flex items-center">
                    <FileText className="h-4 w-4 mr-1"/> Buat Penawaran
                 </button>
              )}
              {(rab.status === 'history' || rab.status === 'approved') && (
                 <button onClick={generateNewVersion} className="px-3 py-1.5 bg-blue-50 text-blue-600 font-medium text-sm rounded border border-blue-200 hover:bg-blue-100 transition flex items-center">
                    <Copy className="h-4 w-4 mr-1"/> Buat Versi v{rab.version + 1}
                 </button>
              )}
           </div>
        </div>
      </div>

      {success && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg text-sm">{success}</div>}

      {/* Editor Warning */}
      {isReadonly && (
         <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 flex items-start gap-3">
            <History className="h-5 w-5 mt-0.5" />
            <div>
               <p className="font-semibold">RAB ini berstatus {rab.status.toUpperCase()}</p>
               <p className="text-sm mt-1">Anda tidak dapat mengubah isi atau angka pada versi RAB ini. Untuk merevisi, silakan klik tombol "Buat Versi Baru".</p>
            </div>
         </div>
      )}

      {/* RAB BUILDER / SECTIONS */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
           <h2 className="text-lg font-bold text-slate-800 dark:text-white">Rincian Pekerjaan</h2>
           {!isReadonly && (
              <button onClick={() => setIsSectionModalOpen(true)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition flex items-center">
                 <Plus className="h-4 w-4 mr-1"/> Tambah Kelompok Pekerjaan
              </button>
           )}
        </div>

        {rab.sections.length === 0 ? (
           <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center text-slate-500">
              Belum ada tahapan pekerjaan. Mulai dengan membuat kategori struktur atau persiapan.
           </div>
        ) : (
           rab.sections.map((sec:any, index: number) => (
             <div key={sec.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center group">
                   <div>
                      <span className="text-indigo-600 font-black mr-3">{index + 1}.</span>
                      <span className="font-bold text-slate-800 dark:text-white uppercase tracking-wider">{sec.name}</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(sec.subtotal || 0)}</span>
                      {!isReadonly && (
                         <button onClick={() => deleteSection(sec.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <Trash2 className="h-4 w-4" />
                         </button>
                      )}
                   </div>
                </div>
                
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 uppercase">
                       <tr>
                         <th className="px-4 py-3 w-[20%]">Kategori</th>
                         <th className="px-4 py-3 w-[40%]">Uraian / Material</th>
                         <th className="px-4 py-3 w-[10%]">Vol</th>
                         <th className="px-4 py-3 w-[10%]">Sat</th>
                         <th className="px-4 py-3 w-[15%] text-right">Harga Satuan</th>
                         <th className="px-4 py-3 w-[15%] text-right">Total</th>
                         {!isReadonly && <th className="px-2 py-3 w-[5%]"></th>}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sec.items.map((item:any) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                             <td className="px-4 py-2">
                                <select 
                                   disabled={isReadonly}
                                   className="w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-indigo-500 rounded text-slate-600"
                                   value={item.category}
                                   onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                                >
                                   <option value="material">Bahan & Material</option>
                                   <option value="tenaga">Upah Tenaga</option>
                                   <option value="alat">Sewa Alat</option>
                                   <option value="pekerjaan_subkon">Subkon/Borong</option>
                                </select>
                             </td>
                             <td className="px-4 py-2">
                                <input 
                                   disabled={isReadonly}
                                   type="text" 
                                   className="w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-indigo-500 rounded font-medium"
                                   value={item.item_name}
                                   onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                                   placeholder="Ketik nama item..."
                                />
                             </td>
                             <td className="px-4 py-2">
                                <input 
                                   disabled={isReadonly}
                                   type="number" 
                                   className="w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-indigo-500 rounded text-center"
                                   value={item.volume}
                                   onChange={(e) => updateItem(item.id, 'volume', e.target.value)}
                                />
                             </td>
                             <td className="px-4 py-2">
                                <input 
                                   disabled={isReadonly}
                                   type="text" 
                                   className="w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-indigo-500 rounded text-center text-slate-500 uppercase text-xs"
                                   value={item.unit}
                                   onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                   placeholder="m2, bh"
                                />
                             </td>
                             <td className="px-4 py-2">
                                <input 
                                   disabled={isReadonly}
                                   type="number" 
                                   className="w-full bg-transparent border-none p-1 focus:ring-1 focus:ring-indigo-500 rounded text-right font-medium text-emerald-600"
                                   value={item.unit_price}
                                   onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                                />
                             </td>
                             <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-white">
                                {formatCurrency(item.subtotal || 0)}
                             </td>
                             {!isReadonly && (
                               <td className="px-2 py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4"/></button>
                               </td>
                             )}
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>

                {!isReadonly && (
                  <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                     <button onClick={() => addItemToSection(sec.id)} className="flex items-center text-xs font-semibold tracking-wide text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded hover:bg-slate-50 transition w-full justify-center border border-dashed border-slate-300 dark:border-slate-700">
                        <Plus className="h-3 w-3 mr-1" /> Tambah Baris Item
                     </button>
                  </div>
                )}
             </div>
           ))
        )}
      </div>

      {/* Modal Add Section */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between">
                <h3 className="font-bold">Tambah Pekerjaan Utama</h3>
                <button onClick={() => setIsSectionModalOpen(false)}><X className="h-5 w-5 text-slate-400"/></button>
             </div>
             <form onSubmit={addSection} className="p-4 space-y-4">
                <input autoFocus required type="text" className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" placeholder="Misal: Pekerjaan Pondasi" value={sectionName} onChange={e => setSectionName(e.target.value)} />
                <div className="flex justify-end pt-2">
                   <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm">Simpan</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Quotation */}
      {isQuotationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between">
                <h3 className="font-bold flex items-center"><FileText className="h-5 w-5 text-orange-500 mr-2"/> Generate Penawaran</h3>
                <button onClick={() => setIsQuotationModalOpen(false)}><X className="h-5 w-5 text-slate-400"/></button>
             </div>
             <form onSubmit={createQuotation} className="p-4 space-y-4">
                <p className="text-sm text-slate-500 mb-4">Masa penawaran akan mengunci RAB versi {rab.version} sebesar <strong>{formatCurrency(rab.total_amount)}</strong></p>
                <div>
                   <label className="text-sm font-semibold mb-1 block">Nama Klien / Instansi</label>
                   <input required type="text" className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" value={quotationForm.client_name} onChange={e => setQuotationForm({...quotationForm, client_name: e.target.value})} />
                </div>
                <div>
                   <label className="text-sm font-semibold mb-1 block">Label Proyek di Penawaran</label>
                   <input required type="text" className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" value={quotationForm.project_name} onChange={e => setQuotationForm({...quotationForm, project_name: e.target.value})} placeholder={rab.project_name || "Misal: Revitalisasi Pabrik..."} />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                   <button type="button" onClick={() => setIsQuotationModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-md text-sm">Batal</button>
                   <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium">Buat Quotation</button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
