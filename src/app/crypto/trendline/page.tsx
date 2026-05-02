"use client";
import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Search,
  Zap,
  ArrowUpRight,
  Shield,
  Target,
  Activity,
  BarChart3,
  Layers,
  CheckCircle2,
  XCircle,
  Flame,
  AlertTriangle,
  Gauge,
  Clock,
  Timer,
  FileDown
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

const CONFIDENCE_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  INSTITUTIONAL: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", icon: Flame },
  STRONG: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Zap },
  VALID: { color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", icon: CheckCircle2 },
  NOISE: { color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20", icon: AlertTriangle },
};

const VOLUME_CONFIG: Record<string, { color: string; label: string }> = {
  EXTREME: { color: "text-red-500", label: "🔥 Extreme" },
  HIGH: { color: "text-amber-500", label: "⚡ High" },
  NORMAL: { color: "text-blue-500", label: "📊 Normal" },
  LOW: { color: "text-slate-400", label: "💤 Low" },
};

export default function TrendlineBreakPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [confidenceFilter, setConfidenceFilter] = useState("ALL");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/trendline?direction=${directionFilter}`);
      const data = await res.json();
      if (data.success) setSignals(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = signals
    .filter((s: any) => s.symbol?.toLowerCase().includes(search.toLowerCase()))
    .filter((s: any) => confidenceFilter === "ALL" || s.confidence === confidenceFilter);

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportToExcel({
      title: "Trendline Break MTF Report",
      subtitle: `Generated: ${new Date().toLocaleString()}`,
      fileName: `Trendline_Break_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Direction", key: "direction" },
        { header: "Total Score", key: "total_score" },
        { header: "Confidence", key: "confidence" },
        { header: "Timeframes", key: "timeframes" },
        { header: "Volume Level", key: "volume_level" },
        { header: "BOS", key: "has_bos", format: (v) => v ? "YES" : "NO" },
        { header: "Sweep", key: "has_sweep", format: (v) => v ? "YES" : "NO" },
        { header: "FVG", key: "has_fvg", format: (v) => v ? "YES" : "NO" },
        { header: "Break %", key: "break_percent", format: (v) => parseFloat(v).toFixed(2) + "%" },
        { header: "Entry Price", key: "entry_price", format: (v) => v ? parseFloat(v).toLocaleString() : "—" },
        { header: "Stop Loss", key: "stop_loss", format: (v) => v ? parseFloat(v).toLocaleString() : "—" },
        { header: "Take Profit", key: "take_profit", format: (v) => v ? parseFloat(v).toLocaleString() : "—" },
      ],
      data: filtered,
    });
  };

  useEffect(() => {
    fetchSignals();
  }, [directionFilter]);

  const handleScan = async () => {
    if (!confirm("🔍 Trendline MTF Scan: Akan memindai top 50 pair Binance di 4 timeframes (15m, 1h, 4h, 1d). Proses ini memakan waktu ±2 menit. Lanjutkan?")) return;
    setScanning(true);
    try {
      const res = await fetch("/api/crypto/trendline/scan");
      const data = await res.json();
      alert(data.message || "Scan selesai");
      fetchSignals();
    } catch (err) {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  const stats = {
    total: filtered.length,
    bullish: filtered.filter((s: any) => s.direction === "BULLISH").length,
    bearish: filtered.filter((s: any) => s.direction === "BEARISH").length,
    strong: filtered.filter((s: any) => s.confidence === "STRONG" || s.confidence === "INSTITUTIONAL").length,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ═══════════ HERO HEADER ═══════════ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-8 md:p-10 rounded-3xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tl-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tl-grid)" />
            {/* Diagonal trendline visual */}
            <line x1="0" y1="300" x2="600" y2="50" stroke="rgba(129,140,248,0.4)" strokeWidth="2" strokeDasharray="8,4" />
            <line x1="100" y1="300" x2="700" y2="80" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" strokeDasharray="6,3" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-[0.2em] mb-3">
              <div className="h-6 w-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              Break Trendline Screener
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2">
              Trendline Break <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">MTF</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
              Deteksi otomatis break trendline yang valid di multi-timeframe (15m → 1D).
              Divalidasi dengan volume spike, BOS, liquidity sweep, dan FVG.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchSignals()}
              className="p-3.5 bg-white/5 text-white/70 rounded-2xl hover:bg-white/10 transition-all border border-white/10 backdrop-blur-sm"
              title="Refresh Data"
            >
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="p-3.5 bg-white/5 text-white/70 rounded-2xl hover:bg-white/10 transition-all border border-white/10 backdrop-blur-sm"
              title="Export Excel"
            >
              <FileDown className="h-5 w-5" />
            </button>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-500/25 disabled:opacity-50 active:scale-95"
            >
              {scanning ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {scanning ? "Scanning 4 TFs..." : "Analyze Market"}
            </button>
          </div>
        </div>

        {/* Score Legend Bar */}
        <div className="relative z-10 mt-6 flex flex-wrap gap-3">
          {[
            { label: "1-3 Noise", color: "bg-slate-500" },
            { label: "4-6 Valid", color: "bg-blue-500" },
            { label: "7-9 Strong", color: "bg-emerald-500" },
            { label: "10+ Institutional", color: "bg-amber-500" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-xs font-bold text-slate-300">
              <div className={`h-2 w-2 rounded-full ${item.color}`} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ QUICK STATS ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Signal", value: stats.total, icon: Activity, color: "from-violet-500 to-indigo-600" },
          { label: "Bullish", value: stats.bullish, icon: TrendingUp, color: "from-emerald-500 to-green-600" },
          { label: "Bearish", value: stats.bearish, icon: TrendingDown, color: "from-red-500 to-rose-600" },
          { label: "High Prob.", value: stats.strong, icon: Flame, color: "from-amber-500 to-orange-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{stat.label}</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════ FILTERS ═══════════ */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Direction Filter */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner">
          {["ALL", "BULLISH", "BEARISH"].map((dir) => (
            <button
              key={dir}
              onClick={() => setDirectionFilter(dir)}
              className={`px-5 py-2.5 text-xs font-black rounded-lg transition-all ${
                directionFilter === dir
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {dir === "ALL" ? "🔗 Semua" : dir === "BULLISH" ? "🟢 Bullish" : "🔴 Bearish"}
            </button>
          ))}
        </div>

        {/* Confidence Filter */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner">
          {["ALL", "INSTITUTIONAL", "STRONG", "VALID", "NOISE"].map((conf) => (
            <button
              key={conf}
              onClick={() => setConfidenceFilter(conf)}
              className={`px-4 py-2.5 text-xs font-black rounded-lg transition-all ${
                confidenceFilter === conf
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {conf === "ALL" ? "Semua" : conf}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center px-4">
          <Search className="h-4 w-4 text-slate-400 mr-3" />
          <input
            type="text"
            placeholder="Cari Pair..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-bold w-full py-2.5"
          />
        </div>
      </div>

      {/* ═══════════ MAIN TABLE ═══════════ */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black text-[10px] uppercase tracking-[0.15em] border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-5">Symbol</th>
                <th className="px-4 py-5 text-center">Direction</th>
                <th className="px-4 py-5 text-center">Score</th>
                <th className="px-4 py-5 text-center">Confidence</th>
                <th className="px-4 py-5 text-center">Timeframes</th>
                <th className="px-4 py-5 text-center">Volume</th>
                <th className="px-4 py-5 text-center">SMC Confirm</th>
                <th className="px-4 py-5 text-center">Break %</th>
                <th className="px-4 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCcw className="h-8 w-8 text-indigo-400 animate-spin" />
                      <span className="text-slate-400 text-sm font-bold">Memuat sinyal trendline...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <TrendingUp className="h-10 w-10 text-slate-300" />
                      <span className="text-slate-400 text-sm font-bold">
                        Belum ada sinyal break trendline.
                      </span>
                      <span className="text-slate-400 text-xs">
                        Klik &quot;Analyze Market&quot; untuk memindai 50 pair × 4 timeframes.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((signal: any, idx: number) => {
                  const confConfig = CONFIDENCE_CONFIG[signal.confidence] || CONFIDENCE_CONFIG.NOISE;
                  const volConfig = VOLUME_CONFIG[signal.volume_level] || VOLUME_CONFIG.NORMAL;
                  const ConfIcon = confConfig.icon;
                  const timeframes = signal.timeframes?.split(",") || [];
                  const isExpanded = expandedRow === signal.nomor;

                  let details: any[] = [];
                  try {
                    details = typeof signal.details === "string" ? JSON.parse(signal.details) : signal.details || [];
                  } catch {
                    details = [];
                  }

                  // Score bar color
                  const scorePercent = Math.min((parseFloat(signal.total_score) / 15) * 100, 100);
                  let scoreColor = "bg-slate-400";
                  if (signal.total_score >= 10) scoreColor = "bg-amber-500";
                  else if (signal.total_score >= 7) scoreColor = "bg-emerald-500";
                  else if (signal.total_score >= 4) scoreColor = "bg-blue-500";

                  return (
                    <tr key={signal.nomor} className="group">
                      <td colSpan={9} className="p-0">
                        {/* Main Row */}
                        <div
                          className="flex items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all cursor-pointer"
                          onClick={() => setExpandedRow(isExpanded ? null : signal.nomor)}
                        >
                          {/* Symbol */}
                          <div className="px-6 py-5 min-w-[180px]">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-black shadow-lg ${
                                signal.direction === "BULLISH"
                                  ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white"
                                  : "bg-gradient-to-br from-red-500 to-rose-600 text-white"
                              }`}>
                                {signal.symbol?.substring(0, 3)}
                              </div>
                              <div>
                                <div className="text-slate-900 dark:text-white font-black text-base leading-none mb-1">
                                  {signal.symbol}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(signal.created_at).toLocaleString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Direction */}
                          <div className="px-4 py-5 text-center min-w-[100px]">
                            <div className="flex flex-col items-center">
                              <div className={`p-2 rounded-full mb-1 ${
                                signal.direction === "BULLISH" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                              }`}>
                                {signal.direction === "BULLISH" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${
                                signal.direction === "BULLISH" ? "text-emerald-600" : "text-red-500"
                              }`}>
                                {signal.direction}
                              </span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="px-4 py-5 text-center min-w-[120px]">
                            <div className="flex flex-col items-center">
                              <div className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1.5">
                                {parseFloat(signal.total_score).toFixed(1)}
                              </div>
                              <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${scoreColor}`}
                                  style={{ width: `${scorePercent}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Confidence */}
                          <div className="px-4 py-5 text-center min-w-[130px]">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${confConfig.bg} ${confConfig.color}`}>
                              <ConfIcon className="h-3 w-3" />
                              {signal.confidence}
                            </span>
                          </div>

                          {/* Timeframes */}
                          <div className="px-4 py-5 text-center min-w-[140px]">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {timeframes.map((tf: string) => (
                                <span key={tf} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black border border-indigo-100 dark:border-indigo-800">
                                  {tf}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Volume */}
                          <div className="px-4 py-5 text-center min-w-[100px]">
                            <span className={`text-xs font-black ${volConfig.color}`}>{volConfig.label}</span>
                          </div>

                          {/* SMC Confirm */}
                          <div className="px-4 py-5 text-center min-w-[140px]">
                            <div className="flex gap-1.5 justify-center">
                              {[
                                { key: "has_bos", label: "BOS", active: signal.has_bos },
                                { key: "has_sweep", label: "SWP", active: signal.has_sweep },
                                { key: "has_fvg", label: "FVG", active: signal.has_fvg },
                              ].map((tag) => (
                                <span
                                  key={tag.key}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-black border ${
                                    tag.active
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                      : "bg-slate-50 text-slate-300 border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700"
                                  }`}
                                >
                                  {tag.active ? "✅" : "—"} {tag.label}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Break % */}
                          <div className="px-4 py-5 text-center min-w-[80px]">
                            <span className={`text-sm font-black ${signal.direction === "BULLISH" ? "text-emerald-600" : "text-red-500"}`}>
                              {signal.direction === "BULLISH" ? "+" : "-"}{parseFloat(signal.break_percent).toFixed(2)}%
                            </span>
                          </div>

                          {/* Action */}
                          <div className="px-6 py-5 text-right min-w-[120px]">
                            <a
                              href={`https://www.tradingview.com/chart/?symbol=BINANCE:${signal.symbol}`}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md active:scale-95"
                            >
                              Chart <ArrowUpRight className="h-3 w-3" />
                            </a>
                          </div>
                        </div>

                        {/* Expanded Detail Row */}
                        {isExpanded && details.length > 0 && (
                          <div className="px-6 pb-6 pt-0">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                                <Layers className="h-3 w-3" />
                                Actionable Insight & Setup
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entry Price</div>
                                  <div className="text-xl font-black text-slate-900 dark:text-white">
                                    {parseFloat(signal.entry_price || signal.break_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-l-4 border-l-red-500 border border-slate-200 dark:border-slate-800 shadow-sm">
                                  <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Stop Loss</div>
                                  <div className="text-xl font-black text-red-600">
                                    {signal.stop_loss ? parseFloat(signal.stop_loss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : "—"}
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-l-4 border-l-emerald-500 border border-slate-200 dark:border-slate-800 shadow-sm">
                                  <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Take Profit (2R)</div>
                                  <div className="text-xl font-black text-emerald-600">
                                    {signal.take_profit ? parseFloat(signal.take_profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : "—"}
                                  </div>
                                </div>
                              </div>

                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                                <Layers className="h-3 w-3" />
                                Breakdown Per Timeframe
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {details.map((d: any, dIdx: number) => (
                                  <div key={dIdx} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-black">
                                        {d.timeframe}
                                      </span>
                                      <span className={`text-xs font-black ${d.direction === "BULLISH" ? "text-emerald-600" : "text-red-500"}`}>
                                        {d.direction === "BULLISH" ? "▲" : "▼"} {d.score}pts
                                      </span>
                                    </div>
                                    <div className="space-y-2 text-[11px]">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Break Price</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{d.breakPrice?.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Break %</span>
                                        <span className={`font-bold ${d.direction === "BULLISH" ? "text-emerald-600" : "text-red-500"}`}>
                                          {d.breakPercent}%
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Volume</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{d.volumeRatio}x avg</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Body</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{d.bodyRatio}x avg</span>
                                      </div>
                                      <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                        {d.hasBOS && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-black dark:bg-emerald-900/30 dark:text-emerald-400">BOS</span>}
                                        {d.hasLiquiditySweep && <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-black dark:bg-violet-900/30 dark:text-violet-400">SWEEP</span>}
                                        {d.hasFVG && <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-black dark:bg-blue-900/30 dark:text-blue-400">FVG</span>}
                                        {!d.hasBOS && !d.hasLiquiditySweep && !d.hasFVG && (
                                          <span className="text-[9px] text-slate-400">No SMC confirm</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════ GUIDE SECTION ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* How It Works */}
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-800">
          <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-300 mb-5 flex items-center gap-2">
            <Gauge className="h-5 w-5" /> Cara Kerja Screener
          </h3>
          <div className="space-y-5">
            {[
              {
                num: "01",
                title: "Swing Detection",
                desc: "Identifikasi fractal pivot high/low di setiap timeframe menggunakan 3-candle sensitivity.",
                color: "from-violet-500 to-indigo-600",
              },
              {
                num: "02",
                title: "Build Trendline",
                desc: "Hubungkan swing lows (uptrend) dan swing highs (downtrend) otomatis. Hitung slope & intercept.",
                color: "from-indigo-500 to-blue-600",
              },
              {
                num: "03",
                title: "Detect Break",
                desc: "Candle close harus menembus trendline (bukan hanya wick). Validasi dengan body size & volume spike.",
                color: "from-blue-500 to-cyan-600",
              },
              {
                num: "04",
                title: "MTF Scoring",
                desc: "15m (+1pt), 1H (+2pt), 4H (+3pt), 1D (+4pt). Score ≥7 = high probability setup.",
                color: "from-cyan-500 to-teal-600",
              },
            ].map((step) => (
              <div key={step.num} className="flex gap-4">
                <div className={`h-10 w-10 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center shrink-0 shadow-lg text-white text-xs font-black`}>
                  {step.num}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">{step.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sniper Setup Guide */}
        <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2">
            <Target className="h-5 w-5 text-red-500" /> Sniper Setup (High Probability)
          </h3>
          <div className="space-y-4">
            {[
              {
                icon: Shield,
                title: "Break + BOS",
                desc: "Break trendline disertai Break of Structure = trend continuation yang kuat.",
                color: "bg-emerald-500",
              },
              {
                icon: Activity,
                title: "Break + Liquidity Sweep",
                desc: "Sweep low/high sebelum break = institutional entry. Highly reliable.",
                color: "bg-violet-600",
              },
              {
                icon: Layers,
                title: "Break + FVG",
                desc: "Fair Value Gap dekat area break = area mitigasi. Entry optimal di 50% FVG.",
                color: "bg-blue-600",
              },
              {
                icon: BarChart3,
                title: "Volume Spike ≥ 2x",
                desc: "Volume di atas 2x rata-rata saat break = konfirmasi institusi, bukan retail noise.",
                color: "bg-amber-500",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className={`h-8 w-8 ${item.color} rounded-lg flex items-center justify-center shrink-0 shadow-lg`}>
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-900/10 dark:to-amber-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-black mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              DISCLAIMER
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Screener ini adalah tool analisis teknikal. Selalu gunakan risk management dan jangan masuk posisi tanpa konfirmasi manual di chart.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
