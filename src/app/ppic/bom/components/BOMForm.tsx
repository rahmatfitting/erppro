"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileText, Loader2, Search, Cpu, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

type BOMDetail = {
  id: number;
  item_id: number | null;
  kode_barang: string;
  nama_barang: string;
  satuan: string;
  satuan_id: number | null;
  jumlah: number;
};

interface BOMFormProps {
  id?: string;
  initialData?: any;
}

export function BOMForm({ id, initialData }: BOMFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    kode: initialData?.kode || "",
    nama: initialData?.nama || "",
    item_id: initialData?.item_id || null,
    item_nama: initialData?.item_nama || "",
    keterangan: initialData?.keterangan || "",
  });

  const [items, setItems] = useState<BOMDetail[]>(
    initialData?.items?.map((it: any) => ({
      id: it.nomor,
      item_id: it.item_id,
      kode_barang: it.kode_barang || "",
      nama_barang: it.item_nama,
      satuan: it.satuan_nama,
      satuan_id: it.satuan_id,
      jumlah: it.jumlah
    })) || [
      { id: Date.now(), item_id: null, kode_barang: "", nama_barang: "", satuan: "", satuan_id: null, jumlah: 1 },
    ]
  );

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"header" | "detail">("header");
  const [activeRowId, setActiveRowId] = useState<number | null>(null);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now(), item_id: null, kode_barang: "", nama_barang: "", satuan: "", satuan_id: null, jumlah: 1 },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof BOMDetail, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const openBrowseModal = (mode: "header" | "detail", rowId?: number) => {
    setModalMode(mode);
    setActiveRowId(rowId || null);
    setIsModalOpen(true);
  };

  const handleSelectBarang = (barang: any) => {
    if (modalMode === "header") {
      setHeader({
        ...header,
        item_id: barang.nomor,
        item_nama: barang.nama
      });
    } else if (modalMode === "detail" && activeRowId !== null) {
      setItems(items.map((item) => {
        if (item.id === activeRowId) {
          return {
            ...item,
            item_id: barang.nomor,
            kode_barang: barang.kode,
            nama_barang: barang.nama,
            satuan: barang.satuan_nama || "Pcs",
            satuan_id: barang.nomormhsatuan
          };
        }
        return item;
      }));
    }
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!header.kode || !header.nama || !header.item_id) {
        throw new Error("Kode, Nama Struktur, dan Produk Jadi wajib diisi");
      }
      
      const validItems = items.filter(i => i.item_id !== null && i.jumlah > 0);
      if (validItems.length === 0) throw new Error("Minimal satu komponen bahan baku harus diisi");

      const payload = {
        kode: header.kode,
        nama: header.nama,
        item_id: header.item_id,
        keterangan: header.keterangan,
        items: validItems.map(item => ({
          item_id: item.item_id,
          jumlah: item.jumlah,
          satuan_id: item.satuan_id
        }))
      };

      const url = id ? `/api/ppic/bom/${id}` : '/api/ppic/bom';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menyimpan data");
      }

      router.push('/ppic/bom');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <button 
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           >
              <ArrowLeft className="h-5 w-5" />
           </button>
           <div>
             <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
               <Cpu className="h-6 w-6 text-indigo-600" />
               {id ? "Edit Bill of Materials" : "Tambah Bill of Materials"}
             </h2>
             <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
               Definisikan resep dan struktur komponen untuk produk jadi.
             </p>
           </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Menyimpan..." : "Simpan BOM"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1">
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xl font-bold">×</button>
        </div>
      )}

      {/* Header Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Header Informasi
            </h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kode Struktur
            </label>
            <input
              type="text"
              placeholder="Ex: BOM-FG-001"
              value={header.kode}
              onChange={(e) => setHeader({ ...header, kode: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-800/50 dark:border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nama Struktur
            </label>
            <input
              type="text"
              placeholder="Ex: Resep Kursi Kayu Premium"
              value={header.nama}
              onChange={(e) => setHeader({ ...header, nama: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-950 dark:border-slate-800"
            />
          </div>
          <div className="space-y-2 lg:col-span-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Produk Jadi (Hasil Produksi)
            </label>
            <div 
               onClick={() => openBrowseModal("header")}
               className="flex items-center justify-between cursor-pointer border border-slate-200 rounded-xl px-4 py-3 bg-white hover:border-indigo-500 transition-all dark:bg-slate-950 dark:border-slate-800 shadow-sm"
            >
               <span className={header.item_nama ? "text-slate-900 font-semibold dark:text-white" : "text-slate-400"}>
                 {header.item_nama || "Pilih Produk..."}
               </span>
               <Search className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Keterangan
            </label>
            <textarea
              placeholder="Catatan tambahan mengenai BOM ini..."
              rows={2}
              value={header.keterangan || ""}
              onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-950 dark:border-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Detail Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                  <Cpu className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Komponen Bahan Baku
              </h3>
          </div>
          <button
            onClick={addItem}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Tambah Komponen
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner bg-slate-50/30 dark:bg-slate-950/30">
          <table className="w-full text-left text-sm relative">
            <thead className="bg-slate-100/50 text-xs uppercase text-slate-600 dark:bg-slate-900/50 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-4 font-bold w-12 text-center">No</th>
                <th className="px-4 py-4 font-bold">Resep Bahan Baku</th>
                <th className="px-4 py-4 font-bold w-32">Kuantitas</th>
                <th className="px-4 py-4 font-bold w-24">Satuan</th>
                <th className="px-4 py-4 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors">
                  <td className="px-4 py-4 text-center text-slate-400 font-bold text-xs uppercase">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div 
                       onClick={() => openBrowseModal("detail", item.id)}
                       className="flex items-center justify-between cursor-pointer border border-slate-200 rounded-lg px-4 py-2 bg-white hover:border-indigo-500 transition-all dark:bg-slate-900 dark:border-slate-800 shadow-sm"
                    >
                       <span className={item.nama_barang ? "text-slate-900 font-semibold dark:text-white" : "text-slate-400"}>
                         {item.nama_barang ? `[${item.kode_barang}] ${item.nama_barang}` : "Pilih Bahan Baku..."}
                       </span>
                       <Search className="h-4 w-4 text-slate-400" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      value={item.jumlah || 0}
                      onChange={(e) => updateItem(item.id, "jumlah", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all dark:bg-slate-900 dark:border-slate-800 dark:text-white shadow-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      className="w-full rounded-lg bg-transparent px-3 py-2 text-sm font-bold text-slate-500 outline-none border-none"
                      readOnly
                      value={item.satuan || ""}
                      placeholder="-"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
             <div className="text-center py-12 text-slate-400 italic">
                Cari dan tambahkan komponen bahan baku di atas.
             </div>
          )}
        </div>
      </div>
      
      <BrowseBarangModal 
         isOpen={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         onSelect={handleSelectBarang}
      />
    </div>
  );
}
