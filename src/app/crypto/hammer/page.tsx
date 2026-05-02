"use client";
import { useState, useEffect } from "react";
import { 
  Zap, 
  RefreshCcw, 
  TrendingDown, 
  Target, 
  ArrowRight,
  Search,
  ShieldCheck,
  ShieldAlert,
  Info,
  Layers,
  Binoculars,
  ChevronRight,
  Navigation,
  FileDown
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

const TIMEFRAMES = [
  { label: "15 Menit", value: "15m" },
  { label: "1 Jam", value: "1h" },
  { label: "4 Jam", value: "4h" },
];

export default function HammerReversalPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [timeframe, setTimeframe] = useState("15m");
  const [search, setSearch] = useState("");

  const fetchSignals = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/hammer?timeframe=${tf}`);
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
    setScanning(true);
    try {
      const res = await fetch(`/api/crypto/hammer/scan?interval=${timeframe}`);
      const data = await res.json();
      alert(data.message || "Hammer Scan Selesai");
      fetchSignals();
    } catch (err) {
      alert("Scan Gagal");
    } finally {
      setScanning(false);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportToExcel({
      title: "Hammer Reversal Opportunities",
      subtitle: `Timeframe: ${TIMEFRAMES.find(t => t.value === timeframe)?.label} | Generated: ${new Date().toLocaleString()}`,
      fileName: `Hammer_Reversal_${timeframe}_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Confidence", key: "confidence" },
        { header: "Pattern", key: "pattern" },
        { header: "Zone", key: "zone" },
        { header: "Trend", key: "trend" },
        { header: "Entry Price", key: "entry_price", format: (v) => parseFloat(v).toLocaleString() },
        { header: "Stop Loss", key: "stop_loss", format: (v) => parseFloat(v).toLocaleString() },
        { header: "Take Profit", key: "take_profit", format: (v) => parseFloat(v).toLocaleString() },
      ],
      data: filtered,
    });
  };

  const filtered = signals.filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 pb-32">
      
      {/* Timeframe Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-fit shadow-inner">
        {TIMEFRAMES.map((tf) => (
          <button 
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`px-8 py-3 text-sm font-black rounded-xl transition-all ${timeframe === tf.value ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Hero Header */}
      <div className="bg-slate-950 p-12 rounded-[50px] border border-slate-800 shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
          <Navigation className="h-80 w-80 text-rose-600" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-rose-500 font-black text-[12px] uppercase tracking-[0.4em] mb-6">
               <Zap className="h-5 w-5 animate-pulse" /> Reversal Hunter Pro
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.9] mb-6 uppercase italic">
              Hammer <br /> <span className="text-rose-600">Sniper</span>
            </h1>
            <p className="text-base text-slate-400 font-bold leading-relaxed">
              Mendeteksi titik jenuh pasar menggunakan perpaduan <span className="text-white italic underline">Candlestick Hammer</span> dan <span className="text-white italic underline">SMC Discount Zones</span>. Sistem mencari koin yang terjebak dalam akumulasi setelah melakukan pembersihan likuiditas.
            </p>
          </div>
          <div className="flex flex-col items-center gap-6">
             <button 
              onClick={handleScan}
              disabled={scanning}
              className="px-14 py-6 bg-rose-600 hover:bg-rose-700 text-white rounded-[32px] text-lg font-black transition-all shadow-[0_0_60px_rgba(225,29,72,0.5)] hover:shadow-rose-500/80 disabled:opacity-50 flex items-center gap-4 uppercase transform active:scale-95"
            >
              {scanning ? <RefreshCcw className="h-6 w-6 animate-spin" /> : <Binoculars className="h-6 w-6" />}
              {scanning ? "Tracking..." : "Find Reversals"}
            </button>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
               <ShieldCheck className="h-4 w-4 text-rose-600" /> High Precision Algorithm v2.4
            </div>
          </div>
        </div>
      </div>

      {/* Screening Dashboard */}
      <div className="space-y-8 px-4">
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                 <Target className="h-6 w-6 text-rose-600" /> Detected Reversal Zones
                 <span className="px-4 py-1.5 bg-rose-600/10 text-rose-600 text-[10px] rounded-full border border-rose-600/20 font-black ml-2 shadow-sm">{filtered.length} FOUND</span>
              </h2>
            </div>
            <div className="relative">
               <input 
                 type="text" 
                 placeholder="Search Symbol..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 px-12 py-3.5 rounded-[24px] text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/20 w-64 shadow-sm"
               />
               <Search className="h-5 w-5 text-slate-400 absolute left-4.5 top-4" />
            </div>
            <button 
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="p-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[24px] text-slate-400 hover:text-rose-600 transition-all shadow-sm"
              title="Export Excel"
            >
              <FileDown className="h-6 w-6" />
            </button>
         </div>

         {loading ? (
            <div className="py-40 text-center flex flex-col items-center gap-6">
              <div className="h-12 w-12 bg-rose-600/10 rounded-full flex items-center justify-center animate-bounce">
                 <RefreshCcw className="h-6 w-6 text-rose-600 animate-spin" />
              </div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Accessing Binance Market Data...</div>
            </div>
         ) : filtered.length === 0 ? (
            <div className="py-40 text-center bg-white dark:bg-slate-900 rounded-[50px] border-4 border-dashed border-slate-100 dark:border-slate-800">
               <div className="text-slate-400 font-black uppercase text-xs tracking-widest flex flex-col items-center gap-4 opacity-50">
                  <Layers className="h-12 w-12 mb-2" />
                  No Reversal Patterns Detected Currently
               </div>
            </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map(s => (
                <div key={s.nomor} className="bg-white dark:bg-slate-900 p-10 rounded-[44px] border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group hover:border-rose-500/30 transition-all hover:scale-[1.02]">
                  {/* Confidence Badge */}
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-125 transition-transform">
                    <Zap className="h-32 w-32 text-rose-600" />
                  </div>

                  <div className="flex justify-between items-start mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                           <span className="px-3 py-1 bg-rose-600 text-white text-[9px] font-black rounded-lg uppercase shadow-lg shadow-rose-600/30">BUY REVERSAL</span>
                           <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black rounded-lg uppercase">{s.timeframe}</span>
                        </div>
                        <div className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{s.symbol}</div>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Confidence</div>
                       <div className={`text-2xl font-black ${s.confidence >= 7 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{s.confidence}<span className="text-[12px] opacity-30">/10</span></div>
                    </div>
                  </div>

                  <div className="space-y-6 mb-10 relative z-10">
                     <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/10 transition-colors">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="h-10 w-10 bg-slate-900 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-white font-black group-hover:bg-rose-600 transition-all">
                              <Target className="h-5 w-5" />
                           </div>
                           <div>
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pattern Found</div>
                              <div className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-none">{s.pattern}</div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> {s.zone} ZONE
                           </div>
                           <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                              <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> STRONG {s.trend}
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-6 px-2">
                        <div>
                           <div className="text-[8px] font-black text-slate-400 uppercase mb-2">ENTRY</div>
                           <div className="text-[13px] font-black text-slate-900 dark:text-white">{(s.entry_price * 1).toFixed(4)}</div>
                        </div>
                        <div>
                           <div className="text-[8px] font-black text-rose-500 uppercase mb-2">STOP LOSS</div>
                           <div className="text-[13px] font-black text-rose-600 italic">{(s.stop_loss * 1).toFixed(4)}</div>
                        </div>
                        <div>
                           <div className="text-[8px] font-black text-emerald-500 uppercase mb-2">TARGET TP</div>
                           <div className="text-[13px] font-black text-emerald-600 italic">{(s.take_profit * 1).toFixed(4)}</div>
                        </div>
                     </div>
                  </div>

                  <a 
                    href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} 
                    target="_blank"
                    className="w-full py-5 bg-slate-900 dark:bg-slate-800 group-hover:bg-rose-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl mt-4 transform group-hover:translate-y-[-5px]"
                  >
                    View Sniper Chart <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              ))}
           </div>
         )}
      </div>

      {/* Logic Card */}
      <div className="bg-slate-900 p-14 rounded-[60px] border border-slate-800 shadow-2xl relative overflow-hidden mx-4">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-1">
               <h3 className="text-xs font-black text-rose-500 mb-6 uppercase tracking-[0.4em] flex items-center gap-3 italic">
                 <Info className="h-5 w-5" /> Logic breakdown
               </h3>
               <h2 className="text-4xl font-black text-white tracking-tighter leading-none uppercase italic mb-8">
                 How the <span className="text-rose-600">Sniper</span> <br /> Sees Markets
               </h2>
               <div className="p-6 bg-slate-800/50 rounded-3xl border-l-4 border-rose-600 font-bold text-slate-400 text-xs italic tracking-wide leading-relaxed uppercase">
                 "Trade the reversal, not the bottom. Wait for the liquidity sweep confirm then ride the accumulation phase."
               </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-12 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
               <div className="space-y-4 p-8 bg-slate-800/30 rounded-[40px] hover:bg-slate-800/50 transition-all border border-transparent hover:border-rose-500/20 group">
                  <div className="h-10 w-10 bg-rose-600/10 rounded-xl flex items-center justify-center text-rose-600 font-black mb-4 group-hover:bg-rose-600 group-hover:text-white transition-all">01</div>
                  <div className="text-white text-sm font-black mb-2">Discount Equilibrium</div>
                  Sistem hanya mencari entry ketika harga berada di area "Discount" (50% terbawah dari range 50 candle terakhir). Ini memastikan <span className="text-rose-500 font-black italic">Risk/Reward</span> yang maksimal.
               </div>
               <div className="space-y-4 p-8 bg-slate-800/30 rounded-[40px] hover:bg-slate-800/50 transition-all border border-transparent hover:border-rose-500/20 group">
                  <div className="h-10 w-10 bg-rose-600/10 rounded-xl flex items-center justify-center text-rose-600 font-black mb-4 group-hover:bg-rose-600 group-hover:text-white transition-all">02</div>
                  <div className="text-white text-sm font-black mb-2">Liquidity Sweep</div>
                  Mendeteksi saat harga menembus Low sebelumnya tapi ditutup di atas Low tersebut. Ini adalah tanda <span className="text-rose-500 font-black italic">Smart Money</span> mengambil likuiditas ritel (stop loss hunting).
               </div>
               <div className="space-y-4 p-8 bg-slate-800/30 rounded-[40px] hover:bg-slate-800/50 transition-all border border-transparent hover:border-rose-500/20 group">
                  <div className="h-10 w-10 bg-rose-600/10 rounded-xl flex items-center justify-center text-rose-600 font-black mb-4 group-hover:bg-rose-600 group-hover:text-white transition-all">03</div>
                  <div className="text-white text-sm font-black mb-2">The Hammer Rejection</div>
                  Morfologi candle harus menunjukkan penolakan harga yang agresif (Lower wick {'>'} 2x body). Bentuk ini menandakan daya beli yang sangat kuat tiba-tiba muncul di area demand.
               </div>
               <div className="space-y-4 p-8 bg-slate-800/30 rounded-[40px] hover:bg-slate-800/50 transition-all border border-transparent hover:border-rose-500/20 group">
                  <div className="h-10 w-10 bg-rose-600/10 rounded-xl flex items-center justify-center text-rose-600 font-black mb-4 group-hover:bg-rose-600 group-hover:text-white transition-all">04</div>
                  <div className="text-white text-sm font-black mb-2">Volume Confirmation</div>
                  Confidence score naik signifikan jika pola terbentuk disertai volume spike (1.5x rata-rata). Ini adalah konfirmasi validitas akumulasi.
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
