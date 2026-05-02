"use client";

import { useState, useEffect } from "react";
import { Plus, CalendarDays, Clock, AlertCircle, X, Save, Building, Loader2, Search, ChevronRight } from "lucide-react";

export default function TimelineMenuPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [timelines, setTimelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineForm, setTimelineForm] = useState({ title: "", description: "", start_date: "", end_date: "" });
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const selectedProject = projects.find(p => p.nomor.toString() === selectedProjectId.toString());
  const filteredProjects = projects.filter(p => 
    p.project_name.toLowerCase().includes(projectSearch.toLowerCase()) || 
    p.project_code.toLowerCase().includes(projectSearch.toLowerCase())
  );

  useEffect(() => {
    fetch('/api/proyek?limit=100')
      .then(r => r.json())
      .then(res => { if(res.success) setProjects(res.data) });
  }, []);

  const loadTimelines = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proyek/timeline?project_id=${projectId}`);
      const json = await res.json();
      if(json.success) {
         setTimelines(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(selectedProjectId) {
       loadTimelines(selectedProjectId);
    } else {
       setTimelines([]);
    }
  }, [selectedProjectId]);

  const saveTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/proyek/timeline', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: selectedProjectId, ...timelineForm })
      });
      const result = await res.json();
      if (result.success) {
        setIsTimelineModalOpen(false);
        setTimelineForm({ title: "", description: "", start_date: "", end_date: "" });
        loadTimelines(selectedProjectId);
      } else alert(result.error);
    } catch(err) { alert("Error"); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
         <div className="bg-indigo-600 p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
               <CalendarDays className="h-8 w-8 text-indigo-200"/> Pengaturan Timeline Proyek
            </h1>
            <p className="text-indigo-100 text-sm">Pilih proyek Anda di bawah ini untuk melihat dan menambahkan jadwal tahapan (Timeline/Gantt) pekerjaannya.</p>
         </div>
         <div className="p-6 bg-slate-50 dark:bg-slate-800/30">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Pilih Proyek:</label>
            <button 
              type="button" 
              onClick={() => setIsProjectModalOpen(true)}
              className="w-full max-w-xl flex items-center justify-between p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-left hover:border-indigo-400 transition-colors shadow-sm"
            >
              <div className="flex-1 truncate">
                 {selectedProject ? (
                    <div>
                       <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">{selectedProject.project_code}</div>
                       <div className="text-slate-900 dark:text-white font-semibold truncate text-lg">{selectedProject.project_name}</div>
                    </div>
                 ) : (
                    <span className="text-slate-400 font-medium text-lg">-- Browse & Pilih Proyek --</span>
                 )}
              </div>
              <Search className="h-6 w-6 text-slate-400 flex-shrink-0 ml-4" />
            </button>
         </div>
      </div>

      {selectedProjectId && (
         <div className="space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <CalendarDays className="h-5 w-5 text-indigo-500" /> Tahapan Pekerjaan (Fase)
              </h2>
              <button onClick={() => setIsTimelineModalOpen(true)} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors font-bold">
                 <Plus className="h-4 w-4 mr-1" /> Tambah Tahap Timeline
              </button>
            </div>

            <div className="space-y-3">
               {loading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-indigo-500"/></div>
               ) : timelines.length === 0 ? (
                  <div className="text-center p-12 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500">
                     <AlertCircle className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                     <p>Belum ada tahap pekerjaan yang dibuat untuk proyek ini.</p>
                     <p className="text-sm mt-1">Silakan klik Tambah Tahap Timeline di atas.</p>
                  </div>
               ) : (
                  timelines.map(t => (
                     <div key={t.nomor} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                           <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t.title}</h3>
                           <p className="text-sm text-slate-500 mt-1">{t.description || 'Tidak ada deskripsi'}</p>
                           <div className="flex gap-3 mt-3 text-xs text-slate-400 font-medium">
                              <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Mulai: {t.start_date || '?'}</span>
                              <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Selesai: {t.end_date || '?'}</span>
                           </div>
                        </div>
                        <div className="sm:w-32 flex flex-col items-end sm:border-l sm:border-slate-100 dark:border-slate-800 sm:pl-4 justify-center">
                           <span className="text-xs font-semibold text-slate-500 uppercase">Progress</span>
                           <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{parseFloat(t.progress_percentage).toFixed(0)}%</span>
                           {t.status === 'done' && <span className="mt-1 text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">Selesai</span>}
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>
      )}

      {/* MODAL TIMELINE */}
      {isTimelineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
             <div className="flex justify-between items-center p-5 bg-indigo-600 text-white">
               <h3 className="font-bold text-lg">Buat Tahap Baru</h3>
               <button onClick={() => setIsTimelineModalOpen(false)} className="text-indigo-200 hover:text-white"><X className="h-5 w-5"/></button>
             </div>
             <form onSubmit={saveTimeline} className="p-5 space-y-4">
                <div>
                   <label className="text-sm font-semibold mb-1 block">Nama Tahapan (Phase) *</label>
                   <input required type="text" className="w-full p-3 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="Misal: Pekerjaan Pondasi" value={timelineForm.title} onChange={e => setTimelineForm({...timelineForm, title: e.target.value})} />
                </div>
                <div>
                   <label className="text-sm font-semibold mb-1 block">Deskripsi Singkat</label>
                   <textarea rows={2} className="w-full p-3 border rounded-lg dark:bg-slate-800 dark:border-slate-700" value={timelineForm.description} onChange={e => setTimelineForm({...timelineForm, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-sm font-semibold mb-1 block">Tgl Mulai *</label>
                      <input required type="date" className="w-full p-3 border rounded-lg dark:bg-slate-800 dark:border-slate-700" value={timelineForm.start_date} onChange={e => setTimelineForm({...timelineForm, start_date: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-sm font-semibold mb-1 block">Target Selesai *</label>
                      <input required type="date" className="w-full p-3 border rounded-lg dark:bg-slate-800 dark:border-slate-700" value={timelineForm.end_date} onChange={e => setTimelineForm({...timelineForm, end_date: e.target.value})} />
                   </div>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                   <button type="button" onClick={() => setIsTimelineModalOpen(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 font-medium rounded-lg">Batal</button>
                   <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Simpan Timeline</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* --- MODAL BROWSE PROYEK --- */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col sm:p-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
           <div className="flex-1 sm:max-w-xl sm:mx-auto w-full flex flex-col bg-slate-50 dark:bg-slate-900 sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 dark:sm:border-slate-800 overflow-hidden">
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                 <button onClick={() => setIsProjectModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-5 w-5"/></button>
                 <h2 className="font-bold text-xl flex-1">Cari Proyek</h2>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input 
                       autoFocus
                       type="text" 
                       placeholder="Ketik nama atau kode proyek..."
                       value={projectSearch}
                       onChange={e => setProjectSearch(e.target.value)}
                       className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {filteredProjects.length === 0 ? (
                    <div className="text-center p-8 text-slate-500">Proyek tidak ditemukan</div>
                 ) : (
                    filteredProjects.map(p => (
                       <button 
                          key={p.nomor}
                          onClick={() => {
                             setSelectedProjectId(p.nomor.toString());
                             setIsProjectModalOpen(false);
                          }}
                          className="w-full text-left p-4 bg-white dark:bg-slate-800 border-2 border-transparent hover:border-indigo-400 rounded-xl shadow-sm transition-all focus:border-indigo-500 flex items-center gap-3 group"
                       >
                          <div className="flex-1">
                             <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">{p.project_code}</div>
                             <div className="font-semibold text-slate-800 dark:text-white line-clamp-2">{p.project_name}</div>
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
