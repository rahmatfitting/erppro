"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileX, CheckCircle, Clock, History, Loader2, AlertCircle, Trash2, X, Save, Receipt, Plus, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import { BrowseNotaModal } from "@/components/BrowseNotaModal";
import { BrowseBarangNotaModal } from "@/components/BrowseBarangNotaModal";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";
import { BrowseValutaModal } from "@/components/BrowseValutaModal";
import PrintModal from "@/components/PrintModal";

const fmt = (v: any) => new Intl.NumberFormat('id-ID').format(v || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

export default function ReturBeliDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<"detail" | "history">("detail");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isBrowseNotaOpen, setIsBrowseNotaOpen] = useState(false);
  const [isBrowseBarangOpen, setIsBrowseBarangOpen] = useState(false);
  const [isBrowseGudangOpen, setIsBrowseGudangOpen] = useState(false);
  const [isBrowseValutaOpen, setIsBrowseValutaOpen] = useState(false);
  const [currentNota, setCurrentNota] = useState({ nomor: 0, kode: "" });

  const [header, setHeader] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/pembelian/retur/${id}`);
      const d = await r.json();
      if (d.success) {
          setData(d.data);
          setHeader({
              nomor: d.data.nomor,
              kode: d.data.kode,
              tanggal: d.data.tanggal ? new Date(d.data.tanggal).toISOString().split('T')[0] : "",
              supplier: d.data.supplier,
              nomormhsupplier: d.data.nomormhsupplier,
              gudang: d.data.gudang,
              nomormhgudang: d.data.nomormhgudang,
              keterangan: d.data.keterangan || "",
              valuta: d.data.valuta || "IDR",
              nomormhvaluta: d.data.nomormhvaluta || 0,
              kurs: d.data.kurs || 1,
              ppnPersen: d.data.ppn_prosentase || 0,
          });
          setItems(d.data.items || []);
      }
      else setError("Gagal mengambil data");
    } catch (err) {
      setError("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSelectValuta = (v: any) => {
    setHeader({ ...header, valuta: v.kode, nomormhvaluta: v.nomor, kurs: v.kurs || 1 });
    setIsBrowseValutaOpen(false);
  };

  const calculations = (() => {
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0);
    const diskon = items.reduce((s, i) => s + (parseFloat(i.diskon_nominal) || 0), 0);
    const dpp = subtotal;
    const ppn = dpp * ((header?.ppnPersen || 0) / 100);
    const total = dpp + ppn;
    const grandTotalIDR = total * (header?.kurs || 1);
    return { subtotal, diskon, dpp, ppn, total, grandTotalIDR };
  })();

  const handleSave = async () => {
    if (!header.nomormhsupplier) { setError("Supplier wajib dipilih"); return; }
    if (items.length === 0) { setError("Item wajib diisi"); return; }
    
    setActionLoading(true);
    try {
      const { subtotal, dpp, ppn, total } = calculations;

      const res = await fetch(`/api/pembelian/retur/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            ...header, 
            subtotal, 
            dpp, 
            ppnPersen: header.ppnPersen,
            ppnNominal: ppn, 
            grandTotal: total, 
            items 
        }),
      });
      const d = await res.json();
      if (d.success) {
        setIsEditing(false);
        fetchData();
      } else setError(d.error || "Gagal mengupdate");
    } catch { setError("Gagal menghubungi server"); } finally { setActionLoading(false); }
  };

  const handleAction = async (action: 'approve' | 'disapprove' | 'delete') => {
    if (!confirm(`Apakah Anda yakin ingin melakukan aksi ${action}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/pembelian/retur`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id: data.nomor, action }) 
      });
      const d = await res.json();
      if (d.success) {
        if (action === 'delete') {
            router.push('/pembelian/retur');
        } else {
            fetchData();
        }
      } else {
        alert(d.error || "Gagal melakukan aksi");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectNota = (nota: any) => {
    setHeader({
      ...header,
      supplier: nota.supplier,
      nomormhsupplier: nota.nomormhsupplier,
      valuta: nota.valuta || "IDR",
      nomormhvaluta: nota.nomormhvaluta || 1,
      kurs: nota.kurs || 1,
    });
    setCurrentNota({ nomor: nota.nomor, kode: nota.kode });
    setIsBrowseNotaOpen(false);
    setIsBrowseBarangOpen(true);
  };

  const handleSelectBarang = (item: any) => {
    if (items.find(i => i.nomortdbelinota === item.nomortdbelinota)) {
        setError("Barang dari nota ini sudah ada di daftar");
        setIsBrowseBarangOpen(false);
        return;
    }

    const newItem = {
        nomorthbelinota: item.nomorthbelinota,
        nomortdbelinota: item.nomortdbelinota,
        nomormhbarang: item.nomormhbarang,
        nomormhsatuan: item.nomormhsatuan,
        kode_nota: currentNota.kode,
        kode_barang: item.kode_barang || '',
        nama_barang: item.barang || item.nama_barang,
        satuan: item.satuan,
        jumlah: item.jumlah,
        harga: item.harga || 0,
        diskon_prosentase: 0,
        diskon_nominal: 0,
        netto: item.harga || 0,
        subtotal: item.jumlah * (item.harga || 0),
        keterangan: ''
    };

    setItems(prev => [...prev, newItem]);
    setIsBrowseBarangOpen(false);
  };

  const handleSelectGudang = (g: any) => {
    setHeader({ ...header, gudang: g.nama, nomormhgudang: g.nomor });
    setIsBrowseGudangOpen(false);
  };

  const addItem = () => {
    setIsBrowseNotaOpen(true);
  };

  const updateItem = (i: number, field: string, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: value };
      const price = parseFloat(updated.harga || 0);
      const qty = parseFloat(updated.jumlah || 0);
      const discPercent = parseFloat(updated.diskon_prosentase || 0);
      const discNom = price * (discPercent / 100);
      updated.diskon_nominal = discNom;
      updated.netto = price - discNom;
      updated.subtotal = qty * updated.netto;
      return updated;
    }));
  };

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));


  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
    </div>
  );
  
  if (!data) return (
    <div className="p-6 text-red-600 flex flex-col items-center gap-4">
      <AlertCircle className="h-12 w-12" />
      <p className="font-bold">Data tidak ditemukan</p>
      <Link href="/pembelian/retur" className="text-blue-600 hover:underline">Kembali ke Daftar Retur</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 mt-4 md:mt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <Link href="/pembelian/retur" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <FileX className={cn("h-6 w-6", isEditing ? "text-rose-600 animate-pulse" : "text-orange-600")} />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{data.kode}</h1>
              {!isEditing && (
                data.status_disetujui ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full border border-green-200">
                      <CheckCircle className="h-3 w-3" /> Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase rounded-full border border-yellow-200">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  )
              )}
              {data.status_aktif === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-full border border-red-200">
                  <Trash2 className="h-3 w-3" /> Deleted
                </span>
              )}
              {isEditing && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded-full border border-rose-200">
                  Mode Edit
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Retur Beli • {fmtDate(data.tanggal)}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
           {data.status_aktif === 1 && (
              <>
                {!data.status_disetujui ? (
                  <>
                    {isEditing ? (
                        <>
                            <button 
                                onClick={handleSave} 
                                disabled={actionLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-rose-200 dark:shadow-rose-900/20"
                            >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Simpan Perubahan
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)} 
                                disabled={actionLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                            >
                                <X className="h-4 w-4" />
                                Batal
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-orange-200 dark:shadow-orange-900/20"
                            >
                                <FileX className="h-4 w-4 text-white" />
                                Edit Retur
                            </button>
                            <button 
                                onClick={() => handleAction('approve')} 
                                disabled={actionLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                Approve Retur
                            </button>
                            <button 
                                onClick={() => handleAction('delete')} 
                                disabled={actionLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                Batalkan Retur
                            </button>
                        </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleAction('disapprove')} 
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 text-amber-600 hover:bg-amber-50 text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Batal Approval
                    </button>
                    <button 
                      onClick={() => setIsPrintOpen(true)} 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                    >
                      <Printer className="h-4 w-4" />
                      Cetak Retur
                    </button>
                  </div>
                )}
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
            activeTab === "detail" ? "border-orange-600 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Detail Retur
        </button>
        <button 
          onClick={() => setActiveTab("history")} 
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2", 
            activeTab === "history" ? "border-orange-600 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <History className="h-4 w-4" /> History Log
        </button>
      </div>

      {activeTab === "detail" ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

          {/* Info Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 border-b pb-2 flex items-center gap-2">
                Informasi Header
                {isEditing && <span className="text-[10px] text-rose-500 normal-case font-normal">(Ubah informasi header di bawah)</span>}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal</p>
                {isEditing ? (
                    <input type="date" value={header.tanggal} onChange={e => setHeader({...header, tanggal: e.target.value})} className="w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-rose-500" />
                ) : (
                    <p className="font-semibold">{fmtDate(data.tanggal)}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier</p>
                {isEditing ? (
                    <div className="flex gap-1">
                        <input type="text" value={header.supplier} readOnly className="flex-1 text-xs px-2 py-1 border border-slate-100 bg-slate-50 rounded outline-none font-bold" />
                        <button onClick={() => setIsBrowseNotaOpen(true)} className="px-2 py-1 bg-slate-100 text-[10px] font-bold rounded border border-slate-200 hover:bg-slate-200 transition-colors uppercase">Nota</button>
                    </div>
                ) : (
                    <p className="font-bold text-slate-700 dark:text-slate-200">{data.supplier}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gudang</p>
                {isEditing ? (
                    <div className="flex gap-1">
                        <input type="text" value={header.gudang} readOnly className="flex-1 text-xs px-2 py-1 border border-slate-100 bg-slate-50 rounded outline-none font-bold" />
                        <button onClick={() => setIsBrowseGudangOpen(true)} className="px-2 py-1 bg-slate-100 text-[10px] font-bold rounded border border-slate-200 hover:bg-slate-200 transition-colors uppercase">Gudang</button>
                    </div>
                ) : (
                    <p className="font-bold text-slate-700 dark:text-slate-200">{data.gudang}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valuta</p>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <div className="flex gap-2 items-center">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={header.valuta} 
                                    readOnly 
                                    className="w-16 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none font-bold" 
                                />
                                <button type="button" onClick={() => setIsBrowseValutaOpen(true)} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                            <input type="number" value={header.kurs} onChange={e => setHeader({...header, kurs: parseFloat(e.target.value) || 1})} className="w-20 text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-rose-500 font-mono font-bold" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <p className="font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded inline-block text-xs">{header.valuta}</p>
                            <span className="text-xs text-slate-500 font-mono">kurs: {fmt(header.kurs)}</span>
                        </div>
                    )}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Keterangan</p>
                {isEditing ? (
                    <input type="text" value={header.keterangan} onChange={e => setHeader({...header, keterangan: e.target.value})} className="w-full text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-rose-500" />
                ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">{data.keterangan || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Daftar Barang Diretur</h2>
              {isEditing && (
                  <button onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-bold rounded transition-colors uppercase tracking-wider">
                      <Plus className="h-3 w-3" /> Tambah dari Nota
                  </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100/50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-4 text-center font-black uppercase text-slate-500 w-12 text-[10px]">#</th>
                    <th className="px-4 py-4 text-left font-black uppercase text-slate-500 text-[10px] w-32">Ref Nota</th>
                    <th className="px-4 py-4 text-left font-black uppercase text-slate-500 text-[10px]">Barang</th>
                    <th className="px-4 py-4 text-center font-black uppercase text-slate-500 w-24 text-[10px]">Satuan</th>
                    <th className="px-4 py-4 text-right font-black uppercase text-slate-500 w-24 text-[10px]">Jumlah</th>
                    <th className="px-4 py-4 text-right font-black uppercase text-slate-500 w-32 text-[10px]">Harga</th>
                    <th className="px-4 py-4 text-right font-black uppercase text-slate-500 w-20 text-[10px]">Disc%</th>
                    <th className="px-4 py-4 text-right font-black uppercase text-slate-500 w-32 text-[10px]">Subtotal</th>
                    {isEditing && <th className="px-4 py-4 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item: any, i: number) => (
                    <tr key={item.id || i} className="hover:bg-orange-50/20 dark:hover:bg-orange-500/5 transition-colors group">
                      <td className="px-4 py-4 text-center text-slate-400 font-mono">{i + 1}</td>
                      <td className="px-4 py-4 font-mono text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        <Link href={`/pembelian/nota/${item.nomorthbelinota}`} className="text-blue-600 hover:underline hover:text-blue-700 transition-colors">
                            {item.kode_nota}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-white leading-tight">{item.nama_barang || item.barang}</span>
                            <span className="text-[9px] font-mono text-slate-400 mt-0.5">{item.kode_barang}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-500 uppercase tracking-tighter text-[10px]">{item.satuan}</td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                            <input type="number" value={item.jumlah} onChange={e => updateItem(i, 'jumlah', parseFloat(e.target.value) || 0)} className="w-20 text-right text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-rose-500 font-bold text-rose-600" />
                        ) : (
                            <span className="font-bold text-indigo-600">{fmt(item.jumlah)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {isEditing ? (
                            <input type="number" value={item.harga} onChange={e => updateItem(i, 'harga', parseFloat(e.target.value) || 0)} className="w-24 text-right text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-rose-500" />
                        ) : (
                            fmt(item.harga)
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                            <input type="number" value={item.diskon_prosentase} onChange={e => updateItem(i, 'diskon_prosentase', parseFloat(e.target.value) || 0)} className="w-14 text-right text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-rose-500" />
                        ) : (
                            <span className="text-red-500 font-bold">{item.diskon_prosentase}%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-orange-600 bg-orange-50/5 font-mono">{fmt(item.subtotal)}</td>
                      {isEditing && (
                          <td className="px-4 py-4 text-center">
                              <button onClick={() => removeItem(i)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                  <Trash2 className="h-3.5 w-3.5" />
                              </button>
                          </td>
                      )}
                    </tr>
                  ))}
                  {items.length === 0 && (
                      <tr><td colSpan={isEditing ? 8 : 7} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada item ditambahkan</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-end pt-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-orange-100 dark:border-orange-900/30 p-6 shadow-sm w-full max-w-sm space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-2 flex items-center justify-between">
                 Rincian Pengembalian
                 <FileX className="h-4 w-4 text-orange-500" />
               </h3>
               <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center"><span className="font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Subtotal Grid</span><span className="font-bold font-mono">{fmt(calculations.subtotal)}</span></div>
                  <div className="flex justify-between items-center"><span className="font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Potongan Diskon</span><span className="font-bold text-red-500 font-mono">-{fmt(calculations.diskon)}</span></div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-tighter"><span className="">DPP Pengembalian</span><span className="font-mono text-slate-700 dark:text-slate-300">{fmt(calculations.dpp)}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500 uppercase tracking-tighter text-[10px]">PPN (%)</span>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <input 
                                type="number" 
                                value={header.ppnPersen} 
                                onChange={e => setHeader({...header, ppnPersen: parseFloat(e.target.value) || 0})} 
                                className="w-10 text-xs px-1 py-0.5 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-rose-500 text-right font-bold" 
                            />
                        ) : (
                            <span className="font-bold text-slate-400">({header.ppnPersen}%)</span>
                        )}
                        <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{fmt(calculations.ppn)}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t-2 border-orange-100 dark:border-orange-900/30">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 italic">Grand Total Retur</span>
                      <span className="text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tighter italic">Rp {fmt(calculations.total)}</span>
                      {header.valuta !== 'IDR' && <span className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-widest text-right whitespace-nowrap">Total IDR (Kurs {fmt(header.kurs)}): <br/> Rp {fmt(calculations.grandTotalIDR)}</span>}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <HistoryLogTab menu="Retur Pembelian" nomor_transaksi={data.nomor} />
      )}

      {/* Modals */}
      <BrowseNotaModal 
        isOpen={isBrowseNotaOpen}
        onClose={() => setIsBrowseNotaOpen(false)}
        onSelect={handleSelectNota}
        filter="remaining_for_return"
      />
      <BrowseBarangNotaModal
        isOpen={isBrowseBarangOpen}
        onClose={() => setIsBrowseBarangOpen(false)}
        onSelect={handleSelectBarang}
        notaNomor={currentNota.nomor}
        notaId={currentNota.kode}
      />
      <BrowseGudangModal
        isOpen={isBrowseGudangOpen}
        onClose={() => setIsBrowseGudangOpen(false)}
        onSelect={handleSelectGudang}
      />
      <BrowseValutaModal
        isOpen={isBrowseValutaOpen}
        onClose={() => setIsBrowseValutaOpen(false)}
        onSelect={handleSelectValuta}
      />
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        data={{
          title: "Retur Pembelian (Purchase Return)",
          kode: data?.kode || "",
          tanggal: header?.tanggal || "",
          keterangan: header?.keterangan || "",
          extraHeaders: [
            { label: "Supplier", value: data?.supplier || "-" },
            { label: "Gudang", value: header?.gudang || "-" },
            { label: "Valuta", value: `${header?.valuta || 'IDR'} (Kurs: ${fmt(header?.kurs || 1)})` },
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Ref Nota", key: "kode_nota", width: 30 },
            { header: "Nama Barang", key: "nama_barang" },
            { header: "Satuan", key: "satuan", width: 18 },
            { header: "Jml", key: "jumlah", width: 18, align: "right" },
            { header: "Harga", key: "harga", width: 30, align: "right", format: (v) => Number(v).toLocaleString('id-ID') },
            { header: "Total", key: "subtotal", width: 35, align: "right", format: (v) => Number(v).toLocaleString('id-ID') },
          ],
          rows: items,
          footerRows: [
            { label: "Subtotal", value: (calculations.subtotal || 0).toLocaleString('id-ID') },
            { label: `PPN (${header?.ppnPersen || 0}%)`, value: (calculations.ppn || 0).toLocaleString('id-ID') },
            { label: "GRAND TOTAL", value: `${header?.valuta || 'IDR'} ${(calculations.total || 0).toLocaleString('id-ID')}` },
          ]
        }}
      />
    </div>
  );
}
