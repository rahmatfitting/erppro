"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Save, PackageOpen, Loader2, ArrowLeft, FileEdit, X, AlertCircle, Printer, History, Search, FileText } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import PrintModal from "@/components/PrintModal";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import { BrowseValutaModal } from "@/components/BrowseValutaModal";
import { BrowseSupplierModal } from "@/components/BrowseSupplierModal";
import { BrowsePRModal } from "@/components/BrowsePRModal";
import { BrowseBarangPRModal } from "@/components/BrowseBarangPRModal";

export default function OrderBeliDetail() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialMode = searchParams.get('mode') || 'view';

  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");
  const [isEdit, setIsEdit] = useState(initialMode === 'edit');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isValutaModalOpen, setIsValutaModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [isBarangModalOpen, setIsBarangModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<number | null>(null);

  const [header, setHeader] = useState({
    nomor: 0,
    kode: "",
    tanggal: "",
    nomormhsupplier: 0,
    supplier: "",
    valuta: "IDR",
    kurs: 1,
    keterangan: "",
    diskonPersen: 0,
    ppnPersen: 0,
    status_aktif: 1,
    status_disetujui: 0
  });

  const [items, setItems] = useState<any[]>([]);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/pembelian/order/${id}`);
      const data = await res.json();

      if (data.success) {
        const item = data.data;

        let ppnPersen = 0;
        let diskonPersen = 0;
        if (item.subtotal && item.dpp && item.ppn_nominal) {
          ppnPersen = Math.round((item.ppn_nominal / item.dpp) * 100);
        }
        if (item.subtotal && item.diskon_nominal) {
          diskonPersen = Math.round((item.diskon_nominal / item.subtotal) * 100);
        }

        setHeader({
          nomor: item.nomor,
          kode: item.kode || "",
          tanggal: item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : "",
          nomormhsupplier: item.nomormhsupplier || 0,
          supplier: item.supplier || "",
          valuta: item.valuta || "IDR",
          kurs: item.kurs || 1,
          keterangan: item.keterangan || "",
          diskonPersen: diskonPersen,
          ppnPersen: ppnPersen,
          status_aktif: item.status_aktif,
          status_disetujui: item.status_disetujui
        });

        if (item.items && item.items.length > 0) {
          setItems(item.items.map((it: any) => ({
            ...it,
            id: it.nomor || it.id || Date.now() + Math.random(),
            kodePermintaan: it.kodePermintaan || it.kode_pr || it.kode_permintaan || "",
            nomorthbelipermintaan: it.nomorthbelipermintaan || null,
            nomortdbelipermintaan: it.nomortdbelipermintaan || null,
            nomormhbarang: it.nomormhbarang || null,
            nomormhsatuan: it.nomormhsatuan || null,
            barang: it.barang || it.nama_barang || "",
            satuan: it.satuan || "Pcs",
            jumlah: it.jumlah ?? 0,
            harga: it.harga ?? 0,
            diskonPersen: it.diskonPersen || it.diskon_prosentase || 0
          })));
        } else {
          setItems([{
            id: Date.now(),
            kodePermintaan: "",
            barang: "",
            nomormhbarang: null,
            nomormhsatuan: null,
            satuan: "Pcs",
            jumlah: 1,
            harga: 0,
            diskonPersen: 0
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
    setItems([
      ...items,
      {
        id: Date.now(),
        kodePermintaan: "",
        barang: "",
        nomormhbarang: null,
        nomormhsatuan: null,
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

  const updateItem = (id: number, field: string, value: string | number) => {
    if (!isEdit) return;
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSelectValuta = (v: any) => {
    setHeader({ ...header, valuta: v.kode, kurs: v.kurs });
    setIsValutaModalOpen(false);
  };

  const handleSelectSupplier = (s: any) => {
    setHeader({ ...header, nomormhsupplier: s.nomor, supplier: s.nama });
    setIsSupplierModalOpen(false);
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

      if (!header.supplier) throw new Error("Supplier harus dipilih");
      const validItems = calculations.items.filter(i => (i.barang || i.nama_barang || "").trim() !== "");
      if (validItems.length === 0) throw new Error("Minimal satu barang harus diisi");

      const payload = {
        tanggal: header.tanggal,
        nomormhsupplier: header.nomormhsupplier,
        supplier_nama: header.supplier,
        valuta: header.valuta,
        kurs: header.kurs,
        keterangan: header.keterangan,
        subtotal: calculations.subtotal,
        diskonNominal: calculations.diskon,
        dpp: calculations.dpp,
        ppnNominal: calculations.ppn,
        grandTotal: calculations.total,
        user: typeof window !== 'undefined' ? localStorage.getItem('user_name') || 'Admin' : 'Admin',
        items: validItems.map(item => ({
          nomorthbelipermintaan: item.nomorthbelipermintaan,
          nomortdbelipermintaan: item.nomortdbelipermintaan,
          nomormhbarang: item.nomormhbarang,
          nomormhsatuan: item.nomormhsatuan,
          kode_pr: item.kodePermintaan,
          kode_barang: item.kode_barang || "",
          nama_barang: item.barang,
          satuan: item.satuan,
          jumlah: item.jumlah,
          harga: item.harga,
          diskon_prosentase: item.diskonPersen,
          diskon_nominal: item.nominalDiskon,
          netto: item.subtotal,
          subtotal: item.subtotal,
          keterangan: item.keterangan || ""
        }))
      };

      const res = await fetch(`/api/pembelian/order/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal mengupdate data Order Beli");
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
      const res = await fetch('/api/pembelian/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId, action })
      });
      const result = await res.json();
      if (result.success) {
        if (action === 'delete') {
          router.push('/pembelian/order');
        } else {
          fetchData();
        }
      } else {
        alert(result.error || "Gagal melakukan aksi");
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem");
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 mt-4 md:mt-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/pembelian/order" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
              Order Pembelian
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">Detail PO</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <PackageOpen className="h-6 w-6 text-indigo-600" />
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
                href="/pembelian/order"
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
                        <span>Approve PO</span>
                      </button>
                      <button
                        onClick={() => handleAction(header.nomor.toString(), 'delete')}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-900 border border-red-200 text-red-600 px-3 py-2 text-sm font-bold hover:bg-red-50 transition-all active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Batalkan Order</span>
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
                <button
                  onClick={() => setIsPrintOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shadow-sm hover:bg-indigo-100 transition-all active:scale-95"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak PO</span>
                </button>
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
                className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {loading ? "Menyimpan Paksa..." : "Simpan PO"}
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
            activeTab === "detail" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Detail Order
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2",
            activeTab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <History className="h-4 w-4" /> History Log
        </button>
      </div>

      {activeTab === "detail" ? (
        <div className="animate-in fade-in duration-500 space-y-6">
          {/* Header Inputs & Items Table */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between border border-red-100 shadow-sm">
                <span className="text-sm font-medium flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400 border-b pb-2">
                Informasi Umum PO
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kode PO</label>
                  <div className="px-3 py-2.5 text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100">
                    {header.kode}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Order</label>
                  <input
                    type="date"
                    value={header.tanggal || ""}
                    onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                    readOnly={!isEdit}
                    className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${!isEdit
                        ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent cursor-default font-semibold"
                        : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendor / Supplier</label>
                  <div
                    onClick={() => isEdit && setIsSupplierModalOpen(true)}
                    className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all flex items-center justify-between ${!isEdit
                        ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent cursor-default font-bold"
                        : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                      }`}
                  >
                    <span>{header.supplier || "Pilih Supplier"}</span>
                    {isEdit && <Search className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>
                <div className="space-y-2 lg:col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catatan Khusus</label>
                  <input
                    type="text"
                    placeholder={isEdit ? "Informasi tambahan, syarat pembayaran, dll" : "-"}
                    value={header.keterangan || ""}
                    onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                    readOnly={!isEdit}
                    className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${!isEdit
                        ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent italic"
                        : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      }`}
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
                      onClick={() => isEdit && setIsValutaModalOpen(true)}
                      className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all flex items-center justify-between ${!isEdit
                          ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent cursor-default font-bold"
                          : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                        }`}
                    >
                      <span>{header.valuta || "IDR"}</span>
                      {isEdit && <Search className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exchange Rate</label>
                    <input
                      type="number"
                      min="1"
                      value={header.kurs || 1}
                      onChange={(e) => setHeader({ ...header, kurs: parseFloat(e.target.value) || 1 })}
                      disabled={!isEdit || header.valuta === 'IDR'}
                      className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all font-mono font-bold ${(!isEdit || header.valuta === 'IDR')
                          ? "bg-slate-50 dark:bg-slate-950/50 text-slate-400 border-transparent cursor-not-allowed"
                          : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Items Table */}
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
                      {isEdit && <th className="px-6 py-4 w-16 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {calculations.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors group">
                        <td className="px-6 py-4 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-500">
                          {isEdit ? (
                            <div
                              onClick={() => openPRModal(item.id)}
                              className="w-full flex items-center justify-between cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold tracking-tight hover:border-indigo-500 transition-all dark:bg-slate-950 dark:border-slate-700"
                            >
                              <span className={item.kodePermintaan ? "text-indigo-600 uppercase" : "text-slate-400"}>
                                {item.kodePermintaan || "PR-..."}
                              </span>
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                            </div>
                          ) : (
                            item.nomorthbelipermintaan ? (
                              <Link
                                href={`/pembelian/permintaan/${item.nomorthbelipermintaan}`}
                                className="text-[10px] tracking-tight text-indigo-600 font-bold hover:underline font-mono"
                              >
                                {item.kodePermintaan}
                              </Link>
                            ) : (
                              <span className="text-[10px] tracking-tight text-slate-400 font-mono">
                                {item.kodePermintaan || "-"}
                              </span>
                            )
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {isEdit ? (
                            <div
                              onClick={() => openBarangModal(item.id, item.kodePermintaan)}
                              className="w-full flex items-center justify-between cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:border-indigo-500 transition-all dark:bg-slate-950 dark:border-slate-700"
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
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={item.satuan}
                            readOnly
                            className="w-full bg-transparent text-[10px] font-bold text-slate-400 outline-none"
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          {isEdit ? (
                            <input
                              type="number"
                              min="1"
                              value={item.jumlah || 0}
                              onChange={(e) => updateItem(item.id, "jumlah", parseFloat(e.target.value) || 0)}
                              className="w-full text-right rounded-lg px-3 py-2 outline-none transition-all font-bold border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950"
                            />
                          ) : (
                            <span className="font-bold text-indigo-600">
                              {Number(item.jumlah || 0).toLocaleString('id-ID')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {isEdit ? (
                            <input
                              type="number"
                              min="0"
                              value={item.harga || 0}
                              onChange={(e) => updateItem(item.id, "harga", parseFloat(e.target.value) || 0)}
                              className="w-full text-right rounded-lg px-3 py-2 outline-none transition-all font-mono font-bold border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950"
                            />
                          ) : (
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {Number(item.harga || 0).toLocaleString('id-ID')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {isEdit ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min="0" max="100"
                                value={item.diskonPersen || 0}
                                onChange={(e) => updateItem(item.id, "diskonPersen", parseFloat(e.target.value) || 0)}
                                className="w-12 rounded-lg px-1 py-2 text-center outline-none transition-all text-red-500 font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                              />
                            </div>
                          ) : (
                            <span className="text-red-500 font-bold">
                              {item.diskonPersen || 0}%
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-700 dark:text-slate-200 bg-slate-50/20 dark:bg-slate-900/40">
                          {formatCurrency(item.subtotal)}
                        </td>
                        {isEdit && (
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="rounded-full p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 disabled:opacity-20"
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
                    <PackageOpen className="h-16 w-16 opacity-5 mb-4" />
                    <p className="text-sm font-medium">Belum ada item pesanan.</p>
                  </div>
                )}
              </div>

              {isEdit && (
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
              )}
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
                            className={`w-14 h-8 text-sm font-bold text-center rounded-lg outline-none transition-all ${!isEdit ? "bg-slate-50 text-slate-400 border-transparent cursor-default" : "bg-white border border-slate-200 focus:border-indigo-500"
                              }`}
                            value={header.diskonPersen || 0}
                            onChange={(e) => setHeader({ ...header, diskonPersen: parseFloat(e.target.value) || 0 })}
                            readOnly={!isEdit}
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
                            className={`w-14 h-8 text-sm font-bold text-center rounded-lg outline-none transition-all ${!isEdit ? "bg-slate-50 text-slate-400 border-transparent cursor-default" : "bg-white border border-slate-200 focus:border-indigo-500"
                              }`}
                            value={header.ppnPersen || 0}
                            onChange={(e) => setHeader({ ...header, ppnPersen: parseFloat(e.target.value) || 0 })}
                            readOnly={!isEdit}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-300">
                        {formatCurrency(calculations.ppn)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t-2 border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col items-end text-right">
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
        </div>
      ) : (
        <HistoryLogTab menu="Order Pembelian" nomor_transaksi={header.nomor} />
      )}

      {/* Print Modal */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        data={{
          title: "Purchase Order (PO)",
          kode: header.kode,
          tanggal: header.tanggal,
          keterangan: header.keterangan,
          extraHeaders: [
            { label: "Supplier", value: header.supplier || "-" },
            { label: "Valuta", value: `${header.valuta} (kurs: ${header.kurs})` },
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Ref PR", key: "kodePermintaan", width: 30 },
            { header: "Nama Barang", key: "barang" },
            { header: "Satuan", key: "satuan", width: 20 },
            { header: "Jml", key: "jumlah", width: 18, align: "right" },
            { header: "Harga Sat", key: "harga", width: 30, align: "right", format: (v) => Number(v).toLocaleString('id-ID') },
            { header: "Disc(%)", key: "diskonPersen", width: 18, align: "right" },
            { header: "Netto", key: "subtotal", width: 35, align: "right", format: (v) => Number(v).toLocaleString('id-ID') },
          ],
          rows: calculations.items,
          footerRows: [
            { label: "Subtotal Grid", value: calculations.subtotal.toLocaleString('id-ID') },
            { label: "Global Diskon", value: `-${calculations.diskon.toLocaleString('id-ID')}` },
            { label: "DPP Pajak", value: calculations.dpp.toLocaleString('id-ID') },
            { label: "PPN Pajak", value: calculations.ppn.toLocaleString('id-ID') },
            { label: "GRAND TOTAL", value: `${header.valuta} ${calculations.total.toLocaleString('id-ID')}` },
          ]
        }}
      />
      <BrowseValutaModal
        isOpen={isValutaModalOpen}
        onClose={() => setIsValutaModalOpen(false)}
        onSelect={handleSelectValuta}
      />
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
    </div>
  );
}
