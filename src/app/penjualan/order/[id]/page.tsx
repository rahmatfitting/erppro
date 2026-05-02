"use client";

import { useState, useEffect } from "react";
import { Save, ArrowLeft, FileText, AlertCircle, Plus, Trash2, FileEdit, X, Printer, Search, Sparkles } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import PrintModal from "@/components/PrintModal";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import { BrowseCustomerModal } from "@/components/BrowseCustomerModal";
import { BrowseSalesModal } from "@/components/BrowseSalesModal";
import { BrowseValutaModal } from "@/components/BrowseValutaModal";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

export default function OrderJualDetail() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialMode = searchParams.get('mode') || 'view';

  const [isEdit, setIsEdit] = useState(initialMode === 'edit');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");

  // Modal states
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isSalesModalOpen, setSalesModalOpen] = useState(false);
  const [isValutaModalOpen, setValutaModalOpen] = useState(false);
  const [isBarangModalOpen, setBarangModalOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // Master data lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [barangs, setBarangs] = useState<any[]>([]);

  const [header, setHeader] = useState<any>({
    kode: "",
    tanggal: "",
    customer: "",
    sales: "",
    nomor_po_customer: "",
    valuta: "IDR",
    kurs: 1,
    keterangan: "",
    diskonNominal: 0,
    ppnNominal: 0,
    ppnProsentase: 0,
    status_aktif: 1,
    status_disetujui: 0,
    nomor: null
  });

  const [items, setItems] = useState<any[]>([]);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [resCust, resSales, resBarang, resDetail] = await Promise.all([
        fetch('/api/master/customer'),
        fetch('/api/master/sales'),
        fetch('/api/master/barang'),
        fetch(`/api/penjualan/order/${id}`)
      ]);
      const custData = await resCust.json();
      const salesData = await resSales.json();
      const brgData = await resBarang.json();
      const detailData = await resDetail.json();

      if (custData.success) setCustomers(custData.data.filter((c:any) => c.status_aktif === 1));
      if (salesData.success) setSalesList(salesData.data.filter((s:any) => s.status_aktif === 1));
      if (brgData.success) setBarangs(brgData.data.filter((b:any) => b.status_aktif === 1));

      if (detailData.success && detailData.data) {
         const data = detailData.data;
         setHeader({
            kode: data.kode,
            tanggal: new Date(data.tanggal).toISOString().split('T')[0],
            customer: data.customer,
            sales: data.sales || "",
            nomor_po_customer: data.nomor_po_customer || "",
            valuta: data.valuta || "IDR",
            kurs: data.kurs || 1,
            keterangan: data.keterangan || "",
            diskonNominal: data.diskon_nominal || 0,
            ppnNominal: data.ppn_nominal || 0,
            ppnProsentase: data.ppn_prosentase || 0,
            status_aktif: data.status_aktif,
            status_disetujui: data.status_disetujui,
            nomor: data.nomor
         });
         setItems(data.items || []);
      } else {
         setError(detailData.error || "Data tidak ditemukan");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal mengambil data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!isEdit) return;
    const { name, value } = e.target;
    
    if (name === 'kurs' || name === 'diskonNominal' || name === 'ppnNominal' || name === 'ppnProsentase') {
      const val = parseFloat(value) || 0;
      setHeader((prev: any) => {
        const newState = { ...prev, [name]: val };
        
        // Auto-calculate PPN nominal if percentage changes
        if (name === 'ppnProsentase' || name === 'diskonNominal') {
          const totalSubtotalItems = items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
          const currentDiskon = name === 'diskonNominal' ? val : prev.diskonNominal;
          const currentPpnPct = name === 'ppnProsentase' ? val : prev.ppnProsentase;
          const dpp = totalSubtotalItems - currentDiskon;
          newState.ppnNominal = Math.round(dpp * (currentPpnPct / 100));
        }

        return newState;
      });
    } else {
      setHeader((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setHeader((prev: any) => ({ ...prev, customer: customer.nama }));
    setCustomerModalOpen(false);
  };

  const handleSelectSales = (sales: any) => {
    setHeader((prev: any) => ({ ...prev, sales: sales.nama }));
    setSalesModalOpen(false);
  };

  const handleSelectValuta = (valuta: any) => {
    setHeader((prev: any) => ({ ...prev, valuta: valuta.kode, kurs: valuta.kurs || 1 }));
    setValutaModalOpen(false);
  };

  const handleSelectBarang = (barang: any) => {
    if (activeItemIndex === null) return;
    const newItems = [...items];
    newItems[activeItemIndex] = calculateItem({
      ...newItems[activeItemIndex],
      kode_barang: barang.kode,
      nama_barang: barang.nama,
      satuan: barang.satuan,
      harga: barang.harga_jual || 0
    });
    setItems(newItems);
    setBarangModalOpen(false);
  };

  const calculateItem = (item: any) => {
    const qty = parseFloat(item.jumlah) || 0;
    const price = parseFloat(item.harga) || 0;
    const discPct = parseFloat(item.diskon_prosentase) || 0;
    
    let discNom = parseFloat(item.diskon_nominal) || 0;
    if (discPct > 0) {
       discNom = price * (discPct / 100);
    }
    
    const netto = price - discNom;
    const subtotal = netto * qty;
    return { ...item, diskon_nominal: discNom, netto, subtotal };
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!isEdit) return;
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
          harga: selected.harga_jual || 0 
        };
      } else {
        newItems[index] = { ...newItems[index], kode_barang: value, nama_barang: "" };
      }
    } else {
      newItems[index] = { ...newItems[index], [name]: value };
    }

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

  const totalSubtotalItems = items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
  const dpp = totalSubtotalItems - header.diskonNominal;
  const grandTotal = dpp + header.ppnNominal;

  const handleSave = async (e: React.FormEvent) => {
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
        ppn_prosentase: header.ppnProsentase,
        grandTotal,
        items,
        user: "Admin" 
      };

      const res = await fetch(`/api/penjualan/order/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setIsEdit(false);
        fetchData(); // reload valid data
      } else {
        setError(data.error || "Gagal mengupdate data");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
     return (
        <div className="flex items-center justify-center p-12">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
     );
  }

  const isCanceled = header.status_aktif === 0;
  const isApproved = header.status_disetujui === 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/penjualan/order" className="text-sm font-medium text-slate-500 hover:text-slate-700">
               Order Jual
             </Link>
             <span className="text-slate-300">/</span>
             <span className="text-sm font-medium text-slate-900 dark:text-white">Detail Order</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            {header.kode}
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ml-2",
              isCanceled 
                ? "bg-red-50 text-red-700 border-red-200"
                : isApproved
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              {isCanceled ? 'Dibatalkan' : isApproved ? 'Disetujui' : 'Menunggu Approval'}
            </span>
          </h1>
        </div>
        
        <div className="flex gap-2">
           {!isEdit ? (
             <>
               <Link href="/penjualan/order" className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                 <ArrowLeft className="h-4 w-4" /> Kembali
               </Link>
               {!isCanceled && !isApproved && (
                 <button onClick={() => setIsEdit(true)} className="inline-flex items-center gap-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 text-sm font-medium shadow-sm hover:bg-amber-100">
                   <FileEdit className="h-4 w-4" /> Edit
                 </button>
               )}
               {/* Tombol Print jika sudah disetujui */}
               {isApproved && (
                 <button
                   onClick={() => setIsPrintOpen(true)}
                   className="inline-flex items-center gap-2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 text-sm font-medium shadow-sm hover:bg-indigo-100"
                 >
                   <Printer className="h-4 w-4" /> Print
                 </button>
               )}
             </>
           ) : (
             <>
                <button onClick={() => setIsEdit(false)} className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
                  <X className="h-4 w-4" /> Batal
                </button>
                <button
                  type="submit"
                  form="order-form"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Menyimpan..." : "Simpan Perbaikan"}
                </button>
             </>
           )}
        </div>
      </div>

      {/* Tabs */}
      {!isEdit && (
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab("detail")} 
            className={cn(
              "px-6 py-3 text-sm font-bold border-b-2 transition-all", 
              activeTab === "detail" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Detail Order
          </button>
          <button 
            onClick={() => setActiveTab("history")} 
            className={cn(
              "px-6 py-3 text-sm font-bold border-b-2 transition-all", 
              activeTab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            History Log
          </button>
        </div>
      )}

      {activeTab === "detail" || isEdit ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-100 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div><h3 className="text-sm font-medium text-red-800">Error</h3><p className="text-sm text-red-600 mt-1">{error}</p></div>
          </div>
        )}

        <form id="order-form" onSubmit={handleSave}>
          {/* Header Info */}
          <div className="p-6 md:p-8 space-y-6 border-b border-slate-200 dark:border-slate-800">
             <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Informasi Dokumen</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">No. Order Jual</label>
                   <input type="text" readOnly value={header.kode || '[AUTOMATIC]'} className="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-500 outline-none" />
                 </div>

                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Order <span className="text-red-500">*</span></label>
                   <input type="date" name="tanggal" required readOnly={!isEdit} value={header.tanggal} onChange={handleHeaderChange} className={cn("w-full rounded-md px-3 py-2 text-sm outline-none", !isEdit ? "bg-slate-50 border border-slate-200 text-slate-500" : "bg-white border border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10")}/>
                 </div>

                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Customer <span className="text-red-500">*</span></label>
                   <div className="relative">
                     <input 
                       type="text" 
                       readOnly 
                       value={header.customer} 
                       className={cn("w-full rounded-md px-3 py-2 text-sm outline-none", !isEdit ? "bg-slate-50 border border-slate-200 text-slate-500" : "bg-white border border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer")}
                       onClick={() => isEdit && setCustomerModalOpen(true)}
                       placeholder="Pilih Customer..."
                     />
                     {isEdit && (
                       <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                         <Search className="h-4 w-4 text-slate-400" />
                       </div>
                     )}
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sales</label>
                   <div className="relative">
                     <input 
                       type="text" 
                       readOnly 
                       value={header.sales || ""} 
                       className={cn("w-full rounded-md px-3 py-2 text-sm outline-none", !isEdit ? "bg-slate-50 border border-slate-200 text-slate-500" : "bg-white border border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer")}
                       onClick={() => isEdit && setSalesModalOpen(true)}
                       placeholder="Pilih Sales..."
                     />
                     {isEdit && (
                       <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                         <Search className="h-4 w-4 text-slate-400" />
                       </div>
                     )}
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">No. PO Customer</label>
                   <input type="text" name="nomor_po_customer" readOnly={!isEdit} value={header.nomor_po_customer} onChange={handleHeaderChange} className={cn("w-full rounded-md px-3 py-2 text-sm outline-none", !isEdit ? "bg-slate-50 border border-slate-200 text-slate-500" : "bg-white border border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10")}/>
                 </div>

                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Valuta</label>
                   <div className="relative">
                     <input 
                       type="text" 
                       readOnly 
                       value={header.valuta} 
                       className={cn("w-full rounded-md px-3 py-2 text-sm outline-none", !isEdit ? "bg-slate-50 border border-slate-200 text-slate-500" : "bg-white border border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer")}
                       onClick={() => isEdit && setValutaModalOpen(true)}
                     />
                     {isEdit && (
                       <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                         <Search className="h-4 w-4 text-slate-400" />
                       </div>
                     )}
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Kurs</label>
                   <input type="number" name="kurs" required min="1" readOnly={!isEdit} value={header.kurs} onChange={handleHeaderChange} className={cn("w-full rounded-md px-3 py-2 text-sm outline-none", !isEdit ? "bg-slate-50 border border-slate-200 text-slate-500" : "bg-white border border-slate-300 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10")}/>
                 </div>
             </div>
                
                <div className="space-y-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Keterangan</label>
                  <textarea name="keterangan" rows={2} readOnly={!isEdit} value={header.keterangan} onChange={handleHeaderChange} className={cn("w-full rounded-md px-3 py-2 text-sm outline-none resize-none", !isEdit ? "bg-slate-50 border border-slate-200 text-slate-500" : "bg-white border border-slate-300 focus:border-indigo-500")}/>
                </div>
          </div>

          {/* Details */}
          <div className="p-6 md:p-8 space-y-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Detail Barang</h3>
             </div>
             
             <div className="overflow-x-auto min-h-[200px]">
                <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                   <thead>
                      <tr className="bg-slate-100/80 text-slate-700 border-y border-slate-200">
                         <th className="p-3 w-10 text-center">#</th>
                         <th className="p-3 w-64">Nama Barang</th>
                         <th className="p-3 w-24">Satuan</th>
                         <th className="p-3 w-24">Jumlah</th>
                         <th className="p-3 w-32">Harga</th>
                         <th className="p-3 w-24">Disc (%)</th>
                         <th className="p-3 w-32">Netto</th>
                         <th className="p-3 w-32 font-bold">Subtotal</th>
                         {isEdit && <th className="p-3 w-10 text-center"></th>}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-200 bg-white">
                      {items.map((item, index) => (
                         <tr key={index} className="group hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-center text-slate-500">{index + 1}</td>
                            <td className="p-2">
                               <div className="flex flex-col gap-1">
                                 <div className="relative">
                                   <input 
                                     type="text" 
                                     readOnly 
                                     value={item.nama_barang || ""} 
                                     placeholder={isEdit ? "Klik untuk pilih barang..." : ""}
                                     className={cn(
                                       "w-full text-sm p-2 pr-8 rounded outline-none transition-all", 
                                       isEdit ? "border border-slate-300 bg-white focus:border-indigo-500 cursor-pointer hover:bg-slate-50" : "border-none bg-transparent font-medium text-slate-900"
                                     )}
                                     onClick={() => {
                                       if (isEdit) {
                                         setActiveItemIndex(index);
                                         setBarangModalOpen(true);
                                       }
                                     }}
                                   />
                                   {isEdit && (
                                     <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                       <Search className="h-3.5 w-3.5 text-slate-400" />
                                     </div>
                                   )}
                                 </div>
                               </div>
                            </td>
                            <td className="p-2">
                               <input type="text" readOnly value={item.satuan} className="w-full text-sm p-2 rounded border-none bg-transparent outline-none text-slate-500" />
                            </td>
                            <td className="p-2 w-24">
                               <input 
                                  type="number" 
                                  name="jumlah" 
                                  min="1" 
                                  step="0.01" 
                                  readOnly={!isEdit} 
                                  value={item.jumlah} 
                                  onChange={(e) => handleItemChange(index, e)} 
                                  className={cn("w-full text-sm p-2 rounded outline-none text-center", isEdit ? "border border-slate-300 bg-white focus:border-indigo-500" : "border-none bg-transparent font-medium")} 
                                  required
                               />
                            </td>
                            <td className="p-2">
                               <input 
                                  type="number" 
                                  name="harga" 
                                  min="0" 
                                  step="0.01" 
                                  readOnly={!isEdit} 
                                  value={item.harga} 
                                  onChange={(e) => handleItemChange(index, e)} 
                                  className={cn("w-full text-sm p-2 rounded outline-none text-right", isEdit ? "border border-slate-300 bg-white focus:border-indigo-500" : "border-none bg-transparent font-medium")}
                               />
                            </td>
                            <td className="p-2">
                               <input 
                                  type="number" 
                                  name="diskon_prosentase" 
                                  min="0" 
                                  max="100" 
                                  step="0.01" 
                                  readOnly={!isEdit} 
                                  value={item.diskon_prosentase} 
                                  onChange={(e) => handleItemChange(index, e)} 
                                  className={cn("w-full text-sm p-2 rounded outline-none text-center", isEdit ? "border border-slate-300 bg-white focus:border-indigo-500" : "border-none bg-transparent font-medium")}
                               />
                            </td>
                            <td className="p-2">
                               <div className="w-full text-sm p-2 text-right text-slate-500 font-medium">
                                 {new Intl.NumberFormat('id-ID').format(item.netto)}
                               </div>
                            </td>
                            <td className="p-2">
                               <div className="w-full text-sm p-2 text-right text-indigo-600 font-bold">
                                 {new Intl.NumberFormat('id-ID').format(item.subtotal)}
                               </div>
                            </td>
                            {isEdit && (
                              <td className="p-2 text-center">
                                 <button type="button" onClick={() => removeItem(index)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors group">
                                    <Trash2 className="h-4 w-4 transform group-hover:scale-110 transition-transform"/>
                                 </button>
                              </td>
                            )}
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             {isEdit && (
               <div className="mt-4 flex justify-start">
                 <button 
                   type="button" 
                   onClick={addItem} 
                   className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-indigo-400 transition-all active:scale-95 shadow-sm"
                 >
                    <Plus className="h-4 w-4 text-indigo-600"/>
                    Tambah Baris Barang
                 </button>
               </div>
             )}
          </div>

          {/* Totals Section */}
          <div className="p-6 md:p-8 border-b border-slate-200 flex justify-end bg-white">
             <div className="w-full md:w-1/2 lg:w-1/3 space-y-3">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-600 font-medium">Subtotal Item</span>
                   <span className="font-semibold text-slate-900">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(totalSubtotalItems)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-600 font-medium pt-2">Diskon Nominal (-)</span>
                   <input type="number" min="0" name="diskonNominal" readOnly={!isEdit} value={header.diskonNominal || ''} onChange={(e) => handleHeaderChange(e)} className={cn("w-1/3 text-right text-sm p-1.5 rounded outline-none", isEdit ? "border border-slate-300 bg-transparent focus:border-indigo-500" : "border-none text-right font-medium")}/>
                </div>
                 <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                   <span className="text-slate-600 font-medium">DPP</span>
                   <span className="font-semibold text-slate-900">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(dpp)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                     <span className="text-slate-600 font-medium pt-2 text-nowrap">PPN Nominal (+)</span>
                     {isEdit && (
                       <div className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-1 mt-2">
                         <input 
                           type="number" 
                           name="ppnProsentase" 
                           value={header.ppnProsentase}
                           onChange={(e) => handleHeaderChange(e)}
                           className="w-10 bg-transparent text-right text-xs font-bold outline-none text-indigo-600"
                         />
                         <span className="text-[10px] font-bold text-slate-400">%</span>
                       </div>
                     )}
                   </div>
                   <input type="number" min="0" name="ppnNominal" readOnly={!isEdit} value={header.ppnNominal || ''} onChange={(e) => handleHeaderChange(e)} className={cn("w-1/3 text-right text-sm p-1.5 rounded outline-none", isEdit ? "border border-slate-300 bg-transparent focus:border-indigo-500" : "border-none text-right font-medium")}/>
                 </div>
                 <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300">
                   <span className="text-base font-bold text-slate-900">Grand Total</span>
                   <span className="text-lg font-bold text-indigo-600">
                      {header.valuta} {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(grandTotal)}
                   </span>
                </div>
             </div>
          </div>

          {isEdit && (
            <div className="p-6 md:p-8 flex justify-end bg-slate-50">
               <button
                 type="submit"
                 disabled={loading}
                 className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Save className="h-4 w-4" />
                 {loading ? "Menyimpan..." : "Update Order Jual"}
               </button>
            </div>
          )}
        </form>
      </div>
      ) : (
        <HistoryLogTab menu="Order Penjualan" nomor_transaksi={header.nomor} />
      )}

      {/* Print Modal */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        data={{
          title: "Sales Order (SO)",
          kode: header.kode,
          tanggal: header.tanggal,
          keterangan: header.keterangan,
          extraHeaders: [
            { label: "Customer", value: header.customer || "-" },
            { label: "Sales", value: header.sales || "-" },
            { label: "PO Customer", value: header.nomor_po_customer || "-" },
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Kode", key: "kode_barang", width: 25 },
            { header: "Nama Barang", key: "nama_barang" },
            { header: "Satuan", key: "satuan", width: 18 },
            { header: "Jumlah", key: "jumlah", width: 18, align: "right" },
            { header: "Harga", key: "harga", width: 30, align: "right", format: (v) => Number(v).toLocaleString('id-ID') },
            { header: "Disc(%)", key: "diskon_prosentase", width: 18, align: "right" },
            { header: "Subtotal", key: "subtotal", width: 35, align: "right", format: (v) => Number(v).toLocaleString('id-ID') },
          ],
          rows: items,
          footerRows: [
            { label: "Subtotal", value: totalSubtotalItems.toLocaleString('id-ID') },
            { label: "Diskon", value: `-${(header.diskonNominal || 0).toLocaleString('id-ID')}` },
            { label: "DPP", value: dpp.toLocaleString('id-ID') },
            { label: "PPN", value: (header.ppnNominal || 0).toLocaleString('id-ID') },
            { label: "Grand Total", value: `${header.valuta} ${grandTotal.toLocaleString('id-ID')}` },
          ]
        }}
      />

       <BrowseCustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          onSelect={handleSelectCustomer}
       />

       <BrowseSalesModal
          isOpen={isSalesModalOpen}
          onClose={() => setSalesModalOpen(false)}
          onSelect={handleSelectSales}
       />

       <BrowseValutaModal
          isOpen={isValutaModalOpen}
          onClose={() => setValutaModalOpen(false)}
          onSelect={handleSelectValuta}
       />

       <BrowseBarangModal
          isOpen={isBarangModalOpen}
          onClose={() => setBarangModalOpen(false)}
          onSelect={handleSelectBarang}
       />
    </div>
  );
}
