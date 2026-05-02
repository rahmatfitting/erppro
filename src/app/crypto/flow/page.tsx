"use client";

import { useState, useEffect } from "react";
import { 
  Zap, 
  RefreshCcw, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  Clock, 
  Crosshair, 
  ShieldCheck, 
  ArrowUpRight,
  ChevronRight,
  Flame,
  Activity,
  BarChart3,
  Waves
} from "lucide-react";

export default function CryptoFlowPage() {
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/flow");
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

  const handleScan = async (symbol: string = 'BTCUSDT') => {
    setScanning(true);
    try {
      const res = await fetch(`/api/crypto/flow/scan?symbol=${symbol}`);
      const data = await res.json();
      if (data.success) {
        alert(`${symbol} Inflow/Outflow Scan Selesai!`);
        fetchData();
      }
    } catch (err) {
      alert("Scan Gagal");
    } finally {
      setScanning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20";
    if (score <= -4) return "text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20";
    return "text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20";
  };

  const getSentimentLabel = (score: number) => {
     if (score < 25) return { label: "EXTREME FEAR", color: "text-rose-500" };
     if (score < 45) return { label: "FEAR", color: "text-orange-500" };
     if (score < 55) return { label: "NEUTRAL", color: "text-slate-500" };
     if (score < 75) return { label: "GREED", color: "text-emerald-500" };
     return { label: "EXTREME GREED", color: "text-emerald-600" };
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Premium Header */}
      <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Activity className="h-64 w-64 text-indigo-500 animate-pulse" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em]">
              <Waves className="h-4 w-4" /> Smart Money Flow Intelligence
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tight">AI Inflow & Outflow</h1>
            <p className="text-sm text-slate-400 font-medium max-w-lg leading-relaxed">
              Mendeteksi akumulasi dan distribusi paus lewat data Inflow/Outflow bursa, dikombinasikan dengan sentimen media sosial dan algoritma berita.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              className="p-4 bg-slate-900 text-slate-400 rounded-2xl hover:bg-slate-800 transition-all border border-slate-800"
            >
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <div className="flex gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
               {['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map(sym => (
                 <button 
                   key={sym}
                   onClick={() => handleScan(sym)}
                   disabled={scanning}
                   className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                 >
                   {scanning ? <RefreshCcw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                   Scan {sym.replace('USDT','')}
                 </button>
               ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 font-black animate-pulse uppercase tracking-widest">Processing Blockchain Flow...</div>
      ) : !latest ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 italic text-slate-400 font-bold">
          Data flow tidak ditemukan. Lakukan scan untuk memulai analisis paus.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Main Intelligence Card */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Latest Flow Snapshot: {new Date(latest.created_at).toLocaleTimeString()}
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                     {latest.symbol} Market Intelligence
                     <span className={`px-3 py-1 rounded-lg text-xs border ${getScoreColor(latest.score)}`}>
                       Composite AI Score: {latest.score}
                     </span>
                  </div>
                </div>
                <div className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl ${latest.bias === 'BULLISH' ? 'bg-emerald-500 text-white' : latest.bias === 'BEARISH' ? 'bg-rose-500 text-white' : 'bg-slate-500 text-white'}`}>
                  {latest.bias} BIAS
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Flow Visualizer */}
                <div className="space-y-6">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Exchange Flow Intensity</h3>
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-rose-500">EXCHANGE INFLOW (DUMP PRESSURE)</span>
                            <span>{Number(latest.inflow).toFixed(1)}%</span>
                         </div>
                         <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div 
                              className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-1000"
                              style={{ width: `${Math.min(latest.inflow, 100)}%` }}
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-emerald-500">EXCHANGE OUTFLOW (ACCUMULATION)</span>
                            <span>{Number(latest.outflow).toFixed(1)}%</span>
                         </div>
                         <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                              style={{ width: `${Math.min(latest.outflow, 100)}%` }}
                            />
                         </div>
                      </div>
                   </div>
                   <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 leading-relaxed uppercase">
                         💡 Status: {latest.outflow > latest.inflow ? "Paus sedang menarik aset ke cold vault. Sinyal Bullish terdeteksi." : "Paus sedang mengirim aset ke bursa. Harap waspada potensi dump."}
                      </p>
                   </div>
                </div>

                {/* Sentiment Gauge Simulation */}
                <div className="flex flex-col items-center justify-center space-y-4">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Retail Sentiment Index</h3>
                   <div className="relative w-48 h-48 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                         <circle
                           cx="96" cy="96" r="80"
                           fill="transparent"
                           stroke="currentColor"
                           strokeWidth="12"
                           className="text-slate-100 dark:text-slate-800"
                         />
                         <circle
                           cx="96" cy="96" r="80"
                           fill="transparent"
                           stroke="currentColor"
                           strokeWidth="12"
                           strokeDasharray={502}
                           strokeDashoffset={502 - (502 * latest.sentiment) / 100}
                           strokeLinecap="round"
                           className={`transition-all duration-1000 ${latest.sentiment < 40 ? 'text-rose-500' : latest.sentiment > 60 ? 'text-emerald-500' : 'text-amber-500'}`}
                         />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{latest.sentiment}</span>
                         <span className={`text-[10px] font-black mt-2 ${getSentimentLabel(latest.sentiment).color}`}>
                           {getSentimentLabel(latest.sentiment).label}
                         </span>
                      </div>
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 text-center uppercase">
                      Berdasarkan Twitter & Reddit Sentiment Analysis
                   </p>
                </div>
              </div>
            </div>
            
            {/* News Stream Layer */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <h3 className="text-xs font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                   <Flame className="h-4 w-4 text-orange-500" /> Fundamental Catalysts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {JSON.parse(latest.reasoning || '[]').filter((r: string) => r.includes('signal:')).map((msg: string, i: number) => (
                     <div key={i} className={`p-4 rounded-2xl border flex items-center gap-4 ${msg.includes('Positive') ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                        {msg.includes('Positive') ? <TrendingUp className="h-5 w-5 shrink-0" /> : <TrendingDown className="h-5 w-5 shrink-0" />}
                        <span className="text-xs font-bold leading-tight uppercase">{msg.replace('Positive signal: ','').replace('Negative signal: ','')}</span>
                     </div>
                   ))}
                </div>
            </div>
          </div>

          {/* Reasoning Sidebar (4 cols) */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm h-full">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-500" /> AI Log Logic
              </h3>
              <div className="space-y-4">
                {JSON.parse(latest.reasoning || '[]').filter((r: string) => !r.includes('signal:')).map((text: string, i: number) => (
                  <div key={i} className="flex gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div className="h-6 w-6 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase">{text}</p>
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
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Global Flow History</h3>
          <span className="text-[10px] font-black text-slate-400 px-4 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full">Archive: {history.length} signals</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                <th className="px-8 py-4">Detection Time</th>
                <th className="px-8 py-4">Symbol</th>
                <th className="px-8 py-4">Bias</th>
                <th className="px-8 py-4">Score</th>
                <th className="px-8 py-4">Sentiment</th>
                <th className="px-8 py-4">Inflow/Outflow</th>
                <th className="px-8 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((h) => (
                <tr key={h.nomor} className="font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                  <td className="px-8 py-5 text-xs text-slate-400 font-medium">
                    {new Date(h.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-8 py-5 font-black text-slate-900 dark:text-white uppercase text-xs tracking-wide">{h.symbol}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black ${
                      h.bias === 'BULLISH' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 
                      h.bias === 'BEARISH' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 
                      'text-slate-400 bg-slate-50 dark:bg-slate-800'
                    }`}>
                      {h.bias}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs font-black">{h.score} pts</td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-extrabold rounded-lg">{h.sentiment} - {getSentimentLabel(h.sentiment).label}</span>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-2">
                        <span className="text-rose-500 text-[9px]">{Number(h.inflow).toFixed(0)}</span>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full bg-slate-400" style={{ width: `${(h.outflow / (h.inflow + h.outflow)) * 100}%` }} />
                        </div>
                        <span className="text-emerald-500 text-[9px]">{Number(h.outflow).toFixed(0)}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <a 
                      href={`https://www.tradingview.com/chart/?symbol=BINANCE:${h.symbol}`} 
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
    </div>
  );
}
