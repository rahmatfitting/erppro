"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Archive, FileEdit, Trash2, Filter, Printer, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import ReportFilterModal from "@/components/ReportFilterModal";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { BarcodeQtyModal } from "@/components/BarcodeQtyModal";
import { QRCodePrintModal } from "@/components/QRCodePrintModal";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import * as XLSX from "xlsx";

export default function BarangList() {
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [isPrintQRModalOpen, setIsPrintQRModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [printQty, setPrintQty] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 20;

  // Master data state for Filters
  const [kategoriList, setKategoriList] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    keyword: "",
    kategori: ""
  });

  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (pageNum: number, isLoadMore = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        keyword: filters.keyword,
        kategori: filters.kategori
      });

      const response = await fetch(`/api/master/barang?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        if (isLoadMore) {
          setData(prev => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }

        setHasMore(result.data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error("Failed to fetch Barang list:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, ITEMS_PER_PAGE]);

  useEffect(() => {
    fetch('/api/master/kategori?limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.success) setKategoriList(data.data);
      })
      .catch(err => console.error("Error fetching kategori", err));
  }, []);

  useEffect(() => {
    setPage(1);
    fetchData(1, false);
  }, [filters, fetchData]);

  const handleAction = async (id: string, action: 'delete') => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data barang ini?`)) return;
    try {
      const res = await fetch('/api/master/barang', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      const result = await res.json();
      if (result.success) {
        fetchData(1, false);
      } else {
        alert(result.error || "Gagal menghapus barang");
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem");
    }
  };

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, true);
  }, [page, hasMore, loading, fetchData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [loadMore, hasMore, loading]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

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
        keyword: filters.keyword,
        kategori: filters.kategori
      });

      const response = await fetch(`/api/master/barang?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        const exportColumns = [
          { header: "No", key: "_no" },
          { header: "Kode", key: "kode" },
          { header: "Nama Barang", key: "nama" },
          { header: "Kategori", key: "kategori" },
          { header: "Satuan", key: "satuan_nama" },
          { header: "Harga Beli", key: "harga_beli", format: (v: any) => formatCurrency(v) },
          { header: "Harga Jual", key: "harga_jual", format: (v: any) => formatCurrency(v) }
        ];

        const config = {
          title: "Master Data Barang",
          subtitle: `Periode Input: ${startDate} s/d ${endDate}`,
          fileName: `Master_Barang_${startDate}_${endDate}`,
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

  const openBarcodePrint = (item: any) => {
    setSelectedItem(item);
    setIsQtyModalOpen(true);
  };

  const handleConfirmQty = (qty: number) => {
    setPrintQty(qty);
    setIsQtyModalOpen(false);
    setIsPrintQRModalOpen(true);
  };

  const openImagePreview = (item: any) => {
    try {
      const imgs = typeof item.gambar === 'string' ? JSON.parse(item.gambar) : item.gambar;
      if (imgs && imgs.length > 0) {
        setPreviewImages(imgs);
        setPreviewIndex(0);
        setIsPreviewOpen(true);
      }
    } catch (e) {}
  };

  const handleDownloadTemplate = () => {
    window.open('/api/master/barang/template', '_blank');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstream = evt.target?.result;
        const wb = XLSX.read(bstream, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        const items = rawData.map(row => ({
          nama: row['Nama Barang'],
          satuan: row['Satuan'],
          kategori: row['Kategori'],
          harga_beli: row['Harga Beli'],
          harga_jual: row['Harga Jual']
        })).filter(it => it.nama);

        if (items.length === 0) {
          alert("Tidak ada data barang yang valid untuk diimport.");
          setLoading(false);
          return;
        }

        const res = await fetch('/api/master/barang/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });
        const result = await res.json();

        if (result.success) {
          alert(result.message);
          fetchData(1, false);
        } else {
          alert(result.error || "Gagal melakukan import data.");
        }
      } catch (err: any) {
        alert("Terjadi kesalahan saat membaca file: " + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="h-6 w-6 text-sky-600 dark:text-sky-500" />
            Master Barang (Item)
          </h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Kelola data produk/barang yang diperdagangkan, diproduksi, atau digunakan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".xlsx,.xls" 
              className="hidden" 
            />
            <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
                Template
            </button>
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            >
                Import Excel
            </button>
            <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
                <Printer className="h-4 w-4" />
                Print List
            </button>
            <Link
            href="/master/barang/create"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
            >
            <Plus className="h-4 w-4" />
            Tambah Barang Baru
            </Link>
        </div>
      </div>

      {/* Filter Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pencarian</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Kode atau Nama Barang..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                className="w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="w-full md:w-56 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kategori</label>
            <select
              value={filters.kategori}
              onChange={(e) => setFilters(prev => ({ ...prev, kategori: e.target.value }))}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Semua Kategori</option>
              {kategoriList.map(c => (
                <option key={c.nomor} value={c.nama}>{c.nama}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 relative min-w-[800px]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-slate-950 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold w-12 text-center">Foto</th>
                <th className="px-6 py-4 font-semibold">Kode</th>
                <th className="px-6 py-4 font-semibold">Nama Barang</th>
                <th className="px-6 py-4 font-semibold">Kategori</th>
                <th className="px-6 py-4 font-semibold text-center text-sky-700">Satuan</th>
                <th className="px-6 py-4 font-semibold text-right text-emerald-700">Harga Beli</th>
                <th className="px-6 py-4 font-semibold text-right text-indigo-700">Harga Jual</th>
                <th className="px-6 py-4 font-semibold text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {data.map((item) => (
                <tr key={item.nomor} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-3 text-center">
                    {(() => {
                      try {
                        const imgs = typeof item.gambar === 'string' ? JSON.parse(item.gambar) : item.gambar;
                        if (imgs && imgs.length > 0) {
                          return (
                            <button 
                              onClick={() => openImagePreview(item)}
                              className="relative group/img h-10 w-10 mx-auto block rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all active:scale-95"
                            >
                                <img src={imgs[0]} alt="" className="h-full w-full object-cover transition-transform group-hover/img:scale-110" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                    <Search className="h-4 w-4 text-white" />
                                </div>
                            </button>
                          );
                        }
                      } catch (e) {}
                      return <div className="h-10 w-10 mx-auto rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300"><Archive className="h-5 w-5 opacity-20" /></div>;
                    })()}
                  </td>
                  <td className="px-6 py-4 font-bold text-sky-600 dark:text-sky-400">
                    {item.kode}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">
                    {item.nama}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      {item.kategori || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">
                    {item.satuan}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(item.harga_beli)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(item.harga_jual)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/master/barang/${item.nomor}`} title="View" className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                        <Search className="h-4 w-4" />
                      </Link>
                      <button 
                        title="Print Barcode" 
                        onClick={() => openBarcodePrint(item)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <button title="Delete" onClick={() => handleAction(item.nomor, 'delete')} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white shadow-sm border border-slate-200 rounded p-1.5 dark:bg-slate-900 dark:border-slate-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 mb-3 opacity-20" />
                      <p>Tidak ada Master Barang yang ditemukan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lazy Loading Indicator */}
        {hasMore && (
          <div ref={observerTarget} className="p-6 flex justify-center items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-600 object-top border-t-transparent dark:border-sky-500"></div>
                Memuat data...
              </>
            ) : (
              "Scroll untuk melihat lebih banyak"
            )}
          </div>
        )}
      </div>

      <ReportFilterModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Print Master Barang"
        onFilter={handleExport}
      />

      {selectedItem && (
        <BarcodeQtyModal
          isOpen={isQtyModalOpen}
          onClose={() => setIsQtyModalOpen(false)}
          onConfirm={handleConfirmQty}
          itemName={selectedItem.nama}
        />
      )}

      {selectedItem && (
        <QRCodePrintModal
          isOpen={isPrintQRModalOpen}
          onClose={() => setIsPrintQRModalOpen(false)}
          items={[{
            kode_barang: selectedItem.kode,
            nama_barang: selectedItem.nama,
            jumlah: printQty,
            satuan: selectedItem.satuan
          }]}
        />
      )}
    </div>
  );
}
