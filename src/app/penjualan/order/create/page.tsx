"use client";

import { useState, useEffect } from "react";
import { Save, ArrowLeft, FileText, AlertCircle, Plus, Trash2, Search, Target, ShieldAlert, ShoppingCart, Users, Wallet, PackageOpen, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrowseCustomerModal } from "@/components/BrowseCustomerModal";
import { BrowseSalesModal } from "@/components/BrowseSalesModal";
import { BrowseValutaModal } from "@/components/BrowseValutaModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";
import { ScanPOModal } from "@/components/ScanPOModal";

export default function CreateOrderJual() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // Modal States
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isSalesModalOpen, setSalesModalOpen] = useState(false);
  const [isValutaModalOpen, setValutaModalOpen] = useState(false);
  const [isBarangModalOpen, setBarangModalOpen] = useState(false);
  const [isOCRModalOpen, setOCRModalOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // Master data lists for dropdowns
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [barangs, setBarangs] = useState<any[]>([]);

  useEffect(() => {
    // Fetch master data & session
    const fetchData = async () => {
      try {
        const [resCust, resSales, resBarang, resSession] = await Promise.all([
          fetch('/api/master/customer'),
          fetch('/api/master/sales'),
          fetch('/api/master/barang'),
          fetch('/api/auth/session')
        ]);
        const custData = await resCust.json();
        const salesData = await resSales.json();
        const brgData = await resBarang.json();
        const sessData = await resSession.json();

        if (custData.success) setCustomers(custData.data.filter((c:any) => c.status_aktif === 1));
        if (salesData.success) setSalesList(salesData.data.filter((s:any) => s.status_aktif === 1));
        if (brgData.success) setBarangs(brgData.data.filter((b:any) => b.status_aktif === 1));
        if (sessData.success) setSession(sessData.data);
      } catch (err) {
        console.error("Failed to fetch page data", err);
      }
    };
    fetchData();
  }, []);

  const [header, setHeader] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    customer: "",
    sales: "",
    nomor_po_customer: "",
    valuta: "IDR",
    kurs: 1,
    keterangan: "",
    diskonNominal: 0,
    ppnNominal: 0,
    ppnPct: 12, // Default to standard 12%
  });

  const [items, setItems] = useState<any[]>([
    { kode_barang: "", nama_barang: "", satuan: "", jumlah: 1, harga: 0, diskon_prosentase: 0, diskon_nominal: 0, netto: 0, subtotal: 0, keterangan: "" }
  ]);

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setHeader((prev) => {
      const next = { ...prev, [name]: ['kurs', 'diskonNominal', 'ppnNominal', 'ppnPct'].includes(name) ? parseFloat(value) || 0 : value };
      
      // Auto-calculate PPN Nominal if PPN % changes
      if (name === 'ppnPct') {
        const dppVal = totalSubtotalItems - next.diskonNominal;
        next.ppnNominal = dppVal * (next.ppnPct / 100);
      }
      return next;
    });
  };

  const calculateItem = (item: any) => {
    const qty = parseFloat(item.jumlah) || 0;
    const price = parseFloat(item.harga) || 0;
    const discPct = parseFloat(item.diskon_prosentase) || 0;
    
    // logic: if user enters disc %, calculate nominal, otherwise use nominal directly. 
    // Here we assume diskon_prosentase takes precedence if > 0.
    let discNom = parseFloat(item.diskon_nominal) || 0;
    if (discPct > 0) {
       discNom = price * (discPct / 100);
    }
    
    const netto = price - discNom;
    const subtotal = netto * qty;
    return { ...item, diskon_nominal: discNom, netto, subtotal };
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newItems = [...items];
    
    if (name === "kode_barang") {
      const selected = barangs.find(b => b.kode === value);
      if (selected) {
        newItems[index] = { 
          ...newItems[index], 
          kode_barang: selected.kode, 
          nama_barang: selected.nama, 
          satuan: selected.satuan,
          harga: selected.harga_jual || 0 // Default to selling price
        };
      } else {
        newItems[index] = { ...newItems[index], kode_barang: value, nama_barang: "" };
      }
    } else {
      newItems[index] = { ...newItems[index], [name]: value };
    }

    // Recalculate
    if (['jumlah', 'harga', 'diskon_prosentase', 'diskon_nominal'].includes(name)) {
       newItems[index] = calculateItem(newItems[index]);
    }

    setItems(newItems);
  };

  const addItem = () => setItems([...items, { kode_barang: "", nama_barang: "", satuan: "", jumlah: 1, harga: 0, diskon_prosentase: 0, diskon_nominal: 0, netto: 0, subtotal: 0, keterangan: "" }]);
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSelectBarang = (barang: any) => {
    if (activeItemIndex === null) return;
    const newItems = [...items];
    newItems[activeItemIndex] = { 
      ...newItems[activeItemIndex], 
      kode_barang: barang.kode, 
      nama_barang: barang.nama, 
      satuan: barang.satuan_nama || barang.satuan,
      harga: barang.harga_jual || 0 
    };
    newItems[activeItemIndex] = calculateItem(newItems[activeItemIndex]);
    setItems(newItems);
    setBarangModalOpen(false);
  };

  const handleOCRSuccess = (ocrData: any) => {
    // Populate header
    setHeader(prev => ({
      ...prev,
      nomor_po_customer: ocrData.po_number || "",
      tanggal: ocrData.date || prev.tanggal,
      // We don't auto-set customer name because it needs MH Customer match, 
      // but we can add it to keterangan if not matched.
      keterangan: ocrData.customer_name ? `Customer PO: ${ocrData.customer_name}\n${prev.keterangan}` : prev.keterangan
    }));

    // Populate items
    if (ocrData.items && ocrData.items.length > 0) {
      setItems(ocrData.items);
    }
  };

  // Subtotal and Totals
  const totalSubtotalItems = items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
  const dpp = totalSubtotalItems - header.diskonNominal;
  const grandTotal = dpp + header.ppnNominal;

  // Sync PPN Nominal when items/diskon change if ppnPct > 0
  useEffect(() => {
    setHeader(prev => {
      if (prev.ppnPct > 0) {
        const dppVal = totalSubtotalItems - prev.diskonNominal;
        const newPpnNominal = dppVal * (prev.ppnPct / 100);
        if (Math.abs(newPpnNominal - prev.ppnNominal) > 0.01) {
          return { ...prev, ppnNominal: newPpnNominal };
        }
      }
      return prev;
    });
  }, [totalSubtotalItems, header.diskonNominal, header.ppnPct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (items.some(i => !i.kode_barang || !i.nama_barang || i.jumlah <= 0)) {
         throw new Error("Lengkapi detail barang dengan benar");
      }

      const payload = {
        ...header,
        subtotal: totalSubtotalItems,
        dpp,
        grandTotal,
        items,
        user: session?.nama || "Admin",
        nomormhcabang: session?.nomormhcabang || 0,
        nomormhperusahaan: session?.nomormhperusahaan || 0
      };

      const res = await fetch("/api/penjualan/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/penjualan/order/${data.data.kode}`);
      } else {
        setError(data.error || "Gagal menyimpan data");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/penjualan/order" className="text-sm font-medium text-slate-500 hover:text-slate-700">
               Order Jual
             </Link>
             <span className="text-slate-300">/</span>
             <span className="text-sm font-medium text-slate-900 dark:text-white">Tambah Baru</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            Buat Order Jual
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link 
            href="/penjualan/order"
            className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <button
            type="submit"
            form="order-form"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {loading ? "Menyimpan..." : "Simpan Order"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-100 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div><h3 className="text-sm font-medium text-red-800">Gagal</h3><p className="text-sm text-red-600 mt-1">{error}</p></div>
          </div>
        )}

        <form id="order-form" onSubmit={handleSubmit}>
          {/* Header Info */}
          <div className="p-6 md:p-8 space-y-6 border-b border-slate-200 dark:border-slate-800">
             <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Informasi Dokumen</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">No. Order Jual</label>
                  <input type="text" readOnly value="[AUTOMATIC]" className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 font-bold outline-none cursor-not-allowed"/>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Order <span className="text-red-500">*</span></label>
                  <input type="date" name="tanggal" required value={header.tanggal} onChange={handleHeaderChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"/>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Customer <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={header.customer} placeholder="Pilih Customer..." className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none cursor-not-allowed"/>
                    <button type="button" onClick={() => setCustomerModalOpen(true)} className="px-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sales</label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={header.sales} placeholder="Pilih Sales..." className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none cursor-not-allowed"/>
                    <button type="button" onClick={() => setSalesModalOpen(true)} className="px-3 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors border border-slate-300">
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">No. PO Customer</label>
                  <input type="text" name="nomor_po_customer" value={header.nomor_po_customer} onChange={handleHeaderChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 outline-none" placeholder="Referensi PO"/>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Valuta</label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={header.valuta} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white outline-none cursor-not-allowed"/>
                    <button type="button" onClick={() => setValutaModalOpen(true)} className="px-3 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors border border-slate-300">
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Kurs</label>
                  <input type="number" name="kurs" required min="1" value={header.kurs} onChange={handleHeaderChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 outline-none"/>
                </div>
                
                <div className="space-y-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Keterangan</label>
                  <textarea name="keterangan" rows={2} value={header.keterangan} onChange={handleHeaderChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:border-indigo-500 outline-none resize-none" placeholder="Catatan tambahan..."/>
                </div>
             </div>
          </div>

          {/* Details */}
          <div className="p-6 md:p-8 space-y-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Detail Barang</h3>
             </div>
             
             <div className="overflow-x-auto min-h-[200px]">
                <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                   <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-y border-slate-200 dark:border-slate-700">
                         <th className="p-3 w-10 text-center">#</th>
                         <th className="p-3 w-64">Nama Barang</th>
                         <th className="p-3 w-24">Satuan</th>
                         <th className="p-3 w-24">Jumlah</th>
                         <th className="p-3 w-32">Harga</th>
                         <th className="p-3 w-24">Disc (%)</th>
                         <th className="p-3 w-32">Netto</th>
                         <th className="p-3 w-32">Subtotal</th>
                         <th className="p-3 w-10 text-center"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                      {items.map((item, index) => (
                         <tr key={index} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 text-center text-slate-500">{index + 1}</td>
                             <td className="p-2">
                                <div className="flex gap-1 group/item">
                                   <input 
                                     type="text" 
                                     name="nama_barang" 
                                     readOnly 
                                     placeholder="Klik ikon cari untuk pilih barang..." 
                                     value={item.nama_barang} 
                                     className="flex-1 text-sm p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" 
                                     onClick={() => { setActiveItemIndex(index); setBarangModalOpen(true); }}
                                     required
                                   />
                                   <button type="button" onClick={() => { setActiveItemIndex(index); setBarangModalOpen(true); }} className="px-2 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 border border-indigo-200 transition-colors">
                                      <Search className="h-3.5 w-3.5" />
                                   </button>
                                </div>
                            </td>
                            <td className="p-2">
                               <input type="text" name="satuan" readOnly value={item.satuan} className="w-full text-sm p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none cursor-not-allowed" placeholder="PCS"/>
                            </td>
                            <td className="p-2">
                               <input type="number" name="jumlah" min="1" step="0.01" value={item.jumlah} onChange={(e) => handleItemChange(index, e)} className="w-full text-sm p-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none" required/>
                            </td>
                            <td className="p-2">
                               <input type="number" name="harga" min="0" step="0.01" value={item.harga} onChange={(e) => handleItemChange(index, e)} className="w-full text-sm p-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none"/>
                            </td>
                            <td className="p-2">
                               <input type="number" name="diskon_prosentase" min="0" max="100" step="0.01" value={item.diskon_prosentase} onChange={(e) => handleItemChange(index, e)} className="w-full text-sm p-2 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none"/>
                            </td>
                            <td className="p-2">
                               <input type="number" readOnly value={item.netto} className="w-full text-sm p-2 rounded border-none bg-transparent outline-none text-slate-500 font-medium" />
                            </td>
                            <td className="p-2">
                               <input type="number" readOnly value={item.subtotal} className="w-full text-sm p-2 rounded border-none bg-transparent outline-none text-indigo-600 dark:text-indigo-400 font-semibold truncate" />
                            </td>
                            <td className="p-2 text-center">
                               <button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20 transition-colors">
                                  <Trash2 className="h-4 w-4"/>
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
             
             <div className="flex justify-start">
                <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-all border border-indigo-200 dark:border-indigo-800 shadow-sm mt-4">
                   <Plus className="h-4 w-4"/> Tambah Baris Detail
                </button>
             </div>
          </div>

          {/* Totals Section */}
          <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-950">
             <div className="w-full md:w-1/2 lg:w-1/3 space-y-3">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-600 dark:text-slate-400 font-medium">Subtotal Item</span>
                   <span className="font-semibold text-slate-900 dark:text-white">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(totalSubtotalItems)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-600 dark:text-slate-400 font-medium pt-2">Diskon Nominal (-)</span>
                   <input type="number" min="0" name="diskonNominal" value={header.diskonNominal || ''} onChange={handleHeaderChange} className="w-1/3 text-right text-sm p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-indigo-500"/>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                   <span className="text-slate-600 dark:text-slate-400 font-medium">DPP</span>
                   <span className="font-semibold text-slate-900 dark:text-white">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(dpp)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">PPN (%)</span>
                      <input type="number" min="0" max="100" name="ppnPct" value={header.ppnPct || ''} onChange={handleHeaderChange} className="w-16 text-center text-sm p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:border-indigo-500"/>
                   </div>
                   <input type="number" min="0" name="ppnNominal" value={header.ppnNominal || ''} onChange={handleHeaderChange} className="w-1/2 text-right text-sm p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-indigo-500"/>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-slate-slate-300 dark:border-slate-700">
                   <span className="text-base font-bold text-slate-900 dark:text-white">Grand Total</span>
                   <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {header.valuta} {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(grandTotal)}
                   </span>
                </div>
             </div>
          </div>

        </form>
      </div>

      {/* Modals */}
      <BrowseCustomerModal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setCustomerModalOpen(false)}
        onSelect={(cust) => {
          setHeader(prev => ({ ...prev, customer: cust.nama }));
          setCustomerModalOpen(false);
        }}
      />
      <BrowseSalesModal
        isOpen={isSalesModalOpen}
        onClose={() => setSalesModalOpen(false)}
        onSelect={(sales) => {
          setHeader(prev => ({ ...prev, sales: sales.nama }));
          setSalesModalOpen(false);
        }}
      />
      <BrowseValutaModal
        isOpen={isValutaModalOpen}
        onClose={() => setValutaModalOpen(false)}
        onSelect={(valuta) => {
          setHeader(prev => ({ ...prev, valuta: valuta.kode, kurs: parseFloat(String(valuta.kurs)) || 1 }));
          setValutaModalOpen(false);
        }}
      />
      <BrowseBarangModal
        isOpen={isBarangModalOpen}
        onClose={() => setBarangModalOpen(false)}
        onSelect={handleSelectBarang}
      />
      <ScanPOModal
        isOpen={isOCRModalOpen}
        onClose={() => setOCRModalOpen(false)}
        onSuccess={handleOCRSuccess}
      />
    </div>
  );
}
