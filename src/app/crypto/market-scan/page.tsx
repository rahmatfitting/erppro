"use client";
import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  RefreshCcw, 
  Search, 
  Zap, 
  Crosshair, 
  ShieldAlert, 
  Target, 
  Layers, 
  Info,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  Waves,
  FileDown
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

const TIMEFRAMES = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
];

export default function MarketScanPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [timeframe, setTimeframe] = useState("1h");
  const [rotation, setRotation] = useState("NEUTRAL");

  const fetchSignals = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/market-scan?interval=${tf}`);
      const data = await res.json();
      if (data.success) {
        setSignals(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSignals(); }, [timeframe]);

  const handleScan = async () => {
    if (!confirm(`Mulai Master AI Scan (Top 50 Binance pairs)? Ini akan memakan waktu ±45 detik.`)) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/crypto/market-scan/scan?interval=${timeframe}`);
      const data = await res.json();
      if (data.success) {
        setRotation(data.rotation);
        alert(data.message);
        fetchSignals();
      }
    } catch (err) {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  const handleExport = () => {
    if (signals.length === 0) return;
    exportToExcel({
      title: "Market AI Scan Report",
      subtitle: `Timeframe: ${timeframe} | Generated: ${new Date().toLocaleString()}`,
      fileName: `Market_Scan_${timeframe}_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Category", key: "category" },
        { header: "Master Score", key: "score" },
        { header: "Setup Type", key: "setup" },
        { header: "Rotation", key: "rotation" },
        { header: "Entry Price", key: "entry", format: (v) => parseFloat(v).toLocaleString() },
        { header: "Stop Loss", key: "stop_loss", format: (v) => parseFloat(v).toLocaleString() },
        { header: "Take Profit 1", key: "tp1", format: (v) => parseFloat(v).toLocaleString() },
      ],
      data: signals,
    });
  };

  const snipers = signals.filter(s => s.category === 'SNIPER');
  const strong = signals.filter(s => s.category === 'Strong');

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Header / Stats Navigation */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Title & Rotation Card */}
        <div className="flex-1 bg-gradient-to-br from-indigo-900 to-indigo-950 p-8 rounded-[2rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Zap className="h-48 w-48 text-indigo-400" />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-indigo-500/30">
               <Zap className="h-3 w-3" /> Master Flow AI System
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter leading-none mb-2">Market Scanner <span className="text-indigo-400">V2.0</span></h1>
            <p className="text-indigo-200/60 font-medium max-w-md">Combining Momentum, Money Rotation, and SMC Filters to rank high-conviction sniper entries.</p>
            
            <div className="mt-8 flex items-center gap-8">
               <div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    Money Rotation
                  </div>
                  <div className={`text-2xl font-black transition-all ${rotation === 'ALTSEASON' ? 'text-green-400' : rotation === 'BTC_DOMINANCE' ? 'text-amber-400' : 'text-indigo-200'}`}>
                    {rotation === 'ALTSEASON' ? '🚀 ALTSEASON' : rotation === 'BTC_DOMINANCE' ? '🟠 BTC DOM' : '⚪ NEUTRAL'}
                  </div>
               </div>
               <div className="h-10 w-[1px] bg-indigo-500/20"></div>
               <div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">AI Confirmed</div>
                  <div className="text-2xl font-black text-white">{snipers.length + strong.length} <span className="text-xs text-indigo-500">Setups</span></div>
               </div>
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="lg:w-72 flex flex-col gap-4">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm grow flex flex-col justify-between">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">Active Timeframe</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIMEFRAMES.map(tf => (
                    <button 
                      key={tf.value}
                      onClick={() => setTimeframe(tf.value)}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition-all border ${timeframe === tf.value ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:border-indigo-400'}`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                {scanning && (
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] font-bold text-indigo-500 mb-1">
                       <span>SCANNING MARKET AI...</span>
                       <span>PROGRESSIVE</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-600 animate-progress-fast"></div>
                    </div>
                  </div>
                )}
                <button 
                  onClick={handleScan}
                  disabled={scanning}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {scanning ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Crosshair className="h-5 w-5" />}
                  {scanning ? "SYSTEM SCANNING..." : "SCAN MARKET"}
                </button>
                <button 
                  onClick={handleExport}
                  disabled={signals.length === 0 || scanning}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 border border-slate-200 dark:border-slate-700 mt-2"
                >
                  <FileDown className="h-5 w-5" />
                  EXPORT EXCEL
                </button>
              </div>
           </div>
        </div>
      </div>

      {/* Top Momentum (Bubbles) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {signals.slice(0, 6).map((s, i) => (
          <div key={s.symbol} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all cursor-default">
             <div className={`absolute -top-4 -right-4 h-16 w-16 opacity-5 rounded-full blur-xl group-hover:opacity-20 transition-all ${s.category === 'SNIPER' ? 'bg-indigo-500' : 'bg-green-500'}`}></div>
             <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-[10px]">
                  #{i+1}
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${s.category === 'SNIPER' ? 'bg-red-500 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-400'}`}>
                  {s.category}
                </div>
             </div>
             <div className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">{s.symbol.replace('USDT','')}</div>
             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">BINANCE USDT</div>
             <div className="flex items-center justify-between">
                <div className="text-lg font-black text-slate-900 dark:text-white">{s.score} <span className="text-[10px] text-slate-400">pts</span></div>
                <div className="flex gap-1">
                   {s.is_explosion && <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />}
                   {s.has_fvg && <Waves className="h-3 w-3 text-blue-500" />}
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Ranked Signals Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                 <Layers className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg leading-none">Ranked AI Setups</h3>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Sorting by AI Intensity Score</p>
              </div>
           </div>
           <button onClick={() => fetchSignals()} className="text-slate-400 hover:text-indigo-600 transition-all p-2">
              <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5">Symbol</th>
                <th className="px-8 py-5 text-center">Master Score</th>
                <th className="px-8 py-5 text-center">Setup Type</th>
                <th className="px-8 py-5 text-center">AI Insights</th>
                <th className="px-8 py-5">Decision Levels</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold">Scanning Neural Market Data...</td></tr>
              ) : signals.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold">No Sniper Setups Found. Trigger a scan to detect momentum.</td></tr>
              ) : (
                signals.map((s) => (
                  <tr key={s.nomor} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-sm bg-gradient-to-br ${s.category === 'SNIPER' ? 'from-red-500 to-red-700 text-white' : 'from-indigo-500 to-indigo-700 text-white'}`}>
                             {s.symbol.substring(0, 2)}
                          </div>
                          <div>
                            <div className="text-slate-900 dark:text-white font-black text-lg leading-none mb-1">{s.symbol}</div>
                            <div className={`text-[10px] font-black uppercase tracking-tighter ${s.rotation === 'ALTSEASON' ? 'text-green-500' : 'text-slate-400'}`}>{s.rotation}</div>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <div className="flex flex-col items-center">
                          <div className={`text-3xl font-black mb-1 ${s.score >= 13 ? 'text-red-500' : s.score >= 9 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                            {s.score}
                          </div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.category}</div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center font-black text-xs text-slate-500 dark:text-slate-400">
                       <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl inline-block max-w-[200px] truncate">
                         {s.setup}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-wrap justify-center gap-2">
                          {s.is_explosion && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-1.5 rounded-lg"><Zap className="h-4 w-4" /></span>}
                          {s.has_sweep && <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-1.5 rounded-lg"><Target className="h-4 w-4" /></span>}
                          {s.has_bos && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 p-1.5 rounded-lg"><TrendingUp className="h-4 w-4" /></span>}
                          {s.has_fvg && <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 p-1.5 rounded-lg"><Waves className="h-4 w-4" /></span>}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-black text-sm">
                             <ArrowUpRight className="h-3 w-3" /> {parseFloat(s.entry).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px]">
                             <ShieldAlert className="h-3 w-3 text-red-500" /> SL: {parseFloat(s.stop_loss).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 text-indigo-500 font-bold text-[10px]">
                             <Target className="h-3 w-3" /> TP1: {parseFloat(s.tp1).toLocaleString()}
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <a 
                         href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} 
                         target="_blank"
                         className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all inline-block"
                       >
                         <ExternalLink className="h-5 w-5" />
                       </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Footnote */}
      <div className="bg-slate-100/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-8">
         <div className="flex gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl h-fit">
               <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
            <div>
               <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest mb-2">Noise Filter</h4>
               <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Scoring di bawah 6 dianggap Noise dan disembunyikan untuk menjaga fokus pada peluang valid saja.</p>
            </div>
         </div>
         <div className="flex gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl h-fit">
               <Crosshair className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
               <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest mb-2">Precision Levels</h4>
               <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Entry SL TP dihitung otomatis menggunakan algoritma Mean Reversion FVG dan Order Block mapping.</p>
            </div>
         </div>
         <div className="flex gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl h-fit">
               <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
               <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest mb-2">Neural Scan</h4>
               <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Sistem memeriksa 50 coin dengan volume tertinggi di Binance untuk memastikan likuiditas entry yang cukup.</p>
            </div>
         </div>
         <div className="flex gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-2xl h-fit">
               <Layers className="h-5 w-5 text-green-600" />
            </div>
            <div>
               <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest mb-2">SMC Confluence</h4>
               <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Sniper rank diperoleh ketika terjadi confluence antara Liquidity Sweep, BOS, dan Explosion secara bersamaan.</p>
            </div>
         </div>
      </div>
    </div>
  );
}
