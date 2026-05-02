"use client";
import { useState, useEffect } from "react";
import {
  Users,
  RefreshCcw,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  Target,
  Zap,
  Info,
  Crown,
  BarChart3,
  FileDown,
  MinusCircle
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

const SIGNAL_FILTERS = [
  { label: "All Signals", value: "ALL" },
  { label: "🔥 Strong Long", value: "STRONG LONG" },
  { label: "🔥 Strong Short", value: "STRONG SHORT" },
  { label: "Long Bias", value: "LONG BIAS" },
  { label: "Short Bias", value: "SHORT BIAS" },
];

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 85 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#94a3b8";
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  return (
    <svg width="76" height="76" className="rotate-[-90deg]">
      <circle cx="38" cy="38" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="38" cy="38" r={radius} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text
        x="38" y="43"
        textAnchor="middle"
        className="rotate-90"
        style={{ rotate: "90deg", transformOrigin: "38px 38px", fontSize: "14px", fontWeight: 900, fill: color }}
      >
        {score}
      </text>
    </svg>
  );
}

export default function TopTraderPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const fetchSignals = async (type = filter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/trader?type=${type}`);
      const data = await res.json();
      if (data.success) setSignals(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSignals(); }, [filter]);

  const handleScan = async () => {
    if (!confirm("Top Trader Flow Scan: Mengambil data Long/Short Ratio, Whale Position, dan OI dari Binance Futures (±20 detik). Lanjutkan?")) return;
    setScanning(true);
    try {
      const res = await fetch("/api/crypto/trader/scan");
      const data = await res.json();
      alert(data.message || "Scan selesai");
      fetchSignals();
    } catch {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  const handleExport = () => {
    if (signals.length === 0) return;
    exportToExcel({
      title: "Top Trader Flow Report",
      subtitle: `Generated: ${new Date().toLocaleString()}`,
      fileName: `Top_Trader_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Master Score", key: "score" },
        { header: "Signal Type", key: "signal_type" },
        { header: "Retail Long Ratio", key: "long_ratio", format: (v) => (parseFloat(v) * 100).toFixed(0) + "%" },
        { header: "Whale Bias", key: "whale_bias" },
        { header: "Open Interest Change", key: "oi_change", format: (v) => parseFloat(v).toFixed(1) + "%" },
        { header: "Created At", key: "created_at", format: (v) => new Date(v).toLocaleString('id-ID') },
      ],
      data: signals,
    });
  };

  const signalColor: Record<string, string> = {
    "STRONG LONG": "text-emerald-500",
    "LONG BIAS": "text-emerald-400",
    "STRONG SHORT": "text-rose-500",
    "SHORT BIAS": "text-rose-400",
    "NEUTRAL": "text-slate-400",
  };

  const signalBg: Record<string, string> = {
    "STRONG LONG": "border-emerald-200 dark:border-emerald-800/60",
    "LONG BIAS": "border-emerald-100 dark:border-emerald-900/40",
    "STRONG SHORT": "border-rose-200 dark:border-rose-800/60",
    "SHORT BIAS": "border-rose-100 dark:border-rose-900/40",
    "NEUTRAL": "border-slate-100 dark:border-slate-800",
  };

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-10 rounded-[2rem] relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-violet-400 font-black text-[10px] uppercase tracking-[0.3em] mb-3">
              <Crown className="h-4 w-4" /> Smart Money Analytics
            </div>
            <h1 className="text-4xl font-black leading-none uppercase">Top Trader Flow</h1>
            <p className="text-slate-400 mt-3 max-w-lg text-sm font-medium leading-relaxed">
              Menggabungkan <span className="text-violet-400 font-bold">Retail Sentiment</span>,{" "}
              <span className="text-amber-400 font-bold">Whale Positioning</span>, dan{" "}
              <span className="text-cyan-400 font-bold">Open Interest Trend</span> menjadi satu skor probabilitas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSignals()}
              className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all"
            >
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={handleExport}
              disabled={signals.length === 0}
              className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all font-bold text-white shadow-xl"
              title="Export Excel"
            >
              <FileDown className="h-5 w-5" />
            </button>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-3 px-10 py-4 bg-violet-600 hover:bg-violet-500 rounded-2xl font-black text-sm shadow-xl shadow-violet-500/30 transition-all disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {scanning ? "Analyzing Flows..." : "Scan Trader Flows"}
            </button>
          </div>
        </div>
      </div>

      {/* Method Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <Users className="h-6 w-6" />, color: "bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600", label: "Retail Contrarian", desc: "Jika retail banyak Long → kita cari Short. Jika retail banyak Short → kita cari Long.", weight: "30%" },
          { icon: <Crown className="h-6 w-6" />, color: "bg-violet-100 dark:bg-violet-900/20 text-violet-600", label: "Whale Position", desc: "Top Trader (institusi) lebih sering benar. Ikuti arah mereka sebagai konfirmasi utama.", weight: "40%" },
          { icon: <BarChart3 className="h-6 w-6" />, color: "bg-amber-100 dark:bg-amber-900/20 text-amber-600", label: "OI Trend", desc: "OI naik = uang baru masuk, mengonfirmasi tren. OI turun = posisi ditutup, tren melemah.", weight: "30%" },
        ].map(m => (
          <div key={m.label} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${m.color}`}>{m.icon}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-slate-900 dark:text-white text-sm">{m.label}</span>
                <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">{m.weight}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{m.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Signal Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {SIGNAL_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-5 py-2.5 text-xs font-black rounded-2xl border transition-all ${
              filter === f.value
                ? "bg-violet-600 text-white border-violet-600 shadow-lg"
                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-violet-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold animate-pulse">Memuat data aliran trader...</div>
      ) : signals.length === 0 ? (
        <div className="py-24 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 italic">
          Tidak ada sinyal ditemukan. Klik <strong>"Scan Trader Flows"</strong> untuk memulai analisis.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {signals.map((s, i) => {
            const reasons = (s.reason || "").split(" | ");
            const isStrong = s.signal_type === "STRONG LONG" || s.signal_type === "STRONG SHORT";
            const isLong = s.signal_type?.includes("LONG");
            return (
              <div
                key={s.nomor}
                className={`bg-white dark:bg-slate-900 p-7 rounded-3xl border-2 transition-all hover:scale-[1.01] relative overflow-hidden ${signalBg[s.signal_type] || "border-slate-100 dark:border-slate-800"}`}
              >
                {/* Rank */}
                <div className="absolute top-0 right-0 px-5 py-2 bg-slate-900 text-slate-400 text-xs font-black rounded-bl-2xl">
                  #{i + 1}
                </div>

                {/* Symbol + Score */}
                <div className="flex items-center gap-4 mb-6">
                  <ScoreRing score={s.score} />
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{s.symbol}</div>
                    <div className={`text-xs font-black mt-1.5 ${signalColor[s.signal_type] || "text-slate-400"}`}>
                      {isStrong && "🔥 "}{s.signal_type}
                    </div>
                  </div>
                </div>

                {/* Ratio Meters */}
                <div className="space-y-4 mb-6">
                  {/* Retail L/S Ratio */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1.5">
                      <span className="text-slate-400">Retail Long Ratio</span>
                      <span className={parseFloat(s.long_ratio) < 0.4 ? "text-emerald-500" : "text-rose-500"}>
                        {(parseFloat(s.long_ratio) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-400 rounded-l-full transition-all" style={{ width: `${parseFloat(s.long_ratio) * 100}%` }} />
                      <div className="h-full bg-rose-400 rounded-r-full flex-1" />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-bold">
                      <span>LONG</span><span>SHORT</span>
                    </div>
                  </div>

                  {/* Whale Ratio */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1.5">
                      <span className="text-slate-400">Whale (Top Trader)</span>
                      <span className={parseFloat(s.top_trader_ratio) > 0.6 ? "text-emerald-500" : parseFloat(s.top_trader_ratio) < 0.4 ? "text-rose-500" : "text-amber-500"}>
                        {(parseFloat(s.top_trader_ratio) * 100).toFixed(0)}% — {s.whale_bias}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${parseFloat(s.top_trader_ratio) > 0.6 ? "bg-emerald-500" : parseFloat(s.top_trader_ratio) < 0.4 ? "bg-rose-500" : "bg-amber-400"}`}
                        style={{ width: `${parseFloat(s.top_trader_ratio) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* OI Trend */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-2xl">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-500">
                      <BarChart3 className="h-4 w-4" /> Open Interest
                    </div>
                    <div className={`flex items-center gap-1 font-black text-xs ${
                      s.oi_trend === "up" ? "text-emerald-500" : s.oi_trend === "down" ? "text-rose-500" : "text-slate-400"
                    }`}>
                      {s.oi_trend === "up" ? <TrendingUp className="h-4 w-4" /> : s.oi_trend === "down" ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                      {parseFloat(s.oi_change) > 0 ? "+" : ""}{parseFloat(s.oi_change).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Reasons */}
                <div className="space-y-1.5 mb-5">
                  {reasons.map((r: string, ri: number) => (
                    <div key={ri} className="flex items-start gap-2 text-[10px] font-bold text-slate-500">
                      <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${isLong ? "bg-emerald-500" : "bg-rose-500"}`} />
                      {r}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="text-[10px] text-slate-400 font-black">
                    {new Date(s.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                  </div>
                  <a
                    href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-violet-600 transition-colors uppercase tracking-widest"
                  >
                    Chart <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gold Strategy Tip */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 p-8 rounded-3xl border border-amber-200 dark:border-amber-800/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-amber-500 rounded-2xl flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-black text-amber-900 dark:text-amber-300 uppercase tracking-wide">🔥 Gold Strategy: Triple Confirmation</h3>
        </div>
        <p className="text-sm text-amber-800/70 dark:text-amber-300/70 font-medium leading-relaxed">
          Setup paling powerful terjadi saat{" "}
          <span className="font-black text-amber-800 dark:text-amber-200">Top Trader LONG</span> +{" "}
          <span className="font-black text-amber-800 dark:text-amber-200">Retail SHORT</span> +{" "}
          <span className="font-black text-amber-800 dark:text-amber-200">OI Naik</span> digabungkan dengan konfirmasi teknikal dari{" "}
          <span className="font-black">Liquidity Sweep</span> atau <span className="font-black">Fair Value Gap (FVG)</span>. Inilah cara institusi membangun posisi tanpa terlihat.
        </p>
      </div>
    </div>
  );
}
