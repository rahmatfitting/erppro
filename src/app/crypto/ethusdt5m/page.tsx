"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCcw, Zap, TrendingUp, TrendingDown, Clock,
  Target, ShieldCheck, Activity, Crosshair, Radio,
  ChevronRight, BarChart2, FileDown, Layers,
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
  pivotS1?: number; pivotS2?: number; pivotS3?: number;
  pivotR1?: number; pivotR2?: number; pivotR3?: number;
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
  EQUILIBRIUM: "text-sky-400 bg-sky-500/10 border-sky-500/30",
};

const STRUCTURE_LABELS: Record<string, { label: string; color: string }> = {
  BOS_BULL:   { label: "BOS Bullish",  color: "text-emerald-400" },
  BOS_BEAR:   { label: "BOS Bearish",  color: "text-rose-400" },
  CHoCH_BULL: { label: "CHoCH Bull",   color: "text-teal-400" },
  CHoCH_BEAR: { label: "CHoCH Bear",   color: "text-orange-400" },
  NONE:       { label: "No Structure", color: "text-slate-500" },
};

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtPrice(v?: number | string | null, dec = 2) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function getRR(entry?: number, sl?: number, tp?: number) {
  if (!entry || !sl || !tp) return "—";
  const risk = Math.abs(entry - sl), reward = Math.abs(tp - entry);
  return risk === 0 ? "—" : `1 : ${(reward / risk).toFixed(1)}`;
}

/* ─── Score Gauge ───────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(100, (score / MAX_SCORE) * 100);
  const color = score >= 10 ? "#6366f1" : score >= 6 ? "#38bdf8" : "#ef4444";
  const circ  = 2 * Math.PI * 44;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx="50" cy="50" r="44" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
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

/* ─── Pivot Bar ─────────────────────────────────────────────── */
function PivotBar({ label, price, currentPrice, color }: { label: string; price?: number; currentPrice: number; color: string }) {
  if (!price) return null;
  const distance = currentPrice - price;
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/50 hover:bg-slate-800/30 px-2 rounded-lg transition-all">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black uppercase tracking-widest w-14 ${color}`}>{label}</span>
        <span className="text-sm font-black text-white font-mono">{fmtPrice(price)}</span>
      </div>
      <span className={`text-[10px] font-bold font-mono ${distance > 0 ? "text-emerald-400" : "text-rose-400"}`}>
        {distance > 0 ? "▲" : "▼"} {Math.abs(distance).toFixed(2)}
      </span>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ETHUSDT5MPage() {
  const [live, setLive]       = useState<LiveData | null>(null);
  const [history, setHistory] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown]     = useState(60);
  const [lastScan, setLastScan]       = useState("");

  const fetchHistory = useCallback(async () => {
    try {
      const res  = await fetch("/api/crypto/ethusdt5m");
      const data = await res.json();
      if (data.success) setHistory(data.data || []);
    } catch (err) { console.error(err); }
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res  = await fetch("/api/crypto/ethusdt5m/scan");
      const data = await res.json();
      if (data.success && data.data) {
        setLive(data.data);
        setLastScan(new Date().toLocaleTimeString("id-ID"));
        await fetchHistory();
      }
    } catch (err) { console.error(err); }
    finally { setScanning(false); }
  }, [fetchHistory]);

  useEffect(() => {
    (async () => { setLoading(true); await fetchHistory(); await runScan(); setLoading(false); })();
  }, []);

  useEffect(() => {
    if (!autoRefresh) { setCountdown(60); return; }
    setCountdown(60);
    const tick = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { runScan(); return 60; } return prev - 1; });
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRefresh, runScan]);

  const handleExport = () => {
    if (!history.length) return;
    exportToExcel({
      title: "ETHUSDT 5M Scalping Signals",
      subtitle: `Generated: ${new Date().toLocaleString("id-ID")}`,
      fileName: `ETHUSDT_5M_${new Date().toISOString().split("T")[0]}`,
      columns: [
        { header: "Setup",       key: "setup" },
        { header: "Bias",        key: "bias" },
        { header: "Confidence",  key: "confidence" },
        { header: "Score",       key: "score" },
        { header: "Entry",       key: "entry_price",   format: (v) => parseFloat(v).toFixed(2) },
        { header: "SL",          key: "stop_loss",     format: (v) => parseFloat(v).toFixed(2) },
        { header: "TP1",         key: "take_profit1",  format: (v) => parseFloat(v).toFixed(2) },
        { header: "Session",     key: "session" },
        { header: "Structure",   key: "structure" },
        { header: "Zone",        key: "zone" },
        { header: "Time",        key: "created_at",    format: (v) => new Date(v).toLocaleString("id-ID") },
      ],
      data: history,
    });
  };

  const currentPrice = live?.entry ?? 0;
  const biasTextColor = live?.bias === "BUY" ? "text-emerald-400" : live?.bias === "SELL" ? "text-rose-400" : "text-slate-400";
  const biasGlowStyle = live?.bias === "BUY"
    ? { textShadow: "0 0 40px #10b98166" }
    : live?.bias === "SELL"
    ? { textShadow: "0 0 40px #ef444466" }
    : {};

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#08080F", color: "#e2e8f0" }}>

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden p-8 mb-6 rounded-3xl border"
        style={{ background: "linear-gradient(135deg, #0d0b1e 0%, #111827 60%, #0a0a1a 100%)", borderColor: "#6366f122" }}
      >
        {/* ETH glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, #6366f1 0%, #818cf8 40%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-4 w-56 h-56 opacity-5 pointer-events-none">
          <Crosshair className="w-full h-full text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <Radio className="h-3 w-3 animate-pulse" /> ETHUSDT — Smart Money Scalping Engine • 5M
              </span>
              {live?.isLive !== undefined && (
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${live.isLive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                  {live.isLive ? "● LIVE BINANCE" : "◐ DEMO"}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-black tracking-tight"
              style={{ background: "linear-gradient(90deg, #818cf8, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ETH/USDT 5M SCALPER
            </h1>
            <p className="text-slate-400 text-sm max-w-lg leading-relaxed font-medium">
              Deteksi BOS · CHoCH · Liquidity Sweep · Order Block · Pivot P/S/R · Premium-Discount Zone ·
              Volume Spike · Session Killzone pada TF 5 Menit Binance.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAutoRefresh(p => !p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${autoRefresh ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"}`}
            >
              <Clock className="h-3.5 w-3.5" />
              {autoRefresh ? `Auto ${countdown}s` : "Auto OFF"}
            </button>
            <button onClick={fetchHistory} className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all" title="Refresh">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleExport} disabled={!history.length} className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-30" title="Export Excel">
              <FileDown className="h-4 w-4" />
            </button>
            <button
              onClick={runScan} disabled={scanning}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm text-white disabled:opacity-50 transition-all shadow-lg"
              style={{ background: scanning ? "#334155" : "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: scanning ? "none" : "0 0 24px rgba(99,102,241,0.4)" }}
            >
              {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {scanning ? "Scanning 5M..." : "⚡ Scan ETH 5M"}
            </button>
          </div>
        </div>

        {lastScan && (
          <div className="relative z-10 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Last scan: {lastScan} · Session: {live?.session ?? "—"} · ATR(14): {live?.atr?.toFixed(2) ?? "—"}
          </div>
        )}
      </div>

      {loading && !live && (
        <div className="py-24 text-center text-indigo-400 font-black animate-pulse uppercase tracking-widest text-sm">
          Initializing ETH SMC Engine via Binance...
        </div>
      )}

      {live && (
        <>
          {/* ── MAIN SIGNAL ROW ─────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5">

            {/* BIAS ── 3 cols */}
            <div
              className="xl:col-span-3 rounded-3xl border p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden"
              style={{ background: "#0d0b1e", borderColor: live.bias === "BUY" ? "#10b98133" : live.bias === "SELL" ? "#ef444433" : "#33415533" }}
            >
              <div className={`absolute inset-0 opacity-5 blur-3xl ${live.bias === "BUY" ? "bg-emerald-500" : live.bias === "SELL" ? "bg-rose-500" : "bg-slate-500"}`} />
              <div className="relative z-10 text-center space-y-2">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Market Bias • ETH/USDT</div>
                <div className={`text-6xl font-black ${biasTextColor}`} style={biasGlowStyle}>
                  {live.bias === "BUY" ? "▲" : live.bias === "SELL" ? "▼" : "–"}
                </div>
                <div className={`text-3xl font-black uppercase tracking-widest ${biasTextColor}`}>{live.bias}</div>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border inline-block ${live.confidence === "HIGH" ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : live.confidence === "MEDIUM" ? "bg-sky-500/15 text-sky-300 border-sky-500/30" : "bg-slate-700/50 text-slate-400 border-slate-600"}`}>
                  {live.confidence} Confidence
                </div>
              </div>
            </div>

            {/* SCORE + DETAIL ── 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border border-slate-800 p-6 flex flex-col gap-5" style={{ background: "#0d0b1e" }}>
              <div className="flex items-center gap-4">
                <ScoreGauge score={live.score} />
                <div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Signal Score</div>
                  <div className="text-xs font-bold text-slate-300">
                    {live.score >= 10 ? "🔥 Strong Confluence" : live.score >= 6 ? "⚡ Moderate" : "⏳ Wait Signal"}
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Structure", val: <span className={`text-xs font-black ${STRUCTURE_LABELS[live.structure]?.color ?? "text-slate-400"}`}>{STRUCTURE_LABELS[live.structure]?.label ?? live.structure}</span> },
                  { label: "Zone", val: <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${ZONE_STYLES[live.zone] ?? "text-slate-400"}`}>{live.zone}</span> },
                  { label: "Sweep", val: <span className="text-xs font-bold text-sky-400">{live.sweepType === "SWEEP_LOW" ? "💧 Low" : live.sweepType === "SWEEP_HIGH" ? "💧 High" : "—"}</span> },
                  { label: "Order Block", val: <span className="text-xs font-bold text-violet-400">{live.orderBlock ? fmtPrice(live.orderBlock) : "—"}</span> },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                    {val}
                  </div>
                ))}
              </div>
            </div>

            {/* ENTRY / SL / TP ── 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between gap-4" style={{ background: "#0d0b1e" }}>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Target className="h-3 w-3 text-indigo-400" /> Trade Levels (Scalp 5M)
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
                  <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Entry Price</div>
                  <div className="text-xl font-black text-indigo-300 font-mono">{fmtPrice(live.entry)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
                    <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Stop Loss</div>
                    <div className="text-sm font-black text-rose-300 font-mono">{fmtPrice(live.sl)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">TP1 (1:2)</div>
                    <div className="text-sm font-black text-emerald-300 font-mono">{fmtPrice(live.tp1)}</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-teal-500/20 bg-teal-500/5 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-black text-teal-400 uppercase tracking-widest">TP2 (1:3)</div>
                    <div className="text-sm font-black text-teal-300 font-mono">{fmtPrice(live.tp2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black text-slate-500 uppercase">Risk:Reward</div>
                    <div className="text-sm font-black text-indigo-400">{getRR(live.entry, live.sl, live.tp1)}</div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-600 px-1">
                ATR(14): <span className="text-indigo-400 font-mono">{live.atr?.toFixed(4) ?? "—"}</span> · SL = 0.5 × ATR
              </div>
            </div>

            {/* PIVOT PANEL ── 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border border-slate-800 p-6" style={{ background: "#0d0b1e" }}>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Layers className="h-3 w-3 text-indigo-400" /> Pivot Levels (Daily)
              </div>
              <div className="space-y-0.5">
                <PivotBar label="R3" price={live.pivotR3} currentPrice={currentPrice} color="text-red-300" />
                <PivotBar label="R2" price={live.pivotR2} currentPrice={currentPrice} color="text-rose-400" />
                <PivotBar label="R1" price={live.pivotR1} currentPrice={currentPrice} color="text-orange-400" />
                {/* Pivot P */}
                <div className="flex items-center justify-between py-2 px-2 rounded-xl my-1" style={{ background: "#0d1120", border: "1px solid #6366f133" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 w-14">PIVOT</span>
                    <span className="text-sm font-black text-indigo-300 font-mono">{fmtPrice(live.pivotP)}</span>
                  </div>
                  <span className="text-[9px] font-black text-indigo-500 uppercase">Equilibrium</span>
                </div>
                <PivotBar label="S1" price={live.pivotS1} currentPrice={currentPrice} color="text-sky-400" />
                <PivotBar label="S2" price={live.pivotS2} currentPrice={currentPrice} color="text-blue-400" />
                <PivotBar label="S3" price={live.pivotS3} currentPrice={currentPrice} color="text-violet-400" />
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Current Price</span>
                <span className="text-sm font-black text-white font-mono">{fmtPrice(currentPrice)}</span>
              </div>
            </div>
          </div>

          {/* ── REASONING LOG ─────────────────────────────────── */}
          <div className="rounded-3xl border border-slate-800 p-6 mb-5" style={{ background: "#0d0b1e" }}>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> AI Signal Reasoning Log
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {live.reasoning.length === 0
                ? <p className="text-slate-500 text-sm col-span-3 text-center py-6">Tidak ada reasoning. Klik Scan untuk memulai.</p>
                : live.reasoning.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-800/20 hover:bg-slate-800/40 transition-all">
                    <div className="h-6 w-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0 border border-indigo-500/20">{i + 1}</div>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">{r}</p>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* ── HISTORY TABLE ─────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-800 overflow-hidden mb-5" style={{ background: "#0d0b1e" }}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-indigo-400" /> Scan History – ETHUSDT 5M
          </div>
          <span className="text-[10px] font-black text-slate-600 px-3 py-1.5 bg-slate-800 rounded-full">{history.length} signals</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900/50 text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                {["Time","Setup","Bias","Score","Structure","Zone","Entry","SL / TP1","Pivot P","Session","Chart"].map(h => (
                  <th key={h} className={`px-5 py-4 ${["Bias","Score","Structure","Zone","Entry","SL / TP1","Pivot P","Session","Chart"].includes(h) ? "text-center" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {history.length === 0
                ? <tr><td colSpan={11} className="px-6 py-16 text-center text-slate-600 text-sm">Belum ada sinyal. Klik <strong className="text-indigo-400">⚡ Scan ETH 5M</strong> untuk mulai.</td></tr>
                : history.map((s) => {
                  const biasIcon = s.bias === "BUY" ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /> : s.bias === "SELL" ? <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" /> : <Minus className="h-3.5 w-3.5 text-slate-500" />;
                  const bc = s.bias === "BUY" ? "text-emerald-400" : s.bias === "SELL" ? "text-rose-400" : "text-slate-400";
                  return (
                    <tr key={s.nomor} className="hover:bg-slate-800/20 transition-all">
                      <td className="px-5 py-4 text-xs text-slate-500 font-mono">
                        {new Date(s.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-5 py-4 max-w-[180px]">
                        <span className="text-xs text-slate-300 font-medium truncate block" title={s.setup}>{s.setup || "—"}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">{biasIcon}<span className={`text-xs font-black ${bc}`}>{s.bias}</span></div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(s.score / MAX_SCORE) * 100}%`, background: s.score >= 10 ? "#6366f1" : s.score >= 6 ? "#38bdf8" : "#ef4444" }} />
                          </div>
                          <span className="text-xs font-black text-white">{s.score}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-xs font-bold ${STRUCTURE_LABELS[s.structure]?.color ?? "text-slate-500"}`}>
                          {STRUCTURE_LABELS[s.structure]?.label ?? s.structure}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${ZONE_STYLES[s.zone] ?? "text-slate-400"}`}>{s.zone}</span>
                      </td>
                      <td className="px-5 py-4 text-center font-mono text-xs text-indigo-300 font-bold">{fmtPrice(s.entry_price)}</td>
                      <td className="px-5 py-4 text-center text-xs font-mono">
                        <span className="text-rose-400">{fmtPrice(s.stop_loss)}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-emerald-400">{fmtPrice(s.take_profit1)}</span>
                      </td>
                      <td className="px-5 py-4 text-center font-mono text-xs text-indigo-500 font-bold">{fmtPrice(s.pivot_p)}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-[10px] font-bold text-slate-400">{s.session}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <a href="https://www.tradingview.com/chart/?symbol=BINANCE:ETHUSDT&interval=5" target="_blank"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all hover:opacity-80"
                          style={{ background: "#0d1120", border: "1px solid #6366f133", color: "#818cf8" }}>
                          Chart <ChevronRight className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── GUIDE ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: <BarChart2 className="h-5 w-5 text-indigo-400" />,
            title: "BOS vs CHoCH",
            color: "text-indigo-400",
            items: ["BOS = Trend continuation (HH/HL atau LL/LH baru)", "CHoCH = Trend reversal signal (karakter berubah)", "Tunggu retrace ke OB setelah BOS/CHoCH", "Volume spike saat BOS = konfirmasi lebih kuat"],
          },
          {
            icon: <Crosshair className="h-5 w-5 text-violet-400" />,
            title: "Liquidity & Order Block",
            color: "text-violet-400",
            items: ["Sweep Low = Smart money ambil liq sell-stop retail", "Bullish OB = Last bearish candle sebelum impulse naik", "Bearish OB = Last bullish candle sebelum impulse turun", "Masuk saat harga pullback ke OB + konfirmasi candle"],
          },
          {
            icon: <Target className="h-5 w-5 text-sky-400" />,
            title: "Session & Risk Management",
            color: "text-sky-400",
            items: ["London 14:00-17:00 WIB, NY 19:00-23:00 WIB", "Overlap 19:00-21:00 WIB = momen paling volatil ETH", "Discount Zone + BOS Bull = BUY confluence terbaik", "SL = 0.5×ATR (scalp ketat), TP = 2×risk & 3×risk"],
          },
        ].map((g, i) => (
          <div key={i} className="rounded-3xl border border-slate-800 p-6" style={{ background: "#0d0b1e" }}>
            <div className="flex items-center gap-2 mb-4">{g.icon}<h3 className={`text-sm font-black uppercase tracking-wider ${g.color}`}>{g.title}</h3></div>
            <ul className="space-y-2">
              {g.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                  <ChevronRight className="h-3 w-3 text-indigo-500 mt-0.5 shrink-0" />{item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
