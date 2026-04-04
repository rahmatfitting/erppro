"use client";
import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  RefreshCcw, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  ArrowUpRight, 
  Info,
  Award,
  Crown,
  Activity,
  DollarSign
} from "lucide-react";

export default function HedgeFundPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crypto/hedge');
      const data = await res.json();
      if (data.success) setSignals(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSignals(); }, []);

  const handleScan = async () => {
    if (!confirm("Professional Deep Scan: Sistem akan memproses dan merelasikan Volume, Volatility, Sweep, dan SMC untuk mencari TOP 10 Setup Hari ini (±45 detik). Lanjutkan?")) return;
    setScanning(true);
    try {
      const res = await fetch('/api/crypto/hedge/scan');
      const data = await res.json();
      alert(data.message || "Deep Scan selesai");
      fetchSignals();
    } catch (err) {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-10 rounded-[2.5rem] border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
           <Crown className="h-48 w-48 text-amber-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-[0.3em] mb-4">
             <ShieldCheck className="h-5 w-5" /> Institutional Grade Algorithm
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">Hedge Fund Screener</h1>
          <p className="text-lg text-slate-400 mt-4 max-w-2xl font-medium">Daily Top 10 High-Probability setups based on Multi-Factor Scoring: Liquidity Sweep, Volume Expansion, and Market Structure.</p>
          
          <div className="mt-8 flex flex-wrap items-center gap-4">
             <button 
               onClick={handleScan}
               disabled={scanning}
               className="inline-flex items-center gap-3 px-10 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-base font-black transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] disabled:opacity-50"
             >
               {scanning ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Award className="h-5 w-5" />}
               {scanning ? "Deep Analyzing..." : "Run Pro Deep Scan"}
             </button>
             <button 
               onClick={fetchSignals}
               className="p-4 bg-slate-700/50 text-white rounded-2xl border border-slate-600 hover:bg-slate-700 transition-all shadow-xl"
             >
               <RefreshCcw className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </div>
      </div>

      {/* Probability Leaderboard */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
           <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
             <div className="h-10 w-1 rounded-full bg-amber-500"></div>
             🏆 Daily Pro Top 10
           </h2>
           <span className="text-sm font-bold text-slate-400">4-Hour Timeframe Standard</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {loading ? (
             <div className="col-span-full py-20 text-center animate-pulse text-slate-400 font-bold">Calculating institutional probability...</div>
           ) : signals.length === 0 ? (
             <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-slate-400 italic">No Alpha Detected. Run "Pro Deep Scan" to analyze the current market.</div>
           ) : signals.map((s, index) => (
             <div key={s.nomor} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 border-slate-50 dark:border-slate-800 shadow-xl hover:border-amber-500/50 transition-all group relative overflow-hidden">
                {/* Ranking Badge */}
                <div className="absolute top-0 right-0 px-6 py-3 bg-slate-900 text-amber-500 font-black text-xl rounded-bl-[1.5rem] shadow-lg">
                  #{index + 1}
                </div>
                
                <div className="flex items-center gap-6 mb-8">
                  <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center font-black text-2xl text-slate-900 dark:text-white shadow-inner">
                    {s.symbol.substring(0, 3)}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-none mb-2">{s.symbol}</h3>
                    <div className="flex items-center gap-2">
                       <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 text-amber-600 border border-amber-200 dark:border-amber-800`}>
                         {s.status}
                       </span>
                       <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{s.setup}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8 border-y border-slate-100 dark:border-slate-800 py-6">
                   <div className="text-center">
                     <div className="text-[10px] text-slate-400 font-black uppercase mb-1">Score</div>
                     <div className="text-2xl font-black text-slate-900 dark:text-white">{s.score}</div>
                   </div>
                   <div className="text-center">
                     <div className="text-[10px] text-slate-400 font-black uppercase mb-1">Volume (24h)</div>
                     <div className="text-xl font-black text-slate-900 dark:text-white">${(s.volume_24h / 1000000).toFixed(1)}M</div>
                   </div>
                   <div className="text-center">
                     <div className="text-[10px] text-slate-400 font-black uppercase mb-1">Volatility</div>
                     <div className="text-xl font-black text-rose-500 flex items-center justify-center gap-1">
                        {parseFloat(s.volatility) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {Math.abs(s.volatility).toFixed(1)}%
                     </div>
                   </div>
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      {/* Setup Indicators */}
                      {s.setup.includes("Sweep") && <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl" title="Liquidity Sweep Captured"><Target className="h-5 w-5 text-indigo-600" /></div>}
                      {s.setup.includes("CHoCH") && <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-xl" title="Trend Reversal Confirmed"><Activity className="h-5 w-5 text-violet-600" /></div>}
                      {s.setup.includes("FVG") && <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl" title="Entry Gap Available"><Zap className="h-5 w-5 text-amber-500" /></div>}
                   </div>
                   <a 
                     href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} 
                     target="_blank"
                     className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-black transition-all shadow-xl active:scale-95"
                   >
                     Execution Chart <ArrowUpRight className="h-4 w-4" />
                   </a>
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* Scoring Engine Guide */}
      <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
         <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 bg-amber-500 text-slate-900 rounded-2xl flex items-center justify-center shadow-lg"><Info className="h-8 w-8" /></div>
            <div>
               <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Institutional Scoring Engine</h3>
               <p className="text-sm text-slate-500 mt-1">Bagaimana skor probabilitas (0-100) dihitung secara algoritmik.</p>
            </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
               <div className="text-3xl font-black text-slate-900 dark:text-white mb-2">40%</div>
               <div className="text-xs font-black text-amber-600 uppercase mb-3">SMC + Sweep</div>
               <p className="text-[10px] leading-relaxed text-slate-500 font-bold italic">Mendeteksi jebakan likuiditas dan pembalikan struktur tren institusi.</p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
               <div className="text-3xl font-black text-slate-900 dark:text-white mb-2">30%</div>
               <div className="text-xs font-black text-indigo-600 uppercase mb-3">Volume Expansion</div>
               <p className="text-[10px] leading-relaxed text-slate-500 font-bold italic">Memvalidasi partisipasi modal besar (Volume {'>'} $500M benchmark).</p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
               <div className="text-3xl font-black text-slate-900 dark:text-white mb-2">20%</div>
               <div className="text-xs font-black text-rose-600 uppercase mb-3">Volatility Check</div>
               <p className="text-[10px] leading-relaxed text-slate-500 font-bold italic">Mengukur daya ledak harga. Volatilitas tinggi meningkatkan peluang profit.</p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
               <div className="text-3xl font-black text-slate-900 dark:text-white mb-2">10%</div>
               <div className="text-xs font-black text-emerald-600 uppercase mb-3">Entry Efficiency</div>
               <p className="text-[10px] leading-relaxed text-slate-500 font-bold italic">Mengukur jarak saat ini terhadap area koreksi (FVG) untuk efisiensi harga.</p>
            </div>
         </div>
      </div>
    </div>
  );
}
