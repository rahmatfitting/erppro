"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Coins, 
  RefreshCcw, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Info, 
  ShieldCheck, 
  ShieldAlert, 
  Search,
  ArrowRight,
  ExternalLink,
  Timer,
  FileDown
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

export default function FundingFarmingPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(Date.now());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crypto/funding-farming');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch funding data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportToExcel({
      title: "Funding Fee Farming Report",
      subtitle: `Generated: ${new Date().toLocaleString()}`,
      fileName: `Funding_Farming_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Funding Rate", key: "fundingRate", format: (v) => (parseFloat(v) * 100).toFixed(4) + "%" },
        { header: "Mark Price", key: "markPrice", format: (v) => parseFloat(v).toLocaleString() },
        { header: "Recommendation", key: "recommendation" },
        { header: "Market Condition", key: "marketCondition" },
        { header: "Is Extreme", key: "isExtreme", format: (v) => v ? "YES" : "NO" },
        { header: "Next Funding Time", key: "nextFundingTime", format: (v) => new Date(v).toLocaleString('id-ID') },
      ],
      data: filtered,
    });
  };

  useEffect(() => {
    fetchData();
    // Refresh every minute
    const interval = setInterval(fetchData, 60000);
    // Update countdown every second
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  const formatCountdown = (nextTime: number) => {
    const diff = nextTime - now;
    if (diff <= 0) return "PAYMENT IN PROGRESS";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const filtered = useMemo(() => {
    return data.filter(item => 
      item.symbol.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  return (
    <div className="space-y-8 pb-24 min-h-screen">
      
      {/* Dynamic Header Box */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-10 md:p-14 rounded-[48px] border border-slate-800 shadow-2xl relative overflow-hidden group">
        {/* Abstract Background Element */}
        <div className="absolute -top-24 -right-24 h-96 w-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
        <div className="absolute -bottom-24 -left-24 h-96 w-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-1000"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-400 font-black text-[11px] uppercase tracking-[0.4em]">
               <Zap className="h-4 w-4 animate-pulse" /> Advanced Funding Arbitrage
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-tight uppercase italic drop-shadow-sm">
              Funding <span className="text-indigo-400">Farming</span>
            </h1>
            <p className="text-slate-400 max-w-xl font-medium leading-relaxed text-sm md:text-base">
              Identifikasi koin dengan <span className="text-white font-bold italic">Funding Rate Extreme</span>. Strategi: Masuk posisi 1-3 menit sebelum funding untuk menerima fee, lalu keluar segera setelah pembayaran diproses.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="px-6 py-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Status Scan</span>
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Live Monitoring</span>
                </div>
                <div className="h-8 w-[2px] bg-slate-800"></div>
                <button 
                  onClick={fetchData} 
                  disabled={loading}
                  className="p-2 transition-all hover:rotate-180 text-slate-400 hover:text-white"
                >
                  <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
                <button 
                  onClick={handleExport}
                  className="p-2 transition-all text-slate-400 hover:text-white"
                  title="Export Excel"
                  disabled={filtered.length === 0}
                >
                  <FileDown className="h-5 w-5" />
                </button>
            </div>
            <div className="flex gap-2">
                <div className="px-5 py-2 bg-rose-500/10 rounded-full border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-wider">
                    High Risk: Impulsive
                </div>
                <div className="px-5 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                    Ready: Sideways
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Filter & Stats */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-6 overflow-x-auto w-full md:w-auto pb-2">
              <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 min-w-[180px]">
                  <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                      <Coins className="h-5 w-5" />
                  </div>
                  <div>
                      <div className="text-[10px] font-black text-slate-500 uppercase">Opportunities</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">{filtered.length} Pairs</div>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 min-w-[200px]">
                  <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                      <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                      <div className="text-[10px] font-black text-slate-500 uppercase">Extreme (&gt;0.5%)</div>
                      <div className="text-lg font-black text-rose-500">{filtered.filter(i => i.isExtreme).length} Alerts</div>
                  </div>
              </div>
          </div>

          <div className="relative w-full md:w-72 group">
              <input 
                type="text" 
                placeholder="Search Symbol..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-12 py-4 rounded-3xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              />
              <Search className="h-5 w-5 text-slate-400 absolute left-4 top-4 group-focus-within:text-indigo-500 transition-colors" />
          </div>
      </div>

      {/* Main Grid */}
      {loading && filtered.length === 0 ? (
        <div className="py-40 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="h-20 w-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-500">
                    <Zap className="h-8 w-8" />
                </div>
            </div>
            <div className="text-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Scanning Futures Market...</h3>
                <p className="text-slate-500 font-medium italic mt-2 uppercase text-[10px] tracking-widest">Fetching Premium Index & Volatility Data</p>
            </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-40 bg-slate-50 dark:bg-slate-900/50 rounded-[48px] border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-4 mx-4">
            <ShieldCheck className="h-16 w-16 text-slate-300 dark:text-slate-700" />
            <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase transition-all">Market Sedang Stabil</h3>
                <p className="text-slate-500 font-bold max-w-sm mt-3 uppercase text-[10px] tracking-widest leading-loose">Tidak ditemukan koin dengan funding rate di atas threshold 0.01% saat ini.</p>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
            {filtered.map((item) => {
                const isPositive = item.fundingRate > 0;
                const timeLeft = item.nextFundingTime - now;
                const isReady = timeLeft <= 3 * 60 * 1000 && timeLeft > 0; // Less than 3 mins
                const isImpulsive = item.marketCondition === 'IMPULSIVE';
                const isSideways = item.marketCondition === 'SIDEWAYS';

                return (
                  <div key={item.symbol} className={`relative bg-white dark:bg-slate-900 p-8 rounded-[40px] border-2 transition-all transition-duration-500 group overflow-hidden ${item.isExtreme ? 'border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                    
                    {/* Header: Symbol & Action Badge */}
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">{item.symbol}</h2>
                                {item.isExtreme && (
                                    <div className="px-2 py-1 bg-indigo-500 text-white text-[8px] font-black rounded-lg uppercase animate-pulse">Extreme</div>
                                )}
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ExternalLink className="h-3 w-3" /> Binance Futures
                            </div>
                        </div>
                        <div className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs transition-all ${isPositive ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                            {isPositive ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                            {item.recommendation}
                        </div>
                    </div>

                    {/* Stats Box */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 group-hover:bg-indigo-500/5 transition-colors">
                            <div className="text-[9px] font-black text-slate-400 uppercase mb-2">Funding Rate</div>
                            <div className={`text-xl font-black ${(item.fundingRate * 100).toFixed(4).startsWith('-') ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {(item.fundingRate * 100).toFixed(4)}%
                            </div>
                        </div>
                        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                            <div className="text-[9px] font-black text-slate-400 uppercase mb-2">Mark Price</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">
                                {item.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </div>
                        </div>
                    </div>

                    {/* Countdown & Market State */}
                    <div className="space-y-4">
                        <div className={`flex items-center justify-between p-5 rounded-[28px] border-2 transition-all ${isReady ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-500 ring-4 ring-rose-500/10' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-3">
                                <Timer className={`h-5 w-5 ${isReady ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
                                <div className="space-y-1">
                                    <div className="text-[8px] font-black text-slate-400 uppercase">Time to Payout</div>
                                    <div className={`text-xs font-black ${isReady ? 'text-rose-600' : 'text-slate-600 dark:text-slate-400'}`}>{formatCountdown(item.nextFundingTime)}</div>
                                </div>
                            </div>
                            {isReady && <div className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Ready Entry!</div>}
                        </div>

                        <div className="flex items-center justify-between p-4 px-6 rounded-[24px] bg-slate-900 text-white transition-all hover:pr-4 group/btn">
                             <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full animate-ping ${isImpulsive ? 'bg-rose-500' : isSideways ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                <div className="text-[10px] font-black uppercase tracking-widest">{item.marketCondition}</div>
                             </div>
                             <a 
                               href={`https://www.binance.com/en/futures/${item.symbol}`} 
                               target="_blank" 
                               className="flex items-center gap-2 text-[10px] font-black text-indigo-400 group-hover/btn:text-white transition-colors"
                             >
                                TRADE NOW <ArrowRight className="h-3 w-3" />
                             </a>
                        </div>
                    </div>

                    {/* Logic Tip Hidden Background Overlay */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-[0.02] pointer-events-none transition-opacity duration-1000 scale-150">
                        <Coins className="h-64 w-64" />
                    </div>
                  </div>
                );
            })}
        </div>
      )}

      {/* Strategy Guide */}
      <div className="bg-slate-50 dark:bg-slate-950 p-12 rounded-[56px] border border-slate-200 dark:border-slate-800 mx-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 text-slate-200 dark:text-slate-800 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <Zap className="h-32 w-32" />
          </div>
          <div className="relative z-10">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-10 flex items-center gap-4 uppercase italic tracking-tighter">
                  <span className="h-10 w-10 bg-indigo-500 text-white rounded-2xl flex items-center justify-center italic">!</span>
                  Pro-Trader Strategy Guide
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 font-bold text-xs uppercase tracking-widest leading-loose">
                  <div className="space-y-6">
                      <div className="text-indigo-500 font-black text-4xl italic">01</div>
                      <div className="text-slate-500 border-l-4 border-indigo-500 pl-6">
                          <span className="text-slate-900 dark:text-white font-black">Entry Timing:</span><br />
                          Jangan masuk terlalu awal agar tidak terkena volatilitas yang tidak perlu. Target entry ideal adalah <span className="text-indigo-400">1-3 menit sebelum funding.</span> 
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div className="text-indigo-500 font-black text-4xl italic">02</div>
                      <div className="text-slate-500 border-l-4 border-indigo-500 pl-6">
                          <span className="text-slate-900 dark:text-white font-black">Position Size:</span><br />
                          Gunakan leverage rendah (max 5x-10x) karena volatilitas sering meningkat drastis menjelang pergantian jam funding.
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div className="text-indigo-500 font-black text-4xl italic">03</div>
                      <div className="text-slate-500 border-l-4 border-indigo-500 pl-6">
                          <span className="text-slate-900 dark:text-white font-black">Fast Exit:</span><br />
                          Target exit adalah <span className="text-rose-500 font-black">10-60 detik</span> setelah fee diterima. Jika koin <span className="italic">Impulsive</span>, pertimbangkan untuk segera keluar terlepas dari profit/loss.
                      </div>
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
}
