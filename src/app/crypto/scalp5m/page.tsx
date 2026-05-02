"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCcw, Zap, Target, ShieldCheck, Activity, Crosshair,
  Radio, ChevronRight, BarChart2, FileDown, Layers,
  ArrowUpRight, ArrowDownRight, Minus, Clock
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

/* ─── Pair Config ────────────────────────────────────────────── */
const PAIRS: PairConfig[] = [
  { symbol: "BTCUSDT", label: "BTC/USDT", emoji: "₿",  primary: "#f97316", secondary: "#ea580c", glow: "rgba(249,115,22,0.4)",   border: "#f9731622", bg: "#120a00" },
  { symbol: "ETHUSDT", label: "ETH/USDT", emoji: "Ξ",  primary: "#6366f1", secondary: "#4f46e5", glow: "rgba(99,102,241,0.4)",   border: "#6366f122", bg: "#04040f" },
  { symbol: "BNBUSDT", label: "BNB/USDT", emoji: "🔶", primary: "#eab308", secondary: "#ca8a04", glow: "rgba(234,179,8,0.4)",   border: "#eab30822", bg: "#100f00" },
  { symbol: "XRPUSDT", label: "XRP/USDT", emoji: "◈",  primary: "#3b82f6", secondary: "#2563eb", glow: "rgba(59,130,246,0.4)", border: "#3b82f622", bg: "#00080f" },
  { symbol: "TRXUSDT", label: "TRX/USDT", emoji: "🔺", primary: "#ef4444", secondary: "#dc2626", glow: "rgba(239,68,68,0.4)",   border: "#ef444422", bg: "#100000" },
  { symbol: "SOLUSDT", label: "SOL/USDT", emoji: "◎",  primary: "#a855f7", secondary: "#9333ea", glow: "rgba(168,85,247,0.4)", border: "#a855f722", bg: "#09000f" },
];

/* ─── Timeframe Config ──────────────────────────────────────── */
const TIMEFRAMES = [
  { interval: "1w", label: "Weekly", short: "1W", slLabel: "2×ATR",  risk: "Swing/Position" },
  { interval: "1d", label: "Daily",  short: "1D", slLabel: "1.5×ATR",risk: "Swing" },
  { interval: "4h", label: "H4",     short: "4H", slLabel: "1×ATR",  risk: "Intraday Swing" },
  { interval: "1h", label: "H1",     short: "1H", slLabel: "0.7×ATR",risk: "Intraday" },
  { interval: "5m", label: "5M",     short: "5M", slLabel: "0.5×ATR",risk: "Scalp" },
];

const TV_INTERVAL: Record<string, string> = { '1w': '1W', '1d': '1D', '4h': '240', '1h': '60', '5m': '5' };

interface PairConfig {
  symbol: string; label: string; emoji: string;
  primary: string; secondary: string; glow: string;
  border: string; bg: string;
}

/* ─── Types ─────────────────────────────────────────────────── */
interface Signal {
  nomor: number; setup: string; session: string; score: number;
  bias: "BUY" | "SELL" | "WAIT"; confidence: "HIGH" | "MEDIUM" | "LOW";
  entry_price: string; stop_loss: string; take_profit1: string; take_profit2: string;
  pivot_p: string; pivot_s1: string; pivot_r1: string;
  atr: string; structure: string; zone: string; reasoning: string; created_at: string;
}

interface LiveData {
  pair: string; timeframe: string; setup: string; session: string;
  score: number; bias: "BUY" | "SELL" | "WAIT"; confidence: "HIGH" | "MEDIUM" | "LOW";
  isLive: boolean; entry?: number; sl?: number; tp1?: number; tp2?: number; atr?: number;
  pivotP?: number; pivotS1?: number; pivotS2?: number; pivotS3?: number;
  pivotR1?: number; pivotR2?: number; pivotR3?: number;
  structure: string; zone: string; orderBlock?: number; sweepType?: string;
  reasoning: string[];
}

/* ─── Constants ─────────────────────────────────────────────── */
const MAX_SCORE = 15;

const STRUCTURE_LABELS: Record<string, { label: string; icon: string }> = {
  BOS_BULL:   { label: "BOS Bullish",  icon: "🔥" },
  BOS_BEAR:   { label: "BOS Bearish",  icon: "🔥" },
  CHoCH_BULL: { label: "CHoCH Bull",   icon: "🔄" },
  CHoCH_BEAR: { label: "CHoCH Bear",   icon: "🔄" },
  NONE:       { label: "No Structure", icon: "—" },
};

const ZONE_STYLE: Record<string, string> = {
  PREMIUM:     "text-rose-400 bg-rose-500/10 border-rose-500/30",
  DISCOUNT:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  EQUILIBRIUM: "text-sky-400 bg-sky-500/10 border-sky-500/30",
};

/* ─── Helpers ────────────────────────────────────────────────── */
function fmt(v?: number | string | null, dec = 4) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  // Auto-adjust decimals for high-value coins like BTC
  if (n > 10000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n > 100)   return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toFixed(dec);
}

function getRR(entry?: number, sl?: number, tp?: number) {
  if (!entry || !sl || !tp) return "—";
  const risk = Math.abs(entry - sl), rwd = Math.abs(tp - entry);
  return risk === 0 ? "—" : `1 : ${(rwd / risk).toFixed(1)}`;
}

/* ─── Score Gauge ───────────────────────────────────────────── */
function ScoreGauge({ score, color }: { score: number; color: string }) {
  const pct = Math.min(100, (score / MAX_SCORE) * 100);
  const c = 2 * Math.PI * 40;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="#1e293b" strokeWidth="9" />
        <circle cx="48" cy="48" r="40" fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-white leading-none">{score}</span>
        <span className="text-[8px] font-bold text-slate-500 uppercase">/{MAX_SCORE}</span>
      </div>
    </div>
  );
}

/* ─── Pivot Row ─────────────────────────────────────────────── */
function PivotRow({ label, price, cur, color }: { label: string; price?: number; cur: number; color: string }) {
  if (!price) return null;
  const diff = cur - price;
  return (
    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-800/30 rounded-lg transition-all border-b border-slate-800/30">
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-black uppercase w-12 ${color}`}>{label}</span>
        <span className="text-xs font-black text-white font-mono">{fmt(price)}</span>
      </div>
      <span className={`text-[9px] font-mono ${diff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
        {diff > 0 ? "▲" : "▼"}{Math.abs(diff).toFixed(Math.abs(price) > 100 ? 2 : 4)}
      </span>
    </div>
  );
}

/* ─── Pair Tab ──────────────────────────────────────────────── */
function PairTab({ cfg, active, live, onClick }: { cfg: PairConfig; active: boolean; live?: LiveData; onClick: () => void }) {
  const biasColor = live?.bias === "BUY" ? "#10b981" : live?.bias === "SELL" ? "#ef4444" : "#64748b";
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all border font-black"
      style={{
        background: active ? cfg.bg : "transparent",
        borderColor: active ? cfg.primary + "44" : "#1e293b",
        boxShadow: active ? `0 0 20px ${cfg.glow}` : "none",
      }}
    >
      <span className="text-lg leading-none">{cfg.emoji}</span>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: active ? cfg.primary : "#64748b" }}>
        {cfg.symbol.replace("USDT", "")}
      </span>
      {live && (
        <span className="text-[8px] font-black uppercase" style={{ color: biasColor }}>
          {live.bias}
        </span>
      )}
      {live?.confidence === "HIGH" && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
      )}
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function Scalp5MPage() {
  const [activePair, setActivePair] = useState<string>("BTCUSDT");
  const [activeTF, setActiveTF]     = useState<string>("5m");   // ← Timeframe state
  const [liveMap, setLiveMap]       = useState<Record<string, LiveData>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, Signal[]>>({});
  const [scanning, setScanning]     = useState<string | null>(null);
  const [loadingPairs, setLoadingPairs] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh]   = useState(false);
  const [countdown, setCountdown]       = useState(60);
  const [lastScan, setLastScan]         = useState<Record<string, string>>({});

  const cfg        = PAIRS.find(p => p.symbol === activePair)!;
  const tfCfg      = TIMEFRAMES.find(t => t.interval === activeTF)!;
  const liveKey    = `${activePair}_${activeTF}`;
  const live       = liveMap[liveKey];
  const history    = historyMap[liveKey] ?? [];

  /* fetch history for a pair + TF */
  const fetchHistory = useCallback(async (pair: string, tf: string) => {
    try {
      const res  = await fetch(`/api/crypto/scalp5m?pair=${pair}&interval=${tf}`);
      const data = await res.json();
      if (data.success) setHistoryMap(prev => ({ ...prev, [`${pair}_${tf}`]: data.data || [] }));
    } catch {}
  }, []);

  /* scan one pair + TF */
  const runScan = useCallback(async (pair: string, tf: string) => {
    const key = `${pair}_${tf}`;
    setScanning(key);
    setLoadingPairs(prev => new Set(prev).add(key));
    try {
      const res  = await fetch(`/api/crypto/scalp5m/scan?pair=${pair}&interval=${tf}`);
      const data = await res.json();
      if (data.success && data.data) {
        setLiveMap(prev   => ({ ...prev, [key]: data.data }));
        setLastScan(prev  => ({ ...prev, [key]: new Date().toLocaleTimeString("id-ID") }));
        await fetchHistory(pair, tf);
      }
    } catch {}
    finally {
      setScanning(null);
      setLoadingPairs(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  }, [fetchHistory]);

  /* scan ALL pairs on current TF */
  const scanAll = useCallback(async () => {
    for (const p of PAIRS) await runScan(p.symbol, activeTF);
  }, [runScan, activeTF]);

  /* initial load — default TF 5m */
  useEffect(() => {
    (async () => {
      for (const p of PAIRS) { await fetchHistory(p.symbol, '5m'); await runScan(p.symbol, '5m'); }
    })();
  }, []);

  /* Re-fetch when TF or pair changes */
  useEffect(() => {
    if (!liveMap[`${activePair}_${activeTF}`]) {
      runScan(activePair, activeTF);
    } else {
      fetchHistory(activePair, activeTF);
    }
  }, [activeTF, activePair]);

  /* auto-refresh countdown */
  useEffect(() => {
    if (!autoRefresh) { setCountdown(60); return; }
    setCountdown(60);
    const tick = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { runScan(activePair, activeTF); return 60; } return prev - 1; });
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRefresh, activePair, activeTF, runScan]);

  const handleExport = () => {
    if (!history.length) return;
    exportToExcel({
      title: `${activePair} [${tfCfg.label}] SMC Signals`,
      subtitle: `Generated: ${new Date().toLocaleString("id-ID")}`,
      fileName: `${activePair}_${tfCfg.short}_${new Date().toISOString().split("T")[0]}`,
      columns: [
        { header: "Setup",      key: "setup" },
        { header: "Bias",       key: "bias" },
        { header: "Confidence", key: "confidence" },
        { header: "Score",      key: "score" },
        { header: "Entry",      key: "entry_price",  format: (v) => parseFloat(v).toFixed(4) },
        { header: "SL",         key: "stop_loss",    format: (v) => parseFloat(v).toFixed(4) },
        { header: "TP1",        key: "take_profit1", format: (v) => parseFloat(v).toFixed(4) },
        { header: "Session",    key: "session" },
        { header: "Structure",  key: "structure" },
        { header: "Zone",       key: "zone" },
        { header: "Time",       key: "created_at",   format: (v) => new Date(v).toLocaleString("id-ID") },
      ],
      data: history,
    });
  };

  const cur = live?.entry ?? 0;
  const biasColor   = live?.bias === "BUY" ? "#10b981" : live?.bias === "SELL" ? "#ef4444" : "#64748b";
  const scanningKey = `${activePair}_${activeTF}`;

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#08080F", color: "#e2e8f0" }}>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden p-6 mb-5 rounded-3xl border"
        style={{ background: "linear-gradient(135deg, #0a0a12 0%, #0d0d18 100%)", borderColor: cfg.primary + "22" }}
      >
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-20 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${cfg.primary}, transparent)` }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Radio className="h-3 w-3 animate-pulse" style={{ color: cfg.primary }} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: cfg.primary }}>
                Multi-Pair · Multi-Timeframe · SMC Engine · Binance Live
              </span>
              {live?.isLive !== undefined && (
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${live.isLive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                  {live.isLive ? "● LIVE" : "◐ DEMO"}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight"
              style={{ background: `linear-gradient(90deg, ${cfg.primary}, ${cfg.secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CRYPTO SMC SCREENER · <span style={{ background: `linear-gradient(90deg, ${cfg.secondary}, #94a3b8)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{tfCfg.label.toUpperCase()}</span>
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              BOS · CHoCH · Liq.Sweep · OB · Pivot P/S/R · Zone · Vol.Spike · Session Killzone
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh(p => !p)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all"
              style={{ background: autoRefresh ? cfg.primary + "15" : "transparent", borderColor: autoRefresh ? cfg.primary + "44" : "#334155", color: autoRefresh ? cfg.primary : "#64748b" }}
            >
              <Clock className="h-3.5 w-3.5" />
              {autoRefresh ? `Auto ${countdown}s` : "Auto OFF"}
            </button>
            <button onClick={handleExport} disabled={!history.length} className="p-2 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white transition-all disabled:opacity-30">
              <FileDown className="h-4 w-4" />
            </button>
            <button
              onClick={() => runScan(activePair, activeTF)}
              disabled={scanning === scanningKey}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${cfg.secondary}, ${cfg.primary})`, boxShadow: `0 0 20px ${cfg.glow}` }}
            >
              {scanning === scanningKey ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Scan [{tfCfg.short}]
            </button>
            <button
              onClick={scanAll}
              disabled={!!scanning}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs text-white border border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 transition-all disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
              Scan ALL [{tfCfg.short}]
            </button>
          </div>
        </div>

        {/* Timeframe Tabs */}
        <div className="relative z-10 mt-5 flex items-center gap-2 flex-wrap">
          {TIMEFRAMES.map(tf => (
            <button key={tf.interval} onClick={() => setActiveTF(tf.interval)}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
              style={{
                background:   activeTF === tf.interval ? cfg.primary + '22' : 'transparent',
                borderColor:  activeTF === tf.interval ? cfg.primary + '55' : '#334155',
                color:        activeTF === tf.interval ? cfg.primary : '#64748b',
                boxShadow:    activeTF === tf.interval ? `0 0 12px ${cfg.glow}` : 'none',
              }}>
              {tf.short}
              <span className="ml-1 text-[8px] opacity-60 normal-case font-medium">{tf.risk}</span>
            </button>
          ))}
          <div className="h-4 w-px bg-slate-700 mx-1" />
          {/* Pair Tabs */}
          {PAIRS.map(p => (
            <PairTab key={p.symbol} cfg={p} active={activePair === p.symbol}
              live={liveMap[`${p.symbol}_${activeTF}`]} onClick={() => setActivePair(p.symbol)} />
          ))}
          {lastScan[scanningKey] && (
            <div className="ml-auto self-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              {tfCfg.label} · Last: {lastScan[scanningKey]} · {live?.session ?? '—'}
            </div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loadingPairs.has(scanningKey) && !live && (
        <div className="py-20 text-center font-black animate-pulse uppercase tracking-widest text-sm" style={{ color: cfg.primary }}>
          Scanning {activePair} [{tfCfg.label}] via Binance...
        </div>
      )}

      {live && (
        <>
          {/* ── SIGNAL CARDS ────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">

            {/* BIAS ── 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border p-6 flex flex-col items-center justify-center gap-3"
              style={{ background: cfg.bg, borderColor: live.bias === "BUY" ? "#10b98133" : live.bias === "SELL" ? "#ef444433" : "#33415533" }}>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{activePair} · {tfCfg.label} · Bias</div>
              <div className="text-5xl font-black" style={{ color: biasColor, textShadow: `0 0 30px ${biasColor}66` }}>
                {live.bias === "BUY" ? "▲" : live.bias === "SELL" ? "▼" : "–"}
              </div>
              <div className="text-2xl font-black uppercase tracking-widest" style={{ color: biasColor }}>{live.bias}</div>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${live.confidence === "HIGH" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : live.confidence === "MEDIUM" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-slate-700/30 text-slate-500 border-slate-700"}`}>
                {live.confidence} Confidence
              </div>
              <div className="text-[9px] font-bold text-slate-500">
                ATR: <span className="font-mono" style={{ color: cfg.primary }}>{live.atr?.toFixed(4) ?? "—"}</span>
              </div>
            </div>

            {/* SCORE + META ── 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border border-slate-800 p-5 flex flex-col gap-4" style={{ background: "#0a0a12" }}>
              <div className="flex items-center gap-3">
                <ScoreGauge score={live.score} color={cfg.primary} />
                <div>
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">SMC Score</div>
                  <div className="text-xs font-bold" style={{ color: live.score >= 10 ? "#10b981" : live.score >= 6 ? cfg.primary : "#ef4444" }}>
                    {live.score >= 10 ? "🔥 Strong Confluence" : live.score >= 6 ? "⚡ Moderate" : "⏳ Low — Wait"}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { k: "Structure", v: `${STRUCTURE_LABELS[live.structure]?.icon} ${STRUCTURE_LABELS[live.structure]?.label ?? live.structure}` },
                  { k: "Zone",      v: live.zone },
                  { k: "Sweep",     v: live.sweepType === "SWEEP_LOW" ? "💧 Low" : live.sweepType === "SWEEP_HIGH" ? "💧 High" : "—" },
                  { k: "OB Level",  v: live.orderBlock ? fmt(live.orderBlock) : "—" },
                ].map(({ k, v }) => (
                  <div key={k} className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{k}</span>
                    {k === "Zone"
                      ? <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${ZONE_STYLE[live.zone] ?? "text-slate-400"}`}>{v}</span>
                      : <span className="font-bold text-slate-200">{v}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* ENTRY / SL / TP ── 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border border-slate-800 p-5 flex flex-col justify-between gap-3" style={{ background: "#0a0a12" }}>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Target className="h-3 w-3" style={{ color: cfg.primary }} /> Trade Levels · {tfCfg.label}
              </div>
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl border" style={{ borderColor: cfg.primary + "33", background: cfg.primary + "0a" }}>
                  <div className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: cfg.primary }}>Entry</div>
                  <div className="text-lg font-black font-mono" style={{ color: cfg.primary }}>{fmt(live.entry)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/5">
                    <div className="text-[8px] font-black text-rose-400 uppercase mb-0.5">SL</div>
                    <div className="text-sm font-black text-rose-300 font-mono">{fmt(live.sl)}</div>
                  </div>
                  <div className="p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <div className="text-[8px] font-black text-emerald-400 uppercase mb-0.5">TP1</div>
                    <div className="text-sm font-black text-emerald-300 font-mono">{fmt(live.tp1)}</div>
                  </div>
                </div>
                <div className="p-2 rounded-xl border border-teal-500/20 bg-teal-500/5 flex justify-between items-center">
                  <div>
                    <div className="text-[8px] font-black text-teal-400 uppercase">TP2 (1:3)</div>
                    <div className="text-sm font-black text-teal-300 font-mono">{fmt(live.tp2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black text-slate-500">R:R</div>
                    <div className="text-sm font-black" style={{ color: cfg.primary }}>{getRR(live.entry, live.sl, live.tp1)}</div>
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-slate-600">SL = {tfCfg.slLabel} · TP1 = 1:2 · TP2 = 1:3</div>
            </div>

            {/* PIVOT ── 3 cols */}
            <div className="xl:col-span-3 rounded-3xl border border-slate-800 p-5" style={{ background: "#0a0a12" }}>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <Layers className="h-3 w-3" style={{ color: cfg.primary }} /> Pivot Levels · {tfCfg.label}
              </div>
              <div className="space-y-0.5">
                <PivotRow label="R3" price={live.pivotR3} cur={cur} color="text-red-300" />
                <PivotRow label="R2" price={live.pivotR2} cur={cur} color="text-rose-400" />
                <PivotRow label="R1" price={live.pivotR1} cur={cur} color="text-orange-400" />
                <div className="flex items-center justify-between py-1.5 px-2 rounded-xl my-1"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.primary}33` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase w-12" style={{ color: cfg.primary }}>PIVOT</span>
                    <span className="text-xs font-black font-mono" style={{ color: cfg.primary }}>{fmt(live.pivotP)}</span>
                  </div>
                  <span className="text-[8px] font-black text-slate-600 uppercase">Equilibrium</span>
                </div>
                <PivotRow label="S1" price={live.pivotS1} cur={cur} color="text-sky-400" />
                <PivotRow label="S2" price={live.pivotS2} cur={cur} color="text-blue-400" />
                <PivotRow label="S3" price={live.pivotS3} cur={cur} color="text-violet-400" />
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[8px] text-slate-600 uppercase font-black">Current</span>
                <span className="text-xs font-black text-white font-mono">{fmt(cur)}</span>
              </div>
            </div>
          </div>

          {/* ── REASONING ─────────────────────────────────────── */}
          <div className="rounded-3xl border border-slate-800 p-5 mb-4" style={{ background: "#0a0a12" }}>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-4">
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: cfg.primary }} /> AI Reasoning — {activePair} [{tfCfg.label}]
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {live.reasoning.length === 0
                ? <p className="text-slate-600 text-sm col-span-4 text-center py-4">No reasoning. Scan untuk memulai analisis.</p>
                : live.reasoning.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-2xl border border-slate-800 bg-slate-800/20 hover:bg-slate-800/40 transition-all">
                    <div className="h-5 w-5 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 border"
                      style={{ background: cfg.primary + "15", color: cfg.primary, borderColor: cfg.primary + "30" }}>
                      {i + 1}
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{r}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* ── ALL PAIRS SUMMARY ─────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {PAIRS.map(p => {
              const pl = liveMap[`${p.symbol}_${activeTF}`];
              const bc = pl?.bias === "BUY" ? "#10b981" : pl?.bias === "SELL" ? "#ef4444" : "#64748b";
              return (
                <button key={p.symbol} onClick={() => setActivePair(p.symbol)}
                  className="p-3 rounded-2xl border transition-all text-left"
                  style={{ background: p.symbol === activePair ? p.bg : "#0a0a12", borderColor: p.symbol === activePair ? p.primary + "44" : "#1e293b" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: p.primary }}>
                      {p.emoji} {p.symbol.replace("USDT", "")}
                    </span>
                    {pl?.confidence === "HIGH" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  </div>
                  {pl ? (
                    <>
                      <div className="text-base font-black" style={{ color: bc }}>{pl.bias}</div>
                      <div className="text-[9px] text-slate-500 font-mono">{fmt(pl.entry)}</div>
                      <div className="mt-1">
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(pl.score / MAX_SCORE) * 100}%`, background: p.primary }} />
                        </div>
                        <div className="text-[8px] text-slate-600 mt-0.5">{pl.score}/{MAX_SCORE}</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-[9px] text-slate-600 animate-pulse">Loading...</div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── HISTORY TABLE ─────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-800 overflow-hidden mb-4" style={{ background: "#0a0a12" }}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="h-3 w-3" style={{ color: cfg.primary }} />
            Scan History — {activePair} [{tfCfg.label}]
          </div>
          <span className="text-[9px] font-black text-slate-600 px-2 py-1 bg-slate-800 rounded-full">{history.length} signals</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900/60 text-slate-500 text-[8px] font-black uppercase tracking-widest border-b border-slate-800">
                {["Time","Setup","Bias","Score","Structure","Zone","Entry","SL / TP1","Pivot P","Session","Chart"].map(h => (
                  <th key={h} className={`px-4 py-3 ${["Bias","Score","Zone","Entry","SL / TP1","Pivot P","Session","Chart"].includes(h) ? "text-center" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {history.length === 0
                ? <tr><td colSpan={11} className="px-6 py-14 text-center text-slate-600 text-sm">
                    Belum ada sinyal. Klik <strong style={{ color: cfg.primary }}>Scan [{tfCfg.short}]</strong> untuk memulai.
                  </td></tr>
                : history.map(s => {
                  const biasIcon = s.bias === "BUY" ? <ArrowUpRight className="h-3 w-3 text-emerald-400" /> : s.bias === "SELL" ? <ArrowDownRight className="h-3 w-3 text-rose-400" /> : <Minus className="h-3 w-3 text-slate-500" />;
                  const bc = s.bias === "BUY" ? "text-emerald-400" : s.bias === "SELL" ? "text-rose-400" : "text-slate-500";
                  return (
                    <tr key={s.nomor} className="hover:bg-slate-800/20 transition-all text-xs">
                      <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                        {new Date(s.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="text-[11px] text-slate-300 truncate block" title={s.setup}>{s.setup || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">{biasIcon}<span className={`font-black text-[11px] ${bc}`}>{s.bias}</span></div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <div className="h-1 w-10 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(s.score / MAX_SCORE) * 100}%`, background: cfg.primary }} />
                          </div>
                          <span className="font-black text-white text-[11px]">{s.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-slate-400">
                          {STRUCTURE_LABELS[s.structure]?.icon} {STRUCTURE_LABELS[s.structure]?.label ?? s.structure}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${ZONE_STYLE[s.zone] ?? "text-slate-400"}`}>{s.zone}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold" style={{ color: cfg.primary }}>{fmt(s.entry_price)}</td>
                      <td className="px-4 py-3 text-center font-mono text-[11px]">
                        <span className="text-rose-400">{fmt(s.stop_loss)}</span><span className="text-slate-700 mx-1">/</span><span className="text-emerald-400">{fmt(s.take_profit1)}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-[11px]" style={{ color: cfg.secondary }}>{fmt(s.pivot_p)}</td>
                      <td className="px-4 py-3 text-center text-[10px] text-slate-500">{s.session}</td>
                      <td className="px-4 py-3 text-center">
                        <a href={`https://www.tradingview.com/chart/?symbol=BINANCE:${activePair}&interval=${TV_INTERVAL[activeTF] ?? '5'}`} target="_blank"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black transition-all hover:opacity-80"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.primary}33`, color: cfg.primary }}>
                          {tfCfg.short} Chart <ChevronRight className="h-2.5 w-2.5" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: "BOS vs CHoCH",
            items: ["BOS = Trend continuation (HH/HL atau LL/LH baru terbentuk)","CHoCH = Reversal signal (karakter market berubah)","Volume spike saat BOS = konfirmasi institusional","Tunggu retrace ke OB setelah BOS/CHoCH terjadi"] },
          { title: "Liquidity & Order Block",
            items: ["Sweep Low = SM ambil sell-stop liq retail lalu reversal","Bullish OB = Candle bearish terakhir sebelum impulse up","Bearish OB = Candle bullish terakhir sebelum impulse down","Entry terbaik: pullback ke OB + konfirmasi candle"] },
          { title: "Risk by Timeframe",
            items: [`Weekly: SL 2×ATR — position trade, target days/weeks`,`Daily: SL 1.5×ATR — swing trade, target 3-7 hari`,`H4: SL 1×ATR — intraday swing, target beberapa jam`,`H1: SL 0.7×ATR — intraday, target 1-3 jam`,`5M: SL 0.5×ATR — scalp ketat, target 15-60 menit`] },
        ].map((g, i) => (
          <div key={i} className="rounded-3xl border border-slate-800 p-5" style={{ background: "#0a0a12" }}>
            <h3 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: cfg.primary }}>{g.title}</h3>
            <ul className="space-y-1.5">
              {g.items.map((item, j) => (
                <li key={j} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                  <ChevronRight className="h-2.5 w-2.5 mt-0.5 shrink-0" style={{ color: cfg.primary }} />
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
