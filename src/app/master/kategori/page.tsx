"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Layers, FileEdit, Trash2, X, Save, AlertCircle, Loader2, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import ReportFilterModal from "@/components/ReportFilterModal";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

export default function KategoriPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [keyword, setKeyword] = useState("");
  const [formData, setFormData] = useState({ kode: "", nama: "", keterangan: "" });
  const [error, setError] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/kategori?keyword=${keyword}`);
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const handleExport = async (startDate: string, endDate: string, exportType: 'view' | 'pdf' | 'excel' | 'pivot') => {
    try {
      if (exportType === 'view') {
        setIsReportModalOpen(false);
        return;
      }

      setLoading(true);
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        limit: "999999",
        keyword: keyword
      });

      const response = await fetch(`/api/master/kategori?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        const exportColumns = [
          { header: "No", key: "_no" },
          { header: "Kode", key: "kode" },
          { header: "Nama Kategori", key: "nama" },
          { header: "Keterangan", key: "keterangan" }
        ];

        const config = {
          title: "Master Kategori Barang",
          subtitle: `Periode Input: ${startDate} s/d ${endDate}`,
          fileName: `Master_Kategori_${startDate}_${endDate}`,
          columns: exportColumns,
          data: result.data
        };

        if (exportType === 'pdf') {
          exportToPDF(config);
        } else {
          await exportToExcel(config, exportType === 'pivot');
        }
      }
      setIsReportModalOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      alert("Gagal melakukan export data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = editData ? `/api/master/kategori/${editData.nomor}` : '/api/master/kategori';
      const method = editData ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      
      if (result.success) {
        setShowModal(false);
        setEditData(null);
        setFormData({ kode: "", nama: "", keterangan: "" });
        fetchData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kategori ini?")) return;
    try {
      const res = await fetch('/api/master/kategori', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' }),
      });
      if ((await res.json()).success) fetchData();
    } catch (err) {
      alert("Gagal menghapus data");
    }
  };

  const openEdit = (item: any) => {
    setEditData(item);
    setFormData({ kode: item.kode, nama: item.nama, keterangan: item.keterangan || "" });
    setShowModal(true);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Master Kategori Barang
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola kategori untuk pengelompokan barang.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
                <Printer className="h-4 w-4" />
                Cetak
            </button>
            <button
            onClick={() => { setEditData(null); setFormData({ kode: "", nama: "", keterangan: "" }); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all font-bold"
            >
            <Plus className="h-4 w-4" />
            Tambah Kategori
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Kategori</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
              {data.map((item) => (
                <tr key={item.nomor} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                  <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{item.kode}</td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.nama}</td>
                  <td className="px-6 py-4 text-slate-500 italic">{item.keterangan || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(item)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
                        <FileEdit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(item.nomor)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-600 transition-all shadow-sm">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Tidak ada data ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editData ? "Edit Kategori" : "Tambah Kategori Baru"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kode Kategori</label>
                <input
                  required
                  type="text"
                  value={formData.kode}
                  onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                  className={cn(
                    "w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-600",
                    editData && "opacity-60 cursor-not-allowed"
                  )}
                  disabled={!!editData}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Kategori</label>
                <input
                  required
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Keterangan</label>
                <textarea
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white min-h-[100px]"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-3 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReportFilterModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Print Master Kategori"
        onFilter={handleExport}
      />
    </div>
  );
}
