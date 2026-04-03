"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Archive, AlertCircle, FileEdit, Trash2, X, Search, ImageIcon } from "lucide-react";
import BrowseKategoriModal from "@/components/BrowseKategoriModal";
import { ImageUpload } from "@/components/ImageUpload";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";

export default function BarangDetail() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialMode = searchParams.get('mode') || 'view';
  
  const [isEdit, setIsEdit] = useState(initialMode === 'edit');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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
    gambar: [] as string[],
    nomor: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setFetching(true);
      try {
        // Fetch available UoM
        const resSatuan = await fetch('/api/master/satuan?limit=100');
        const dataSatuan = await resSatuan.json();
        if (dataSatuan.success) setSatuanList(dataSatuan.data);

        // Fetch Barang Detail
        const resBarang = await fetch(`/api/master/barang/${id}`);
        const dataBarang = await resBarang.json();

        if (dataBarang.success) {
          const item = dataBarang.data;
          setFormData({
            kode: item.kode || "",
            nama: item.nama || "",
            nomormhsatuan: item.nomormhsatuan || "",
            satuan: item.satuan || "",
            kategori: item.kategori || "",
            nomormhkategori: item.nomormhkategori || "",
            harga_beli: item.harga_beli || "",
            harga_jual: item.harga_jual || "",
            gambar: typeof item.gambar === 'string' ? JSON.parse(item.gambar) : (item.gambar || []),
            nomor: item.nomor || 0
          });
        } else {
          setError("Barang tidak ditemukan");
        }
      } catch (err: any) {
        setError("Error mengambil data");
        console.error("Error fetching", err);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!formData.nama || !formData.satuan) {
      setError("Nama dan Satuan wajib diisi");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/master/barang/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setIsEdit(false);
        if (result.offline) {
           setError("Tersimpan secara Offline. Perubahan akan disinkronisasi ketika koneksi pulih.");
           window.scrollTo(0, 0);
        }
      } else {
        setError(result.error || "Terjadi kesalahan saat mengupdate Barang");
      }
    } catch (err: any) {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus barang ini?")) return;
    try {
      const res = await fetch('/api/master/barang', {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id, action: 'delete' })
      });
      const result = await res.json();
      if (result.success) {
         router.push('/master/barang');
      } else {
         setError(result.error || "Gagal menghapus barang");
      }
    } catch (error) {
      setError("Terjadi kesalahan sistem");
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"></div>
      </div>
    );
  }

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
              <span className="text-sm font-medium text-slate-900 dark:text-white">Detail Barang</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {formData.kode} - {formData.nama}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isEdit ? (
            <>
              <Link 
                href="/master/barang"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
              <button 
                type="button"
                onClick={() => setIsEdit(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm hover:bg-amber-100 dark:hover:bg-amber-500/30 transition-all"
              >
                <FileEdit className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button 
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 shadow-sm hover:bg-red-100 dark:hover:bg-red-500/30 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                <span>Hapus</span>
              </button>
            </>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => setIsEdit(false)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Batal</span>
              </button>
              <button 
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-4 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Terjadi Kesalahan</h3>
            <div className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
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
                type="text"
                id="kode"
                value={formData.kode}
                readOnly
                className="block w-full rounded-md border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-2.5 text-sm shadow-sm text-slate-500 dark:text-slate-400 cursor-not-allowed uppercase"
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
                value={formData.nama || ""}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                readOnly={!isEdit}
                className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                  !isEdit 
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed" 
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-sky-500 focus:ring-sky-500 dark:text-white"
                }`}
              />
            </div>
            
             <div className="space-y-2">
              <label htmlFor="satuan" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Satuan Dasar <span className="text-red-500">*</span>
              </label>
              <select
                id="satuan"
                value={formData.satuan || ""}
                onChange={(e) => {
                   const selected = satuanList.find(s => s.kode === e.target.value);
                   if (selected) {
                      setFormData({ ...formData, satuan: selected.kode, nomormhsatuan: selected.nomor.toString() });
                   } else {
                      setFormData({ ...formData, satuan: e.target.value, nomormhsatuan: "" });
                   }
                }}
                disabled={!isEdit}
                className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                  !isEdit 
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed opacity-100" 
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-sky-500 focus:ring-sky-500 dark:text-white"
                }`}
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
                   name="kategori"
                   placeholder={isEdit ? "Pilih Kategori..." : "-"}
                   value={formData.kategori || ""}
                   onClick={() => isEdit && setIsBrowseKategoriOpen(true)}
                   className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                     !isEdit 
                       ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed opacity-100" 
                       : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-sky-500 focus:ring-sky-500 cursor-pointer dark:text-white"
                   }`}
                 />
                 {isEdit && (
                   <button
                     type="button"
                     onClick={() => setIsBrowseKategoriOpen(true)}
                     className="px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                   >
                     <Search className="h-4 w-4 text-slate-500" />
                   </button>
                 )}
               </div>

               <BrowseKategoriModal
                 isOpen={isBrowseKategoriOpen}
                 onClose={() => setIsBrowseKategoriOpen(false)}
                 onSelect={(kat: any) => {
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
                 value={formData.harga_beli || ""}
                 onChange={(e) => setFormData({ ...formData, harga_beli: e.target.value })}
                 readOnly={!isEdit}
                 className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                  !isEdit 
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed" 
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-sky-500 focus:ring-sky-500 dark:text-white"
                }`}
               />
             </div>
             <div className="space-y-2">
               <label htmlFor="harga_jual" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                 Harga Jual Standar (IDR)
               </label>
               <input
                 type="number"
                 id="harga_jual"
                 value={formData.harga_jual || ""}
                 onChange={(e) => setFormData({ ...formData, harga_jual: e.target.value })}
                 readOnly={!isEdit}
                 className={`block w-full rounded-md px-4 py-2.5 text-sm shadow-sm transition-colors ${
                  !isEdit 
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 cursor-not-allowed" 
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-sky-500 focus:ring-sky-500 dark:text-white"
                }`}
               />
             </div>
          </div>
          <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 mt-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm">3</span>
              Foto / Gambar Barang
            </h3>
          </div>
          {isEdit ? (
            <ImageUpload 
                value={formData.gambar}
                onChange={(paths) => setFormData({ ...formData, gambar: paths })}
                onImageClick={(idx) => {
                  setPreviewIndex(idx);
                  setIsPreviewOpen(true);
                }}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {formData.gambar.map((path, idx) => (
                    <button 
                      key={path} 
                      onClick={() => {
                        setPreviewIndex(idx);
                        setIsPreviewOpen(true);
                      }}
                      className="group aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-400 transition-all active:scale-95 shadow-sm"
                    >
                        <img src={path} alt="Barang" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                    </button>
                ))}
                {formData.gambar.length === 0 && (
                    <div className="col-span-full py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-xs italic">Belum ada foto untuk barang ini.</p>
                    </div>
                )}
            </div>
          )}
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
