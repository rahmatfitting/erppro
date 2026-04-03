"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Truck, Loader2, PackageOpen, Package, Store, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrowsePOModal } from "@/components/BrowsePOModal";
import { BrowseBarangPOModal } from "@/components/BrowseBarangPOModal";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";

export default function PenerimaanBarang() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    kode: "[AUTO]",
    tanggal: new Date().toISOString().split("T")[0],
    supplier: "",
    nomormhsupplier: null as number | null,
    nomorthbeliorder: null as number | null,
    kodeOrderBeli: "",
    keterangan: "",
    noSuratJalan: "",
    nomormhgudang: null as number | null,
    gudang: "",
  });

  const [items, setItems] = useState<any[]>([]);
  const [isBrowsePOOpen, setIsBrowsePOOpen] = useState(false);
  const [isBrowseBarangOpen, setIsBrowseBarangOpen] = useState(false);
  const [isBrowseSupplierOpen, setIsBrowseSupplierOpen] = useState(false);
  const [isBrowseGudangOpen, setIsBrowseGudangOpen] = useState(false);

  const addItem = () => {
    if (!header.kodeOrderBeli) {
      setError("Pilih Order Beli terlebih dahulu");
      return;
    }
    setIsBrowseBarangOpen(true);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: number, field: string, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSelectPO = (po: any) => {
    setHeader({
      ...header,
      nomorthbeliorder: po.nomor,
      kodeOrderBeli: po.kode,
      supplier: po.supplier,
      nomormhsupplier: po.nomormhsupplier,
    });
    setItems([]); // Clear items when PO changes
    setIsBrowsePOOpen(false);
  };

  const handleSelectSupplier = (supplier: any) => {
    setHeader({
      ...header,
      supplier: supplier.nama,
      nomormhsupplier: supplier.nomor,
    });
    setIsBrowseSupplierOpen(false);
  };

  const handleSelectGudang = (gudang: any) => {
    setHeader({
      ...header,
      gudang: gudang.nama,
      nomormhgudang: gudang.nomor,
    });
    setIsBrowseGudangOpen(false);
  };

  const handleSelectBarang = (item: any) => {
    // Check if already added
    if (items.find(i => i.nomortdbeliorder === item.nomortdbeliorder)) {
        setError("Barang ini sudah ada di daftar");
        setIsBrowseBarangOpen(false);
        return;
    }

    setItems([
      ...items,
      { 
        id: Date.now(), 
        nomortdbeliorder: item.nomortdbeliorder,
        nomormhbarang: item.nomormhbarang,
        nomormhsatuan: item.nomormhsatuan,
        kode_barang: item.kode_barang,
        barang: item.barang, 
        satuan: item.satuan, 
        jumlahDipesan: item.jumlah,
        jumlahDiterima: item.jumlah, 
        keterangan: "" 
      },
    ]);
    setIsBrowseBarangOpen(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!header.nomormhsupplier) throw new Error("Supplier harus dipilih");
      if (!header.noSuratJalan) throw new Error("Nomor Surat Jalan wajib diisi");
      
      const validItems = items.filter(i => i.barang.trim() !== "");
      if (validItems.length === 0) throw new Error("Minimal satu barang harus diisi");
      
      const payload = {
        tanggal: header.tanggal,
        supplier: header.supplier, // Name for history
        nomormhsupplier: header.nomormhsupplier,
        suratJalan: header.noSuratJalan,
        tglSuratJalan: header.tanggal,
        keterangan: header.keterangan || `Ref PO: ${header.kodeOrderBeli}`,
        nomorthbeliorder: header.nomorthbeliorder,
        kode_po: header.kodeOrderBeli,
        nomormhgudang: header.nomormhgudang,
        gudang: header.gudang,
        items: validItems.map(item => ({
          nomorthbeliorder: header.nomorthbeliorder,
          nomortdbeliorder: item.nomortdbeliorder,
          nomormhbarang: item.nomormhbarang,
          nomormhsatuan: item.nomormhsatuan,
          kode_po: header.kodeOrderBeli,
          kode_barang: item.kode_barang,
          nama_barang: item.barang,
          satuan: item.satuan,
          jumlah: item.jumlahDiterima,
          keterangan: item.keterangan
        }))
      };

      const res = await fetch('/api/pembelian/penerimaan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menyimpan data Penerimaan Barang");
      }

      if (data.offline) {
         setError("Tersimpan secara Offline. Penerimaan akan diproses ketika koneksi pulih.");
         setHeader({ ...header, noSuratJalan: "", keterangan: "", kodeOrderBeli: "", nomorthbeliorder: null, nomormhgudang: null, gudang: "" });
         setItems([]);
         window.scrollTo(0, 0);
      } else {
         router.push(`/pembelian/penerimaan/${data.data.nomor}`);
      }
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
            <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Penerimaan Barang
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Catat barang masuk dari supplier berdasarkan Purchase Order.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/pembelian/penerimaan')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Menyimpan..." : "Simpan Penerimaan"}
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
          Informasi Penerimaan
        </h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Kode Penerimaan
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
              Tanggal Terima
            </label>
            <input
              type="date"
              value={header.tanggal || ""}
              onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
           <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No. Surat Jalan
            </label>
            <input
              type="text"
              placeholder="SJ-..."
              value={header.noSuratJalan || ""}
              onChange={(e) => setHeader({ ...header, noSuratJalan: e.target.value })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Supplier
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={header.supplier || ""}
                readOnly
                placeholder="Pilih Supplier..."
                onClick={() => setIsBrowseSupplierOpen(true)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none cursor-pointer focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <button
                onClick={() => setIsBrowseSupplierOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
              >
                <Plus className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Referensi Order Beli (PO)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={header.kodeOrderBeli || ""}
                readOnly
                placeholder="Pilih PO..."
                onClick={() => setIsBrowsePOOpen(true)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none cursor-pointer focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <button
                onClick={() => setIsBrowsePOOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
              >
                <PackageOpen className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Gudang Tujuan
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={header.gudang || ""}
                readOnly
                placeholder="Pilih Gudang..."
                onClick={() => setIsBrowseGudangOpen(true)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none cursor-pointer focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
              <button
                onClick={() => setIsBrowseGudangOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-colors"
              >
                <Store className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Keterangan
            </label>
            <input
              type="text"
              placeholder="Kondisi barang saat dterima"
              value={header.keterangan || ""}
              onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Grid Items Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Detail Barang Bukti Terima
          </h3>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 relative">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-950 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-semibold w-12 text-center">No</th>
                <th className="px-4 py-3 font-semibold w-[25%]">Nama Barang</th>
                <th className="px-4 py-3 font-semibold w-24">Satuan</th>
                <th className="px-4 py-3 font-semibold w-28 text-center bg-slate-100/50 dark:bg-slate-900/50">Jml (PO)</th>
                <th className="px-4 py-3 font-semibold w-32 border-l border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10">Jml Terima</th>
                <th className="px-4 py-3 font-semibold">Keterangan / Status</th>
                <th className="px-4 py-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2">
                    <div
                      onClick={() => {
                        if (!header.kodeOrderBeli) {
                            setError("Pilih Order Beli terlebih dahulu");
                            return;
                        }
                        setIsBrowseBarangOpen(true);
                      }}
                      className="w-full flex items-center justify-between cursor-pointer rounded border border-slate-200 bg-white px-2 py-1.5 text-sm hover:border-emerald-500 transition-all dark:bg-slate-950 dark:border-slate-700"
                    >
                      <span className={item.barang ? "text-slate-900 dark:text-white font-medium" : "text-slate-400"}>
                        {item.barang || "Pilih Barang..."}
                      </span>
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-[10px] text-slate-400 uppercase">
                      {item.satuan || "Pcs"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center bg-slate-50/30 dark:bg-slate-900/30">
                     {item.jumlahDipesan > 0 ? item.jumlahDipesan : '-'}
                  </td>
                  <td className="px-2 py-2 border-l border-emerald-50 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-emerald-900/10">
                    <input
                      type="number"
                      min="0"
                      value={item.jumlahDiterima || 0}
                      onChange={(e) => updateItem(item.id, "jumlahDiterima", parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 dark:focus:bg-slate-950 hover:border-emerald-200 dark:hover:border-emerald-800 outline-none transition-all text-emerald-700 dark:text-emerald-400"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      placeholder="Catatan penerimaan..."
                      value={item.keterangan || ""}
                      onChange={(e) => updateItem(item.id, "keterangan", e.target.value)}
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-sm focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 dark:focus:bg-slate-950 hover:border-slate-200 dark:hover:border-slate-700 outline-none transition-all"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50/30 border-t dark:border-slate-800 flex justify-start">
          <button
            onClick={addItem}
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-lg transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            TAMBAH BARIS
          </button>
        </div>
      </div>

      {/* Modals */}
      <BrowsePOModal 
        isOpen={isBrowsePOOpen}
        onClose={() => setIsBrowsePOOpen(false)}
        onSelect={handleSelectPO}
        openReceiptOnly={true}
      />
      
      <BrowseBarangPOModal
        isOpen={isBrowseBarangOpen}
        onClose={() => setIsBrowseBarangOpen(false)}
        onSelect={handleSelectBarang}
        poNomor={header.nomorthbeliorder}
        poId={header.kodeOrderBeli}
      />

      <BrowseSupplierModal 
        isOpen={isBrowseSupplierOpen}
        onClose={() => setIsBrowseSupplierOpen(false)}
        onSelect={handleSelectSupplier}
      />

      <BrowseGudangModal
        isOpen={isBrowseGudangOpen}
        onClose={() => setIsBrowseGudangOpen(false)}
        onSelect={handleSelectGudang}
      />
    </div>
  );
}
