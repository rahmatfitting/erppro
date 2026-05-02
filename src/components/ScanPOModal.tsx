"use client";

import { useState } from "react";
import { X, Upload, FileText, Loader2, Sparkles } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface ScanPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export function ScanPOModal({ isOpen, onClose, onSuccess }: ScanPOModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("file", acceptedFiles[0]);

    try {
      const res = await fetch("/api/penjualan/order/ocr", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        onSuccess(result.data);
        onClose();
      } else {
        setError(result.error || "Gagal memproses file");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan sistem saat memproses OCR");
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            AI PO Scanner (OCR)
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {!loading ? (
            <div 
              {...getRootProps()} 
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Upload PO Customer
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                  Tarik & lepas file atau klik untuk memilih PO (Image/PDF)
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative h-16 w-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-t-4 border-indigo-600 animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-indigo-600 animate-bounce" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">AI Sedang Bekerja</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mengekstrak data PO dan mencocokkan dengan Master Barang...
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-2">
               <div className="text-red-600 text-xs font-medium">{error}</div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
             <button 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
             >
               Batal
             </button>
          </div>
        </div>
        
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
           <p className="text-[10px] text-center text-slate-400">
             Powered by Gemini AI Vision Flash 1.5
           </p>
        </div>
      </div>
    </div>
  );
}
