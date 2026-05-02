"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  RefreshCcw,
  Zap,
  Target,
  ShieldCheck,
  Clock,
  Info,
  ArrowUpRight,
  ChevronDown,
  Globe,
  BarChart3,
  Crosshair,
  AlertTriangle,
  Flame,
} from "lucide-react";

const SCORE_PARS = [
  { factor: "Liquidity Sweep", max: 4, icon: Zap },
  { factor: "Market Structure (BOS)", max: 3, icon: TrendingUp },
  { factor: "Killzone Active", max: 2, icon: Clock },
  { factor: "Asian Range Expansion", max: 2, icon: Target },
  { factor: "No High Impact News", max: 2, icon: ShieldCheck },
];

export default function XAUUSDScreenerPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/forex/xauusd");
      const data = await res.json();
      if (data.success) setHistory(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleScan = async () => {
    if (!confirm("AI Screener XAUUSD: Analisis Struktur, Likuiditas, Killzone, dan News XAUUSD (±10 detik). Lanjutkan?")) return;
    setScanning(true);
    try {
      const res = await fetch("/api/forex/xauusd/scan");
      const data = await res.json();
      if (data.success) {
        alert("Scan Berhasil!");
        fetchHistory();
      } else {
        alert("Scan Gagal: " + data.error);
      }
    } catch {
      alert("Scan Gagal");
    } finally {
      setScanning(false);
    }
  };

  const latest = history[0];

  return (
    <div className="space-y-8 pb-16">
      {/* Premium Header */}
      <div className="relative bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 p-10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/30 backdrop-blur-md rounded-full text-white font-black text-[10px] uppercase tracking-widest">
                <Crosshair className="h-3.5 w-3.5" /> Hedge Fund Strategy Engine
              </div>
              {latest && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 backdrop-blur-md rounded-full text-white font-black text-[8px] uppercase tracking-widest border ${
                  latest.isLive 
                    ? "bg-emerald-500/30 border-emerald-400/50" 
                    : "bg-rose-500/30 border-rose-400/50"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${latest.isLive ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                  {latest.isLive ? "LIVE Market" : "Demo Data"}
                </div>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-none uppercase tracking-tighter">
              AI Screener <span className="text-amber-100">XAUUSD</span>
            </h1>
            <p className="text-amber-50 mt-4 text-sm font-bold opacity-90 leading-relaxed">
              Mendeteksi setup probabilitas tinggi di Gold menggunakan fusi SMC (Structure & Liquidity), 
              Killzone Dynamics, dan News Risk Filtering.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => fetchHistory()}
              className="p-4 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl text-white transition-all shadow-lg border border-white/20"
            >
              <RefreshCcw className={`h-6 w-6 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="px-10 py-4 bg-white hover:bg-amber-50 text-amber-600 rounded-2xl font-black text-sm uppercase shadow-2xl transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-4 w-4 animate-spin text-amber-600" /> : <Zap className="h-4 w-4 fill-amber-600" />}
              {scanning ? "Analyzing XAU..." : "Scan Gold"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Menganalisis Pasar Emas...</p>
        </div>
      ) : latest ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Main Signal Dashboard (8 cols) */}
          <div className="xl:col-span-8 space-y-8">
            
            {/* Top Score & Bias Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-10">
                
                {/* Score Circular Gauge */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent"
                      strokeDasharray={440}
                      strokeDashoffset={440 - (latest.score / 13) * 440}
                      strokeLinecap="round"
                      className="text-amber-500 transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                    <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{latest.score}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Score / 13</span>
                  </div>
                </div>

                {/* Bias Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`px-5 py-2 rounded-2xl font-black text-xs uppercase tracking-widest ${
                      latest.bias === 'BUY' ? 'bg-emerald-500 text-white' : 
                      latest.bias === 'SELL' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {latest.bias} {latest.bias !== 'WAIT' ? 'SIGNAL' : ''}
                    </div>
                    <div className={`px-5 py-2 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700`}>
                      {latest.confidence} CONFIDENCE
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight uppercase">
                    {latest.setup}
                  </h2>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                      <Clock className="h-4 w-4 text-amber-500" /> {latest.session} Session
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                      <BarChart3 className="h-4 w-4 text-amber-500" /> Gold (Spot)
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown Bars */}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 dark:border-slate-800 pt-8">
                {SCORE_PARS.map(s => {
                  const hasReason = latest.reasoning.toLowerCase().includes(s.factor.split(' ')[0].toLowerCase());
                  const val = hasReason ? s.max : 0;
                  return (
                    <div key={s.factor} className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span className="flex items-center gap-1.5"><s.icon className="h-3 w-3" /> {s.factor}</span>
                        <span className={val > 0 ? "text-amber-500" : "text-slate-300"}>{val} / {s.max} PTS</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${val > 0 ? "bg-amber-500" : "bg-transparent"}`} style={{ width: `${(val / s.max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Entry Recommendations (The Meat) */}
            <div className={`p-8 rounded-[2.5rem] border-2 shadow-xl ${
              latest.bias === 'BUY' ? "border-emerald-200 bg-emerald-50/30" : "border-rose-200 bg-rose-50/30"
            }`}>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" /> Trading Parameters
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Entry Price", val: latest.entry_price, color: "text-slate-900 dark:text-white" },
                  { label: "Stop Loss", val: latest.stop_loss, color: "text-rose-600" },
                  { label: "Take Profit 1 (1:2)", val: latest.take_profit1, color: "text-emerald-600 font-black" },
                  { label: "Take Profit 2 (1:3)", val: latest.take_profit2, color: "text-emerald-600 font-black" },
                ].map(p => (
                  <div key={p.label} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{p.label}</div>
                    <div className={`text-xl font-black ${p.color}`}>
                      {p.val !== null && p.val !== undefined ? Number(p.val).toFixed(2) : "N/A"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-4 items-center">
                 <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                   Risk:Reward — 1:2.0 / 1:3.0
                 </div>
                 <div className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest">
                   ATR (14): {latest.atr ? Number(latest.atr).toFixed(2) : "0.00"} Volatility
                 </div>
              </div>
            </div>
            
          </div>

          {/* Reasoning & Flow (4 cols) */}
          <div className="xl:col-span-4 space-y-8">
            
            {/* Reasoning List */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm h-full">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> AI Logic Insights
              </h3>
              <div className="space-y-4">
                {latest.reasoning.split(' | ').map((r: string, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>

              {/* Visual Flow Pipeline */}
              <div className="mt-12 space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">AI Analysis Pipeline</h4>
                <div className="flex flex-col items-center gap-2">
                   {["Structure", "Liquidity", "Session", "Scoring"].map((step, i) => (
                     <div key={step} className="flex flex-col items-center gap-2">
                        <div className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                          i < (latest.score / 3) 
                          ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30" 
                          : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}>
                          {step}
                        </div>
                        {i < 3 && <div className="h-4 w-[2px] bg-slate-200 dark:bg-slate-800" />}
                     </div>
                   ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
           <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
           <p className="text-slate-400 font-bold italic">Belum ada hasil analisis. Klik "Scan Gold" untuk memulai.</p>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Analysis History</h3>
          <div className="text-xs font-black text-slate-400 underline cursor-pointer">Export PDF</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                {["Date", "Session", "Score", "Bias", "Confidence", "Entry", "Result"].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                    {new Date(h.created_at).toLocaleString("id-ID", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase text-xs">{h.session}</td>
                  <td className="px-6 py-4">
                    <span className="font-black text-amber-500">{h.score}/13</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-black text-[10px] uppercase tracking-widest ${h.bias === 'BUY' ? 'text-emerald-500' : h.bias === 'SELL' ? 'text-rose-500' : 'text-slate-400'}`}>
                      {h.bias}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black rounded-md">{h.confidence}</span>
                  </td>
                  <td className="px-6 py-4 font-black">
                    {h.entry_price ? `$${Number(h.entry_price).toFixed(2)}` : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <ArrowUpRight className="h-4 w-4 text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logic Guide / Strategy Board */}
      <div className="bg-slate-950 text-white p-12 rounded-[3.5rem] relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full" />
        <h3 className="text-xl font-black uppercase tracking-[0.2em] text-amber-500 mb-8 flex items-center gap-2">
          <Flame className="h-6 w-6" /> The Golden Strategy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-slate-400">
           <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-4">
              <div className="text-3xl">🛡️</div>
              <div className="font-black text-white uppercase tracking-widest">1. Liquidity First</div>
              <p className="font-medium leading-relaxed opacity-70">Gold adalah instrumen paling manipulatif. Kami tidak entry jika belum ada "Sweep" Swing High/Low sebelumnya — tempat retail meletakkan Stop Loss.</p>
           </div>
           <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-4">
              <div className="text-3xl">⚖️</div>
              <div className="font-black text-white uppercase tracking-widest">2. Bias Confirmation</div>
              <p className="font-medium leading-relaxed opacity-70">Structure (BOS/CHoCH) harus searah dengan Fundamental Bias (Dollar Strength). Kami menggabungkan keduanya untuk konfirmasi entry.</p>
           </div>
           <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-4">
              <div className="text-3xl">⌛</div>
              <div className="font-black text-white uppercase tracking-widest">3. Time is Liquidity</div>
              <p className="font-medium leading-relaxed opacity-70">Volatilitas tinggi terjadi di Killzones. Volume Asia seringkali palsu. London & NY Expansion adalah target utama kami.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
