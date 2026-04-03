"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Archive, AlertCircle, Search, ImageIcon } from "lucide-react";
import BrowseKategoriModal from "@/components/BrowseKategoriModal";
import { ImageUpload } from "@/components/ImageUpload";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";

export default function BarangCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Master data state for Select dropdowns
  const [satuanList, setSatuanList] = useState<any[]>([]);
  const [isBrowseKategoriOpen, setIsBrowseKategoriOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    nomormhsatuan: "",
    satuan: "",
    kategori: "",
    nomormhkategori: "",
    harga_beli: "",
    harga_jual: "",
    gambar: [] as string[]
  });

  useEffect(() => {
    // Fetch available UoM
    fetch('/api/master/satuan?limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSatuanList(data.data);
      })
      .catch(err => console.error("Error fetching satuan", err));
  }, []);


  const handleSave = async () => {
    if (!formData.nama || !formData.satuan) {
      setError("Nama dan Satuan wajib diisi");
      return;
    }

    setLoading(true);
    setError(null);

    try {
       // Lookup the nomormhsatuan based on selected text if needed, though we can pass both or just let backend handle it
       // In this simple DB structure, storing the text 'satuan' is enough, nomormhsatuan is optional relational
      const response = await fetch('/api/master/barang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        if (result.offline) {
           setError("Tersimpan secara Offline. Anda dapat melanjutkan input data lain.");
           // Reset form for next input to avoid duplicates
            setFormData({
               kode: "",
               nama: "",
               nomormhsatuan: "",
               satuan: "",
               kategori: "",
               nomormhkategori: "",
               harga_beli: "",
               harga_jual: "",
               gambar: []
            });
           window.scrollTo(0, 0);
        } else {
           router.push(`/master/barang/${result.data.nomor}`);
        }
      } else {
        setError(result.error || "Terjadi kesalahan saat menyimpan Barang");
      }
    } catch (err: any) {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center border border-sky-200 dark:border-sky-800/50">
            <Archive className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href="/master/barang" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
                Master Barang
              </Link>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">Form Baru</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Tambah Barang (Item)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link 
            href="/master/barang"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali</span>
          </Link>
          <button 
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{loading ? 'Menyimpan...' : 'Simpan Barang'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-4 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Gagal Menyimpan</h3>
            <div className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Form Container */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm">1</span>
              Informasi Umum
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <div className="space-y-2">
              <label htmlFor="kode" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Kode Barang <span className="text-red-500">*</span>
              </label>
              <input
                readOnly
                type="text"
                id="kode"
                name="kode"
                value={formData.kode || "AUTO"}
                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 px-4 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500 dark:text-white uppercase font-mono font-semibold text-sky-600 cursor-not-allowed"
                placeholder="Auto Generated"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="nama" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nama Barang <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nama"
                name="nama"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500 dark:text-white"
                placeholder="Contoh: Baja Ringan 0.75mm"
              />
            </div>
            
             <div className="space-y-2">
              <label htmlFor="satuan" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Satuan Dasar <span className="text-red-500">*</span>
              </label>
              <select
                id="satuan"
                value={formData.satuan}
                onChange={(e) => {
                   const selected = satuanList.find(s => s.kode === e.target.value);
                   if (selected) {
                      setFormData({ ...formData, satuan: selected.kode, nomormhsatuan: selected.nomor.toString() });
                   } else {
                      setFormData({ ...formData, satuan: e.target.value, nomormhsatuan: "" });
                   }
                }}
                className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500 dark:text-white"
              >
                <option value="">-- Pilih Satuan --</option>
                {satuanList.map(s => (
                   <option key={s.kode} value={s.kode}>{s.nama} ({s.kode})</option>
                ))}
              </select>
            </div>

             <div className="space-y-2">
               <label htmlFor="kategori" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                 Kategori
               </label>
               <div className="flex gap-2">
                  <input
                    readOnly
                    type="text"
                    id="kategori"
                    placeholder="Pilih Kategori..."
                    value={formData.kategori}
                    onClick={() => setIsBrowseKategoriOpen(true)}
                    className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 px-4 py-2.5 text-sm shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-all dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setIsBrowseKategoriOpen(true)}
                    className="px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                  >
                    <Search className="h-4 w-4 text-slate-500" />
                  </button>
               </div>
               
               <BrowseKategoriModal
                  isOpen={isBrowseKategoriOpen}
                  onClose={() => setIsBrowseKategoriOpen(false)}
                  onSelect={(kat) => {
                    setFormData({ ...formData, nomormhkategori: kat.nomor.toString(), kategori: kat.nama });
                    setIsBrowseKategoriOpen(false);
                  }}
               />
             </div>
          </div>

          <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm">2</span>
              Informasi Harga (Opsional)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
               <label htmlFor="harga_beli" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                 Harga Beli Standar (IDR)
               </label>
               <input
                 type="number"
                 id="harga_beli"
                 value={formData.harga_beli}
                 onChange={(e) => setFormData({ ...formData, harga_beli: e.target.value })}
                 className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500 dark:text-white"
                 placeholder="0"
                 min="0"
               />
             </div>
             <div className="space-y-2">
               <label htmlFor="harga_jual" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                 Harga Jual Standar (IDR)
               </label>
               <input
                 type="number"
                 id="harga_jual"
                 value={formData.harga_jual}
                 onChange={(e) => setFormData({ ...formData, harga_jual: e.target.value })}
                 className="block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500 dark:text-white"
                 placeholder="0"
                 min="0"
               />
             </div>
          </div>
          <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 mt-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm">3</span>
              Foto / Gambar Barang
            </h3>
          </div>
          <ImageUpload 
            value={formData.gambar}
            onChange={(paths) => setFormData({ ...formData, gambar: paths })}
            onImageClick={(idx) => {
              setPreviewIndex(idx);
              setIsPreviewOpen(true);
            }}
          />
        </div>
      </div>

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        images={formData.gambar}
        currentIndex={previewIndex}
        onIndexChange={setPreviewIndex}
      />
    </div>
  );
}
