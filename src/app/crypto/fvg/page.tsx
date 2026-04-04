"use client";
import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  RefreshCcw, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  Info,
  ExternalLink,
  ChevronRight,
  Database
} from "lucide-react";

const TIMEFRAMES = [
  { label: "1 Jam", value: "1h" },
  { label: "4 Jam", value: "4h" },
  { label: "1 Hari", value: "1d" },
  { label: "1 Minggu", value: "1w" },
  { label: "1 Bulan", value: "1M" },
];

export default function CryptoFvgPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterDistance, setFilterDistance] = useState(20);
  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState("1w");

  const fetchSignals = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/fvg?interval=${tf}`);
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
    const tfLabel = TIMEFRAMES.find(t => t.value === timeframe)?.label;
    if (!confirm(`Mulai scan 50 pair Binance teratas untuk timeframe ${tfLabel}? (Proses ini memakan waktu ±30 detik)`)) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/crypto/fvg/scan?interval=${timeframe}`);
      const data = await res.json();
      alert(data.message || "Scan selesai");
      fetchSignals();
    } catch (err) {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  const filteredSignals = signals
    .filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()))
    .filter(s => Math.abs(parseFloat(s.distance)) <= filterDistance);

  return (
    <div className="space-y-6 pb-12">
      {/* Timeframe Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-fit">
        {TIMEFRAMES.map((tf) => (
          <button 
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${timeframe === tf.value ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <TrendingUp className="h-32 w-32 text-indigo-600" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1">
             <TrendingUp className="h-4 w-4" /> Market Intelligence
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Crypto FVG Screener</h1>
          <p className="text-sm text-slate-500 mt-1">Mendeteksi Bullish Fair Value Gap pada Binance USDT Pairs.</p>
        </div>
        <div className="flex items-center gap-3 relative z-10 font-bold">
          <button 
            onClick={() => fetchSignals()}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
            title="Refresh Data"
          >
            <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 h-[44px]"
          >
            {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {scanning ? `Scanning ${TIMEFRAMES.find(t=>t.value===timeframe)?.label}...` : "Scan Market Now"}
          </button>
        </div>
      </div>

      {/* Filters & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
             <Filter className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Max Distance from Price (%)</label>
            <input 
              type="range" min="1" max="50" step="1" 
              value={filterDistance}
              onChange={(e) => setFilterDistance(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-1">
              <span>Short Range (1%)</span>
              <span className="text-indigo-600 dark:text-indigo-400">{filterDistance}%</span>
              <span>Wide (50%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl pr-2">
             <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Signals Found</div>
            <div className="text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">{filteredSignals.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 relative overflow-hidden">
           <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl pr-2">
             <Info className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Active Timeframe</div>
            <div className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5 uppercase">{TIMEFRAMES.find(t=>t.value===timeframe)?.label}</div>
          </div>
        </div>
      </div>

      {/* Search and Alert */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input 
          type="text"
          placeholder="Search by symbol (e.g. BTC, ETH)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm transition-all font-medium mb-4"
        />
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4">Trading Pair</th>
                <th className="px-6 py-4 text-center">FVG Zone (Low - High)</th>
                <th className="px-6 py-4 text-center">Entry Price</th>
                <th className="px-6 py-4 text-center">Stop Loss</th>
                <th className="px-6 py-4 text-center">Take Profit</th>
                <th className="px-6 py-4 text-right">Distance</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                 <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Loading market signals...</td></tr>
              ) : filteredSignals.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No FVG signals found matching your filters. Try scanning or adjusting distance.</td></tr>
              ) : (
                filteredSignals.map((signal) => (
                  <tr key={signal.nomor} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black text-xs uppercase shadow-sm">
                          {signal.symbol.substring(0, 2)}
                        </div>
                        <div>
                          <div className="text-slate-900 dark:text-white font-black text-lg leading-none mb-0.5">{signal.symbol}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest">Binance USDT</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
                        {parseFloat(signal.fvg_low).toLocaleString()} - {parseFloat(signal.fvg_high).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className="font-bold text-green-600 dark:text-green-400">{parseFloat(signal.entry).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5 text-center text-red-500 font-bold">
                       {parseFloat(signal.stop_loss).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-center text-indigo-600 dark:text-indigo-400 font-bold">
                       {parseFloat(signal.take_profit).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className={`text-sm font-black ${Math.abs(signal.distance) < 5 ? 'text-green-500' : 'text-slate-600 dark:text-slate-400'}`}>
                         {signal.distance}%
                       </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <a 
                         href={`https://www.tradingview.com/chart/?symbol=BINANCE:${signal.symbol}`}
                         target="_blank"
                         className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors"
                       >
                         Chart <ArrowUpRight className="h-3 w-3" />
                       </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / FAQ */}
      <div className="bg-slate-100/50 dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-indigo-600" /> Refined Screener Rules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-500 leading-relaxed">
          <div className="space-y-4">
             <div className="flex gap-3">
               <div className="h-5 w-5 bg-indigo-100 dark:bg-indigo-900/30 rounded flex items-center justify-center shrink-0 text-indigo-600 font-bold text-[10px]">1</div>
               <div><span className="font-bold text-slate-700 dark:text-slate-300">Impulse Candle:</span> Body Candle B harus lebih besar dari rata-rata 10 candle sebelumnya untuk mengonfirmasi ledakan momentum yang valid.</div>
             </div>
             <div className="flex gap-3">
               <div className="h-5 w-5 bg-indigo-100 dark:bg-indigo-900/30 rounded flex items-center justify-center shrink-0 text-indigo-600 font-bold text-[10px]">2</div>
               <div><span className="font-bold text-slate-700 dark:text-slate-300">Fresh FVG (Unmitigated):</span> Mendeteksi gap yang belum pernah disentuh kembali oleh harga (Low candle setelahnya tidak boleh masuk ke area High Candle A).</div>
             </div>
          </div>
          <div className="space-y-4">
             <div className="flex gap-3">
               <div className="h-5 w-5 bg-indigo-100 dark:bg-indigo-900/30 rounded flex items-center justify-center shrink-0 text-indigo-600 font-bold text-[10px]">3</div>
               <div><span className="font-bold text-slate-700 dark:text-slate-300">Trend Confirmation (SMA 20):</span> Hanya menampilkan signal beli (Bullish) jika harga saat ini berada di atas garis SMA 20 (Uptrend).</div>
             </div>
             <div className="flex gap-3">
               <div className="h-5 w-5 bg-indigo-100 dark:bg-indigo-900/30 rounded flex items-center justify-center shrink-0 text-indigo-600 font-bold text-[10px]">4</div>
               <div><span className="font-bold text-slate-700 dark:text-slate-300">Strict Distance:</span> Entry (titik tengah 50% FVG) harus berada maksimal 20% dari harga saat ini untuk menjaga efisiensi Risk/Reward.</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
