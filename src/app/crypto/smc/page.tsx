"use client";
import { useState, useEffect } from "react";
import { 
  Zap, 
  RefreshCcw, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  Info,
  ShieldCheck,
  Target,
  FileDown
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

const TIMEFRAMES = [
  { label: "1 Jam", value: "1h" },
  { label: "4 Jam", value: "4h" },
  { label: "1 Hari", value: "1d" },
  { label: "1 Minggu", value: "1w" },
  { label: "1 Bulan", value: "1M" },
];

export default function CryptoSmcPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [timeframe, setTimeframe] = useState("1w");
  const [search, setSearch] = useState("");
  const [structureFilter, setStructureFilter] = useState("ALL");

  const fetchSignals = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/smc?interval=${tf}`);
      const data = await res.json();
      if (data.success) setSignals(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSignals(); }, [timeframe]);

  const handleScan = async () => {
    const tfLabel = TIMEFRAMES.find(t => t.value === timeframe)?.label;
    if (!confirm(`SMC Scan ${tfLabel}: Ini akan memindai top 50 pair Binance (±30 detik). Lanjutkan?`)) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/crypto/smc/scan?interval=${timeframe}`);
      const data = await res.json();
      alert(data.message || "Scan selesai");
      fetchSignals();
    } catch (err) {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  const handleExport = () => {
    if (filteredSignals.length === 0) return;
    exportToExcel({
      title: "SMC Market Structure Report",
      subtitle: `Timeframe: ${TIMEFRAMES.find(t => t.value === timeframe)?.label} | Generated: ${new Date().toLocaleString()}`,
      fileName: `SMC_Scan_${timeframe}_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Structure", key: "structure" },
        { header: "Bias", key: "bias" },
        { header: "Order Block Price", key: "ob_price", format: (v) => parseFloat(v).toLocaleString() },
        { header: "Timeframe", key: "timeframe" },
        { header: "Created At", key: "created_at", format: (v) => new Date(v).toLocaleString('id-ID') },
      ],
      data: filteredSignals,
    });
  };

  const filteredSignals = signals
    .filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()))
    .filter(s => structureFilter === "ALL" || s.structure === structureFilter);

  return (
    <div className="space-y-6 pb-12">
      {/* Timeframe Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-fit shadow-inner">
        {TIMEFRAMES.map((tf) => (
          <button 
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${timeframe === tf.value ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Zap className="h-32 w-32 text-violet-600" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-xs uppercase tracking-widest mb-2">
             <ShieldCheck className="h-4 w-4" /> Smart Money Concepts
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">SMC Market Structure</h1>
          <p className="text-sm text-slate-500 mt-2">Mendeteksi BOS (Trend Continuation) & CHoCH (Trend Reversal) berdasarkan institusi.</p>
        </div>
        <div className="flex items-center gap-3 relative z-10 font-bold">
          <button 
            onClick={() => fetchSignals()}
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
            title="Refresh Data"
          >
            <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleExport}
            disabled={filteredSignals.length === 0}
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
            title="Export Excel"
          >
            <FileDown className="h-5 w-5" />
          </button>
          <button 
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-indigo-500/30 text-white rounded-2xl text-sm font-black transition-all shadow-xl disabled:opacity-50"
          >
            {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {scanning ? `Scanning...` : "Analyze Market"}
          </button>
        </div>
      </div>

      {/* Quick Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 flex gap-2">
          {['ALL', 'BOS', 'CHoCH'].map(type => (
            <button 
              key={type}
              onClick={() => setStructureFilter(type)}
              className={`flex-1 py-3 text-xs font-black rounded-2xl border transition-all ${structureFilter === type ? 'bg-violet-600 text-white border-violet-600 shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
            >
              {type === 'ALL' ? 'Semua Sinyal' : type}
            </button>
          ))}
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detected</div>
            <div className="text-xl font-black text-slate-900 dark:text-white leading-none">{filteredSignals.length} Setups</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center px-4">
          <Search className="h-4 w-4 text-slate-400 mr-3" />
          <input 
             type="text" 
             placeholder="Cari Pair..."
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="bg-transparent border-none outline-none text-sm font-bold w-full"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                <th className="px-8 py-5">Symbol</th>
                <th className="px-8 py-5 text-center">Structure Type</th>
                <th className="px-8 py-5 text-center">Market Bias</th>
                <th className="px-8 py-5 text-center">Order Block Level</th>
                <th className="px-8 py-5 text-center">Time Detected</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-16 text-center text-slate-400">Menarik data Smart Money...</td></tr>
              ) : filteredSignals.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-16 text-center text-slate-400">Belum ada sinyal SMC terdeteksi. Mulai "Analyze Market" untuk memindai sinyal.</td></tr>
              ) : filteredSignals.map((signal) => (
                <tr key={signal.nomor} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-md">
                        {signal.symbol.substring(0, 3)}
                      </div>
                      <div>
                        <div className="text-slate-900 dark:text-white font-black text-lg leading-none mb-1">{signal.symbol}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Interval {signal.timeframe}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-black shadow-sm ${signal.structure === 'CHoCH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'}`}>
                      {signal.structure === 'CHoCH' ? '🔄 CHoCH' : '🔥 BOS'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full ${signal.bias === 'BULLISH' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} mb-1`}>
                         {signal.bias === 'BULLISH' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${signal.bias === 'BULLISH' ? 'text-green-600' : 'text-red-500'}`}>{signal.bias}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center font-black text-slate-900 dark:text-white">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700">
                      <Target className="h-3 w-3 text-violet-600" />
                      {parseFloat(signal.ob_price).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center text-slate-400 text-xs">
                    {new Date(signal.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <a 
                      href={`https://www.tradingview.com/chart/?symbol=BINANCE:${signal.symbol}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md active:scale-95"
                    >
                      Buka Chart <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 p-8 rounded-3xl border border-violet-100 dark:border-violet-800">
          <h3 className="text-lg font-black text-violet-900 dark:text-violet-300 mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" /> SMC Logic: Reversal vs Continuation
          </h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30"><RefreshCcw className="h-5 w-5 text-white" /></div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm">CHoCH (Change of Character)</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Terjadi saat harga mematahkan swing point terakhir yang berlawanan arah. Ini adalah sinyal utama **Pembalikan Tren** (Reversal).</p>
              </div>
            </div>
            <div className="flex gap-4">
               <div className="h-10 w-10 bg-violet-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30"><Zap className="h-5 w-5 text-white" /></div>
               <div>
                 <h4 className="font-black text-slate-900 dark:text-white text-sm">BOS (Break of Structure)</h4>
                 <p className="text-xs text-slate-500 mt-1 leading-relaxed">Terjadi saat harga mematahkan swing point searah (High baru pada tren naik, Low baru pada tren turun). Ini mengonfirmasi **Kelanjutan Tren**.</p>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
           <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-600" /> Order Block (OB) Strategy
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-violet-600 mt-2 shrink-0"></div>
              <p className="text-xs text-slate-500"><span className="font-bold text-slate-700 dark:text-slate-300">Identify Zone:</span> OB Price adalah harga pembukaan dari candle "berlawanan" tepat sebelum ledakan harga yang memicu BOS/CHoCH.</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-violet-600 mt-2 shrink-0"></div>
              <p className="text-xs text-slate-500"><span className="font-bold text-slate-700 dark:text-slate-300">Strategy:</span> Target entry terbaik adalah saat harga kembali (*pullback*) ke area Order Block tersebut setelah terjadinya Breakout.</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-violet-600 mt-2 shrink-0"></div>
              <p className="text-xs text-slate-500"><span className="font-bold text-slate-700 dark:text-slate-300">High Probability:</span> CHoCH yang diikuti dengan kembalinya harga ke OB Fresh seringkali menghasilkan pergerakan harga yang besar.</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
