"use client";
import { useState, useEffect } from "react";
import { 
  Target, 
  RefreshCcw, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Search, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  Layers,
  Binoculars,
  FileDown
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

// Timeframe options for scanning
const TIMEFRAMES = [
  { label: "15 Menit", value: "15m" },
  { label: "1 Jam", value: "1h" },
  { label: "4 Jam", value: "4h" },
];

export default function ReversalSniperPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [timeframe, setTimeframe] = useState("15m");
  const [search, setSearch] = useState("");
  
  // Configuration state
  const [overbought, setOverbought] = useState<string[]>([]);
  const [oversold, setOversold] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [overboughtInput, setOverboughtInput] = useState("");
  const [oversoldInput, setOversoldInput] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/crypto/reversal/config');
      const data = await res.json();
      if (data.success) {
        setOverbought(data.data.COINGLASS_OVERBOUGHT || []);
        setOversold(data.data.COINGLASS_OVERSOLD || []);
        setOverboughtInput((data.data.COINGLASS_OVERBOUGHT || []).join(", "));
        setOversoldInput((data.data.COINGLASS_OVERSOLD || []).join(", "));
      }
    } catch (err) {
      console.error("Failed to fetch config", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const obList = overboughtInput.split(",").map(s => s.trim().toUpperCase()).filter(s => s);
      const osList = oversoldInput.split(",").map(s => s.trim().toUpperCase()).filter(s => s);

      const res = await fetch('/api/crypto/reversal/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overbought: obList, oversold: osList })
      });
      
      const data = await res.json();
      if (data.success) {
        setOverbought(obList);
        setOversold(osList);
        setIsEditing(false);
        alert("Konfigurasi disimpan!");
      }
    } catch (err) {
      alert("Gagal menyimpan konfigurasi");
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchSignals = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/reversal?timeframe=${tf}`);
      const data = await res.json();
      if (data.success) setSignals(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchConfig();
    fetchSignals(); 
  }, [timeframe]);

  const handleScan = async () => {
    setScanning(true);
    // Prepare map for RSI context from dynamic state
    const rsiContextMap: any = {};
    overbought.forEach(s => rsiContextMap[`${s}USDT`] = 'OVERBOUGHT');
    oversold.forEach(s => rsiContextMap[`${s}USDT`] = 'OVERSOLD');
    
    const symbols = [...overbought, ...oversold].map(s => `${s}USDT`);

    if (symbols.length === 0) {
      alert("Tidak ada simbol untuk di-scan. Silakan update konfigurasi.");
      setScanning(false);
      return;
    }

    try {
      const res = await fetch(`/api/crypto/reversal/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, timeframe, rsiContextMap })
      });
      const data = await res.json();
      alert(data.message || "Sniper Scan Selesai");
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
      title: "Reversal Sniper Opportunities",
      subtitle: `Timeframe: ${TIMEFRAMES.find(t => t.value === timeframe)?.label} | Generated: ${new Date().toLocaleString()}`,
      fileName: `Reversal_Sniper_${timeframe}_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Bias", key: "bias" },
        { header: "Reason", key: "reason" },
        { header: "Timeframe", key: "timeframe" },
        { header: "Entry Price", key: "entry_price", format: (v) => parseFloat(v).toLocaleString() },
        { header: "Stop Loss", key: "stop_loss", format: (v) => parseFloat(v).toLocaleString() },
        { header: "Take Profit", key: "take_profit", format: (v) => parseFloat(v).toLocaleString() },
      ],
      data: filtered,
    });
  };

  const filtered = signals.filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 pb-20">
      
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

      {/* Header */}
      <div className="bg-slate-950 p-10 rounded-[40px] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
          <Target className="h-64 w-64 text-rose-600" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-rose-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-4">
               <Zap className="h-4 w-4" /> Smart Money Reversal sniper
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none mb-4 uppercase italic">
              Reversal Sniper
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl font-bold leading-relaxed">
              Mendeteksi titik balik pasar dengan metodologi <span className="text-rose-500 font-black italic">Mean Reversion</span>. Kami memantau RSI Heatmap (Daily) untuk mencari konfluensi dengan <span className="text-white italic">Liquidity Sweep</span> dan <span className="text-white italic">MS Shift</span> pada timeframe kecil.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <button 
              onClick={handleScan}
              disabled={scanning}
              className="px-10 py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-[24px] text-sm font-black transition-all shadow-[0_0_40px_rgba(225,29,72,0.4)] hover:shadow-rose-500/60 disabled:opacity-50 flex items-center gap-3 uppercase"
            >
              {scanning ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Binoculars className="h-5 w-5" />}
              {scanning ? "Screening Patterns..." : "Run Reversal Sniper"}
            </button>
            <button 
              onClick={handleExport}
              disabled={filtered.length === 0 || scanning}
              className="p-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[24px] hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
              title="Export Excel"
            >
              <FileDown className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Context vs Validation */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Left Col: Coinglass Monitor (Source) */}
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="h-4 w-4 text-rose-500" /> Coinglass Context
                </h3>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                >
                  {isEditing ? "Batal" : "Manage"}
                </button>
             </div>

             {isEditing ? (
               <div className="space-y-4">
                 <div>
                   <label className="text-[10px] font-black text-rose-500 mb-2 block uppercase">Overbought (Comma separated)</label>
                   <textarea 
                     value={overboughtInput}
                     onChange={(e) => setOverboughtInput(e.target.value)}
                     className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-[10px] font-bold min-h-[100px] outline-none focus:ring-2 focus:ring-rose-500"
                     placeholder="BTC, ETH, SOL..."
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-emerald-500 mb-2 block uppercase">Oversold (Comma separated)</label>
                   <textarea 
                     value={oversoldInput}
                     onChange={(e) => setOversoldInput(e.target.value)}
                     className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-[10px] font-bold min-h-[100px] outline-none focus:ring-2 focus:ring-emerald-500"
                     placeholder="BTC, ETH, SOL..."
                   />
                 </div>
                 <button 
                   onClick={saveConfig}
                   disabled={savingConfig}
                   className="w-full py-3 bg-rose-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg hover:bg-rose-700 disabled:opacity-50"
                 >
                   {savingConfig ? "Saving..." : "Simpan Konfigurasi"}
                 </button>
               </div>
             ) : (
               <div className="space-y-6">
                 <div>
                    <div className="text-[10px] font-black text-rose-500 mb-3 ml-2 uppercase">🔴 Overbought Candidates</div>
                    <div className="flex flex-wrap gap-2">
                      {overbought.length > 0 ? overbought.map(s => (
                         <span key={s} className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 text-[10px] font-black rounded-xl border border-rose-100 dark:border-rose-900/60">{s}</span>
                      )) : <span className="text-[10px] text-slate-400 italic ml-2">Kosong</span>}
                    </div>
                 </div>
                 <div>
                    <div className="text-[10px] font-black text-emerald-500 mb-3 ml-2 uppercase">🟢 Oversold Candidates</div>
                    <div className="flex flex-wrap gap-2">
                      {oversold.length > 0 ? oversold.map(s => (
                         <span key={s} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100 dark:border-emerald-900/60">{s}</span>
                      )) : <span className="text-[10px] text-slate-400 italic ml-2">Kosong</span>}
                    </div>
                 </div>
                 <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[9px] font-bold text-slate-500 leading-relaxed italic border-l-4 border-rose-500">
                   Data ini bersumber dari heatmap harian Coinglass. Klik "Manage" untuk memperbarui daftar simbol secara manual.
                 </div>
               </div>
             )}
           </div>
        </div>

        {/* Right Col: Validated Sniper Signals */}
        <div className="xl:col-span-3 space-y-6">
           <div className="flex items-center justify-between px-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                 🏹 Active Snipe Opportunities <span className="px-3 py-1 bg-rose-600 text-white text-[10px] rounded-full shadow-lg ml-2">{filtered.length}</span>
              </h2>
              <div className="relative">
                 <input 
                   type="text" 
                   placeholder="Cari Pair..."
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-10 py-2.5 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 w-48"
                 />
                 <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
           </div>

           {loading ? (
              <div className="py-32 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse flex flex-col items-center gap-4">
                <RefreshCcw className="h-8 w-8 animate-spin" />
                Validating Smart Money Activity...
              </div>
           ) : filtered.length === 0 ? (
              <div className="py-32 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 italic">
                Belum ada sinyal Reversal Sniper yang dikonfirmasi di Binance. Klik "Run Reversal Sniper" untuk memulai pencarian.
              </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map(s => {
                  const isBullish = s.bias === 'BULLISH';
                  return (
                    <div key={s.nomor} className="bg-white dark:bg-slate-900 p-8 rounded-[36px] border-2 border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-all">
                      <div className={`absolute top-0 left-0 px-6 py-2 rounded-br-2xl text-[10px] font-black uppercase tracking-widest ${isBullish ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                        🏹 {s.bias}
                      </div>

                      <div className="flex justify-between items-start mb-8 mt-4">
                        <div>
                          <div className="text-3xl font-black text-slate-900 dark:text-white uppercase leading-none">{s.symbol}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase mt-2">{s.timeframe} Timeframe</div>
                        </div>
                        <a 
                          href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} target="_blank"
                          className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-[18px] flex items-center justify-center text-slate-500 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        >
                          <Target className="h-5 w-5" />
                        </a>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3">
                           {isBullish ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-rose-500" />}
                           <div className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase">{s.reason}</div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                           <div className="grid grid-cols-3 gap-4">
                              <div>
                                 <div className="text-[8px] font-black text-slate-400 uppercase mb-1">ENTRY</div>
                                 <div className="text-xs font-black text-slate-900 dark:text-white">{(s.entry_price * 1).toFixed(isBullish ? 4 : 2)}</div>
                              </div>
                              <div>
                                 <div className="text-[8px] font-black text-rose-500 uppercase mb-1">STOP LOSS</div>
                                 <div className="text-xs font-black text-rose-600">{(s.stop_loss * 1).toFixed(isBullish ? 4 : 2)}</div>
                              </div>
                              <div>
                                 <div className="text-[8px] font-black text-emerald-500 uppercase mb-1">TARGET TP</div>
                                 <div className="text-xs font-black text-emerald-600">{(s.take_profit * 1).toFixed(isBullish ? 4 : 2)}</div>
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 transition-all group-hover:pl-2">
                        <span>Strategy: {isBullish ? "Mean Reversion Long" : "Mean Reversion Short"}</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  )
                })}
             </div>
           )}
        </div>

      </div>

      {/* Logic Card */}
      <div className="bg-slate-50 dark:bg-slate-950 p-10 rounded-[40px] border border-slate-200 dark:border-slate-800 my-10">
         <h3 className="text-sm font-black text-slate-900 dark:text-white mb-8 flex items-center gap-2 uppercase tracking-widest">
           <Info className="h-5 w-5 text-rose-500" /> Reversal Sniper Logic & Checklist
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-[11px] leading-relaxed text-slate-500 font-bold uppercase tracking-wide">
           <div className="space-y-4">
             <div className="text-rose-600 font-black text-xl">1.</div>
             <div>
               <span className="text-slate-900 dark:text-white">Daily Overextended:</span><br />
               Kami memantau Coinglass Heatmap untuk koin yang sudah "lelah" (RSI {'>'} 70 atau {'<'} 30).
             </div>
           </div>
           <div className="space-y-4">
             <div className="text-rose-600 font-black text-xl">2.</div>
             <div>
               <span className="text-slate-900 dark:text-white">Liquidity Grab:</span><br />
               Di timeframe kecil, koin harus melakukan "Final Sweep" untuk mengambil likuiditas terakhir (rejection wick).
             </div>
           </div>
           <div className="space-y-4">
             <div className="text-rose-600 font-black text-xl">3.</div>
             <div>
               <span className="text-slate-900 dark:text-white">Structure Shift:</span><br />
               Konfirmasi akhir adalah Market Structure Shift (MSS) atau CHoCH yang menandakan pergantian tren telah dimulai.
             </div>
           </div>
         </div>
      </div>
    </div>
  );
}
