"use client";

import { useState, useEffect } from "react";
import { Camera, Image as ImageIcon, MapPin, Calendar, Clock, Loader2, Search, X } from "lucide-react";
import Link from "next/link";

export default function DokumentasiGlobalPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/proyek/dokumentasi')
      .then(r => r.json())
      .then(res => {
         if(res.success) setDocs(res.data);
         setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredDocs = docs.filter(d => 
     d.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     d.timeline_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
         <div className="bg-indigo-600 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                  <Camera className="h-8 w-8 text-indigo-200"/> Galeri Dokumentasi Lapangan
               </h1>
               <p className="text-indigo-100 text-sm">Arsip seluruh foto laporan dari semua proyek dan tahapan.</p>
            </div>
            <div className="relative w-full sm:w-72 mt-2 sm:mt-0">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300" />
               <input 
                  type="text" 
                  placeholder="Cari nama proyek..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-indigo-700/50 border border-indigo-500/50 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white transition-shadow"
               />
            </div>
         </div>
      </div>

      {loading ? (
         <div className="flex justify-center p-12">
           <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
         </div>
      ) : filteredDocs.length === 0 ? (
         <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
            <ImageIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">Tidak ada foto dokumentasi ditemukan.</p>
         </div>
      ) : (
         <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {filteredDocs.map(d => (
               <div key={d.nomor} className="break-inside-avoid bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group">
                  <div className="relative cursor-pointer" onClick={() => setSelectedImage(d.file_url)}>
                     <img src={d.file_url} alt="Dokumentasi" className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-white text-sm font-medium flex items-center gap-1"><Search className="h-4 w-4"/> Klik untuk perbesar</span>
                     </div>
                  </div>
                  <div className="p-4">
                     <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-sm uppercase tracking-wider">{d.project_code}</span>
                        <span className="text-xs text-slate-400 flex items-center"><Calendar className="h-3 w-3 mr-1"/>{new Date(d.report_date).toLocaleDateString('id-ID')}</span>
                     </div>
                     <Link href={`/proyek/${d.project_id}`} className="font-bold text-slate-900 dark:text-white leading-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2 mb-1">
                        {d.project_name}
                     </Link>
                     <p className="text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-1 mb-2">{d.timeline_name || 'Umum'}</p>
                     
                     <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
                        {d.description || 'Tidak ada deskripsi'}
                     </div>
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* FULLSCREEN IMAGE MODAL */}
      {selectedImage && (
         <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedImage(null)}
         >
            <button className="absolute top-4 right-4 text-white hover:text-red-400 transition-colors bg-white/10 p-2 rounded-full" onClick={() => setSelectedImage(null)}>
               <X className="h-6 w-6"/>
            </button>
            <img src={selectedImage} alt="Fullscreen Detail" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
         </div>
      )}
    </div>
  );
}
