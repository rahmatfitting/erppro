"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Save, PackageOpen, Loader2, Search, Building2, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { BrowsePRModal } from "@/components/BrowsePRModal";
import { BrowseBarangPRModal } from "@/components/BrowseBarangPRModal";
import { BrowseValutaModal } from "@/components/BrowseValutaModal";

type POItem = {
  id: number;
  kodePermintaan: string;
  nomorthbelipermintaan: number | null;
  nomortdbelipermintaan: number | null;
  nomormhbarang: number | null;
  nomormhsatuan: number | null;
  barang: string;
  satuan: string;
  jumlah: number;
  harga: number;
  diskonPersen: number;
};

export default function OrderBeli() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    kode: "[AUTO]",
    tanggal: new Date().toISOString().split("T")[0],
    nomormhsupplier: null as number | null,
    supplier_nama: "",
    valuta: "IDR",
    kurs: 1,
    keterangan: "",
    diskonPersen: 0,
    ppnPersen: 11,
  });

  const [items, setItems] = useState<POItem[]>([
    { 
      id: 1, 
      kodePermintaan: "",
      nomorthbelipermintaan: null,
      nomortdbelipermintaan: null,
      nomormhbarang: null,
      nomormhsatuan: null,
      barang: "", 
      satuan: "Pcs", 
      jumlah: 1, 
      harga: 0, 
      diskonPersen: 0
    },
  ]);

  // Modals state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [isBarangModalOpen, setIsBarangModalOpen] = useState(false);
  const [isValutaModalOpen, setIsValutaModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<number | null>(null);

  const addItem = () => {
    setItems([
      ...items,
      { 
        id: Date.now(), 
        kodePermintaan: "",
        nomorthbelipermintaan: null,
        nomortdbelipermintaan: null,
        nomormhbarang: null,
        nomormhsatuan: null,
        barang: "", 
        satuan: "Pcs", 
        jumlah: 1, 
        harga: 0, 
        diskonPersen: 0
      },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof POItem, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const openPRModal = (id: number) => {
    setActiveRowId(id);
    setIsPRModalOpen(true);
  };

  const openBarangModal = (id: number, prCode: string) => {
    if (!prCode) {
      alert("Pilih Header PR terlebih dahulu pada baris ini.");
      return;
    }
    setActiveRowId(id);
    setIsBarangModalOpen(true);
  };

  const handleSelectSupplier = (supplier: any) => {
    setHeader({ ...header, nomormhsupplier: supplier.nomor, supplier_nama: supplier.nama });
    setIsSupplierModalOpen(false);
  };

  const handleSelectPR = (pr: any) => {
    if (activeRowId !== null) {
      setItems(items.map((item) => {
        if (item.id === activeRowId) {
          return { 
             ...item, 
             kodePermintaan: pr.kode, 
             nomorthbelipermintaan: pr.nomor,
             barang: "", 
             nomortdbelipermintaan: null,
             nomormhbarang: null,
             satuan: "Pcs", 
             jumlah: 1 
          };
        }
        return item;
      }));
    }
    setIsPRModalOpen(false);
  };

  const handleSelectBarang = (barang: any) => {
    if (activeRowId !== null) {
      setItems(items.map((item) => {
        if (item.id === activeRowId) {
          return {
            ...item,
            nomortdbelipermintaan: barang.id,
            nomormhbarang: barang.nomormhbarang,
            nomormhsatuan: barang.nomormhsatuan || null,
            barang: barang.barang,
            satuan: barang.satuan || "Pcs",
            jumlah: barang.jumlah || 1
          };
        }
        return item;
      }));
    }
    setIsBarangModalOpen(false);
  };

  const handleSelectValuta = (v: any) => {
    setHeader({ ...header, valuta: v.kode, kurs: v.kurs });
    setIsValutaModalOpen(false);
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
      
      // Basic validation
      if (!header.nomormhsupplier) throw new Error("Supplier harus dipilih");
      const validItems = calculations.items.filter(i => i.barang.trim() !== "");
      if (validItems.length === 0) throw new Error("Minimal satu barang harus diisi");

      const payload = {
        kode: header.kode,
        tanggal: header.tanggal,
        nomormhsupplier: header.nomormhsupplier,
        supplier_nama: header.supplier_nama,
        valuta: header.valuta,
        kurs: header.kurs,
        keterangan: header.keterangan,
        subtotal: calculations.subtotal,
        diskonNominal: calculations.diskon,
        dpp: calculations.dpp,
        ppnNominal: calculations.ppn,
        grandTotal: calculations.total,
        items: validItems.map(item => ({
          nomorthbelipermintaan: item.nomorthbelipermintaan || null,
          nomortdbelipermintaan: item.nomortdbelipermintaan || null,
          nomormhbarang: item.nomormhbarang || null,
          nomormhsatuan: item.nomormhsatuan || null,
          kode_pr: item.kodePermintaan,
          kode_barang: "", // dummy reference
          nama_barang: item.barang,
          satuan: item.satuan,
          jumlah: item.jumlah,
          harga: item.harga,
          diskon_prosentase: item.diskonPersen,
          diskon_nominal: item.nominalDiskon,
          netto: item.subtotal,
          subtotal: item.subtotal,
          keterangan: ""
        }))
      };

      const res = await fetch('/api/pembelian/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal menyimpan data Order Beli");
      }

      router.push(`/pembelian/order/${data.data.nomor}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <PackageOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-500" />
            Order Beli (Purchase Order)
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Terbitkan order pembelian ke supplier berdasarkan permintaan pembelian.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/pembelian/order')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleSave}
            disabled={loading || !header.nomormhsupplier}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Menyimpan..." : "Simpan & Cetak PO"}
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
        {/* Header Inputs */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b pb-2">
            Informasi Umum
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kode PO</label>
              <input
                type="text"
                value={header.kode}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 outline-none dark:border-slate-800 dark:bg-slate-950 font-semibold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal</label>
              <input
                type="date"
                value={header.tanggal || ""}
                onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier</label>
              <div 
                 onClick={() => setIsSupplierModalOpen(true)}
                 className="w-full h-[42px] flex items-center justify-between cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all shadow-sm"
              >
                 <span className={header.supplier_nama ? "text-slate-900 dark:text-white font-bold" : "text-slate-400"}>
                   {header.supplier_nama || "Pilih Supplier..."}
                 </span>
                 <Search className="h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2 lg:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catatan Khusus</label>
              <input
                type="text"
                placeholder="Informasi tambahan, syarat pembayaran, dll"
                value={header.keterangan || ""}
                onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all"
              />
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
             <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Setting Mata Uang
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
               <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currency</label>
                <div 
                  onClick={() => setIsValutaModalOpen(true)}
                  className="w-full h-[42px] flex items-center justify-between cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all shadow-sm"
                >
                  <span className="text-slate-900 dark:text-white font-bold">
                    {header.valuta || "IDR"}
                  </span>
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exchange Rate</label>
                <input
                  type="number"
                  min="1"
                  value={header.kurs || 1}
                  onChange={(e) => setHeader({ ...header, kurs: parseFloat(e.target.value) || 1 })}
                  disabled={header.valuta === 'IDR'}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900 font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Grid Items Section */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md overflow-hidden">
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Daftar Barang Dipesan
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100/50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-500 sticky top-0 border-b dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">No</th>
                  <th className="px-6 py-4 w-40">Ref PR</th>
                  <th className="px-6 py-4 min-w-[200px]">Nama Barang</th>
                  <th className="px-6 py-4 w-24">Satuan</th>
                  <th className="px-6 py-4 w-24 text-right">Jml</th>
                  <th className="px-6 py-4 w-36 text-right">Harga Sat</th>
                  <th className="px-6 py-4 w-24 text-center">Disc (%)</th>
                  <th className="px-6 py-4 w-40 text-right">Subtotal</th>
                  <th className="px-6 py-4 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {calculations.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors group">
                    <td className="px-6 py-4 text-center text-slate-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="px-6 py-3">
                      <div 
                         onClick={() => openPRModal(item.id)}
                         className="w-full flex items-center justify-between cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold tracking-tight hover:border-indigo-500 transition-all dark:bg-slate-950 dark:border-slate-700"
                      >
                         <span className={item.kodePermintaan ? "text-indigo-600 uppercase" : "text-slate-400"}>
                           {item.kodePermintaan || "PR-..."}
                         </span>
                         <FileText className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div 
                         onClick={() => openBarangModal(item.id, item.kodePermintaan)}
                         className="w-full flex items-center justify-between cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:border-indigo-500 transition-all dark:bg-slate-950 dark:border-slate-700"
                      >
                         <span className={item.barang ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                           {item.barang || "Pilih Barang..."}
                         </span>
                         <Search className="h-4 w-4 text-slate-400" />
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="text"
                        readOnly
                        value={item.satuan}
                        className="w-full bg-transparent text-[10px] font-bold text-slate-400 outline-none"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        min="1"
                        value={item.jumlah || 0}
                        onChange={(e) => updateItem(item.id, "jumlah", parseInt(e.target.value) || 0)}
                        className="w-full text-right rounded-lg px-3 py-2 outline-none transition-all font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        min="0"
                        value={item.harga || 0}
                        onChange={(e) => updateItem(item.id, "harga", parseFloat(e.target.value) || 0)}
                        className="w-full text-right rounded-lg px-3 py-2 outline-none transition-all font-mono font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-3 text-center">
                       <div className="flex items-center justify-center">
                          <input
                              type="number"
                              min="0" max="100"
                              value={item.diskonPersen || 0}
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
                        disabled={items.length === 1}
                        className="rounded-full p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 disabled:opacity-20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50/30 border-t dark:border-slate-800">
            <button
              onClick={addItem}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              TAMBAH BARIS
            </button>
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
                            className="w-14 h-8 text-sm font-bold text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:border-indigo-500 transition-all"
                            value={header.diskonPersen || 0}
                            onChange={(e) => setHeader({...header, diskonPersen: parseFloat(e.target.value) || 0})}
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
                            className="w-14 h-8 text-sm font-bold text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:border-indigo-500 transition-all"
                            value={header.ppnPersen || 0}
                            onChange={(e) => setHeader({...header, ppnPersen: parseFloat(e.target.value) || 0})}
                          />
                      </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-300">
                    {formatCurrency(calculations.ppn)}
                  </span>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t-2 border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Grand Total Order</span>
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                    {formatCurrency(calculations.total)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-1 italic">Excl. Shipping & Admin Fee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <BrowseSupplierModal 
        isOpen={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)} 
        onSelect={handleSelectSupplier} 
      />
      <BrowsePRModal 
        isOpen={isPRModalOpen} 
        onClose={() => setIsPRModalOpen(false)} 
        onSelect={handleSelectPR} 
      />
      <BrowseBarangPRModal 
        isOpen={isBarangModalOpen} 
        prNomor={items.find(i => i.id === activeRowId)?.nomorthbelipermintaan || 0}
        prId={items.find(i => i.id === activeRowId)?.kodePermintaan || ""}
        onClose={() => setIsBarangModalOpen(false)} 
        onSelect={handleSelectBarang} 
      />
      <BrowseValutaModal
        isOpen={isValutaModalOpen}
        onClose={() => setIsValutaModalOpen(false)}
        onSelect={handleSelectValuta}
      />
    </div>
  );
}
