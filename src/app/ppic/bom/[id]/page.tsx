"use client";

import { useState, useEffect } from "react";
import { BOMForm } from "../components/BOMForm";
import { Loader2 } from "lucide-react";

export default function EditBOMPage({ params }: { params: { id: string } }) {
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`/api/ppic/bom/${params.id}`);
        const json = await res.json();
        if (json.success) {
          setInitialData(json.data);
        }
      } catch (error) {
        console.error("Gagal memuat data BOM:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Memuat data BOM...</p>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-800">BOM tidak ditemukan</h2>
        <p className="text-slate-500 mt-2">Data yang Anda cari mungkin sudah dihapus atau tidak tersedia.</p>
      </div>
    );
  }

  return <BOMForm id={params.id} initialData={initialData} />;
}
