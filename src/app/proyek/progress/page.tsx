"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, Image as ImageIcon, Loader2, Send, CheckCircle2, CloudRain, Sun, AlertTriangle, Search, X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MobileProgressPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [timelines, setTimelines] = useState<any[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTimelineId, setSelectedTimelineId] = useState("");
  
  const [progressVal, setProgressVal] = useState("0");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState("Cerah");
  const [description, setDescription] = useState("");
  const [issues, setIssues] = useState("");
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

  useEffect(() => {
    fetch('/api/proyek?limit=100')
      .then(r => r.json())
      .then(res => { if(res.success) setProjects(res.data) });
  }, []);

  useEffect(() => {
    if(selectedProjectId) {
      fetch(`/api/proyek/timeline?project_id=${selectedProjectId}`)
        .then(r => r.json())
        .then(res => { if(res.success) setTimelines(res.data) });
    } else {
      setTimelines([]);
    }
  }, [selectedProjectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      
      // Mencegah select file yang bukan gambar dari File Explorer
      if (!f.type.startsWith('image/')) {
         alert("Hanya file gambar (foto) yang diizinkan untuk diunggah!");
         return;
      }
      
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const img = new window.Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Update Preview directly with compressed WebP
          const webpDataUrl = canvas.toDataURL("image/webp", 0.7);
          setPreview(webpDataUrl);

          // Create Blob and save to File state
          canvas.toBlob((blob) => {
            if (blob) {
              const baseName = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
              const compressedFile = new File([blob], `${baseName}.webp`, {
                type: "image/webp",
                lastModified: Date.now(),
              });
              setFile(compressedFile);
            }
          }, "image/webp", 0.7);
        };
      };
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return alert("Pilih Proyek!");
    if (!selectedTimelineId) return alert("Pilih Tahapan (Timeline)!");
    if (!file) return alert("Foto Dokumentasi WAJIB dilampirkan!");

    setLoading(true);
    const formData = new FormData();
    formData.append('project_id', selectedProjectId);
    formData.append('timeline_id', selectedTimelineId);
    formData.append('report_date', reportDate);
    formData.append('progress_percentage', progressVal);
    formData.append('description', description);
    formData.append('weather', weather);
    formData.append('issues', issues);
    formData.append('file', file);

    try {
      const res = await fetch('/api/proyek/progress', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
           setSuccess(false);
           setSelectedProjectId("");
           setSelectedTimelineId("");
           setProgressVal("0");
           setDescription("");
           setIssues("");
           setFile(null);
           setPreview(null);
        }, 3000);
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem saat upload");
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.nomor.toString() === selectedProjectId.toString());
  const selectedTimeline = timelines.find(t => t.nomor.toString() === selectedTimelineId.toString());

  const filteredProjects = projects.filter(p => 
    p.project_name.toLowerCase().includes(projectSearch.toLowerCase()) || 
    p.project_code.toLowerCase().includes(projectSearch.toLowerCase())
  );

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl m-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <CheckCircle2 className="h-20 w-20 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Berhasil!</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Progress report & foto berhasil diupload ke sistem.</p>
        <button onClick={() => setSuccess(false)} className="w-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl">
          Input Progress Lain
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-20 relative">
      <div className="bg-indigo-600 p-5 text-white">
        <h1 className="text-xl font-bold">Input Progress Lapangan</h1>
        <p className="text-indigo-200 text-sm opacity-90 mt-1">Laporan harian/mingguan</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* Pilihan Proyek & Timeline (Browse Style) */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Proyek</label>
            <button 
              type="button" 
              onClick={() => setIsProjectModalOpen(true)}
              className="w-full flex items-center justify-between p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-left hover:border-indigo-400 transition-colors"
            >
              <div className="flex-1 truncate">
                 {selectedProject ? (
                    <div>
                       <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{selectedProject.project_code}</div>
                       <div className="text-slate-900 dark:text-white font-medium truncate">{selectedProject.project_name}</div>
                    </div>
                 ) : (
                    <span className="text-slate-400 font-medium">-- Browse & Pilih Proyek --</span>
                 )}
              </div>
              <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
            </button>
          </div>

          {selectedProjectId && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tahapan Pekerjaan</label>
              <button 
                type="button" 
                onClick={() => setIsTimelineModalOpen(true)}
                className="w-full flex items-center justify-between p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-left hover:border-indigo-400 transition-colors"
              >
                <div className="flex-1 truncate">
                   {selectedTimeline ? (
                      <div className="text-slate-900 dark:text-white font-medium truncate">{selectedTimeline.title}</div>
                   ) : (
                      <span className="text-slate-400 font-medium">-- Browse & Pilih Tahapan --</span>
                   )}
                </div>
                <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Progress Slider */}
        <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-semibold text-indigo-900 dark:text-indigo-300">Progress Pekerjaan</label>
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{progressVal}%</span>
          </div>
          <input 
            type="range" min="0" max="100" step="1"
            value={progressVal}
            onChange={e => setProgressVal(e.target.value)}
            className="w-full h-3 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Weather */}
        <div>
           <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Kondisi Cuaca</label>
           <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setWeather('Cerah')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${weather === 'Cerah' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                <Sun className="h-5 w-5" /> Cerah
              </button>
              <button type="button" onClick={() => setWeather('Hujan')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${weather === 'Hujan' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                <CloudRain className="h-5 w-5" /> Hujan
              </button>
           </div>
        </div>

        {/* Catatan & Kendala */}
        <div className="space-y-4">
           <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Singkat</label>
              <textarea 
                 rows={2}
                 value={description}
                 onChange={e => setDescription(e.target.value)}
                 className="w-full p-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                 placeholder="Apa yang dikerjakan hari ini..."
              />
           </div>
           <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                 <AlertTriangle className="h-4 w-4"/> Ada Kendala? (Opsional)
              </label>
              <input 
                 type="text"
                 value={issues}
                 onChange={e => setIssues(e.target.value)}
                 className="w-full p-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                 placeholder="Misal: Material terlambat datang"
              />
           </div>
        </div>
        
        {/* Upload Foto Mandatori */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
           <label className="block text-sm font-bold text-slate-900 dark:text-white mb-3">Foto Dokumentasi (Wajib) <span className="text-red-500">*</span></label>
           
           <input 
             type="file" accept="image/*" capture="environment" 
             className="hidden" ref={fileInputRef}
             onChange={handleFileChange}
           />
           
           {preview ? (
             <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 aspect-video bg-slate-100">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                   Ganti Foto
                </button>
             </div>
           ) : (
             <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                  <Camera className="h-8 w-8" />
                  <span className="font-semibold text-sm">Ambil Kamera</span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-colors">
                  <ImageIcon className="h-8 w-8" />
                  <span className="font-semibold text-sm">Pilih Galeri</span>
                </button>
             </div>
           )}
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          disabled={loading || !file}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
          {loading ? "Mengirim Data..." : "Submit Progress"}
        </button>
      </form>

      {/* --- MODAL BROWSE PROYEK --- */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col sm:p-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
           <div className="flex-1 sm:max-w-lg sm:mx-auto w-full flex flex-col bg-slate-50 dark:bg-slate-900 sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 dark:sm:border-slate-800 overflow-hidden">
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                 <button onClick={() => setIsProjectModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-5 w-5"/></button>
                 <h2 className="font-bold text-lg flex-1">Cari Proyek</h2>
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
                             setSelectedTimelineId("");
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

      {/* --- MODAL BROWSE TIMELINE --- */}
      {isTimelineModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col sm:p-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
           <div className="flex-1 sm:max-w-lg sm:mx-auto w-full flex flex-col bg-slate-50 dark:bg-slate-900 sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 dark:sm:border-slate-800 overflow-hidden">
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                 <button onClick={() => setIsTimelineModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-5 w-5"/></button>
                 <h2 className="font-bold text-lg flex-1">Pilih Tahapan (Timeline)</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {timelines.length === 0 ? (
                    <div className="text-center p-8 text-slate-500">
                       Belum ada tahapan pada proyek ini.<br/><br/>
                       Mohon tambahkan terlebih dahulu melalui menu Timeline Utama.
                    </div>
                 ) : (
                    timelines.map(t => (
                       <button 
                          key={t.nomor}
                          onClick={() => {
                             setSelectedTimelineId(t.nomor.toString());
                             // Set progress value to the current progress of that timeline to make it convenient
                             setProgressVal(parseFloat(t.progress_percentage).toFixed(0));
                             setIsTimelineModalOpen(false);
                          }}
                          className="w-full text-left p-4 bg-white dark:bg-slate-800 border-2 border-transparent hover:border-indigo-400 rounded-xl shadow-sm transition-all focus:border-indigo-500 flex items-center justify-between group"
                       >
                          <div>
                             <div className="font-bold text-slate-800 dark:text-white text-lg">{t.title}</div>
                             <div className="text-sm text-slate-500 mt-1">Status saat ini: {parseFloat(t.progress_percentage).toFixed(0)}%</div>
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
