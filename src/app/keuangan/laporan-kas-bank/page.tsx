
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, FileText, Download, Printer, ArrowLeft, Calendar, BookOpen, Loader2, MapPin, Layers, ChevronsUpDown, X } from "lucide-react";
import { BrowseAccountModal } from "@/components/BrowseAccountModal";
import { BrowseCabangModal } from "@/components/BrowseCabangModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (v: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(v || 0);
const fmt0 = (v: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(v || 0);
const PAGE_SIZE = 80;

type Row = {
  tanggal?: string;
  transaksikode?: string;
  uraian?: string;
  coa_lawan?: string;
  nama_coa?: string;
  saldo_debit?: number;
  saldo_kredit?: number;
  saldo_total?: number;
  is_group_header?: boolean;
  group_label?: string;
  is_saldo_awal?: boolean;
};

// Flatten raw SP rows into display rows (grouped by account)
function buildDisplayRows(rawData: any[]): Row[] {
  const rows: Row[] = [];
  let currentGroup = "";

  rawData.forEach((r: any) => {
    const group = r.group || r.account_header || r.account_nomor || "";

    if (group && group !== currentGroup) {
      rows.push({ is_group_header: true, group_label: group });
      currentGroup = group;
    }

    const isSaldoAwal =
      r.is_saldo_awal === 1 ||
      r.keterangan?.toLowerCase().includes("saldo awal") ||
      r.transaksikode?.toLowerCase().includes("saldo awal");

    rows.push({
      tanggal: r.tanggal ? String(r.tanggal).split("T")[0] : "",
      transaksikode: r.transaksikode || "",
      uraian: r.keterangan || r.uraian || "",
      coa_lawan: r.coa_lawan || r.account_kode || "",
      nama_coa: r.nama_coa || r.account_nama || "",
      saldo_debit: parseFloat(r.saldo_debit || 0),
      saldo_kredit: parseFloat(r.saldo_kredit || 0),
      saldo_total: parseFloat(r.saldo_total || 0),
      is_saldo_awal: isSaldoAwal,
    });
  });

  return rows;
}

export default function LaporanKasBankPage() {
  const [loading, setLoading] = useState(false);
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [saldoAkhir, setSaldoAkhir] = useState(0);
  const [params, setParams] = useState({
    tanggal_awal: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    tanggal_akhir: new Date().toISOString().split("T")[0],
    nomormhaccount: 0,
    account_nama: "",
    account_kode: "",
    nomormhcabang: 0,
    cabang_nama: "Semua Cabang",
    is_detail: "1",
    kas_bank: "1", // Initial default: Kas
  });

  const [isBrowseAccountOpen, setIsBrowseAccountOpen] = useState(false);
  const [isBrowseCabangOpen, setIsBrowseCabangOpen] = useState(false);

  // Lazy load sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, allRows.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [allRows.length]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setAllRows([]);
    setVisibleCount(PAGE_SIZE);
    try {
      let url = `/api/keuangan/laporan-kas-bank?tanggal_awal=${params.tanggal_awal}&tanggal_akhir=${params.tanggal_akhir}&is_detail=${params.is_detail}&kas_bank=${params.kas_bank}`;
      if (params.nomormhaccount) url += `&nomormhaccount=${params.nomormhaccount}`;
      url += `&nomormhcabang=${params.nomormhcabang}`; // Always include branch
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        const raw = json.data.transactions || [];
        setAllRows(buildDisplayRows(raw));
        setSaldoAkhir(json.data.saldo_akhir || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [params]);

  // Don't auto-fetch on mount; user clicks Tampilkan
  const visibleRows = allRows.slice(0, visibleCount);

  // Totals computed from non-group non-saldo-awal rows
  const txRows = allRows.filter((r) => !r.is_group_header && !r.is_saldo_awal);
  const totalDebit = txRows.reduce((s, r) => s + (r.saldo_debit || 0), 0);
  const totalKredit = txRows.reduce((s, r) => s + (r.saldo_kredit || 0), 0);

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("LAPORAN KAS BANK", 14, 16);
    doc.setFontSize(9);
    doc.text(`Periode: ${params.tanggal_awal} s/d ${params.tanggal_akhir}  |  Cabang: ${params.cabang_nama}  |  Account: ${params.account_nama || "Semua"}`, 14, 22);
    const body: any[] = [];
    allRows.forEach((r) => {
      if (r.is_group_header) {
        body.push([{ content: r.group_label, colSpan: 8, styles: { fontStyle: "bold", fillColor: [226, 232, 240], textColor: [30, 41, 59] } }]);
      } else {
        body.push([r.tanggal || "", r.transaksikode || "", r.uraian || "", r.coa_lawan || "", r.nama_coa || "", r.saldo_debit ? fmt(r.saldo_debit) : "-", r.saldo_kredit ? fmt(r.saldo_kredit) : "-", fmt(r.saldo_total || 0)]);
      }
    });
    autoTable(doc, {
      startY: 28,
      head: [["Tanggal", "Bukti Transaksi", "Uraian", "COA Lawan", "Nama COA", "Debit", "Kredit", "Saldo"]],
      body,
      foot: [["", "", "", "", "TOTAL", fmt(totalDebit), fmt(totalKredit), fmt(saldoAkhir)]],
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], fontSize: 7, textColor: 255 },
      footStyles: { fillColor: [30, 41, 59], fontSize: 7, textColor: 255 },
      styles: { fontSize: 7 },
      columnStyles: { 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
    });
    doc.save(`Laporan_Kas_Bank_${params.tanggal_awal}_${params.tanggal_akhir}.pdf`);
  };

  const handleExportExcel = () => {
    let csv = "Tanggal,Bukti Transaksi,Uraian,COA Lawan,Nama COA,Debit,Kredit,Saldo\n";
    allRows.forEach((r) => {
      if (r.is_group_header) csv += `,,${r.group_label},,,,, \n`;
      else csv += `${r.tanggal || ""},${r.transaksikode || ""},${r.uraian || ""},${r.coa_lawan || ""},${r.nama_coa || ""},${r.saldo_debit || 0},${r.saldo_kredit || 0},${r.saldo_total || 0}\n`;
    });
    csv += `,,,,TOTAL,${totalDebit},${totalKredit},${saldoAkhir}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Laporan_Kas_Bank_${params.tanggal_awal}_${params.tanggal_akhir}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIcon = () => <ChevronsUpDown className="h-3 w-3 opacity-40 ml-1 inline-flex" />;

  return (
    <div className="max-w-full mx-auto space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/keuangan" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><BookOpen className="h-6 w-6 text-indigo-600" /> Laporan Kas Bank</h1>
            <p className="text-xs text-slate-500">Arus kas dan bank per akun</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"><FileText className="h-3.5 w-3.5" /> PDF</button>
          <button onClick={handleExportExcel} className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"><Download className="h-3.5 w-3.5" /> Excel</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"><Printer className="h-3.5 w-3.5" /> Cetak</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dari</label>
            <div className="relative"><Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><input type="date" value={params.tanggal_awal} onChange={e => setParams(p => ({ ...p, tanggal_awal: e.target.value }))} className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hingga</label>
            <div className="relative"><Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><input type="date" value={params.tanggal_akhir} onChange={e => setParams(p => ({ ...p, tanggal_akhir: e.target.value }))} className="w-full pl-8 pr-2 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cabang</label>
            <div className="relative"><input type="text" readOnly onClick={() => setIsBrowseCabangOpen(true)} value={params.cabang_nama} className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer hover:border-indigo-400 outline-none" /><MapPin className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" /></div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Account</label>
            <div className="relative">
              <input type="text" readOnly onClick={() => setIsBrowseAccountOpen(true)} value={params.account_nama || "Semua Account"} className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer hover:border-indigo-400 outline-none" />
              {params.nomormhaccount !== 0 ? (
                <button onClick={() => setParams(p => ({ ...p, nomormhaccount: 0, account_nama: "", account_kode: "" }))} className="absolute right-7 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 hover:text-rose-500"><X className="h-full w-full" /></button>
              ) : null}
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kas/Bank</label>
            <select
              value={params.kas_bank}
              onChange={e => setParams(p => ({ ...p, kas_bank: e.target.value }))}
              disabled={params.nomormhaccount !== 0}
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none appearance-none ${params.nomormhaccount !== 0 ? 'bg-slate-100 dark:bg-slate-900 cursor-not-allowed text-slate-500' : 'cursor-pointer'}`}
            >
              <option value="1">Kas</option>
              <option value="0">Bank</option>
            </select>
          </div>
          <div className="space-y-1 hidden">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tipe</label>
            <select value={params.is_detail} onChange={e => setParams(p => ({ ...p, is_detail: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none appearance-none cursor-pointer">
              <option value="1">Detail</option>
              <option value="0">Rekap</option>
            </select>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center justify-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Tampilkan
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow overflow-hidden">
        {/* Stats bar */}
        {allRows.length > 0 && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-6 text-xs text-slate-500">
            <span>{txRows.length} transaksi</span>
            <span>Menampilkan {Math.min(visibleCount, allRows.length)} / {allRows.length} baris</span>
            <span className="ml-auto font-semibold text-slate-700 dark:text-slate-300">Saldo Akhir: <span className="text-indigo-600">{fmt(saldoAkhir)}</span></span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-600 text-left">
                <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">TANGGAL <SortIcon /></th>
                <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">BUKTI TRANSAKSI <SortIcon /></th>
                <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider min-w-[200px]">URAIAN <SortIcon /></th>
                <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">COA LAWAN <SortIcon /></th>
                <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider min-w-[140px]">NAMA COA <SortIcon /></th>
                <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-right whitespace-nowrap">DEBIT <SortIcon /></th>
                <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-right whitespace-nowrap">KREDIT <SortIcon /></th>
                <th className="px-3 py-2.5 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-right whitespace-nowrap">SALDO <SortIcon /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">Memuat laporan...</p>
                </td></tr>
              ) : visibleRows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>Pilih filter dan klik Tampilkan</p>
                </td></tr>
              ) : visibleRows.map((row, i) => {
                if (row.is_group_header) {
                  return (
                    <tr key={i} className="bg-slate-100 dark:bg-slate-800/60">
                      <td colSpan={8} className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 text-xs tracking-wide text-center border-t border-b border-slate-300 dark:border-slate-600">
                        {row.group_label}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.tanggal}</td>
                    <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap" dangerouslySetInnerHTML={{ __html: row.transaksikode || "" }}></td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[260px] truncate" title={row.uraian} dangerouslySetInnerHTML={{ __html: row.uraian || "" }}></td>
                    <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.coa_lawan}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.nama_coa}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{(row.saldo_debit || 0) > 0 ? fmt(row.saldo_debit!) : <span className="text-slate-300">-</span>}</td>
                    <td className="px-3 py-2 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">{(row.saldo_kredit || 0) > 0 ? fmt(row.saldo_kredit!) : <span className="text-slate-300">-</span>}</td>
                    <td className="px-3 py-2 text-right font-bold font-mono text-slate-800 dark:text-white whitespace-nowrap">{fmt(row.saldo_total || 0)}</td>
                  </tr>
                );
              })}

              {/* Footer totals row */}
              {!loading && allRows.length > 0 && (
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-xs border-t-2 border-slate-300">
                  <td colSpan={5} className="px-3 py-3 text-right text-slate-500 uppercase tracking-widest text-[10px]">
                    TOTAL PERIODE
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-600 font-mono">
                    {fmt(totalDebit)}
                  </td>
                  <td className="px-3 py-3 text-right text-rose-600 font-mono">
                    {fmt(totalKredit)}
                  </td>
                  <td className="px-3 py-3 text-right text-indigo-600 font-mono">
                    {fmt(saldoAkhir)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lazy load sentinel */}
        {visibleCount < allRows.length && (
          <div ref={sentinelRef} className="flex items-center justify-center py-6 gap-2 text-slate-400 text-xs border-t border-slate-100 dark:border-slate-800">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat {Math.min(PAGE_SIZE, allRows.length - visibleCount)} baris lagi...
          </div>
        )}
      </div>

      <BrowseAccountModal
        isOpen={isBrowseAccountOpen}
        onClose={() => setIsBrowseAccountOpen(false)}
        detail={true}
        onSelect={(a: any) => {
          setParams(p => ({
            ...p,
            nomormhaccount: a.nomor,
            account_nama: a.nama,
            account_kode: a.kode,
            kas_bank: a.kas ? "1" : a.bank ? "0" : p.kas_bank
          }));
          setIsBrowseAccountOpen(false);
        }}
      />

      <BrowseCabangModal
        isOpen={isBrowseCabangOpen}
        onClose={() => setIsBrowseCabangOpen(false)}
        onSelect={(c) => { setParams(p => ({ ...p, nomormhcabang: c.nomor, cabang_nama: c.nama })); setIsBrowseCabangOpen(false); }}
      />
    </div>
  );
}
