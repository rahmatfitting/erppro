"use client";
import { useState, useEffect } from "react";
import { 
  BarChart3, 
  RefreshCcw, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Search, 
  Zap,
  Info,
  Thermometer,
  LayoutGrid,
  Target,
  ArrowRight,
  Layers,
  Binoculars,
  FileDown
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

const TIMEFRAMES = [
  { label: "5 Menit", value: "5m" },
  { label: "15 Menit", value: "15m" },
  { label: "1 Jam", value: "1h" },
  { label: "4 Jam", value: "4h" },
  { label: "1 Hari", value: "1d" },
];

function getRsiColor(rsi: number) {
  if (rsi >= 80) return "bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.6)] border-rose-400";
  if (rsi >= 70) return "bg-rose-500/80 text-white border-rose-300";
  if (rsi >= 60) return "bg-rose-400/30 text-rose-600 border-rose-200 dark:border-rose-900/30";
  if (rsi <= 20) return "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)] border-emerald-400";
  if (rsi <= 30) return "bg-emerald-500/80 text-white border-emerald-300";
  if (rsi <= 40) return "bg-emerald-400/30 text-emerald-600 border-emerald-200 dark:border-emerald-900/30";
  return "bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800";
}

export default function RsiHeatmapPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [timeframe, setTimeframe] = useState("1h");
  const [search, setSearch] = useState("");

  const fetchSignals = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/rsi?interval=${tf}`);
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
    if (!confirm(`RSI Heatmap Scan ${tfLabel}: Ini akan memindai 150 pair Binance (±45 detik). Lanjutkan?`)) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/crypto/rsi/scan?interval=${timeframe}`);
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
    if (filtered.length === 0) return;
    exportToExcel({
      title: "RSI Heatmap Report",
      subtitle: `Timeframe: ${TIMEFRAMES.find(t => t.value === timeframe)?.label} | Generated: ${new Date().toLocaleString()}`,
      fileName: `RSI_Heatmap_${timeframe}_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "RSI Value", key: "rsi_value", format: (v) => Math.round(parseFloat(v)).toString() },
        { header: "Status", key: "rsi_value", format: (v) => {
            const rsi = parseFloat(v);
            if (rsi >= 70) return "Overbought";
            if (rsi <= 30) return "Oversold";
            return "Neutral";
          }
        },
      ],
      data: filtered,
    });
  };

  const filtered = signals.filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()));
  const overboughtCount = signals.filter(s => s.rsi_value >= 70).length;
  const oversoldCount = signals.filter(s => s.rsi_value <= 30).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Timeframe Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-fit shadow-inner">
        {TIMEFRAMES.map((tf) => (
          <button 
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${timeframe === tf.value ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Thermometer className="h-48 w-48 text-rose-600" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-widest mb-2">
               <Zap className="h-4 w-4" /> Market Sentiment Monitor
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">RSI Heatmap</h1>
            <p className="text-sm text-slate-500 mt-3 max-w-xl">
              Memantau jenuh beli/jual untuk 150+ koin secara real-time. Terinspirasi oleh Coinglass Market Intelligence.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-rose-500/30 disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              {scanning ? `Analyzing 150+ Pairs...` : "Run Intelligent Scan"}
            </button>
            <button 
              onClick={handleExport}
              disabled={filtered.length === 0 || scanning}
              className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
              title="Export Excel"
            >
              <FileDown className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
           <div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Overbought (70+)</div>
             <div className="text-3xl font-black text-rose-600">{overboughtCount}</div>
           </div>
           <div className="h-12 w-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center">
             <TrendingUp className="h-6 w-6 text-rose-600" />
           </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
           <div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Oversold (30-)</div>
             <div className="text-3xl font-black text-emerald-600">{oversoldCount}</div>
           </div>
           <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
             <TrendingDown className="h-6 w-6 text-emerald-600" />
           </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 relative overflow-hidden">
           <Search className="h-5 w-5 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search coin (e.g. BTC)..."
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="bg-transparent border-none outline-none font-bold text-slate-900 dark:text-white w-full placeholder:text-slate-400"
           />
        </div>
      </div>

      {/* HEATMAP GRID */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all min-h-[400px]">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <RefreshCcw className="h-10 w-10 text-rose-600 animate-spin" />
             <div className="text-slate-400 font-black uppercase text-xs tracking-widest">Building Market Map...</div>
           </div>
        ) : filtered.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-32 text-slate-400 italic">
             No market data found for this timeframe. Please run a scan.
           </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
             {filtered.map((s) => (
               <a 
                 key={s.nomor}
                 href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} target="_blank"
                 className={`group flex flex-col items-center justify-center aspect-square rounded-2xl border-2 transition-all p-2 hover:scale-[1.08] hover:z-20 ${getRsiColor(parseFloat(s.rsi_value))}`}
               >
                 <div className="text-[11px] font-black tracking-tight">{s.symbol.replace('USDT', '')}</div>
                 <div className="text-[14px] font-black leading-none mt-1">{Math.round(parseFloat(s.rsi_value))}</div>
                 <div className="text-[7px] font-bold opacity-40 uppercase mt-1 group-hover:opacity-100 transition-opacity">Chart <ArrowRight className="inline h-1.5 w-1.5" /></div>
               </a>
             ))}
          </div>
        )}
      </div>

      {/* Legend & Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-slate-950 text-white p-8 rounded-3xl">
          <h3 className="font-black uppercase tracking-widest text-rose-500 mb-6 flex items-center gap-2 text-sm">
            <Thermometer className="h-4 w-4" /> RSI Intensity Legend
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-rose-600 rounded shadow-[0_0_8px_rgba(225,29,72,0.8)]"></div>
              <span className="text-[10px] font-bold uppercase text-slate-400 self-center">80+ Extreme Overbought</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-emerald-600 rounded shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <span className="text-[10px] font-bold uppercase text-slate-400 self-center">20- Extreme Oversold</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-rose-500/80 rounded"></div>
              <span className="text-[10px] font-bold uppercase text-slate-400 self-center">70+ Overbought</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-emerald-500/80 rounded"></div>
              <span className="text-[10px] font-bold uppercase text-slate-400 self-center">30- Oversold</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-slate-800 rounded"></div>
              <span className="text-[10px] font-bold uppercase text-slate-400 self-center">45-55 Neutral Zone</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
           <h3 className="font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6 flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-rose-600" /> Scalping Strategy
          </h3>
          <p className="text-xs text-slate-500 font-bold leading-relaxed mb-4">
            Gunakan Heatmap ini untuk mencari peluang <span className="text-rose-600 italic">Mean Reversion</span>. 
            Koin yang berwarna merah pekat adalah kandidat Short, sedangkan hijau pekat kandidat Long. 
          </p>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-[10px] text-amber-700 dark:text-amber-400 font-bold">
             🔥 <strong>Pro Tip:</strong> Cari koin yang overbought di 1h & 4h secara bersamaan (Confluence) untuk probabilitas reversal tertinggi.
          </div>
        </div>
      </div>

    </div>
  );
}
