"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Save, Receipt, Loader2, PackageOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrowsePenerimaanModal } from "@/components/BrowsePenerimaanModal";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { BrowseValutaModal } from "@/components/BrowseValutaModal";

export default function NotaBeli() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    kode: "[AUTO]",
    tanggal: new Date().toISOString().split("T")[0],
    supplier: "",
    nomormhsupplier: 0,
    noFakturSupplier: "",
    jatuhTempo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    valuta: "IDR",
    nomormhvaluta: 1,
    kurs: 1,
    keterangan: "",
    diskonPersen: 0,
    ppnPersen: 11,
  });

  const [items, setItems] = useState<any[]>([]);
  const [isBrowsePBOpen, setIsBrowsePBOpen] = useState(false);
  const [isBrowseSupplierOpen, setIsBrowseSupplierOpen] = useState(false);
  const [isBrowseValutaOpen, setIsBrowseValutaOpen] = useState(false);
  const [currentPB, setCurrentPB] = useState({ nomor: 0, kode: "" });

  const addItem = () => {
    setIsBrowsePBOpen(true);
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

  const handleSelectPB = async (pb: any) => {
    setHeader({
      ...header,
      supplier: pb.supplier,
      nomormhsupplier: pb.nomormhsupplier,
    });
    setCurrentPB({ nomor: pb.nomor, kode: pb.kode });
    setIsBrowsePBOpen(false);

    // Fetch all items from this PB
    setLoading(true);
    try {
      const res = await fetch(`/api/pembelian/penerimaan/${pb.nomor}`);
      const json = await res.json();
      if (json.success && json.data.items) {
        const newItems = json.data.items.map((item: any) => ({
          id: Date.now() + Math.random(),
          nomorthbelipenerimaan: pb.nomor,
          nomortdbelipenerimaan: item.id,
          nomormhbarang: item.nomormhbarang,
          nomormhsatuan: item.nomormhsatuan,
          kodePenerimaan: pb.kode,
          kode_barang: item.kode_barang,
          barang: item.barang,
          satuan: item.satuan,
          jumlah: item.jumlahDiterima,
          harga: item.harga || 0,
          diskonPersen: item.diskon_prosentase || 0
        }));
        setItems(prev => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error("Error fetching PB items:", err);
      setError("Gagal mengambil detail barang dari LPB");
    } finally {
      setLoading(false);
    }
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

  const handleSelectBarang = (item: any) => {
    // Legacy - no longer used but kept for structural safety if referenced
  };

  // Calculations
  const calculations = useMemo(() => {
    const calculatedItems = items.map(item => {
      const brutto = item.jumlah * item.harga;
      const nominalDiskon = brutto * (item.diskonPersen / 100);
      const netto = brutto - nominalDiskon;
      return { ...item, brutto, nominalDiskon, subtotal: netto };
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

      const validItems = calculations.items.filter(i => (i.barang || "").trim() !== "");
      if (validItems.length === 0) throw new Error("Minimal satu barang harus diisi");

      const payload = {
        tanggal: header.tanggal,
        supplier: header.supplier,
        nomormhsupplier: header.nomormhsupplier,
        noFaktur: header.noFakturSupplier,
        jatuhTempo: header.jatuhTempo,
        keterangan: header.keterangan || `Faktur ${header.noFakturSupplier}`,
        valuta: header.valuta,
        nomormhvaluta: header.nomormhvaluta,
        kurs: header.kurs,
        subtotal: calculations.subtotal,
        diskonNominal: calculations.diskon,
        dpp: calculations.dpp,
        ppnPersen: header.ppnPersen,
        ppnNominal: calculations.ppn,
        grandTotal: calculations.total,
        items: validItems.map(item => ({
          nomorthbelipenerimaan: item.nomorthbelipenerimaan,
          nomortdbelipenerimaan: item.nomortdbelipenerimaan,
          nomormhbarang: item.nomormhbarang,
          nomormhsatuan: item.nomormhsatuan,
          kode_pb: item.kodePenerimaan,
          kode_barang: item.kode_barang || "",
          nama_barang: item.barang,
          satuan: item.satuan,
          jumlah: item.jumlah,
          harga: item.harga,
          diskon_prosentase: item.diskonPersen,
          diskon_nominal: item.nominalDiskon,
          netto: item.subtotal,
          subtotal: item.subtotal
        }))
      };

      const res = await fetch('/api/pembelian/nota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menyimpan data Tagihan/Nota");
      }

      if (data.offline) {
        setError("Tersimpan secara Offline. Tagihan divalidasi ketika koneksi pulih.");
        setHeader({ ...header, noFakturSupplier: "", keterangan: "", supplier: "", nomormhsupplier: 0 });
        setItems([]);
        window.scrollTo(0, 0);
      } else {
        router.push(`/pembelian/nota/${data.data.nomor}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto mb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-rose-600 dark:text-rose-500" />
            Nota Beli (Purchase Invoice)
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Terbitkan faktur tagihan pembelian berdasarkan penerimaan barang.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/pembelian/nota')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Menyimpan..." : "Simpan Tagihan"}
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
        {/* Header Inputs & Items Table */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b pb-2">
              Informasi Faktur Tagihan
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. Nota (Internal)</label>
                <input
                  type="text"
                  value={header.kode}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 outline-none dark:border-slate-800 dark:bg-slate-950 font-semibold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">No. Faktur Supplier *</label>
                <input
                  type="text"
                  placeholder="INV-SUP-..."
                  value={header.noFakturSupplier}
                  onChange={(e) => setHeader({ ...header, noFakturSupplier: e.target.value })}
                  className="w-full rounded-lg border border-rose-200 bg-rose-50/20 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-white transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={header.supplier}
                    readOnly
                    placeholder="Pilih Supplier..."
                    onClick={() => setIsBrowseSupplierOpen(true)}
                    className="w-full h-[42px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none cursor-pointer focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all font-bold"
                  />
                  <button
                    onClick={() => setIsBrowseSupplierOpen(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valuta & Kurs</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={header.valuta}
                      readOnly
                      onClick={() => setIsBrowseValutaOpen(true)}
                      placeholder="IDR"
                      className="w-full h-[42px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none cursor-pointer focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setIsBrowseValutaOpen(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="number"
                    value={header.kurs}
                    onChange={(e) => setHeader({ ...header, kurs: parseFloat(e.target.value) || 1 })}
                    className="w-24 h-[42px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all font-mono font-bold text-right"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Nota</label>
                <input
                  type="date"
                  value={header.tanggal}
                  onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tgl. Jatuh Tempo</label>
                <input
                  type="date"
                  value={header.jatuhTempo}
                  onChange={(e) => setHeader({ ...header, jatuhTempo: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keterangan</label>
                <input
                  type="text"
                  placeholder="Catatan tagihan..."
                  value={header.keterangan}
                  onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Grid Items Section */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md overflow-hidden">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Detail Tagihan Barang
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100/50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-500 sticky top-0 border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">No</th>
                    <th className="px-6 py-4 w-40">PB Ref.</th>
                    <th className="px-6 py-4 min-w-[200px]">Nama Barang</th>
                    <th className="px-6 py-4 w-24">Sat</th>
                    <th className="px-6 py-4 w-24">Jml</th>
                    <th className="px-6 py-4 w-36">Harga Satuan</th>
                    <th className="px-6 py-4 w-24">Disc %</th>
                    <th className="px-6 py-4 w-40 text-right">Subtotal</th>
                    <th className="px-6 py-4 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calculations.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-500/5 transition-colors group">
                      <td className="px-6 py-4 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="PB-..."
                          value={item.kodePenerimaan}
                          readOnly
                          className="w-full rounded-lg px-2 py-1.5 outline-none transition-all uppercase text-[10px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          placeholder="Nama barang..."
                          value={item.barang}
                          readOnly
                          // onChange={(e) => updateItem(item.id, "barang", e.target.value)}
                          className="w-full rounded-lg px-2 py-1.5 outline-none transition-all uppercase text-[10px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500"
                        />
                      </td>
                      <td className="px-6 py-3 text-[10px] font-bold text-slate-400">
                        {item.satuan}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          value={item.jumlah}
                          readOnly
                          className="w-full text-center rounded-lg px-2 py-2 outline-none transition-all font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={item.harga}
                          onChange={(e) => updateItem(item.id, "harga", parseFloat(e.target.value) || 0)}
                          className="w-full text-right rounded-lg px-3 py-2 outline-none transition-all font-mono font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-rose-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min="0" max="100"
                            value={item.diskonPersen}
                            onChange={(e) => updateItem(item.id, "diskonPersen", parseFloat(e.target.value) || 0)}
                            className="w-12 rounded-lg px-1 py-2 text-center outline-none transition-all text-red-500 font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-700 dark:text-slate-200 bg-slate-50/20 dark:bg-slate-900/40">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="hidden rounded-full p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-20 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all active:scale-95"
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
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-700 shadow-lg transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                TAMBAH BARIS
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Order Summary */}
        <div className="flex justify-end">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
            <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
              Summary Billing
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center group">
                <span className="text-xs font-bold text-slate-500">Gross Total</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">{formatCurrency(calculations.subtotal)}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Global Disc (%)</span>
                    <div className="flex items-center mt-1">
                      <input
                        type="number"
                        min="0" max="100"
                        className="w-14 h-8 text-sm font-bold text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:border-rose-500 transition-all font-mono"
                        value={header.diskonPersen}
                        onChange={(e) => setHeader({ ...header, diskonPersen: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-600">
                    -{formatCurrency(calculations.diskon)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold text-slate-500">DPP</span>
                <span className="text-xs font-black text-slate-600 dark:text-slate-400 tracking-wider font-mono">
                  {formatCurrency(calculations.dpp)}
                </span>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">PPN (%)</span>
                    <div className="flex items-center mt-1">
                      <input
                        type="number"
                        min="0" max="100"
                        className="w-14 h-8 text-sm font-bold text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:border-rose-500 transition-all font-mono"
                        value={header.ppnPersen}
                        onChange={(e) => setHeader({ ...header, ppnPersen: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-300 font-mono">
                    {formatCurrency(calculations.ppn)}
                  </span>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t-2 border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-1">Grand Total Tagihan</span>
                  <span className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tighter italic">
                    {formatCurrency(calculations.total)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-1">Excl. Shipping & Admin Fee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <BrowsePenerimaanModal
          isOpen={isBrowsePBOpen}
          onClose={() => setIsBrowsePBOpen(false)}
          onSelect={handleSelectPB}
          filter="uninvoiced"
        />
        <BrowseValutaModal
          isOpen={isBrowseValutaOpen}
          onClose={() => setIsBrowseValutaOpen(false)}
          onSelect={handleSelectValuta}
        />
        <BrowseSupplierModal
          isOpen={isBrowseSupplierOpen}
          onClose={() => setIsBrowseSupplierOpen(false)}
          onSelect={handleSelectSupplier}
        />
      </div>
    </div>
  );
}
