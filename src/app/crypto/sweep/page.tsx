"use client";
import { useState, useEffect } from "react";
import {
  Waves,
  RefreshCcw,
  ArrowUpRight,
  Search,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  ShieldCheck,
  Info,
  Filter,
} from "lucide-react";

const TIMEFRAMES = [
  { label: "1 Jam", value: "1h" },
  { label: "4 Jam", value: "4h" },
  { label: "1 Hari", value: "1d" },
  { label: "1 Minggu", value: "1w" },
];

export default function SweepPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [timeframe, setTimeframe] = useState("4h");
  const [search, setSearch] = useState("");
  const [strengthFilter, setStrengthFilter] = useState("ALL");

  const fetchSignals = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/sweep?interval=${tf}`);
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
    const label = TIMEFRAMES.find(t => t.value === timeframe)?.label;
    if (!confirm(`Liquidity Sweep Scan (${label}): Memindai 50 pair Binance (±20 detik). Lanjutkan?`)) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/crypto/sweep/scan?interval=${timeframe}`);
      const data = await res.json();
      alert(data.message || "Scan selesai");
      fetchSignals();
    } catch {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  const filtered = signals
    .filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()))
    .filter(s => strengthFilter === "ALL" || s.strength === strengthFilter);

  return (
    <div className="space-y-6 pb-16">

      {/* Timeframe Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-fit shadow-inner">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
              timeframe === tf.value
                ? "bg-white dark:bg-slate-900 text-cyan-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
          <Waves className="h-48 w-48 text-cyan-500" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-black text-[10px] uppercase tracking-[0.25em] mb-2">
              <Target className="h-4 w-4" /> Smart Money Detection
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-none uppercase">
              Liquidity Sweep
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-lg">
              Mendeteksi jebakan likuiditas: candle melewati Swing Low lalu ditolak kuat (close kembali di atas), diperkuat volume spike dan wick panjang.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSignals()}
              className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-200 transition-all"
            >
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Waves className="h-4 w-4" />}
              {scanning ? "Scanning..." : "Scan Sweep"}
            </button>
          </div>
        </div>
      </div>

      {/* Filters + Stats Row */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {["ALL", "STRONG", "MODERATE"].map(f => (
            <button
              key={f}
              onClick={() => setStrengthFilter(f)}
              className={`px-5 py-2.5 text-xs font-black rounded-2xl border transition-all ${
                strengthFilter === f
                  ? "bg-cyan-600 text-white border-cyan-600 shadow-lg"
                  : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800"
              }`}
            >
              {f === "ALL" ? "Semua" : f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="h-4 w-4 text-cyan-500" />
            {filtered.length} Sinyal
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari Pair..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-10 py-2.5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-cyan-500 font-bold w-44"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
        </div>
      </div>

      {/* Signal Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold animate-pulse">Mendeteksi Liquidity Sweep...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 italic">
          Tidak ada sinyal Liquidity Sweep. Klik "Scan Sweep" untuk memulai analisis.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(s => {
            const isStrong = s.strength === "STRONG";
            return (
              <div
                key={s.nomor}
                className={`bg-white dark:bg-slate-900 p-7 rounded-3xl border-2 transition-all group relative overflow-hidden hover:scale-[1.01] ${
                  isStrong
                    ? "border-cyan-200 dark:border-cyan-800/60 shadow-xl shadow-cyan-500/5"
                    : "border-slate-100 dark:border-slate-800 shadow-sm"
                }`}
              >
                {/* Strength Badge */}
                <div className={`absolute top-0 left-0 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-br-2xl ${
                  isStrong ? "bg-cyan-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
                }`}>
                  {isStrong ? "💪 STRONG" : "MODERATE"}
                </div>

                <div className="flex justify-between items-start mt-6 mb-6">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{s.symbol}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">{s.timeframe} Timeframe</div>
                  </div>
                  <a
                    href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`}
                    target="_blank"
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Wick Ratio</div>
                    <div className="text-xl font-black text-cyan-600">{parseFloat(s.wick_ratio).toFixed(1)}x</div>
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, parseFloat(s.wick_ratio) * 20)}%` }} />
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Volume Spike</div>
                    <div className="text-xl font-black text-indigo-600">{parseFloat(s.volume_ratio).toFixed(1)}x</div>
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, parseFloat(s.volume_ratio) * 20)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Support Context */}
                <div className="flex gap-2 mb-5 flex-wrap">
                  {s.near_fvg ? (
                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-600 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Near FVG
                    </span>
                  ) : null}
                  {s.near_prev_low ? (
                    <span className="px-3 py-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-600 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1">
                      <Target className="h-3 w-3" /> Near Prev Low
                    </span>
                  ) : null}
                  {!s.near_fvg && !s.near_prev_low && (
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-black rounded-lg uppercase">No Support Context</span>
                  )}
                </div>

                {/* Price Levels */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-1.5 text-xs font-bold">
                  <div className="flex justify-between text-slate-400">
                    <span>Swing Low</span>
                    <span className="text-slate-700 dark:text-slate-300">{parseFloat(s.swing_low).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Sweep Low</span>
                    <span className="text-rose-500">{parseFloat(s.sweep_low).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Close</span>
                    <span className="text-cyan-600">{parseFloat(s.close_price).toFixed(4)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logic Guide */}
      <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
          <Info className="h-4 w-4 text-cyan-600" /> Cara Membaca Sinyal Liquidity Sweep
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] font-bold text-slate-500 leading-relaxed">
          <div className="flex gap-3">
            <div className="h-10 w-10 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-xl flex items-center justify-center shrink-0 text-lg">A</div>
            <div>
              <span className="text-slate-700 dark:text-slate-300 uppercase">Break Swing Low</span><br />
              Harga (wick) turun melewati level Swing Low sebelumnya — mengambil Stop Loss para trader retail.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 text-lg">B</div>
            <div>
              <span className="text-slate-700 dark:text-slate-300 uppercase">Strong Rejection</span><br />
              Candle menutup (close) kembali di atas Swing Low. Wick panjang {'>'} 2x body adalah sinyal penolakan institusi.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center shrink-0 text-lg">C</div>
            <div>
              <span className="text-slate-700 dark:text-slate-300 uppercase">Volume Spike</span><br />
              Volume {'>'} 1.5x rata-rata mengonfirmasi adanya modal besar (Smart Money) yang masuk di titik tersebut.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
