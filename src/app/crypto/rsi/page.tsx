"use client";
import { useState, useEffect } from "react";
import { 
  BarChart3, 
  RefreshCcw, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Zap,
  Info,
  Thermometer,
  LayoutGrid
} from "lucide-react";

const TIMEFRAMES = [
  { label: "15 Menit", value: "15m" },
  { label: "1 Jam", value: "1h" },
  { label: "4 Jam", value: "4h" },
  { label: "1 Hari", value: "1d" },
];

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
    if (!confirm(`RSI Heatmap Scan ${tfLabel}: Ini akan memindai 50 pair Binance (±20 detik). Lanjutkan?`)) return;
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

  const overbought = signals.filter(s => s.status === 'OVERBOUGHT' && s.symbol.toLowerCase().includes(search.toLowerCase()));
  const oversold = signals.filter(s => s.status === 'OVERSOLD' && s.symbol.toLowerCase().includes(search.toLowerCase()));

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Thermometer className="h-32 w-32 text-rose-600" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-widest mb-2">
             <BarChart3 className="h-4 w-4" /> Market Sentiment
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">RSI HEATMAP</h1>
          <p className="text-sm text-slate-500 mt-2">Mendeteksi koin ekstrem Jenuh Beli (Overbought) & Jenuh Jual (Oversold).</p>
        </div>
        <div className="flex items-center gap-3 relative z-10 font-bold">
           <div className="relative">
              <input 
                type="text" 
                placeholder="Cari..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-10 py-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all w-48 font-bold"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-4 top-4" />
           </div>
          <button 
            onClick={() => fetchSignals()}
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
          >
            <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-rose-500/30 disabled:opacity-50"
          >
            {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            {scanning ? `Analyzing...` : "Re-Scan Market"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* OVERBOUGHT SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-lg font-black text-rose-600 flex items-center gap-2 uppercase tracking-wide">
               🔴 EXTREME OVERBOUGHT
             </h2>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{overbought.length} Coins</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {loading ? (
                <div className="col-span-full p-12 text-center text-slate-400">Loading...</div>
             ) : overbought.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 italic">Tidak ada koin Overbought saat ini.</div>
             ) : overbought.map((s) => (
                <div key={s.nomor} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-rose-100 dark:border-rose-900/30 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all">
                  <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:scale-110 transition-all">
                    <TrendingDown className="h-24 w-24 text-rose-600" />
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="font-black text-slate-900 dark:text-white text-lg">{s.symbol}</div>
                    <div className="px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 text-xs font-black rounded-lg shadow-sm border border-rose-100 dark:border-rose-800">{parseFloat(s.rsi_value).toFixed(2)}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                      <span>RSI Intensity</span>
                      <span className="text-rose-600">CRITICAL</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-rose-600 rounded-full shadow-[0_0_10px_rgba(225,29,72,0.5)]" style={{ width: `${Math.min(100, (parseFloat(s.rsi_value) - 70) * 3.33 + 70)}%` }}></div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <a 
                      href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} target="_blank"
                      className="text-[10px] font-black text-slate-400 hover:text-rose-600 flex items-center gap-1 uppercase tracking-widest"
                    >
                      OPEN CHART <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
             ))}
          </div>
        </section>

        {/* OVERSOLD SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-lg font-black text-emerald-600 flex items-center gap-2 uppercase tracking-wide">
               🟢 EXTREME OVERSOLD
             </h2>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{oversold.length} Coins</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {loading ? (
                <div className="col-span-full p-12 text-center text-slate-400">Loading...</div>
             ) : oversold.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 italic">Tidak ada koin Oversold saat ini.</div>
             ) : oversold.map((s) => (
                <div key={s.nomor} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/30 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all">
                  <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:scale-110 transition-all">
                    <TrendingUp className="h-24 w-24 text-emerald-600" />
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="font-black text-slate-900 dark:text-white text-lg">{s.symbol}</div>
                    <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 text-xs font-black rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-800">{parseFloat(s.rsi_value).toFixed(2)}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                      <span>RSI Intensity</span>
                      <span className="text-emerald-600">POTENTIAL REVERSAL</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-600 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${100 - (parseFloat(s.rsi_value) * 3)}%` }}></div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <a 
                      href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} target="_blank"
                      className="text-[10px] font-black text-slate-400 hover:text-emerald-600 flex items-center gap-1 uppercase tracking-widest"
                    >
                      OPEN CHART <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
             ))}
          </div>
        </section>

      </div>

      {/* Guide Card */}
      <div className="bg-slate-100/50 dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
         <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-widest">
           <Info className="h-4 w-4 text-rose-600" /> RSI Heatmap Logic (RSI 14)
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] leading-relaxed text-slate-500 font-bold">
            <div className="flex gap-4">
              <div className="h-10 w-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl flex items-center justify-center shrink-0"><TrendingDown className="h-5 w-5" /></div>
              <div>
                <span className="text-rose-600 uppercase">Extreme Overbought (RSI {'>'} 70)</span>: Harga telah bergerak naik terlalu cepat secara statistik. Aset ini seringkali mengalami <span className="text-slate-900 dark:text-white italic">pullback</span> atau koreksi harga untuk menyeimbangkan pasar.
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center shrink-0"><TrendingUp className="h-5 w-5" /></div>
              <div>
                <span className="text-emerald-600 uppercase">Extreme Oversold (RSI {'<'} 30)</span>: Harga telah terjun terlalu dalam secara statistik. Aset ini seringkali menunjukkan sinyal <span className="text-slate-900 dark:text-white italic">reversal</span> atau pemulihan harga karena tekanan jual yang mulai jenuh.
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
