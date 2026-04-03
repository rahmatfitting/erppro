"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Truck, Loader2, ArrowLeft, FileEdit, X, AlertCircle, Printer, History, Search, Store, PackageOpen, QrCode } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import PrintModal from "@/components/PrintModal";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import { BrowseBarangPOModal } from "@/components/BrowseBarangPOModal";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { BrowsePOModal } from "@/components/BrowsePOModal";
import { QRCodePrintModal } from "@/components/QRCodePrintModal";

export default function PenerimaanBarangDetail() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialMode = searchParams.get('mode') || 'view';
  
  const [activeTab, setActiveTab ] = useState<"detail" | "history">("detail");
  const [isEdit, setIsEdit] = useState(initialMode === 'edit');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isQRPrintOpen, setIsQRPrintOpen] = useState(false);
  const [isBrowseBarangOpen, setIsBrowseBarangOpen] = useState(false);
  const [isBrowseGudangOpen, setIsBrowseGudangOpen] = useState(false);
  const [isBrowseSupplierOpen, setIsBrowseSupplierOpen] = useState(false);
  const [isBrowsePOOpen, setIsBrowsePOOpen] = useState(false);

  const [header, setHeader] = useState({
    nomor: 0,
    kode: "",
    tanggal: "",
    supplier: "",
    nomormhsupplier: 0,
    kodeOrderBeli: "",
    nomorthbeliorder: null as number | null,
    keterangan: "",
    noSuratJalan: "",
    tglSuratJalan: "",
    nomormhgudang: null as number | null,
    gudang: "",
    status_aktif: 1,
    status_disetujui: 0
  });

  const [items, setItems] = useState<any[]>([]);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/pembelian/penerimaan/${id}`);
      const data = await res.json();

      if (data.success) {
        const item = data.data;

        setHeader({
          nomor: item.nomor,
          kode: item.kode || "",
          tanggal: item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : "",
          supplier: item.supplier || "",
          nomormhsupplier: item.nomormhsupplier || 0,
          nomorthbeliorder: item.nomorthbeliorder || null,
          kodeOrderBeli: item.kode_po || "",
          keterangan: item.keterangan || "",
          noSuratJalan: item.nomor_surat_jalan || "",
          tglSuratJalan: item.tanggal_surat_jalan ? new Date(item.tanggal_surat_jalan).toISOString().split('T')[0] : "",
          nomormhgudang: item.nomormhgudang || null,
          gudang: item.gudang || "",
          status_aktif: item.status_aktif,
          status_disetujui: item.status_disetujui
        });
        
        setItems((item.items || []).map((it: any) => ({
            ...it,
            nomormhbarang: it.nomormhbarang,
            nomormhsatuan: it.nomormhsatuan,
            nomortdbeliorder: it.nomortdbeliorder,
            nomorthbeliorder: it.nomorthbeliorder,
            barang: it.barang || it.nama_barang || "",
            satuan: it.satuan || "Pcs",
            jumlahDipesan: it.jumlahDipesan || 0,
            jumlahDiterima: it.jumlahDiterima || it.jumlah || 0,
            keterangan: it.keterangan || ""
        })));
        
        if (!item.items || item.items.length === 0) {
            setItems([{ 
              id: Date.now(), 
              nomormhbarang: null,
              nomormhsatuan: null,
              barang: "", 
              satuan: "Pcs", 
              jumlahDipesan: 0,
              jumlahDiterima: 1, 
              keterangan: "" 
            }]);
        }
      } else {
        setError("Data tidak ditemukan");
      }
    } catch (err: any) {
      setError("Error mengambil data");
      console.error("Error fetching", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const addItem = () => {
    if (!header.kodeOrderBeli) {
      alert("Penerimaan ini tidak memiliki referensi PO");
      return;
    }
    setIsBrowseBarangOpen(true);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: number, field: string, value: string | number) => {
    if (!isEdit) return;
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSelectBarang = (item: any) => {
    if (items.find(i => i.nomortdbeliorder === item.nomortdbeliorder)) {
        setError("Barang ini sudah ada di daftar");
        setIsBrowseBarangOpen(false);
        return;
    }

    setItems([
      ...items,
      { 
        id: Date.now(), 
        nomorthbeliorder: header.nomorthbeliorder,
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

  const handleSelectGudang = (gudang: any) => {
    setHeader({
      ...header,
      gudang: gudang.nama,
      nomormhgudang: gudang.nomor,
    });
    setIsBrowseGudangOpen(false);
  };

  const handleSelectSupplier = (supplier: any) => {
    setHeader({
      ...header,
      supplier: supplier.nama,
      nomormhsupplier: supplier.nomor,
    });
    setIsBrowseSupplierOpen(false);
  };

  const handleSelectPO = (po: any) => {
    setHeader({
      ...header,
      nomorthbeliorder: po.nomor,
      kodeOrderBeli: po.kode,
      supplier: po.supplier,
      nomormhsupplier: po.nomormhsupplier,
    });
    setItems([]); // Clear items when PO changes, as in Create mode
    setIsBrowsePOOpen(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!header.nomormhsupplier) throw new Error("Supplier harus dipilih");
      if (!header.noSuratJalan) throw new Error("Nomor Surat Jalan wajib diisi");
      
      const validItems = items.filter(i => i.barang.trim() !== "");
      if (validItems.length === 0) throw new Error("Minimal satu barang harus diisi");
      
      const invalidQty = validItems.filter(i => i.jumlahDiterima <= 0);
      if (invalidQty.length > 0) throw new Error("Jumlah diterima harus lebih dari 0");

      const payload = {
        tanggal: header.tanggal,
        supplier: header.supplier,
        nomormhsupplier: header.nomormhsupplier,
        suratJalan: header.noSuratJalan,
        tglSuratJalan: header.tglSuratJalan,
        keterangan: header.keterangan,
        nomorthbeliorder: header.nomorthbeliorder,
        kode_po: header.kodeOrderBeli,
        nomormhgudang: header.nomormhgudang,
        gudang: header.gudang,
        user: typeof window !== 'undefined' ? localStorage.getItem('user_name') || 'Admin' : 'Admin',
        items: validItems.map(item => ({
          nomorthbeliorder: header.nomorthbeliorder,
          nomortdbeliorder: item.nomortdbeliorder,
          nomormhbarang: item.nomormhbarang,
          nomormhsatuan: item.nomormhsatuan,
          kode_po: header.kodeOrderBeli,
          kode_barang: item.kode_barang || "", 
          nama_barang: item.barang,
          satuan: item.satuan,
          jumlahDiterima: item.jumlahDiterima,
          keterangan: item.keterangan
        }))
      };

      const res = await fetch(`/api/pembelian/penerimaan/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal mengupdate data Penerimaan Barang");
      }

      setIsEdit(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionId: string, action: 'approve' | 'disapprove' | 'delete') => {
    if (!confirm(`Apakah Anda yakin ingin melakukan aksi ${action}?`)) return;
    try {
      const res = await fetch('/api/pembelian/penerimaan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId, action })
      });
      const result = await res.json();
      if (result.success) {
         if (action === 'delete') {
             router.push('/pembelian/penerimaan');
         } else {
             fetchData();
         }
      } else {
        alert(result.error || "Gagal melakukan aksi");
      }
    } catch (error: any) {
       console.error("Action error:", error);
       alert("Terjadi kesalahan sistem: " + error.message);
    }
  };

  if (fetching) {
     return (
       <div className="flex justify-center items-center h-48">
         <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
       </div>
     );
  }

  // UI logic for status translation
  const getStatusDisplay = (aktif: number, disetujui: number) => {
    if (aktif === 0) return { label: 'Dibatalkan', color: 'bg-red-50 text-red-700 border-red-200' };
    if (disetujui === 1) return { label: 'Disetujui', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label: 'Menunggu Approval', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  const statusDisplay = getStatusDisplay(header.status_aktif, header.status_disetujui);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 mt-4 md:mt-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Link href="/pembelian/penerimaan" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
               Penerimaan Barang
             </Link>
             <span className="text-slate-300 dark:text-slate-600">/</span>
             <span className="text-sm font-medium text-slate-900 dark:text-white">Detail Penerimaan</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Truck className="h-6 w-6 text-emerald-600" />
            {header.kode}
            <span className={cn(
               "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ml-2",
               statusDisplay.color
             )}>
               {statusDisplay.label}
             </span>
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {!isEdit ? (
            <>
              <Link 
                href="/pembelian/penerimaan"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
              
              {header.status_aktif === 1 && (
                  <>
                    {!header.status_disetujui ? (
                      <>
                        <button 
                          onClick={() => setIsEdit(true)}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm hover:bg-amber-100 transition-all active:scale-95"
                        >
                          <FileEdit className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button 
                          onClick={() => handleAction(header.nomor.toString(), 'approve')}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span>Approve LPB</span>
                        </button>
                        <button 
                          onClick={() => handleAction(header.nomor.toString(), 'delete')}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-900 border border-red-200 text-red-600 px-3 py-2 text-sm font-bold hover:bg-red-50 transition-all active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Batalkan LPB</span>
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => handleAction(header.nomor.toString(), 'disapprove')}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-900 border border-amber-200 text-amber-600 px-3 py-2 text-sm font-bold hover:bg-amber-50 transition-all active:scale-95"
                      >
                        <X className="h-4 w-4" />
                        <span>Batal Approval</span>
                      </button>
                    )}
                  </>
              )}

              {header.status_disetujui === 1 && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsQRPrintOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm hover:bg-amber-100 transition-all active:scale-95"
                    >
                        <QrCode className="h-4 w-4" />
                        <span>Cetak QR Code</span>
                    </button>
                    <button
                        onClick={() => setIsPrintOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shadow-sm hover:bg-indigo-100 transition-all active:scale-95"
                    >
                        <Printer className="h-4 w-4" />
                        <span>Cetak LPB</span>
                    </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setIsEdit(false);
                  fetchData();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all"
              >
                <X className="h-4 w-4" />
                <span>Batal</span>
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 py-2 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {loading ? "Menyimpan Paksa..." : "Simpan Penerimaan"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab("detail")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300", 
            activeTab === "detail" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Detail Penerimaan
        </button>
        <button 
          onClick={() => setActiveTab("history")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2", 
            activeTab === "history" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <History className="h-4 w-4" /> History Log
        </button>
      </div>

      {activeTab === "detail" ? (
        <div className="animate-in fade-in duration-500 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between border border-red-100 shadow-sm">
              <span className="text-sm font-medium flex items-center gap-2"><AlertCircle className="h-4 w-4"/> {error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* Header Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
            <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400 border-b pb-2">
              Informasi Penerimaan (LPB)
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  No. LPB
                </label>
                <div className="px-3 py-2.5 text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100">
                  {header.kode}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tgl Penerimaan
                </label>
                <input
                  type="date"
                  value={header.tanggal || ""}
                  onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                  readOnly={!isEdit}
                  className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${
                      !isEdit 
                        ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent cursor-default font-semibold" 
                        : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  No. Surat Jalan
                </label>
                <input
                  type="text"
                  placeholder="SJ-..."
                  value={header.noSuratJalan || ""}
                  onChange={(e) => setHeader({ ...header, noSuratJalan: e.target.value })}
                  readOnly={!isEdit}
                  className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${
                      !isEdit 
                        ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent cursor-default font-bold" 
                        : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Vendor / Supplier
                </label>
                {isEdit ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={header.supplier || ""}
                            readOnly
                            placeholder="Pilih Supplier..."
                            onClick={() => setIsBrowseSupplierOpen(true)}
                            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                        />
                        <button
                            onClick={() => setIsBrowseSupplierOpen(true)}
                            className="px-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                            <Plus className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>
                ) : (
                    <div className={`w-full rounded-lg px-3 py-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border border-transparent`}>
                        {header.supplier || "Tanpa Supplier"}
                    </div>
                )}
              </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                   Ref. Pesanan (PO)
                </label>
                {isEdit ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={header.kodeOrderBeli || ""}
                            readOnly
                            placeholder="Pilih Order Beli..."
                            onClick={() => setIsBrowsePOOpen(true)}
                            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                        />
                        <button
                            onClick={() => setIsBrowsePOOpen(true)}
                            className="px-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                            <PackageOpen className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>
                ) : header.kodeOrderBeli ? (
                    <Link 
                      href={`/pembelian/order/${header.nomorthbeliorder}`}
                      className="px-3 py-2.5 text-sm font-bold flex items-center gap-2 text-blue-600 bg-blue-50/50 rounded-lg hover:underline transition-all"
                    >
                      <PackageOpen className="h-4 w-4" />
                      {header.kodeOrderBeli}
                    </Link>
                  ) : (
                    <div className="px-3 py-2.5 text-sm font-bold flex items-center gap-2 text-slate-300">
                      <PackageOpen className="h-4 w-4" />
                      Tanpa PO
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Gudang Tujuan
                  </label>
                  {isEdit ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={header.gudang || ""}
                        readOnly
                        placeholder="Pilih Gudang..."
                        onClick={() => setIsBrowseGudangOpen(true)}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                      />
                      <button
                        onClick={() => setIsBrowseGudangOpen(true)}
                        className="px-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        <Store className="h-4 w-4 text-slate-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="px-3 py-2.5 text-sm font-bold flex items-center gap-2 text-indigo-600 bg-indigo-50/50 rounded-lg border border-indigo-100">
                      <Store className="h-4 w-4 text-indigo-500" />
                      {header.gudang || "-"}
                    </div>
                  )}
                </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Keterangan
                </label>
                <input
                  type="text"
                  placeholder={isEdit ? "Kondisi barang saat dterima" : "-"}
                  value={header.keterangan || ""}
                  onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                  readOnly={!isEdit}
                   className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${
                      !isEdit 
                        ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent italic" 
                        : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                />
              </div>
            </div>
          </div>

          {/* Grid Items Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md overflow-hidden">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Data Barang Masuk
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100/50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-500 sticky top-0 border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">No</th>
                    <th className="px-6 py-4 min-w-[250px]">Nama Barang / Produk</th>
                    <th className="px-6 py-4 w-24 text-center">Satuan</th>
                    <th className="px-6 py-4 w-28 text-center bg-slate-100/50">Jml (PO)</th>
                    <th className="px-6 py-4 w-32 text-center bg-emerald-50/50 text-emerald-700">Jml Terima</th>
                    <th className="px-6 py-4">Catatan Per Item</th>
                    {isEdit && <th className="px-6 py-4 w-16 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-emerald-50/20 dark:hover:bg-emerald-600/5 transition-colors">
                      <td className="px-6 py-4 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="px-6 py-3">
                        {isEdit ? (
                          <div
                            onClick={() => setIsBrowseBarangOpen(true)}
                            className="w-full flex items-center justify-between cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:border-emerald-500 transition-all dark:bg-slate-950 dark:border-slate-700"
                          >
                            <span className={item.barang ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                              {item.barang || "Pilih Barang..."}
                            </span>
                            <Search className="h-4 w-4 text-slate-400" />
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.barang || "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-[10px] text-slate-400 uppercase">
                          {item.satuan}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center text-slate-400 font-bold bg-slate-50/30">
                         {item.jumlahDipesan > 0 ? item.jumlahDipesan : '-'}
                      </td>
                      <td className="px-6 py-3 text-center bg-emerald-50/20">
                        <input
                          type="number"
                          min="0"
                          value={item.jumlahDiterima || 0}
                          onChange={(e) => updateItem(item.id, "jumlahDiterima", parseFloat(e.target.value) || 0)}
                          readOnly={!isEdit}
                          className={`w-full text-center rounded-lg px-3 py-2 outline-none transition-all font-black text-emerald-600 ${
                              !isEdit ? "bg-transparent" : "bg-white dark:bg-slate-950 border border-emerald-100 dark:border-emerald-900 focus:ring-1 focus:ring-emerald-500"
                          }`}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          placeholder={isEdit ? "Catatan per item..." : "-"}
                          value={item.keterangan || ""}
                          onChange={(e) => updateItem(item.id, "keterangan", e.target.value)}
                          readOnly={!isEdit}
                          className={`w-full rounded-lg px-3 py-2 outline-none transition-all italic text-slate-500 ${
                              !isEdit ? "bg-transparent" : "bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:ring-1 focus:ring-emerald-500"
                          }`}
                        />
                      </td>
                      {isEdit && (
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="rounded-full p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 disabled:opacity-30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Truck className="h-16 w-16 opacity-5 mb-4" />
                    <p className="text-sm font-medium tracking-wide">Data barang kosong.</p>
                 </div>
              )}
            </div>

            {isEdit && (
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
            )}
          </div>
        </div>
      ) : (
        <HistoryLogTab menu="Penerimaan Barang" nomor_transaksi={header.nomor} />
      )}

      {/* Print Modal */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        data={{
          title: "Bukti Penerimaan Barang (LPB)",
          kode: header.kode,
          tanggal: header.tanggal,
          keterangan: header.keterangan,
          extraHeaders: [
            { label: "Supplier / Vendor", value: header.supplier || "-" },
            { label: "No. Surat Jalan", value: header.noSuratJalan || "-" },
            { label: "Ref. Pesanan PO", value: header.kodeOrderBeli || "Tanpa PO" },
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Nama Barang", key: "barang" },
            { header: "Satuan", key: "satuan", width: 18 },
            { header: "Jml Pesan", key: "jumlahDipesan", width: 22, align: "right" },
            { header: "Jml Terima", key: "jumlahDiterima", width: 25, align: "right" },
            { header: "Catatan", key: "keterangan" },
          ],
          rows: items,
        }}
      />
      
      <QRCodePrintModal
        isOpen={isQRPrintOpen}
        onClose={() => setIsQRPrintOpen(false)}
        items={items.map(i => ({
          kode_barang: i.kode_barang || "",
          nama_barang: i.barang,
          jumlah: i.jumlahDiterima,
          satuan: i.satuan
        }))}
      />

      <BrowseBarangPOModal
        isOpen={isBrowseBarangOpen}
        onClose={() => setIsBrowseBarangOpen(false)}
        poNomor={header.nomorthbeliorder}
        poId={header.kodeOrderBeli}
        onSelect={handleSelectBarang}
      />

      <BrowseGudangModal
        isOpen={isBrowseGudangOpen}
        onClose={() => setIsBrowseGudangOpen(false)}
        onSelect={handleSelectGudang}
      />

      <BrowseSupplierModal 
        isOpen={isBrowseSupplierOpen}
        onClose={() => setIsBrowseSupplierOpen(false)}
        onSelect={handleSelectSupplier}
      />

      <BrowsePOModal
        isOpen={isBrowsePOOpen}
        onClose={() => setIsBrowsePOOpen(false)}
        onSelect={handleSelectPO}
        openReceiptOnly={true}
      />
    </div>
  );
}

