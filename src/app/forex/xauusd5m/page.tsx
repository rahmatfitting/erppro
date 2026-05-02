"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCcw, Zap, TrendingUp, TrendingDown, Clock,
  Target, ShieldCheck, Activity, Crosshair, AlertTriangle,
  Radio, ChevronRight, BarChart2, FileDown, Layers,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

/* ─── Types ─────────────────────────────────────────────────── */
interface Signal {
  nomor: number;
  setup: string;
  session: string;
  score: number;
  bias: "BUY" | "SELL" | "WAIT";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  entry_price: string;
  stop_loss: string;
  take_profit1: string;
  take_profit2: string;
  pivot_p: string;
  pivot_s1: string;
  pivot_r1: string;
  atr: string;
  structure: string;
  zone: string;
  reasoning: string;
  created_at: string;
}

interface LiveData {
  pair: string;
  timeframe: string;
  setup: string;
  session: string;
  score: number;
  bias: "BUY" | "SELL" | "WAIT";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  isLive: boolean;
  entry?: number;
  sl?: number;
  tp1?: number;
  tp2?: number;
  atr?: number;
  pivotP?: number;
  pivotS1?: number;
  pivotS2?: number;
  pivotS3?: number;
  pivotR1?: number;
  pivotR2?: number;
  pivotR3?: number;
  structure: string;
  zone: string;
  orderBlock?: number;
  sweepType?: string;
  reasoning: string[];
}

/* ─── Constants ─────────────────────────────────────────────── */
const MAX_SCORE = 15;

const ZONE_STYLES: Record<string, string> = {
  PREMIUM: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  DISCOUNT: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  EQUILIBRIUM: "text-amber-400 bg-amber-500/10 border-amber-500/30",
};

const STRUCTURE_LABELS: Record<string, { label: string; color: string }> = {
  BOS_BULL: { label: "BOS Bullish", color: "text-emerald-400" },
  BOS_BEAR: { label: "BOS Bearish", color: "text-rose-400" },
  CHoCH_BULL: { label: "CHoCH Bull", color: "text-emerald-300" },
  CHoCH_BEAR: { label: "CHoCH Bear", color: "text-rose-300" },
  NONE: { label: "No Structure", color: "text-slate-500" },
};

/* ─── Timeframe Config ──────────────────────────────────────── */
const TIMEFRAMES = [
  { interval: "1w", label: "Weekly", short: "1W", slLabel: "2×ATR",  risk: "Swing/Position" },
  { interval: "1d", label: "Daily",  short: "1D", slLabel: "1.5×ATR",risk: "Swing" },
  { interval: "4h", label: "H4",     short: "4H", slLabel: "1×ATR",  risk: "Intraday Swing" },
  { interval: "1h", label: "H1",     short: "1H", slLabel: "0.7×ATR",risk: "Intraday" },
  { interval: "5m", label: "5M",     short: "5M", slLabel: "0.5×ATR",risk: "Scalp" },
];

const TV_INTERVAL: Record<string, string> = { '1w': '1W', '1d': '1D', '4h': '240', '1h': '60', '5m': '5' };

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtPrice(v?: number | string | null) {
  if (v == null) return "—";
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getRR(entry?: number, sl?: number, tp1?: number) {
  if (!entry || !sl || !tp1) return "—";
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp1 - entry);
  if (risk === 0) return "—";
  return `1 : ${(reward / risk).toFixed(1)}`;
}

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(100, (score / MAX_SCORE) * 100);
  const color = score >= 10 ? "#10b981" : score >= 6 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 44;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="44" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white leading-none">{score}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">/{MAX_SCORE}</span>
      </div>
    </div>
  );
}

function PivotBar({ label, price, currentPrice, color }: { label: string; price?: number; currentPrice: number; color: string }) {
  if (!price) return null;
  const distance = currentPrice - price;
  const arrow = distance > 0 ? "▲" : "▼";
  const distColor = distance > 0 ? "text-emerald-400" : "text-rose-400";
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/50 group hover:bg-slate-800/30 px-2 rounded-lg transition-all">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black uppercase tracking-widest w-14 ${color}`}>{label}</span>
        <span className="text-sm font-black text-white font-mono">{fmtPrice(price)}</span>
      </div>
      <span className={`text-[10px] font-bold ${distColor} font-mono`}>
        {arrow} {Math.abs(distance).toFixed(2)}
      </span>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function XAUUSD5MPage() {
  const [activeTF, setActiveTF] = useState<string>("5m");
  const [liveMap, setLiveMap] = useState<Record<string, LiveData>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, Signal[]>>({});
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [lastScanMap, setLastScanMap] = useState<Record<string, string>>({});

  const tfCfg = TIMEFRAMES.find(t => t.interval === activeTF)!;
  const live = liveMap[activeTF] || null;
  const history = historyMap[activeTF] || [];
  const lastScan = lastScanMap[activeTF] || "";

  /* Fetch history */
  const fetchHistory = useCallback(async (tf: string) => {
    try {
      const res = await fetch(`/api/forex/xauusd5m?interval=${tf}`);
      const data = await res.json();
      if (data.success) {
        setHistoryMap(prev => ({ ...prev, [tf]: data.data || [] }));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  /* Run scan */
  const runScan = useCallback(async (tf: string) => {
    setScanning(true);
    try {
      const res = await fetch(`/api/forex/xauusd5m/scan?interval=${tf}`);
      const data = await res.json();
      if (data.success && data.data) {
        setLiveMap(prev => ({ ...prev, [tf]: data.data }));
        setLastScanMap(prev => ({ ...prev, [tf]: new Date().toLocaleTimeString("id-ID") }));
        await fetchHistory(tf);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  }, [fetchHistory]);

  /* Initial load */
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchHistory("5m");
      await runScan("5m");
      setLoading(false);
    })();
  }, []);

  /* Re-fetch when TF changes */
  useEffect(() => {
    if (!liveMap[activeTF]) {
      runScan(activeTF);
    } else {
      fetchHistory(activeTF);
    }
  }, [activeTF]);

  /* Auto-refresh countdown */
  useEffect(() => {
    if (!autoRefresh) { setCountdown(60); return; }
    setCountdown(60);
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { runScan(activeTF); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRefresh, activeTF, runScan]);

  /* Export */
  const handleExport = () => {
    if (!history.length) return;
    exportToExcel({
      title: `XAUUSD ${tfCfg.label} Scalping Signals`,
      subtitle: `Generated: ${new Date().toLocaleString("id-ID")}`,
      fileName: `XAUUSD_${tfCfg.short}_${new Date().toISOString().split("T")[0]}`,
      columns: [
        { header: "Setup", key: "setup" },
        { header: "Bias", key: "bias" },
        { header: "Confidence", key: "confidence" },
        { header: "Score", key: "score" },
        { header: "Entry", key: "entry_price", format: (v) => parseFloat(v).toFixed(2) },
        { header: "SL", key: "stop_loss", format: (v) => parseFloat(v).toFixed(2) },
        { header: "TP1", key: "take_profit1", format: (v) => parseFloat(v).toFixed(2) },
        { header: "Session", key: "session" },
        { header: "Structure", key: "structure" },
        { header: "Zone", key: "zone" },
        { header: "Time", key: "created_at", format: (v) => new Date(v).toLocaleString("id-ID") },
      ],
      data: history,
    });
  };

  const currentPrice = live?.entry ?? 0;
  const biasColor = live?.bias === "BUY" ? "from-emerald-500 to-teal-500" : live?.bias === "SELL" ? "from-rose-500 to-pink-500" : "from-slate-600 to-slate-500";
  const biasTextColor = live?.bias === "BUY" ? "text-emerald-400" : live?.bias === "SELL" ? "text-rose-400" : "text-slate-400";

  return (
    <div
      className="min-h-screen pb-20"
      style={{ backgroundColor: "#09090E", color: "#e2e8f0" }}
    >
      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden p-8 mb-6 rounded-3xl border"
        style={{
          background: "linear-gradient(135deg, #0f0f1a 0%, #141428 50%, #0a0a14 100%)",
          borderColor: "#f59e0b22"
        }}
      >
        {/* Gold glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl opacity-10" style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
          <Crosshair className="w-full h-full text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <Radio className="h-3 w-3 animate-pulse" /> XAUUSD — Smart Money Scalping Engine
              </span>
              {live?.isLive !== undefined && (
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${live.isLive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                  {live.isLive ? "● LIVE" : "◐ DEMO"}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-black tracking-tight" style={{ background: "linear-gradient(90deg, #f59e0b, #fcd34d, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              SCALP/SWING SCREENER · <span style={{ color: "#d97706", WebkitTextFillColor: "#d97706" }}>{tfCfg.label.toUpperCase()}</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-lg leading-relaxed font-medium">
              Deteksi BOS · CHoCH · Liquidity Sweep · Order Block · Pivot P/S/R · Premium-Discount Zone · Session Killzone multi-timeframe.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Auto refresh toggle */}
            <button
              onClick={() => setAutoRefresh(p => !p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${autoRefresh ? "bg-amber-500/15 border-amber-500/40 text-amber-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"}`}
            >
              <Clock className="h-3.5 w-3.5" />
              {autoRefresh ? `Auto ${countdown}s` : "Auto OFF"}
            </button>

            <button
              onClick={() => fetchHistory(activeTF)}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              title="Refresh Riwayat"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleExport}
              disabled={!history.length}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-30"
              title="Export Excel"
            >
              <FileDown className="h-4 w-4" />
            </button>
            <button
              onClick={() => runScan(activeTF)}
              disabled={scanning}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm text-white disabled:opacity-50 transition-all shadow-lg"
              style={{
                background: scanning ? "#334155" : "linear-gradient(135deg, #d97706, #f59e0b)",
                boxShadow: scanning ? "none" : "0 0 24px rgba(245,158,11,0.3)"
              }}
            >
              {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {scanning ? `Scanning...` : `⚡ Scan ${tfCfg.short}`}
            </button>
          </div>
        </div>

        {/* Timeframe Tabs */}
        <div className="relative z-10 flex items-center gap-2 mt-4 flex-wrap">
          {TIMEFRAMES.map(tf => (
            <button key={tf.interval} onClick={() => setActiveTF(tf.interval)}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
              style={{
                background:   activeTF === tf.interval ? '#f59e0b22' : 'transparent',
                borderColor:  activeTF === tf.interval ? '#f59e0b55' : '#334155',
                color:        activeTF === tf.interval ? '#f59e0b' : '#64748b',
                boxShadow:    activeTF === tf.interval ? `0 0 12px rgba(245,158,11,0.4)` : 'none',
              }}>
              {tf.short}
              <span className="ml-1 text-[8px] opacity-60 normal-case font-medium">{tf.risk}</span>
            </button>
          ))}
        </div>

        {lastScan && (
          <div className="relative z-10 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Last {tfCfg.short} scan: {lastScan} · Session: {live?.session ?? "—"}
          </div>
        )}
      </div>

      {loading && !live && (
        <div className="py-24 text-center text-amber-400 font-black animate-pulse uppercase tracking-widest text-sm">
          Initializing SMC Detection Engine...
        </div>
      )}

      {live && (
        <>
          {/* ── MAIN SIGNAL ROW ─────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5">

            {/* BIAS CARD — 3 cols */}
            <div
              className="xl:col-span-3 rounded-3xl border p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden"
              style={{ background: "#0f0f1a", borderColor: live.bias === "BUY" ? "#10b98133" : live.bias === "SELL" ? "#ef444433" : "#33415533" }}
            >
              <div className={`absolute inset-0 opacity-5 ${live.bias === "BUY" ? "bg-emerald-500" : live.bias === "SELL" ? "bg-rose-500" : "bg-slate-500"} blur-3xl`} />
              <div className="relative z-10 text-center">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Market Bias</div>
                <div
                  className={`text-6xl font-black mb-3 ${biasTextColor}`}
                  style={{ textShadow: live.bias === "BUY" ? "0 0 40px #10b98166" : live.bias === "SELL" ? "0 0 40px #ef444466" : "none" }}
                >
                  {live.bias === "BUY" ? "▲" : live.bias === "SELL" ? "▼" : "–"}
                </div>
                <div className={`text-3xl font-black uppercase tracking-widest ${biasTextColor}`}>{live.bias}</div>
                <div className={`mt-3 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border inline-block ${live.confidence === "HIGH" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : live.confidence === "MEDIUM" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-slate-700/50 text-slate-400 border-slate-600"}`}>
                  {live.confidence} Confidence
                </div>
              </div>
            </div>

            {/* SCORE + STRUCTURE — 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border border-slate-800 p-6 flex flex-col gap-5" style={{ background: "#0f0f1a" }}>
              <div className="flex items-center gap-4">
                <ScoreGauge score={live.score} />
                <div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Signal Score</div>
                  <div className="text-xs font-bold text-slate-300">
                    {live.score >= 10 ? "🔥 Strong Confluence" : live.score >= 6 ? "⚡ Moderate Confluence" : "⏳ Weak — Wait"}
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Structure</span>
                  <span className={`text-xs font-black ${STRUCTURE_LABELS[live.structure]?.color ?? "text-slate-400"}`}>
                    {STRUCTURE_LABELS[live.structure]?.label ?? live.structure}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zone</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded border ${ZONE_STYLES[live.zone] ?? "text-slate-400"}`}>
                    {live.zone}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sweep</span>
                  <span className="text-xs font-bold text-amber-400">
                    {live.sweepType === "SWEEP_LOW" ? "💧 Sweep Low" : live.sweepType === "SWEEP_HIGH" ? "💧 Sweep High" : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Block</span>
                  <span className="text-xs font-bold text-violet-400">
                    {live.orderBlock ? fmtPrice(live.orderBlock) : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* ENTRY / SL / TP — 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between gap-4" style={{ background: "#0f0f1a" }}>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Target className="h-3 w-3 text-amber-400" /> Trade Levels
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl border border-slate-700 bg-slate-800/30">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Entry</div>
                  <div className="text-xl font-black text-amber-400 font-mono">{fmtPrice(live.entry)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
                    <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Stop Loss</div>
                    <div className="text-sm font-black text-rose-300 font-mono">{fmtPrice(live.sl)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">TP1</div>
                    <div className="text-sm font-black text-emerald-300 font-mono">{fmtPrice(live.tp1)}</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-teal-500/20 bg-teal-500/5 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-black text-teal-400 uppercase tracking-widest">TP2</div>
                    <div className="text-sm font-black text-teal-300 font-mono">{fmtPrice(live.tp2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black text-slate-500 uppercase">Risk : Reward</div>
                    <div className="text-sm font-black text-amber-400">{getRR(live.entry, live.sl, live.tp1)}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 text-[10px] font-bold text-slate-500">
                <span>ATR(14): <span className="text-amber-400 font-mono">{live.atr?.toFixed(2) ?? "—"}</span></span>
                <span>SL: {tfCfg.slLabel}</span>
              </div>
            </div>

            {/* PIVOT PANEL — 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border border-slate-800 p-6" style={{ background: "#0f0f1a" }}>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Layers className="h-3 w-3 text-amber-400" /> Pivot Levels
              </div>
              <div className="space-y-0.5">
                <PivotBar label="R3" price={live.pivotR3} currentPrice={currentPrice} color="text-red-300" />
                <PivotBar label="R2" price={live.pivotR2} currentPrice={currentPrice} color="text-rose-400" />
                <PivotBar label="R1" price={live.pivotR1} currentPrice={currentPrice} color="text-orange-400" />
                {/* Pivot P */}
                <div className="flex items-center justify-between py-2 px-2 rounded-xl my-1" style={{ background: "#1f1a0e", border: "1px solid #f59e0b33" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 w-14">PIVOT</span>
                    <span className="text-sm font-black text-amber-300 font-mono">{fmtPrice(live.pivotP)}</span>
                  </div>
                  <span className="text-[9px] font-black text-amber-500 uppercase">Equilibrium</span>
                </div>
                <PivotBar label="S1" price={live.pivotS1} currentPrice={currentPrice} color="text-sky-400" />
                <PivotBar label="S2" price={live.pivotS2} currentPrice={currentPrice} color="text-blue-400" />
                <PivotBar label="S3" price={live.pivotS3} currentPrice={currentPrice} color="text-violet-400" />
              </div>

              {/* Current Price indicator */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Current Price</span>
                <span className="text-sm font-black text-white font-mono">{fmtPrice(currentPrice)}</span>
              </div>
            </div>
          </div>

          {/* ── REASONING LOG ─────────────────────────────────── */}
          <div className="rounded-3xl border border-slate-800 p-6 mb-5" style={{ background: "#0f0f1a" }}>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> AI Signal Reasoning Log
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {live.reasoning.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-800/20 hover:bg-slate-800/40 transition-all"
                >
                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-[10px] font-black shrink-0 border border-amber-500/20">
                    {i + 1}
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{r}</p>
                </div>
              ))}
              {live.reasoning.length === 0 && (
                <p className="text-slate-500 text-sm col-span-3 text-center py-4">Tidak ada reasoning. Jalankan scan untuk menganalisis pasar.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── HISTORY TABLE ─────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-800 overflow-hidden" style={{ background: "#0f0f1a" }}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-amber-400" /> Scan History
          </div>
          <span className="text-[10px] font-black text-slate-600 px-3 py-1.5 bg-slate-800 rounded-full">
            {history.length} signals
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900/50 text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Setup</th>
                <th className="px-6 py-4 text-center">Bias</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4 text-center">Structure</th>
                <th className="px-6 py-4 text-center">Zone</th>
                <th className="px-6 py-4 text-center">Entry</th>
                <th className="px-6 py-4 text-center">SL / TP1</th>
                <th className="px-6 py-4 text-center">Pivot P</th>
                <th className="px-6 py-4 text-center">Session</th>
                <th className="px-6 py-4 text-center">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-slate-600 text-sm">
                    Belum ada sinyal. Klik <strong className="text-amber-400">⚡ Scan {tfCfg.short}</strong> untuk memulai analisis.
                  </td>
                </tr>
              ) : history.map((s) => {
                const biasIcon = s.bias === "BUY"
                  ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                  : s.bias === "SELL"
                    ? <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
                    : <Minus className="h-3.5 w-3.5 text-slate-500" />;
                const biasColor2 = s.bias === "BUY" ? "text-emerald-400" : s.bias === "SELL" ? "text-rose-400" : "text-slate-400";
                return (
                  <tr key={s.nomor} className="hover:bg-slate-800/20 transition-all group">
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {new Date(s.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-300 font-medium max-w-[180px] truncate block" title={s.setup}>{s.setup}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {biasIcon}
                        <span className={`text-xs font-black ${biasColor2}`}>{s.bias}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(s.score / MAX_SCORE) * 100}%`,
                              background: s.score >= 10 ? "#10b981" : s.score >= 6 ? "#f59e0b" : "#ef4444"
                            }}
                          />
                        </div>
                        <span className="text-xs font-black text-white">{s.score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-bold ${STRUCTURE_LABELS[s.structure]?.color ?? "text-slate-500"}`}>
                        {STRUCTURE_LABELS[s.structure]?.label ?? s.structure}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${ZONE_STYLES[s.zone] ?? "text-slate-400"}`}>
                        {s.zone}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-amber-400 font-bold">
                      {fmtPrice(s.entry_price)}
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-mono">
                      <span className="text-rose-400">{fmtPrice(s.stop_loss)}</span>
                      <span className="text-slate-600 mx-1">/</span>
                      <span className="text-emerald-400">{fmtPrice(s.take_profit1)}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-amber-500 font-bold">
                      {fmtPrice(s.pivot_p)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-bold text-slate-400">{s.session}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <a
                        href={`https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD&interval=${TV_INTERVAL[activeTF] ?? '5'}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all hover:opacity-80"
                        style={{ background: "#1a1a00", border: "1px solid #f59e0b33", color: "#f59e0b" }}
                      >
                        {tfCfg.short} Chart <ChevronRight className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── GUIDE SECTION ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {[
          {
            icon: <BarChart2 className="h-5 w-5 text-amber-400" />,
            title: "BOS vs CHoCH",
            items: [
              "BOS (Break of Structure) = Konfirmasi kelanjutan tren",
              "CHoCH (Change of Character) = Sinyal pembalikan arah",
              "HH/HL = Uptrend | LL/LH = Downtrend",
              "Tunggu retrace ke OB setelah BOS/CHoCH"
            ]
          },
          {
            icon: <Crosshair className="h-5 w-5 text-violet-400" />,
            title: "Liquidity & Order Block",
            items: [
              "Liquidity Sweep = SM ambil order stop loss retail",
              "Bullish OB = Candle bearish terakhir sebelum BOS naik",
              "Bearish OB = Candle bullish terakhir sebelum BOS turun",
              "Entry terbaik saat harga pullback ke OB",
            ]
          },
          {
            icon: <Target className="h-5 w-5 text-emerald-400" />,
            title: "Session & Pivot",
            items: [
              "Weekly: SL 2×ATR — position trade",
              "Daily: SL 1.5×ATR — swing trade, target 3-7 hari",
              "H4: SL 1×ATR — intraday swing",
              "H1: SL 0.7×ATR — intraday",
              "5M: SL 0.5×ATR — scalp ketat",
              "Pivot P = Equilibrium level harian"
            ]
          }
        ].map((guide, i) => (
          <div key={i} className="rounded-3xl border border-slate-800 p-6" style={{ background: "#0f0f1a" }}>
            <div className="flex items-center gap-2 mb-4">
              {guide.icon}
              <h3 className="text-sm font-black text-white uppercase tracking-wider">{guide.title}</h3>
            </div>
            <ul className="space-y-2">
              {guide.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                  <ChevronRight className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
