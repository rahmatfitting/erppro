"use client";

import { useState, useEffect } from "react";
import { Plus, Users, CalendarDays, BarChart3, Clock, AlertCircle, X, Save, ArrowLeft, Building, UserCheck, Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProyekDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [timelines, setTimelines] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [masterSubcons, setMasterSubcons] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Browse Modals
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isSubconModalOpen, setIsSubconModalOpen] = useState(false);
  const [isMasterSubconBrowseOpen, setIsMasterSubconBrowseOpen] = useState(false);
  const [subconSearch, setSubconSearch] = useState("");

  // Forms
  const [timelineForm, setTimelineForm] = useState({ title: "", description: "", start_date: "", end_date: "" });
  const [subconForm, setSubconForm] = useState({ subcontractor_id: "", role: "", start_date: "", end_date: "" });

  const selectedMasterSubcon = masterSubcons.find(s => s.nomor.toString() === subconForm.subcontractor_id.toString());
  const filteredMasterSubcons = masterSubcons.filter(s => 
    s.name.toLowerCase().includes(subconSearch.toLowerCase()) || 
    s.specialization?.toLowerCase().includes(subconSearch.toLowerCase())
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch master project details
      const res = await fetch(`/api/proyek`);
      const json = await res.json();
      if (json.success) {
         const p = json.data.find((x:any) => x.nomor.toString() === id);
         setProject(p);
      }

      // Fetch Timelines
      const tRes = await fetch(`/api/proyek/timeline?project_id=${id}`);
      const tJson = await tRes.json();
      if(tJson.success) setTimelines(tJson.data);

      // Fetch Subcontractors
      const sRes = await fetch(`/api/proyek/assign-subkon?project_id=${id}`);
      const sJson = await sRes.json();
      if(sJson.success) setSubcontractors(sJson.data);

      // Fetch Master Subcons for assignment
      const mRes = await fetch(`/api/master/subkontraktor?limit=999`);
      const mJson = await mRes.json();
      if(mJson.success) setMasterSubcons(mJson.data);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const saveTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/proyek/timeline', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id, ...timelineForm })
      });
      const result = await res.json();
      if (result.success) {
        setIsTimelineModalOpen(false);
        setTimelineForm({ title: "", description: "", start_date: "", end_date: "" });
        fetchData();
      } else alert(result.error);
    } catch(err) { alert("Error"); }
  };

  const saveSubcon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/proyek/assign-subkon', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id, ...subconForm })
      });
      const result = await res.json();
      if (result.success) {
        setIsSubconModalOpen(false);
        setSubconForm({ subcontractor_id: "", role: "", start_date: "", end_date: "" });
        fetchData();
      } else alert(result.error);
    } catch(err) { alert("Error"); }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Memuat Data Proyek...</div>;
  if (!project) return <div className="p-12 text-center text-red-500">Proyek tidak ditemukan</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
         <div className="bg-indigo-600 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
               <Link href="/proyek" className="inline-flex items-center text-indigo-200 hover:text-white mb-4 text-sm font-medium transition-colors">
                 <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Daftar
               </Link>
               <h1 className="text-3xl font-bold text-white mb-2">{project.project_name}</h1>
               <div className="flex flex-wrap items-center gap-4 text-indigo-100 text-sm">
                  <span className="flex items-center"><Building className="h-4 w-4 mr-1"/> {project.client_name || 'Internal'}</span>
                  <span className="flex items-center"><CalendarDays className="h-4 w-4 mr-1"/> {project.start_date || '?'} s/d {project.end_date || '?'}</span>
                  <span className="flex items-center px-2.5 py-0.5 rounded-full bg-white/20 text-white font-medium">Status: {project.status}</span>
               </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex flex-col items-center min-w-[150px] shadow-lg">
               <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Progress</span>
               <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{parseFloat(project.progress_percentage).toFixed(1)}%</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Kiri: Timelines */}
         <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <CalendarDays className="h-5 w-5 text-indigo-500" /> Tahapan & Timeline
              </h2>
              <button onClick={() => setIsTimelineModalOpen(true)} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors">
                 <Plus className="h-4 w-4 mr-1" /> Tambah Tahap
              </button>
            </div>

            <div className="space-y-3">
               {timelines.length === 0 ? (
                  <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
                     Belum ada tahap pekerjaan yang didefinisikan.
                  </div>
               ) : (
                  timelines.map(t => (
                     <div key={t.nomor} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                           <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t.title}</h3>
                           <p className="text-sm text-slate-500 mt-1">{t.description || 'Tidak ada deskripsi'}</p>
                           <div className="flex gap-3 mt-3 text-xs text-slate-400 font-medium">
                              <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {t.start_date || '?'} - {t.end_date || '?'}</span>
                           </div>
                        </div>
                        <div className="sm:w-32 flex flex-col items-end sm:border-l sm:border-slate-100 dark:border-slate-800 sm:pl-4 justify-center">
                           <span className="text-xs font-semibold text-slate-500 uppercase">Progress</span>
                           <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">{parseFloat(t.progress_percentage).toFixed(0)}%</span>
                           {t.status === 'done' && <span className="mt-1 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Selesai</span>}
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>

         {/* Kanan: Subkontraktor */}
         <div className="space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <Users className="h-5 w-5 text-orange-500" /> Subkontraktor
              </h2>
              <button onClick={() => setIsSubconModalOpen(true)} className="flex items-center text-sm font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1.5 rounded-md transition-colors">
                 <Plus className="h-4 w-4" /> Assign
              </button>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
               {subcontractors.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                     Belum ada subkontraktor yang diassign ke proyek ini.
                  </div>
               ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                     {subcontractors.map(s => (
                        <li key={s.nomor} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                           <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-slate-800 dark:text-white">{s.subcon_name}</span>
                              <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{s.role}</span>
                           </div>
                           <div className="flex items-center gap-2 text-xs text-slate-500">
                              <UserCheck className="h-3 w-3" /> {s.specialization} · {s.phone}
                           </div>
                        </li>
                     ))}
                  </ul>
               )}
            </div>
         </div>
      </div>

      {/* MODAL TIMELINE */}
      {isTimelineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800">
             <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
               <h3 className="font-bold">Tambah Tahapan (Timeline)</h3>
               <button onClick={() => setIsTimelineModalOpen(false)}><X className="h-5 w-5 text-slate-400"/></button>
             </div>
             <form onSubmit={saveTimeline} className="p-4 space-y-4">
                <div>
                   <label className="text-sm font-medium mb-1 block">Nama Tahapan *</label>
                   <input required type="text" className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" placeholder="Misal: Pekerjaan Pondasi" value={timelineForm.title} onChange={e => setTimelineForm({...timelineForm, title: e.target.value})} />
                </div>
                <div>
                   <label className="text-sm font-medium mb-1 block">Deskripsi</label>
                   <textarea rows={2} className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" value={timelineForm.description} onChange={e => setTimelineForm({...timelineForm, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-sm font-medium mb-1 block">Mulai</label>
                      <input type="date" className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" value={timelineForm.start_date} onChange={e => setTimelineForm({...timelineForm, start_date: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-sm font-medium mb-1 block">Selesai</label>
                      <input type="date" className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" value={timelineForm.end_date} onChange={e => setTimelineForm({...timelineForm, end_date: e.target.value})} />
                   </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                   <button type="button" onClick={() => setIsTimelineModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-md">Batal</button>
                   <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Simpan</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* MODAL ASSIGN SUBCON */}
      {isSubconModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800">
             <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
               <h3 className="font-bold">Assign Subkontraktor</h3>
               <button onClick={() => setIsSubconModalOpen(false)}><X className="h-5 w-5 text-slate-400"/></button>
             </div>
             <form onSubmit={saveSubcon} className="p-4 space-y-4">
                <div>
                   <label className="text-sm font-medium mb-1 block">Pilih Subkontraktor *</label>
                   <button 
                      type="button" 
                      onClick={() => setIsMasterSubconBrowseOpen(true)}
                      className="w-full flex items-center justify-between p-3 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-left hover:border-indigo-400 transition-colors shadow-sm"
                    >
                       <div className="flex-1 truncate">
                          {selectedMasterSubcon ? (
                             <div>
                                <div className="text-slate-900 dark:text-white font-semibold truncate text-base">{selectedMasterSubcon.name}</div>
                                <div className="text-xs text-slate-500 font-medium">{selectedMasterSubcon.specialization}</div>
                             </div>
                          ) : (
                             <span className="text-slate-400 font-medium">-- Browse & Pilih Subkon --</span>
                          )}
                       </div>
                       <Search className="h-5 w-5 text-slate-400 flex-shrink-0 ml-4" />
                    </button>
                </div>
                <div>
                   <label className="text-sm font-medium mb-1 block">Role / Tugas</label>
                   <input type="text" className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" placeholder="Misal: Tukang Listrik" value={subconForm.role} onChange={e => setSubconForm({...subconForm, role: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-sm font-medium mb-1 block">Tanggal Masuk</label>
                      <input type="date" className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" value={subconForm.start_date} onChange={e => setSubconForm({...subconForm, start_date: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-sm font-medium mb-1 block">Tanggal Keluar</label>
                      <input type="date" className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700" value={subconForm.end_date} onChange={e => setSubconForm({...subconForm, end_date: e.target.value})} />
                   </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                   <button type="button" onClick={() => setIsSubconModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-md">Batal</button>
                   <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-md">Assign</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* --- MODAL BROWSE MASTER SUBKONTRAKTOR --- */}
      {isMasterSubconBrowseOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col sm:p-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
           <div className="flex-1 sm:max-w-lg sm:mx-auto w-full flex flex-col bg-slate-50 dark:bg-slate-900 sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 dark:sm:border-slate-800 overflow-hidden">
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                 <button onClick={() => setIsMasterSubconBrowseOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-5 w-5"/></button>
                 <h2 className="font-bold text-lg flex-1">Browse Subkontraktor</h2>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input 
                       autoFocus
                       type="text" 
                       placeholder="Cari nama atau spesialisasi..."
                       value={subconSearch}
                       onChange={e => setSubconSearch(e.target.value)}
                       className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {filteredMasterSubcons.length === 0 ? (
                    <div className="text-center p-8 text-slate-500">Subkontraktor tidak ditemukan</div>
                 ) : (
                    filteredMasterSubcons.map(s => (
                       <button 
                          key={s.nomor}
                          onClick={() => {
                             setSubconForm({ ...subconForm, subcontractor_id: s.nomor.toString() });
                             setIsMasterSubconBrowseOpen(false);
                          }}
                          className="w-full text-left p-4 bg-white dark:bg-slate-800 border-2 border-transparent hover:border-indigo-400 rounded-xl shadow-sm transition-all focus:border-indigo-500 flex items-center gap-3 group"
                       >
                          <div className="flex-1">
                             <div className="font-bold text-slate-800 dark:text-white">{s.name}</div>
                             <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-semibold uppercase tracking-wider">{s.specialization}</div>
                             <div className="text-xs text-slate-500 mt-0.5">{s.phone}</div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                       </button>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
