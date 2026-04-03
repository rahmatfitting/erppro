"use client";

import { useState } from "react";
import { Plus, Trash2, Save, FileText, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

type ItemPR = {
  id: number;
  nomormhbarang: number | null;
  nomormhsatuan: number | null;
  kode_barang: string;
  nama_barang: string;
  satuan: string;
  jumlah: number;
  keterangan: string;
};

export default function PermintaanPembelian() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    kode: "[AUTO]",
    tanggal: new Date().toISOString().split("T")[0],
    divisi: "",
    keterangan: "",
  });

  const [items, setItems] = useState<ItemPR[]>([
    { id: 1, nomormhbarang: null, nomormhsatuan: null, kode_barang: "", nama_barang: "", satuan: "", jumlah: 1, keterangan: "" },
  ]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<number | null>(null);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now(), nomormhbarang: null, nomormhsatuan: null, kode_barang: "", nama_barang: "", satuan: "", jumlah: 1, keterangan: "" },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof ItemPR, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const openBrowseModal = (id: number) => {
    setActiveRowId(id);
    setIsModalOpen(true);
  };

  const handleSelectBarang = (barang: any) => {
    if (activeRowId !== null) {
      setItems(items.map((item) => {
        if (item.id === activeRowId) {
          return {
            ...item,
            nomormhbarang: barang.nomor,
            nomormhsatuan: barang.nomormhsatuan || null,
            kode_barang: barang.kode,
            nama_barang: barang.nama,
            satuan: barang.satuan_nama || "Pcs"
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

      // Basic validation
      if (!header.divisi) throw new Error("Divisi peminta harus dipilih");
      const validItems = items.filter(i => i.nomormhbarang !== null && i.jumlah > 0);
      if (validItems.length === 0) throw new Error("Minimal satu barang valid harus diisi");

      const payload = {
        kode: header.kode,
        tanggal: header.tanggal,
        divisi: header.divisi,
        keterangan: header.keterangan,
        items: validItems.map(item => ({
          nomormhbarang: item.nomormhbarang,
          nomormhsatuan: item.nomormhsatuan,
          kode_barang: item.kode_barang,
          nama_barang: item.nama_barang,
          satuan: item.satuan,
          jumlah: item.jumlah,
          keterangan: item.keterangan
        }))
      };

      const res = await fetch('/api/pembelian/permintaan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menyimpan data");
      }

      router.push(`/pembelian/permintaan/${data.data.nomor}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-500" />
            Permintaan Pembelian
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Buat dokumen permintaan pembelian barang dari divisi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/pembelian/permintaan')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Menyimpan..." : "Simpan Data"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Header Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Informasi Dokumen
        </h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Kode Permintaan
            </label>
            <input
              type="text"
              value={header.kode}
              readOnly
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none dark:border-slate-800 dark:bg-slate-950"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Tanggal
            </label>
            <input
              type="date"
              value={header.tanggal || ""}
              onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Divisi Peminta
            </label>
            <select
              value={header.divisi || ""}
              onChange={(e) => setHeader({ ...header, divisi: e.target.value })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Pilih Divisi</option>
              <option value="Produksi">Produksi</option>
              <option value="Gudang">Gudang Utama</option>
              <option value="HRD">HRD & General Affair</option>
              <option value="IT">IT Support</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Keterangan
            </label>
            <input
              type="text"
              placeholder="Ex: Untuk keperluan produksi"
              value={header.keterangan || ""}
              onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Grid Items Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Daftar Barang
          </h3>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 relative">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-950 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-semibold w-12 text-center">No</th>
                <th className="px-4 py-3 font-semibold w-[40%]">Cari / Pilih Barang</th>
                <th className="px-4 py-3 font-semibold w-24">Satuan</th>
                <th className="px-4 py-3 font-semibold w-32">Jumlah</th>
                <th className="px-4 py-3 font-semibold">Keterangan</th>
                <th className="px-4 py-3 w-16 text-center shadow-lg">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        onClick={() => openBrowseModal(item.id)}
                        className="flex-1 flex items-center justify-between cursor-pointer border border-slate-300 rounded hover:border-blue-500 px-3 py-1.5 bg-white text-sm"
                      >
                        <span className={item.nama_barang ? "text-slate-900 font-medium" : "text-slate-400"}>
                          {item.nama_barang ? `[${item.kode_barang}] ${item.nama_barang}` : "Pilih Barang..."}
                        </span>
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-slate-500 focus:outline-none"
                      readOnly
                      value={item.satuan || ""}
                      placeholder="-"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="1"
                      value={item.jumlah || 0}
                      onChange={(e) => updateItem(item.id, "jumlah", parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:focus:bg-slate-950 outline-none transition-all"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Catatan..."
                      value={item.keterangan || ""}
                      onChange={(e) => updateItem(item.id, "keterangan", e.target.value)}
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-sm focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 hover:border-slate-200 outline-none transition-all"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-start">
          <button
            onClick={addItem}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-all shadow-sm border border-blue-100 dark:border-blue-900/30 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            TAMBAH BARIS
          </button>
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
