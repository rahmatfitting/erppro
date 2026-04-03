"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Save, Receipt, Loader2, FileEdit, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { BrowseValutaModal } from "@/components/BrowseValutaModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

export default function NotaBeliLangsungEdit() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    kode: "",
    tanggal: "",
    supplier: "",
    nomormhsupplier: 0,
    noFakturSupplier: "",
    jatuhTempo: "",
    valuta: "IDR",
    nomormhvaluta: 1,
    kurs: 1,
    keterangan: "",
    diskonPersen: 0,
    ppnPersen: 11,
  });

  const [items, setItems] = useState<any[]>([]);
  const [isBrowseBarangOpen, setIsBrowseBarangOpen] = useState(false);
  const [isBrowseSupplierOpen, setIsBrowseSupplierOpen] = useState(false);
  const [isBrowseValutaOpen, setIsBrowseValutaOpen] = useState(false);

  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        setFetching(true);
        const res = await fetch(`/api/pembelian/nota-beli-langsung/${id}`);
        const result = await res.json();
        
        if (result.success) {
          const data = result.data;
          if (data.status_disetujui === 1) {
             setError("Nota yang sudah disetujui tidak dapat diedit");
             setFetching(false);
             return;
          }

          setHeader({
            kode: data.kode,
            tanggal: data.tanggal.split("T")[0],
            supplier: data.supplier,
            nomormhsupplier: data.nomormhsupplier,
            noFakturSupplier: data.nomor_faktur_supplier,
            jatuhTempo: data.jatuh_tempo ? data.jatuh_tempo.split("T")[0] : "",
            valuta: data.valuta,
            nomormhvaluta: data.nomormhvaluta,
            kurs: data.kurs,
            keterangan: data.keterangan,
            diskonPersen: Number(data.diskon_prosentase || 0),
            ppnPersen: Number(data.ppn_prosentase || 11),
          });

          setItems(data.items.map((it: any) => ({
            id: it.nomor,
            nomormhbarang: it.nomormhbarang,
            nomormhsatuan: it.nomormhsatuan,
            kode_barang: it.kode_barang,
            barang: it.nama_barang || it.barang_nama,
            satuan: it.satuan || it.satuan_nama,
            jumlah: Number(it.jumlah),
            harga: Number(it.harga),
            diskonPersen: Number(it.diskon_prosentase),
            keterangan: it.keterangan || ""
          })));
        } else {
          setError(result.error || "Gagal mengambil data");
        }
      } catch (err: any) {
        setError("Terjadi kesalahan saat mengambil data");
      } finally {
        setFetching(false);
      }
    };

    fetchExistingData();
  }, [id]);

  const addItem = () => {
    setIsBrowseBarangOpen(true);
  };

  const removeItem = (itemId: number) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const updateItem = (itemId: number, field: string, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSelectBarang = (barang: any) => {
    const newItem = {
      id: Date.now() + Math.random(),
      nomormhbarang: barang.nomor,
      nomormhsatuan: barang.nomormhsatuan,
      kode_barang: barang.kode,
      barang: barang.nama,
      satuan: barang.satuan_nama,
      jumlah: 1,
      harga: 0,
      diskonPersen: 0,
      keterangan: ""
    };
    setItems(prev => [...prev, newItem]);
    setIsBrowseBarangOpen(false);
  };

  const handleSelectSupplier = (supplier: any) => {
    setHeader({
      ...header,
      supplier: supplier.nama,
      nomormhsupplier: supplier.nomor,
    });
    setIsBrowseSupplierOpen(false);
  };

  const handleSelectValuta = (valuta: any) => {
    setHeader({
      ...header,
      valuta: valuta.kode,
      nomormhvaluta: valuta.nomor,
      kurs: valuta.kurs || 1
    });
    setIsBrowseValutaOpen(false);
  };

  // Calculations
  const calculations = useMemo(() => {
    const calculatedItems = items.map(item => {
      const unitNetto = item.harga - (item.harga * (item.diskonPersen / 100));
      const subtotal = unitNetto * item.jumlah;
      const nominalDiskon = (item.harga * item.jumlah) * (item.diskonPersen / 100);
      return { ...item, netto: unitNetto, subtotal: subtotal, nominalDiskon };
    });

    const subtotalGrid = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const nominalDiskonHeader = subtotalGrid * (header.diskonPersen / 100);
    const dpp = subtotalGrid - nominalDiskonHeader;
    const ppn = dpp * (header.ppnPersen / 100);
    const total = dpp + ppn;

    return {
      items: calculatedItems,
      subtotal: subtotalGrid,
      diskon: nominalDiskonHeader,
      dpp,
      ppn,
      total
    };
  }, [items, header.diskonPersen, header.ppnPersen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: header.valuta, minimumFractionDigits: 0 }).format(amount);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!header.nomormhsupplier) throw new Error("Supplier harus dipilih");
      if (!header.noFakturSupplier) throw new Error("Nomor Faktur Supplier wajib diisi");
      if (items.length === 0) throw new Error("Minimal satu barang harus diisi");

      const payload = {
        tanggal: header.tanggal,
        supplier: header.supplier,
        nomormhsupplier: header.nomormhsupplier,
        noFaktur: header.noFakturSupplier,
        jatuhTempo: header.jatuhTempo,
        keterangan: header.keterangan,
        valuta: header.valuta,
        nomormhvaluta: header.nomormhvaluta,
        kurs: header.kurs,
        subtotal: calculations.subtotal,
        diskonNominal: calculations.diskon,
        dpp: calculations.dpp,
        ppnPersen: header.ppnPersen,
        ppnNominal: calculations.ppn,
        grandTotal: calculations.total,
        items: calculations.items.map(item => ({
          nomormhbarang: item.nomormhbarang,
          nomormhsatuan: item.nomormhsatuan,
          kode_barang: item.kode_barang || "",
          nama_barang: item.barang,
          satuan: item.satuan,
          jumlah: item.jumlah,
          harga: item.harga,
          diskon_prosentase: item.diskonPersen,
          diskon_nominal: item.nominalDiskon,
          netto: item.netto,
          subtotal: item.subtotal,
          keterangan: item.keterangan
        }))
      };

      const res = await fetch(`/api/pembelian/nota-beli-langsung/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal mengupdate Nota Beli Langsung");
      }

      router.push(`/pembelian/nota-beli-langsung/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto mb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileEdit className="h-6 w-6 text-indigo-600 dark:text-indigo-500" />
            Edit Nota Beli Langsung: {header.kode}
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Ubah detail faktur pembelian langsung.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/pembelian/nota-beli-langsung/${id}`}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Batal
          </Link>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b pb-2">
            Informasi Faktur
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. Nota</label>
              <input type="text" value={header.kode} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 outline-none dark:border-slate-800 dark:bg-slate-950 font-semibold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">No. Faktur Supplier *</label>
              <input
                type="text"
                placeholder="Faktur dari supplier..."
                value={header.noFakturSupplier}
                onChange={(e) => setHeader({ ...header, noFakturSupplier: e.target.value })}
                className="w-full rounded-lg border border-indigo-200 bg-indigo-50/20 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-white transition-all font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier</label>
              <div className="flex gap-2 text-indigo-600">
                <input
                  type="text"
                  value={header.supplier}
                  readOnly
                  placeholder="Pilih Supplier..."
                  onClick={() => setIsBrowseSupplierOpen(true)}
                  className="w-full h-[42px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all font-bold"
                />
                <button onClick={() => setIsBrowseSupplierOpen(true)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors">
                  <Plus className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valuta & Kurs</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={header.valuta}
                  readOnly
                  onClick={() => setIsBrowseValutaOpen(true)}
                  className="w-full h-[42px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all font-bold text-indigo-600"
                />
                <input
                  type="number"
                  value={header.kurs}
                  onChange={(e) => setHeader({ ...header, kurs: parseFloat(e.target.value) || 1 })}
                  className="w-24 h-[42px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all font-mono font-bold text-right"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Nota</label>
              <input
                type="date"
                value={header.tanggal}
                onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tgl. Jatuh Tempo</label>
              <input
                type="date"
                value={header.jatuhTempo}
                onChange={(e) => setHeader({ ...header, jatuhTempo: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
              />
            </div>
            <div className="space-y-2 lg:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keterangan</label>
              <input
                type="text"
                placeholder="Catatan tambahan..."
                value={header.keterangan}
                onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all overflow-hidden font-bold">
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Detail Barang Pembelian
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100/50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-500 sticky top-0 border-b dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">No</th>
                  <th className="px-6 py-4 min-w-[200px]">Barang</th>
                  <th className="px-6 py-4 w-24">Satuan</th>
                  <th className="px-6 py-4 w-24">Jumlah</th>
                  <th className="px-6 py-4 w-36">Harga</th>
                  <th className="px-6 py-4 w-24">Disc %</th>
                  <th className="px-6 py-4 w-40 text-right">Subtotal</th>
                  <th className="px-6 py-4 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {calculations.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors group">
                    <td className="px-6 py-4 text-center text-slate-400 font-mono italic">
                      {index + 1}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white font-bold uppercase">{item.barang}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.kode_barang}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500 uppercase">{item.satuan}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.jumlah}
                        onChange={(e) => updateItem(item.id, "jumlah", parseFloat(e.target.value) || 0)}
                        className="w-full text-center rounded-lg px-2 py-2 outline-none font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.harga}
                        onChange={(e) => updateItem(item.id, "harga", parseFloat(e.target.value) || 0)}
                        className="w-full text-right rounded-lg px-3 py-2 outline-none font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.diskonPersen}
                        onChange={(e) => updateItem(item.id, "diskonPersen", parseFloat(e.target.value) || 0)}
                        className="w-full text-center rounded-lg px-1 py-2 outline-none text-red-500 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      />
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-700 dark:text-slate-200">
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button onClick={() => removeItem(item.id)} className="rounded-full p-2 text-slate-300 hover:text-red-500 transition-colors">
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
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              TAMBAH BARANG
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all font-bold">
            <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
              Ringkasan Pembayaran
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center group">
                <span className="text-xs text-slate-500">Subtotal Item</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(calculations.subtotal)}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.1em]">Diskon (%)</span>
                    <input
                      type="number"
                      className="w-14 h-8 text-sm text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white px-1 outline-none focus:border-indigo-500 font-mono"
                      value={header.diskonPersen}
                      onChange={(e) => setHeader({ ...header, diskonPersen: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <span className="text-sm text-red-600">-{formatCurrency(calculations.diskon)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 uppercase tracking-tighter">DPP</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-mono tracking-widest">{formatCurrency(calculations.dpp)}</span>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.1em]">PPN (%)</span>
                    <input
                      type="number"
                      className="w-14 h-8 text-sm text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white px-1 outline-none focus:border-indigo-500 font-mono"
                      value={header.ppnPersen}
                      onChange={(e) => setHeader({ ...header, ppnPersen: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <span className="text-sm text-slate-900 dark:text-slate-300 font-mono">{formatCurrency(calculations.ppn)}</span>
                </div>
              </div>
              <div className="pt-6 mt-4 border-t-2 border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] text-indigo-500 uppercase tracking-[0.2em] mb-1">Total Bayar (Invoice)</span>
                  <span className="text-3xl text-indigo-600 dark:text-indigo-400 tracking-tighter italic">
                    {formatCurrency(calculations.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <BrowseBarangModal isOpen={isBrowseBarangOpen} onClose={() => setIsBrowseBarangOpen(false)} onSelect={handleSelectBarang} />
      <BrowseValutaModal isOpen={isBrowseValutaOpen} onClose={() => setIsBrowseValutaOpen(false)} onSelect={handleSelectValuta} />
      <BrowseSupplierModal isOpen={isBrowseSupplierOpen} onClose={() => setIsBrowseSupplierOpen(false)} onSelect={handleSelectSupplier} />
    </div>
  );
}
