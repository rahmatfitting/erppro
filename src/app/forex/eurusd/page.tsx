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
  ChevronRight,
  Globe
} from "lucide-react";

export default function EURUSDScreenerPage() {
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/forex/eurusd");
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
      const res = await fetch("/api/forex/eurusd/scan");
      const data = await res.json();
      if (data.success) {
        alert("EURUSD Scan Selesai!");
        fetchData();
      }
    } catch (err) {
      alert("Scan Gagal");
    } finally {
      setScanning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10";
    if (score >= 6) return "text-blue-500 bg-blue-50 dark:bg-blue-500/10";
    return "text-slate-500 bg-slate-50 dark:bg-slate-500/10";
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Globe className="h-40 w-40 text-indigo-600" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.25em]">
                <ShieldCheck className="h-4 w-4" /> AI Major Forex Intelligence
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
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">EURUSD AI Screener</h1>
            <p className="text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
              Analisis matematis untuk EURUSD menggunakan penggabungan algoritma SMC (Smart Money Concepts), deteksi likuiditas, dan sentimen fundamental.
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
              className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[1.25rem] font-black text-sm shadow-xl shadow-indigo-500/20 flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
              {scanning ? "Analyzing FX Market..." : "Scan Major Pair"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-black animate-pulse">MENARIK DATA EURUSD...</div>
      ) : !latest ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 italic text-slate-400 font-bold">
          Belum ada rekaman analisis. Mulai scan pertama Anda sekarang.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Main Signal Card (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative h-full">
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Timestamp: {new Date(latest.created_at).toLocaleTimeString('id-ID')}
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white uppercase">{latest.setup}</div>
                </div>
                <div className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${getScoreColor(latest.score)}`}>
                  AI Score: {latest.score}/11
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">Market Sentiment Bias</div>
                    <div className={`text-5xl font-black flex items-center gap-3 ${latest.bias === 'BUY' ? 'text-emerald-500' : latest.bias === 'SELL' ? 'text-rose-500' : 'text-slate-400'}`}>
                      {latest.bias === 'BUY' ? 'BUY' : latest.bias === 'SELL' ? 'SELL' : 'WAIT'}
                    </div>
                  </div>
                  <div className={`inline-flex px-4 py-1.5 rounded-xl text-[10px] font-extrabold uppercase ${latest.confidence === 'HIGH' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    Confidence: {latest.confidence}
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  {[
                    { label: "Entry Zone", val: latest.entry_price, color: "text-slate-900 dark:text-white" },
                    { label: "Stop Loss (1.5x ATR)", val: latest.stop_loss, color: "text-rose-600" },
                    { label: "Take Profit 1 (Target)", val: latest.take_profit1, color: "text-indigo-600 font-black" },
                    { label: "Take Profit 2 (Runner)", val: latest.take_profit2, color: "text-indigo-600 font-black" },
                  ].map(p => (
                    <div key={p.label} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{p.label}</div>
                      <div className={`text-xl font-black ${p.color}`}>
                        {p.val !== null && p.val !== undefined ? Number(p.val).toFixed(5) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center">
                 <div className="px-5 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                   Model: ForexMajor Engine
                 </div>
                 <div className="px-5 py-2.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                   ATR Flux: {latest.atr ? Number(latest.atr).toFixed(5) : "0.00000"}
                 </div>
                 <div className="ml-auto flex items-center gap-2 text-indigo-600 font-black text-xs">
                   Active Session: {latest.session} <ChevronRight className="h-4 w-4" />
                 </div>
              </div>
            </div>
          </div>

          {/* Reasoning Sidebar (4 cols) */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm h-full">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" /> Deep Analysis Logs
              </h3>
              <div className="space-y-4">
                {latest.reasoning?.split(' | ').map((text: string, i: number) => (
                  <div key={i} className="flex gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div className="h-6 w-6 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
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

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Signal History Log</h3>
          <span className="text-[10px] font-black text-slate-400 px-4 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full">Archive: {history.length} signals</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                <th className="px-8 py-4">Detection Time</th>
                <th className="px-8 py-4">Setup Type</th>
                <th className="px-8 py-4">Bias</th>
                <th className="px-8 py-4">Score</th>
                <th className="px-8 py-4">Confidence</th>
                <th className="px-8 py-4">Price Zone</th>
                <th className="px-8 py-4 text-right">External</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((h) => (
                <tr key={h.nomor} className="font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                  <td className="px-8 py-5 text-xs text-slate-400 font-medium">
                    {new Date(h.created_at).toLocaleDateString('id-ID')} · {new Date(h.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-8 py-5 font-black text-slate-900 dark:text-white uppercase text-xs tracking-wide">{h.setup}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black ${
                      h.bias === 'BUY' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 
                      h.bias === 'SELL' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 
                      'text-slate-400 bg-slate-50'
                    }`}>
                      {h.bias}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs font-black">{h.score}/11</td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-extrabold rounded-lg">{h.confidence}</span>
                  </td>
                  <td className="px-8 py-5 text-slate-900 dark:text-white font-black">{h.entry_price ? Number(h.entry_price).toFixed(5) : "—"}</td>
                  <td className="px-8 py-5 text-right">
                    <a 
                      href={`https://www.tradingview.com/chart/?symbol=FX:EURUSD`} 
                      target="_blank"
                      className="inline-flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-indigo-500 hover:text-indigo-700 transition-all"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide & Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem]">
           <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">Pair Volatility</h3>
              <Globe className="h-5 w-5 text-slate-600" />
           </div>
           <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
             EURUSD cenderung bergerak lebih teratur dibanding Gold/Silver. Sinyal "Confidence: HIGH" pada pair ini didukung oleh volume transaksi terbesar di dunia mata uang.
           </p>
        </div>
        <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem]">
           <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-100">Stop Loss Logic</h3>
              <Target className="h-5 w-5 text-indigo-300" />
           </div>
           <p className="text-[11px] text-indigo-100 leading-relaxed font-bold">
             Kami menggunakan multipier 1.5x ATR. Cukup untuk menahan fluktuasi normal namun tetap menjaga Risk/Reward yang efisien (minimal 1:2).
           </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
           <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Asian Accumulation</h3>
              <Zap className="h-5 w-5 text-amber-500" />
           </div>
           <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
             Jika range harga di sesi Asia sangat sempit, perhatikan potensi breakout manipulatif di awal sesi London (Killzone) untuk mencari peluang entry.
           </p>
        </div>
      </div>
    </div>
  );
}
