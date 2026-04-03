"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
  onImageClick?: (index: number) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ value = [], onChange, onImageClick }) => {
  const [uploading, setUploading] = useState(false);

  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        
        // Resize logic (optional but good for 'ringan')
        let width = img.width;
        let height = img.height;
        const max_size = 1200;
        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas context not available");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject("Blob conversion failed");
        }, "image/webp", 0.8);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    const newPaths = [...value];

    try {
      for (const file of acceptedFiles) {
        const webpBlob = await convertToWebP(file);
        const renamedFile = new File([webpBlob], "image.webp", { type: "image/webp" });

        const formData = new FormData();
        formData.append("file", renamedFile);

        const res = await fetch("/api/master/barang/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          newPaths.push(data.url);
        }
      }
      onChange(newPaths);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Gagal mengupload gambar. Silakan coba lagi.");
    } finally {
      setUploading(false);
    }
  }, [value, onChange]);

  const onDropRejected = useCallback(() => {
    alert("File ditolak! Hanya file gambar JPG, JPEG, dan PNG yang diperbolehkan (Maksimal 5MB).");
  }, []);

  const removeImage = (path: string) => {
    onChange(value.filter((p) => p !== path));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { 
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"]
    },
    maxSize: 5 * 1024 * 1024, // 5MB limit
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer",
          isDragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-2" />
        ) : (
          <Upload className={cn("h-10 w-10 mb-2 transition-colors", isDragActive ? "text-indigo-500" : "text-slate-400")} />
        )}
        <div className="text-center">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            {uploading ? "Sedang mengupload..." : isDragActive ? "Lepaskan gambar di sini" : "Klik atau seret gambar ke sini"}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium italic">Hanya JPG, JPEG, PNG. Otomatis dikonversi ke WebP agar ringan.</p>
        </div>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {value.map((path, idx) => (
            <div 
              key={path} 
              onClick={() => onImageClick && onImageClick(idx)}
              className={cn(
                "group relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-indigo-300",
                onImageClick && "cursor-pointer"
              )}
            >
              <img src={path} alt="Barang" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); removeImage(path); }}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
