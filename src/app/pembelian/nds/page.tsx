"use client";

// NDS = Nota Debet Supplier - list page
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, FileText, RefreshCw, CheckCircle, Printer } from "lucide-react";
import PrintModal, { PrintData } from "@/components/PrintModal";

const fmt = (v: any) => new Intl.NumberFormat('id-ID').format(v || 0);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function NDSList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [printData, setPrintData] = useState<PrintData | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams({ jenis: 'NDS', keyword, startDate, endDate });
    const res = await fetch(`/api/pembelian/nota-kredit?${params}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Nota Debet Supplier</h1>
            <p className="text-sm text-slate-500">Daftar NDS pembelian</p>
          </div>
        </div>
        <Link href="/pembelian/nds/create" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="h-4 w-4" /> Buat NDS
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Kode / Supplier..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none" />
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" /> Cari
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Kode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Account Tujuan</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada data NDS</td></tr>
              ) : data.map(row => (
                <tr key={row.nomor} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-purple-600">{row.kode}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmtDate(row.tanggal)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{row.supplier}</td>
                  <td className="px-4 py-3 text-slate-600">{row.account_tujuan || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">Rp {fmt(row.total)}</td>
                  <td className="px-4 py-3 text-center">
                    {row.status_disetujui ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full"><CheckCircle className="h-3 w-3" /> Approved</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/pembelian/nds/${row.nomor}`} className="text-sm text-purple-600 hover:text-purple-700 font-medium whitespace-nowrap">Detail</Link>
                      <button 
                        onClick={() => setPrintData({
                          title: "NOTA DEBET SUPPLIER (NDS)",
                          kode: row.kode,
                          tanggal: fmtDate(row.tanggal),
                          extraHeaders: [
                            { label: "Supplier", value: row.supplier },
                            { label: "Account Tujuan", value: row.account_tujuan || "-" }
                          ],
                          columns: [
                            { header: "No", key: "_no" },
                            { header: "Tanggal", key: "tanggal", format: (v) => fmtDate(v) },
                            { header: "Kode", key: "kode" },
                            { header: "Supplier", key: "supplier" },
                            { header: "Keterangan", key: "keterangan" },
                            { header: "Total", key: "total", align: "right", format: (v) => fmt(v) },
                          ],
                          rows: [row],
                          footerRows: [
                            { label: "Total Keseluruhan", value: `Rp ${fmt(row.total)}` }
                          ]
                        })}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Print"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {printData && (
        <PrintModal 
          isOpen={!!printData} 
          onClose={() => setPrintData(null)} 
          data={printData} 
        />
      )}
    </div>
  );
}
