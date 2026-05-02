"use client";
import { useState, useEffect } from "react";
import { 
  Zap, 
  RefreshCcw, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Clock, 
  Target, 
  BarChart3, 
  ArrowUpRight,
  ShieldCheck,
  Info,
  ChevronRight
} from "lucide-react";

export default function XAGUSDScreenerPage() {
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/forex/xagusd");
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
        if (data.data.length > 0) setLatest(data.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/forex/xagusd/scan");
      const data = await res.json();
      if (data.success) {
        alert("XAGUSD Scan Selesai!");
        fetchData();
      }
    } catch (err) {
      alert("Scan Gagal");
    } finally {
      setScanning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10";
    if (score >= 6) return "text-blue-500 bg-blue-50 dark:bg-blue-500/10";
    return "text-slate-500 bg-slate-50 dark:bg-slate-500/10";
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <TrendingUp className="h-40 w-40 text-blue-600" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.25em]">
                <ShieldCheck className="h-4 w-4" /> AI Silver Intelligence
              </div>
              {latest && (
                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${
                  latest.isLive 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                    : "bg-rose-50 text-rose-600 border-rose-200"
                }`}>
                  {latest.isLive ? "● LIVE MARKET" : "○ DEMO DATA"}
                </div>
              )}
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">XAGUSD AI Screener</h1>
            <p className="text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
              Menganalisis probabilitas pergerakan Silver menggunakan integrasi SMC, Liquidity Sweep, dan fundamental news.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
            >
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={handleScan}
              disabled={scanning}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.25rem] font-black text-sm shadow-xl shadow-blue-500/20 flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
              {scanning ? "Analyzing Market..." : "Scan Silver Market"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-black animate-pulse">MEMUAT DATA XAGUSD...</div>
      ) : !latest ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 italic text-slate-400 font-bold">
          Belum ada data hasil scan. Klik "Scan Silver Market" untuk memulai.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Main Signal Card (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative h-full">
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Last Analysis: {new Date(latest.created_at).toLocaleTimeString('id-ID')}
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white uppercase">{latest.setup}</div>
                </div>
                <div className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${getScoreColor(latest.score)}`}>
                  Score: {latest.score}/11
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Current Sentiment</div>
                  <div className={`text-5xl font-black italic flex items-center gap-3 ${latest.bias === 'BUY' ? 'text-emerald-500' : latest.bias === 'SELL' ? 'text-rose-500' : 'text-slate-400'}`}>
                    {latest.bias === 'BUY' ? <TrendingUp className="h-10 w-10" /> : latest.bias === 'SELL' ? <TrendingDown className="h-10 w-10" /> : <Zap className="h-10 w-10" />}
                    {latest.bias}
                  </div>
                  <div className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase ${latest.confidence === 'HIGH' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    Confidence: {latest.confidence}
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  {[
                    { label: "Entry Price", val: latest.entry_price, color: "text-slate-900 dark:text-white" },
                    { label: "Stop Loss", val: latest.stop_loss, color: "text-rose-600" },
                    { label: "Take Profit 1", val: latest.take_profit1, color: "text-emerald-600 font-black" },
                    { label: "Take Profit 2", val: latest.take_profit2, color: "text-emerald-600 font-black" },
                  ].map(p => (
                    <div key={p.label} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{p.label}</div>
                      <div className={`text-xl font-black ${p.color}`}>
                        {p.val !== null && p.val !== undefined ? Number(p.val).toFixed(3) : "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center">
                 <div className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest">
                   System: Silver AI Engine v1.0
                 </div>
                 <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest">
                   ATR (14): {latest.atr ? Number(latest.atr).toFixed(3) : "0.000"} Volatility
                 </div>
                 <div className="ml-auto flex items-center gap-1.5 text-blue-600 font-black text-xs">
                   Session: {latest.session} <ChevronRight className="h-4 w-4" />
                 </div>
              </div>
            </div>
          </div>

          {/* Reasoning Sidebar (4 cols) */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm h-full">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" /> AI Log Reasoning
              </h3>
              <div className="space-y-4">
                {latest.reasoning?.split(' | ').map((text: string, i: number) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Analysis History</h3>
          <div className="text-[10px] font-black text-slate-400">Total: {history.length} Scan Records</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                <th className="px-8 py-4">Time Captured</th>
                <th className="px-8 py-4">Setup</th>
                <th className="px-8 py-4">Bias</th>
                <th className="px-8 py-4">Score</th>
                <th className="px-8 py-4">Conf.</th>
                <th className="px-8 py-4">Entry</th>
                <th className="px-8 py-4">SL</th>
                <th className="px-8 py-4">TP1</th>
                <th className="px-8 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((h) => (
                <tr key={h.nomor} className="font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                  <td className="px-8 py-5 text-xs">
                    {new Date(h.created_at).toLocaleDateString('id-ID')} {new Date(h.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-8 py-5 font-black text-slate-900 dark:text-white uppercase text-xs">{h.setup}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black outline outline-1 ${
                      h.bias === 'BUY' ? 'text-emerald-500 outline-emerald-500/30 bg-emerald-50/50' : 
                      h.bias === 'SELL' ? 'text-rose-500 outline-rose-500/30 bg-rose-50/50' : 
                      'text-slate-400 outline-slate-400/30'
                    }`}>
                      {h.bias}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs">{h.score}/11</td>
                  <td className="px-8 py-5">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black rounded-md">{h.confidence}</span>
                  </td>
                  <td className="px-8 py-5 text-slate-900 dark:text-white">{h.entry_price ? Number(h.entry_price).toFixed(3) : "-"}</td>
                  <td className="px-8 py-5 text-rose-500/80">{h.stop_loss ? Number(h.stop_loss).toFixed(3) : "-"}</td>
                  <td className="px-8 py-5 text-emerald-500/80">{h.take_profit1 ? Number(h.take_profit1).toFixed(3) : "-"}</td>
                  <td className="px-8 py-5 text-right">
                    <a 
                      href={`https://www.tradingview.com/chart/?symbol=OANDA:XAGUSD`} 
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-700 text-xs"
                    >
                      Chart <ArrowUpRight className="h-3 w-3" />
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
        <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2rem] border border-blue-100 dark:border-blue-800">
           <h3 className="text-lg font-black text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
             <Target className="h-5 w-5" /> Gold vs Silver Correlation
           </h3>
           <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed font-bold">
             Silver (XAG) cenderung mengikuti Gold (XAU) namun dengan persentase pergerakan yang lebih tinggi. Konfirmasi sinyal HIGH di Silver seringkali valid jika Gold juga menunjukkan setup yang serupa (Correlation Fusion).
           </p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700">
           <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
             <Info className="h-5 w-5" /> SL Recommendation
           </h3>
           <p className="text-xs text-slate-500 leading-relaxed font-bold">
             Gunakan SL berbasis 2.0x ATR untuk mengakomodasi volatilitas tinggi di Silver. Jika SL terlalu dekat, risiko terkena "Liquidity Sweep" manipulatif sangat besar sebelum target tercapai.
           </p>
        </div>
      </div>
    </div>
  );
}
