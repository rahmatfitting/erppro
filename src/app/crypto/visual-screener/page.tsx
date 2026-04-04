"use client";
import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCcw, 
  Search, 
  ArrowUpRight, 
  Target,
  Layers,
  Activity,
  BarChart3,
  Info
} from "lucide-react";

export default function VisualScreenerPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState("");

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crypto/visual-screener');
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
    if (!confirm("Scanning Top 30 Futures Pairs untuk deteksi OI & Price Sentiment (±20 detik)?")) return;
    setScanning(true);
    try {
      const res = await fetch('/api/crypto/visual-screener/scan');
      const data = await res.json();
      alert(data.message || "Scan selesai");
      fetchSignals();
    } catch (err) {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  const longEntering = signals.filter(s => s.sentiment === 'LONG_ENTERING' && s.symbol.toLowerCase().includes(search.toLowerCase()));
  const shortEntering = signals.filter(s => s.sentiment === 'SHORT_ENTERING' && s.symbol.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
          <Layers className="h-48 w-48 text-indigo-600" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">
             <Activity className="h-4 w-4" /> Market Dynamics
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Visual Market Screener</h1>
          <p className="text-sm text-slate-500 mt-2">Mendeteksi akumulasi posisi Long & Short berdasarkan korelasi Open Interest dan Harga.</p>
        </div>
        <div className="flex items-center gap-3 relative z-10 font-bold">
           <div className="relative group">
              <input 
                type="text" 
                placeholder="Cari Pair..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-10 py-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-48 focus:w-64 font-bold"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-4 top-4" />
           </div>
          <button 
            onClick={fetchSignals}
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
          >
            <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
          >
            {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            {scanning ? `Analyzing...` : "Re-Scan Market"}
          </button>
        </div>
      </div>

      {/* Grid for Long vs Short */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LONG ENTERING COLUMN */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
               <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
               🔥 LONG ENTERING
             </h2>
             <span className="text-xs font-bold text-slate-400">{longEntering.length} Cryptos</span>
          </div>
          
          <div className="space-y-4">
            {loading ? (
               <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">Loading bullish assets...</div>
            ) : longEntering.length === 0 ? (
               <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 italic">No significant long entries detected.</div>
            ) : longEntering.map((s) => (
              <div key={s.nomor} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-50 dark:border-slate-800 shadow-sm hover:border-cyan-500 dark:hover:border-cyan-500 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-bl-2xl">
                   <TrendingUp className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{s.symbol}</h3>
                    <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">Bullish Sentiment</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white">Potensi</div>
                    <div className="text-lg font-black text-cyan-500 leading-none">{parseFloat(s.potential).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 relative z-10">
                   <div className="space-y-2">
                     <div className="flex justify-between text-[11px] font-black uppercase mb-1">
                       <span className="text-slate-400">Harga (24j)</span>
                       <span className="text-cyan-500">+{parseFloat(s.price_change).toFixed(2)}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, Math.abs(parseFloat(s.price_change)) * 10)}%` }}></div>
                     </div>
                   </div>
                   <div className="space-y-2">
                     <div className="flex justify-between text-[11px] font-black uppercase mb-1">
                       <span className="text-slate-400">Open Interest</span>
                       <span className="text-cyan-500">+{parseFloat(s.oi_change).toFixed(2)}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, Math.abs(parseFloat(s.oi_change)) * 5)}%` }}></div>
                     </div>
                   </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                   <div className="flex items-center gap-3">
                      <div className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500 font-bold uppercase tracking-tighter cursor-help" title="High OI & High Price = Aggressive Longs">High Conviction</div>
                   </div>
                   <a 
                     href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} target="_blank"
                     className="text-[11px] font-black text-slate-400 hover:text-cyan-500 transition-colors flex items-center gap-1"
                   >
                     OPEN CHART <ArrowUpRight className="h-3 w-3" />
                   </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SHORT ENTERING COLUMN */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
             <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
               <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
               💀 SHORT ENTERING
             </h2>
             <span className="text-xs font-bold text-slate-400">{shortEntering.length} Cryptos</span>
          </div>

          <div className="space-y-4">
            {loading ? (
               <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">Loading bearish assets...</div>
            ) : shortEntering.length === 0 ? (
               <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 italic">No significant short entries detected.</div>
            ) : shortEntering.map((s) => (
              <div key={s.nomor} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-50 dark:border-slate-800 shadow-sm hover:border-rose-500 dark:hover:border-rose-500 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-2 bg-rose-50 dark:bg-rose-900/20 rounded-bl-2xl">
                   <TrendingDown className="h-4 w-4 text-rose-500" />
                </div>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{s.symbol}</h3>
                    <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">Bearish Sentiment</p>
                  </div>
                   <div className="text-right">
                    <div className="text-sm font-black text-slate-900 dark:text-white">Potensi</div>
                    <div className="text-lg font-black text-rose-500 leading-none">{parseFloat(s.potential).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 relative z-10">
                   <div className="space-y-2">
                     <div className="flex justify-between text-[11px] font-black uppercase mb-1">
                       <span className="text-slate-400">Harga (24j)</span>
                       <span className="text-rose-500">{parseFloat(s.price_change).toFixed(2)}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, Math.abs(parseFloat(s.price_change)) * 10)}%` }}></div>
                     </div>
                   </div>
                   <div className="space-y-2">
                     <div className="flex justify-between text-[11px] font-black uppercase mb-1">
                       <span className="text-slate-400">Open Interest</span>
                       <span className="text-rose-500">+{parseFloat(s.oi_change).toFixed(2)}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, Math.abs(parseFloat(s.oi_change)) * 5)}%` }}></div>
                     </div>
                   </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                   <div className="flex items-center gap-3">
                      <div className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500 font-bold uppercase tracking-tighter" title="Lower Price & Higher OI = Aggressive Shorts">Heavy Sell Pressure</div>
                   </div>
                   <a 
                     href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} target="_blank"
                     className="text-[11px] font-black text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                   >
                     OPEN CHART <ArrowUpRight className="h-3 w-3" />
                   </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Logic Card */}
      <div className="bg-slate-100 dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
         <div className="h-20 w-20 rounded-3xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-lg">
           <Info className="h-10 w-10 text-indigo-500" />
         </div>
         <div>
           <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Bagaimana cara membaca screener ini?</h3>
           <p className="text-sm text-slate-500 leading-relaxed">Screener ini menganalisa hubungan antara <span className="font-bold text-slate-700 dark:text-slate-300">Open Interest (OI)</span> dan <span className="font-bold text-slate-700 dark:text-slate-300">Harga</span> untuk mendeteksi akumulasi posisi. <br/>
           <span className="text-cyan-500 font-bold">Long Entering:</span> Terjadi saat Harga Naik dan OI juga Naik (Uang baru masuk untuk membeli). <br/>
           <span className="text-rose-500 font-bold">Short Entering:</span> Terjadi saat Harga Turun namun OI Naik (Uang baru masuk untuk menjual/short). <br/>
           Semakin besar persentase OI, semakin kuat konvirmasi bahwa tren tersebut sedang didorong oleh partisipasi pasar yang agresif.</p>
         </div>
      </div>
    </div>
  );
}
