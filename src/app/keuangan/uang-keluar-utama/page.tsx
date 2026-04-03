"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, ArrowUpCircle, RefreshCw, CheckCircle, Printer, Loader2, Edit } from "lucide-react";
import ReportFilterModal from "@/components/ReportFilterModal";
import PrintModal from "@/components/PrintModal";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

const fmt = (v: any) => new Intl.NumberFormat('id-ID').format(v || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function UangKeluarUtamaList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(""); 
  const [startDate, setStartDate] = useState(""); 
  const [endDate, setEndDate] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const fetchData = async () => { 
    setLoading(true); 
    const p = new URLSearchParams({ jenis: '1', keyword, startDate, endDate }); 
    const r = await fetch(`/api/keuangan/uang-keluar?${p}`); 
    const j = await r.json(); if (j.success) setData(j.data); setLoading(false); 
  };

  const handleExport = async (sDate: string, eDate: string, exportType: 'view' | 'pdf' | 'excel' | 'pivot') => {
    try {
      if (exportType === 'view') {
        setStartDate(sDate);
        setEndDate(eDate);
        setIsReportModalOpen(false);
        setTimeout(() => fetchData(), 100);
        return;
      }

      setLoading(true);
      const queryParams = new URLSearchParams({
        jenis: '1',
        startDate: sDate,
        endDate: eDate,
        limit: "999999",
        keyword
      });

      const response = await fetch(`/api/keuangan/uang-keluar?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        const exportColumns = [
          { header: "No", key: "_no" },
          { header: "Kode", key: "kode" },
          { header: "Tanggal", key: "tanggal", format: (v: any) => fmtDate(v) },
          { header: "Metode", key: "metode", format: (v: any) => String(v).toUpperCase() },
          { header: "Account", key: "account_nama" },
          { header: "Total", key: "total", format: (v: any) => "Rp " + fmt(v) },
          { header: "Total IDR", key: "total_idr", format: (v: any) => "Rp " + fmt(v) },
          { header: "Status", key: "status_disetujui", format: (v: any) => v ? "Approved" : "Pending" }
        ];

        const config = {
          title: "Laporan Uang Keluar Utama",
          subtitle: `Periode: ${sDate} s/d ${eDate}`,
          fileName: `UK_Utama_${sDate}_${eDate}`,
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

  const handlePrintRow = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/keuangan/uang-keluar/detail?id=${id}`);
      const d = await res.json();
      if (d.success) {
        setPrintData({
          title: "Voucher Pengeluaran Kas/Bank (Utama)",
          kode: d.header.kode,
          tanggal: d.header.tanggal,
          keterangan: d.header.keterangan || "-",
          extraHeaders: [
            { label: "Account Pembayar", value: `${d.header.account_kode} - ${d.header.account_nama}` },
            { label: "Metode Bayar", value: d.header.metode?.toUpperCase() || "-" },
            { label: "Valuta", value: `${d.header.valuta} @ ${fmt(d.header.kurs)}` }
          ],
          columns: [
            { header: "No", key: "_no", width: 8, align: "center" },
            { header: "Ref. Transaksi", key: "ref_kode" },
            { header: "Supplier / Customer", key: "customer_supplier" },
            { header: "Keterangan", key: "keterangan" },
            { header: "Nominal (IDR)", key: "total_bayar_idr", width: 30, align: "right", format: (v: any) => fmt(v) },
          ],
          rows: d.items,
          footerRows: [
            { label: "TOTAL PENGELUARAN", value: `Rp ${fmt(d.header.total)}` }
          ]
        });
        setIsPrintModalOpen(true);
      }
    } catch (e) {
      alert("Gagal memuat data print");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg"><ArrowUpCircle className="h-6 w-6 text-rose-600"/></div><div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Uang Keluar Utama</h1><p className="text-sm text-slate-500">Pembayaran dari transaksi pembelian</p></div></div>
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
                <Printer className="h-4 w-4" />
                Cetak Laporan
            </button>
            <Link href="/keuangan/uang-keluar-utama/create" className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"><Plus className="h-4 w-4"/> Buat UKU</Link>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/><input type="text" placeholder="Kode / Keterangan..." value={keyword} onChange={e=>setKeyword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchData()} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"/></div>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none"/>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none"/>
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg transition-colors"><RefreshCw className="h-4 w-4"/> Cari</button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">{['Kode','Tanggal','Metode','Account','Total','Total IDR','Status','Aksi'].map(h=><th key={h} className={`px-4 py-3 text-xs font-semibold uppercase text-slate-500 ${['Total','Total IDR'].includes(h)?'text-right':'text-left'}`}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading?<tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
            :data.length===0?<tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Belum ada data Uang Keluar Utama</td></tr>
            :data.map(row=>(
              <tr key={row.nomor} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-rose-600">{row.kode}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmtDate(row.tanggal)}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${row.metode==='bank'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{row.metode?.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[160px] truncate">{row.account_nama||'-'}</td>
                <td className="px-4 py-3 text-right font-semibold">Rp {fmt(row.total)}</td>
                <td className="px-4 py-3 text-right text-slate-500 text-xs">Rp {fmt(row.total_idr)}</td>
                <td className="px-4 py-3">{row.status_disetujui?<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full"><CheckCircle className="h-3 w-3"/>Approved</span>:<span className="inline-flex px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Pending</span>}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/keuangan/uang-keluar-utama/${row.kode}`} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="Detail"><Search className="h-4 w-4" /></Link>
                    {(!row.status_disetujui && row.status_aktif !== 0) && (
                      <Link href={`/keuangan/uang-keluar-utama/edit/${row.nomor}`} className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" title="Edit"><Edit className="h-4 w-4" /></Link>
                    )}
                    <button onClick={() => handlePrintRow(row.nomor)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors" title="Print PDF"><Printer className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      <ReportFilterModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Print Laporan Uang Keluar Utama"
        onFilter={handleExport}
      />

      {printData && (
        <PrintModal 
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          data={printData}
        />
      )}
    </div>
  );
}
