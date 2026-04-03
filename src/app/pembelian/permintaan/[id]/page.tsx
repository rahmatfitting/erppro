"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileText, Loader2, ArrowLeft, FileEdit, X, AlertCircle, Printer, History, Search } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import PrintModal from "@/components/PrintModal";
import { HistoryLogTab } from "@/components/HistoryLogTab";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";

export default function PermintaanDetail() {
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<number | null>(null);

  const [header, setHeader] = useState({
    nomor: 0,
    kode: "",
    tanggal: "",
    divisi: "",
    keterangan: "",
    status_aktif: 1,
    status_disetujui: 0
  });

  const [items, setItems] = useState<any[]>([]);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/pembelian/permintaan/${id}`);
      const data = await res.json();

      if (data.success) {
        const item = data.data;
        setHeader({
          nomor: item.nomor,
          kode: item.kode || "",
          tanggal: item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : "",
          divisi: item.divisi_parsed || "",
          keterangan: item.keterangan_parsed || "",
          status_aktif: item.status_aktif,
          status_disetujui: item.status_disetujui
        });

        if (item.items && item.items.length > 0) {
          setItems(item.items.map((it: any) => ({
            ...it,
            id: it.nomor || it.id || Date.now() + Math.random(),
            nomormhbarang: it.nomormhbarang,
            nomormhsatuan: it.nomormhsatuan,
            nama_barang: it.barang || it.nama_barang || "",
            satuan: it.satuan || "Pcs",
            jumlah: it.jumlah || 0,
            keterangan: it.keterangan || ""
          })));
        } else {
          setItems([{ id: Date.now(), nomormhbarang: null, nama_barang: "", satuan: "Pcs", jumlah: 1, keterangan: "" }]);
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
      { id: Date.now(), nomormhbarang: null, nomormhsatuan: null, nama_barang: "", satuan: "Pcs", jumlah: 1, keterangan: "" },
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

  const openBrowseModal = (rowId: number) => {
    if (!isEdit) return;
    setActiveRowId(rowId);
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

      if (!header.divisi) throw new Error("Divisi peminta harus dipilih");
      const validItems = items.filter(i => (i.nama_barang || "").trim() !== "");
      if (validItems.length === 0) throw new Error("Minimal satu barang harus diisi");

      const payload = {
        tanggal: header.tanggal,
        divisi: header.divisi,
        keterangan: header.keterangan,
        user: typeof window !== 'undefined' ? localStorage.getItem('user_name') || 'Admin' : 'Admin',
        items: validItems.map(item => ({
          nomormhbarang: item.nomormhbarang || null,
          nomormhsatuan: item.nomormhsatuan || null,
          kode_barang: item.kode_barang || "",
          nama_barang: item.nama_barang || item.barang || "",
          satuan: item.satuan,
          jumlah: item.jumlah,
          keterangan: item.keterangan
        }))
      };

      const res = await fetch(`/api/pembelian/permintaan/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal mengupdate data");
      }

      setIsEdit(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionId: number | string, action: 'approve' | 'disapprove' | 'delete') => {
    if (!confirm(`Apakah Anda yakin ingin melakukan aksi ${action}?`)) return;
    try {
      const res = await fetch(`/api/pembelian/permintaan/${actionId}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const result = await res.json();
      if (result.success) {
        if (action === 'delete') {
          router.push('/pembelian/permintaan');
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12 mt-4 md:mt-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/pembelian/permintaan" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
              Permintaan Pembelian
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">Detail Permintaan</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
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
                href="/pembelian/permintaan"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
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
                        onClick={() => handleAction(header.nomor, 'approve')}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleAction(header.nomor, 'delete')}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-900 border border-red-200 text-red-600 px-3 py-2 text-sm font-bold hover:bg-red-50 transition-all active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Batalkan</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAction(header.nomor, 'disapprove')}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-900 border border-amber-200 text-amber-600 px-3 py-2 text-sm font-bold hover:bg-red-50 transition-all active:scale-95"
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
                  <span>Cetak PR</span>
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
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 transition-all">
        <button
          onClick={() => setActiveTab("detail")}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300",
            activeTab === "detail" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Detail Permintaan
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2",
            activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <History className="h-4 w-4" /> History Log
        </button>
      </div>

      {activeTab === "detail" ? (
        <div className="animate-in fade-in duration-500 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between border border-red-100">
              <span className="text-sm font-medium flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* Header Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
            <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400 border-b pb-2">
              Informasi Dokumen
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Kode Permintaan
                </label>
                <div className="px-3 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/20">
                  {header.kode}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tanggal Pengajuan
                </label>
                <input
                  type="date"
                  value={header.tanggal || ""}
                  onChange={(e) => setHeader({ ...header, tanggal: e.target.value })}
                  readOnly={!isEdit}
                  className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${!isEdit
                      ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent cursor-default"
                      : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Divisi Peminta
                </label>
                <select
                  value={header.divisi || ""}
                  onChange={(e) => setHeader({ ...header, divisi: e.target.value })}
                  disabled={!isEdit}
                  className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${!isEdit
                      ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent cursor-not-allowed appearance-none"
                      : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                >
                  <option value="">Pilih Divisi</option>
                  <option value="Produksi">Produksi</option>
                  <option value="Gudang">Gudang Utama</option>
                  <option value="HRD">HRD & General Affair</option>
                  <option value="IT">IT Support</option>
                  <option value="Finance">Accounting & Finance</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Keterangan Tambahan
                </label>
                <input
                  type="text"
                  placeholder={isEdit ? "Ex: Untuk keperluan produksi" : "-"}
                  value={header.keterangan || ""}
                  onChange={(e) => setHeader({ ...header, keterangan: e.target.value })}
                  readOnly={!isEdit}
                  className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${!isEdit
                      ? "bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-transparent italic"
                      : "border border-slate-300 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                />
              </div>
            </div>
          </div>

          {/* Grid Items Section */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md overflow-hidden">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Daftar Barang Permintaan
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100/50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-500 sticky top-0 border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">No</th>
                    <th className="px-6 py-4 min-w-[300px]">Nama Barang</th>
                    <th className="px-6 py-4 w-32">Satuan</th>
                    <th className="px-6 py-4 w-32 text-right">Jumlah</th>
                    <th className="px-6 py-4">Keterangan Khusus</th>
                    {isEdit && <th className="px-6 py-4 w-20 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="px-6 py-3">
                        <div
                          onClick={() => isEdit && openBrowseModal(item.id)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-lg px-3 py-2 transition-all font-semibold",
                            !isEdit
                              ? "bg-transparent text-slate-700 dark:text-slate-300"
                              : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-blue-400"
                          )}
                        >
                          <span className={cn(!item.nama_barang && isEdit ? "text-slate-400" : "")}>
                            {item.nama_barang || (isEdit ? "Pilih Barang..." : "-")}
                          </span>
                          {isEdit && <Search className="h-3.5 w-3.5 text-slate-400" />}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        <input
                          type="text"
                          readOnly
                          value={item.satuan || ""}
                          placeholder="-"
                          className={cn(
                            "w-full rounded-lg px-2 py-2 outline-none transition-all font-bold text-[10px]",
                            !isEdit ? "bg-transparent" : "bg-slate-50 dark:bg-slate-800 border border-transparent text-slate-500 cursor-not-allowed"
                          )}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          min="1"
                          value={item.jumlah || 0}
                          onChange={(e) => updateItem(item.id, "jumlah", parseFloat(e.target.value) || 0)}
                          readOnly={!isEdit}
                          className={`w-full text-right rounded-lg px-3 py-2 outline-none transition-all font-black ${!isEdit ? "bg-transparent text-blue-600" : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                            }`}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          placeholder={isEdit ? "Catatan untuk item ini..." : "-"}
                          value={item.keterangan || ""}
                          onChange={(e) => updateItem(item.id, "keterangan", e.target.value)}
                          readOnly={!isEdit}
                          className={`w-full rounded-lg px-3 py-2 outline-none transition-all italic ${!isEdit ? "bg-transparent text-slate-400" : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                            }`}
                        />
                      </td>
                      {isEdit && (
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                            className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isEdit && (
              <div className="px-6 py-4 bg-slate-50/30 border-t dark:border-slate-800">
                <button
                  onClick={addItem}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-black text-white hover:bg-blue-700 shadow-lg transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  TAMBAH BARIS
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <HistoryLogTab menu="Permintaan Pembelian" nomor_transaksi={header.nomor} />
      )}

      {/* Print Modal */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        data={{
          title: "Permintaan Pembelian",
          kode: header.kode,
          tanggal: header.tanggal,
          keterangan: header.keterangan,
          extraHeaders: [
            { label: "Divisi", value: header.divisi || "-" },
            { label: "Pemohon", value: "Admin" }
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Nama Barang", key: "barang" },
            { header: "Satuan", key: "satuan", width: 20 },
            { header: "Jumlah", key: "jumlah", width: 20, align: "right" },
            { header: "Keterangan", key: "keterangan" },
          ],
          rows: items,
        }}
      />

      <BrowseBarangModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectBarang}
      />
    </div>
  );
}
