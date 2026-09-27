"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Play,
  Square,
  Settings,
  TrendingUp,
  Clock,
  Zap,
  Activity,
  DollarSign,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Download,
  Trash2,
  RefreshCw,
  Award,
  BarChart2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Sliders,
  Target
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

interface TopGainerCoin {
  symbol: string;
  priceChangePercent: number;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
  rank: number;
}

export type TopGainerSessionPreset =
  | 'NEW_YORK'
  | 'NEW_YORK_PRIME'
  | 'LONDON'
  | 'LONDON_OPEN'
  | 'ASIA'
  | 'ASIA_MORNING'
  | 'ASIA_LONDON'
  | 'OVERLAP'
  | 'ALL_3_SESSIONS'
  | 'CUSTOM';

interface TopGainerBotConfig {
  id: number;
  is_active: boolean;
  strategy_mode: 'FLASH_SCALP' | 'SESSION_HOURS';
  session_preset: TopGainerSessionPreset;
  session_start_time: string;
  session_end_time: string;
  session_last_open_slot: string | null;
  trailing_stop_enabled: boolean;
  trailing_callback_percent: number;
  trailing_activation_percent: number;
  peak_price: number | null;
  notional_usd: number;
  leverage: number;
  hold_seconds: number;
  min_gain_percent: number;
  is_compound: boolean;
  emergency_sl_percent: number | null;
  current_state: 'IDLE' | 'SCANNING' | 'HOLDING' | 'CLOSING';
  current_symbol: string | null;
  current_side: 'BUY' | null;
  entry_price: number | null;
  quantity: number | null;
  binance_order_id: string | null;
  entry_time: number | null;
  last_leader_symbol: string | null;
  last_bought_symbol: string | null;
  round_number: number;
  total_profit: number;
  win_count: number;
  loss_count: number;
  last_check_at: string | null;
  updated_at: string;
  created_at: string;
  account_balance?: any;
  real_position?: any;
}

interface TopGainerBotHistory {
  id: number;
  round_number: number;
  symbol: string;
  gain_percent: number;
  notional_usd: number;
  leverage: number;
  entry_price: number;
  exit_price: number | null;
  peak_price: number | null;
  quantity: number;
  hold_seconds: number;
  trade_pnl_usd: number;
  commission_usd: number;
  net_pnl_usd: number;
  net_pnl_percent: number;
  status: string;
  exit_reason: string;
  strategy_mode: string;
  binance_open_order_id: string | null;
  binance_close_order_id: string | null;
  opened_at: string;
  closed_at: string | null;
}

interface TopGainerBotLog {
  id: number;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  category: string;
  message: string;
  created_at: string;
}

const getSessionPresetLabel = (preset?: string, start?: string, end?: string) => {
  switch (preset) {
    case 'ASIA_MORNING': return `Asia Pagi (${start || '06:00'} - ${end || '12:00'} WIB)`;
    case 'ASIA': return `Asia Full (${start || '07:00'} - ${end || '15:00'} WIB)`;
    case 'ASIA_LONDON': return `Asia-London Pre (${start || '11:00'} - ${end || '17:00'} WIB)`;
    case 'LONDON_OPEN': return `London Open (${start || '14:00'} - ${end || '18:00'} WIB)`;
    case 'LONDON': return `London Full (${start || '14:00'} - ${end || '22:00'} WIB)`;
    case 'OVERLAP': return `London-NY Overlap (${start || '19:00'} - ${end || '23:00'} WIB)`;
    case 'NEW_YORK_PRIME': return `New York Prime (${start || '20:00'} - ${end || '00:00'} WIB)`;
    case 'NEW_YORK': return `New York Full (${start || '20:00'} - ${end || '04:00'} WIB)`;
    case 'ALL_3_SESSIONS': return '🌍 3 Sesi Sehari (Asia, Lon & NY)';
    default: return `${preset || 'Kustom'} (${start || '20:00'} - ${end || '04:00'} WIB)`;
  }
};

export default function TopGainerBotPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<TopGainerBotConfig | null>(null);
  const [leaderCoin, setLeaderCoin] = useState<TopGainerCoin | null>(null);
  const [topGainers, setTopGainers] = useState<TopGainerCoin[]>([]);
  const [history, setHistory] = useState<TopGainerBotHistory[]>([]);
  const [logs, setLogs] = useState<TopGainerBotLog[]>([]);
  const [stats, setStats] = useState({
    totalTrades: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    totalNetProfit: 0
  });

  // Settings Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [notionalUsd, setNotionalUsd] = useState(50);
  const [leverage, setLeverage] = useState(10);
  const [holdSeconds, setHoldSeconds] = useState(20);
  const [minGainPercent, setMinGainPercent] = useState(3.0);
  const [isCompound, setIsCompound] = useState(false);
  const [emergencySlPercent, setEmergencySlPercent] = useState(3.0);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Strategy & Session states
  const [strategyMode, setStrategyMode] = useState<'FLASH_SCALP' | 'SESSION_HOURS'>('FLASH_SCALP');
  const [sessionPreset, setSessionPreset] = useState<TopGainerSessionPreset>('NEW_YORK');
  const [sessionStartTime, setSessionStartTime] = useState('20:00');
  const [sessionEndTime, setSessionEndTime] = useState('04:00');
  const [trailingStopEnabled, setTrailingStopEnabled] = useState(false);
  const [trailingCallbackPercent, setTrailingCallbackPercent] = useState(1.0);
  const [trailingActivationPercent, setTrailingActivationPercent] = useState(1.0);

  // Stop Confirmation Modal
  const [showStopModal, setShowStopModal] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Action Loading states
  const [isStarting, setIsStarting] = useState(false);
  const [isManualClosing, setIsManualClosing] = useState(false);

  // Real-time ticking time
  const [now, setNow] = useState(Date.now());
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Apply session preset
  const applySessionPreset = (preset: TopGainerSessionPreset) => {
    setSessionPreset(preset);
    if (preset === 'NEW_YORK') {
      setSessionStartTime('20:00');
      setSessionEndTime('04:00');
    } else if (preset === 'NEW_YORK_PRIME') {
      setSessionStartTime('20:00');
      setSessionEndTime('00:00');
    } else if (preset === 'LONDON') {
      setSessionStartTime('14:00');
      setSessionEndTime('22:00');
    } else if (preset === 'LONDON_OPEN') {
      setSessionStartTime('14:00');
      setSessionEndTime('18:00');
    } else if (preset === 'ASIA') {
      setSessionStartTime('07:00');
      setSessionEndTime('15:00');
    } else if (preset === 'ASIA_MORNING') {
      setSessionStartTime('06:00');
      setSessionEndTime('12:00');
    } else if (preset === 'ASIA_LONDON') {
      setSessionStartTime('11:00');
      setSessionEndTime('17:00');
    } else if (preset === 'OVERLAP') {
      setSessionStartTime('19:00');
      setSessionEndTime('23:00');
    } else if (preset === 'ALL_3_SESSIONS') {
      setSessionStartTime('07:00');
      setSessionEndTime('04:00');
    }
  };

  // Fetch full state from backend
  const fetchBotState = async () => {
    try {
      const res = await fetch('/api/crypto/top-gainer-bot', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data.config);
        setLeaderCoin(json.data.leaderCoin);
        setTopGainers(json.data.topGainers || []);
        setHistory(json.data.history || []);
        setLogs(json.data.logs || []);
        if (json.data.stats) setStats(json.data.stats);

        // sync modal defaults if config exists
        if (json.data.config) {
          setNotionalUsd(json.data.config.notional_usd || 50);
          setLeverage(json.data.config.leverage || 10);
          setHoldSeconds(json.data.config.hold_seconds || 20);
          setMinGainPercent(json.data.config.min_gain_percent || 3.0);
          setIsCompound(Boolean(json.data.config.is_compound));
          setEmergencySlPercent(json.data.config.emergency_sl_percent || 3.0);
          setStrategyMode(json.data.config.strategy_mode || 'FLASH_SCALP');
          setSessionPreset(json.data.config.session_preset || 'NEW_YORK');
          setSessionStartTime(json.data.config.session_start_time || '20:00');
          setSessionEndTime(json.data.config.session_end_time || '04:00');
          setTrailingStopEnabled(Boolean(json.data.config.trailing_stop_enabled));
          setTrailingCallbackPercent(json.data.config.trailing_callback_percent || 1.0);
          setTrailingActivationPercent(json.data.config.trailing_activation_percent || 1.0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch top gainer bot state:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger tick (Client watchdog)
  const triggerTick = async () => {
    try {
      const res = await fetch('/api/crypto/top-gainer-bot/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.success && json.data?.state) {
        setConfig(json.data.state.config);
        setLeaderCoin(json.data.state.leaderCoin);
        setTopGainers(json.data.state.topGainers || []);
        setHistory(json.data.state.history || []);
        setLogs(json.data.state.logs || []);
        if (json.data.state.stats) setStats(json.data.state.stats);
      }
    } catch (err) {
      // silently fail on tick
    }
  };

  // Start Bot Handler
  const handleStartBot = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/crypto/top-gainer-bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionalUsd,
          leverage,
          holdSeconds,
          minGainPercent,
          isCompound,
          emergencySlPercent,
          strategyMode,
          sessionPreset,
          sessionStartTime,
          sessionEndTime,
          trailingStopEnabled,
          trailingCallbackPercent,
          trailingActivationPercent
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data.config);
        setShowConfigModal(false);
      } else {
        alert(json.error || 'Gagal memulai bot');
      }
    } catch (err: any) {
      alert(err.message || 'Error saat memulai bot');
    } finally {
      setIsStarting(false);
    }
  };

  // Stop Bot Handler
  const handleStopBot = async (closePosition: boolean = false) => {
    setIsStopping(true);
    try {
      const res = await fetch('/api/crypto/top-gainer-bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closePosition })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data.config);
        setShowStopModal(false);
      } else {
        alert(json.error || 'Gagal menghentikan bot');
      }
    } catch (err: any) {
      alert(err.message || 'Error saat menghentikan bot');
    } finally {
      setIsStopping(false);
    }
  };

  // Save Config Only Handler
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/crypto/top-gainer-bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionalUsd,
          leverage,
          holdSeconds,
          minGainPercent,
          isCompound,
          emergencySlPercent,
          strategyMode,
          sessionPreset,
          sessionStartTime,
          sessionEndTime,
          trailingStopEnabled,
          trailingCallbackPercent,
          trailingActivationPercent
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data.config);
        setShowConfigModal(false);
      } else {
        alert(json.error || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      alert(err.message || 'Error saat menyimpan pengaturan');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Manual Close Active Position
  const handleManualClosePosition = async () => {
    if (!confirm('Tutup posisi aktif sekarang di Binance via Market Sell?')) return;
    setIsManualClosing(true);
    try {
      const res = await fetch('/api/crypto/top-gainer-bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closePosition: true })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data.config);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menutup posisi manual');
    } finally {
      setIsManualClosing(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    try {
      await fetch('/api/crypto/top-gainer-bot/clear-logs', { method: 'POST' });
      setLogs([]);
    } catch {}
  };

  // Export History to Excel
  const handleExportExcel = () => {
    if (!history || history.length === 0) return;
    exportToExcel({
      title: "Top Gainer Scalper Bot History",
      subtitle: `Total Trades: ${history.length} | Net PnL: $${stats.totalNetProfit.toFixed(4)} USDT`,
      fileName: `Top_Gainer_Bot_History_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Trade #", key: "round_number" },
        { header: "Symbol", key: "symbol" },
        { header: "Strategi", key: "strategy_mode", format: (v) => v === 'SESSION_HOURS' ? 'Sesi Jam Trading' : 'Flash Scalp (20s)' },
        { header: "Exit Reason", key: "exit_reason", format: (v) => v === 'TRAILING_STOP' ? 'Trailing Stop Hit' : v === 'SESSION_END' ? 'Tutup Sesi Selesai' : v === 'STOP_LOSS' ? 'Stop Loss Darurat' : v === 'TIME_EXIT' ? 'Scalp Time Exit' : (v || '-') },
        { header: "Notional USD", key: "notional_usd", format: (v) => `$${parseFloat(v).toFixed(2)}` },
        { header: "Leverage", key: "leverage", format: (v) => `${v}x` },
        { header: "Entry Price", key: "entry_price", format: (v) => parseFloat(v).toFixed(4) },
        { header: "Exit Price", key: "exit_price", format: (v) => v ? parseFloat(v).toFixed(4) : '-' },
        { header: "Peak Price", key: "peak_price", format: (v) => v ? parseFloat(v).toFixed(4) : '-' },
        { header: "Hold (s)", key: "hold_seconds", format: (v) => `${v}s` },
        { header: "Trade PnL ($)", key: "trade_pnl_usd", format: (v) => `$${parseFloat(v).toFixed(4)}` },
        { header: "Commission ($)", key: "commission_usd", format: (v) => `-$${parseFloat(v).toFixed(4)}` },
        { header: "Net Realized PnL ($)", key: "net_pnl_usd", format: (v) => `$${parseFloat(v).toFixed(4)}` },
        { header: "Net ROE %", key: "net_pnl_percent", format: (v) => `${parseFloat(v).toFixed(2)}%` },
        { header: "Status", key: "status" },
        { header: "Waktu Open", key: "opened_at", format: (v) => new Date(v).toLocaleString('id-ID') },
        { header: "Waktu Close", key: "closed_at", format: (v) => v ? new Date(v).toLocaleString('id-ID') : '-' },
      ],
      data: history
    });
  };

  // Setup periodic polling & watchdog tick
  useEffect(() => {
    fetchBotState();

    const clockInterval = setInterval(() => setNow(Date.now()), 500);

    // Watchdog tick every 1.5 seconds
    const tickInterval = setInterval(() => {
      triggerTick();
    }, 1500);

    return () => {
      clearInterval(clockInterval);
      clearInterval(tickInterval);
    };
  }, []);

  // Autoscroll logs inside container only (do not scroll the webpage)
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);


  // Compute countdown & active progress if holding
  const isHolding = config?.current_state === 'HOLDING' && config.current_symbol;
  const entryTime = config?.entry_time || now;
  const elapsedSec = Math.floor((now - entryTime) / 1000);
  const targetHold = config?.hold_seconds || 20;
  const secondsRemaining = Math.max(0, targetHold - elapsedSec);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSec / targetHold) * 100));

  // Floating PnL
  const realPos = config?.real_position;
  const floatPnl = realPos ? realPos.unRealizedProfit : 0;
  const floatRoe = realPos ? realPos.roePercent : 0;
  const isPnlPositive = floatPnl >= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          HERO BANNER & CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl mb-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400">
                <Flame className="w-7 h-7 animate-pulse text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                    Top Gainer Scalper Bot
                  </h1>
                  <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    20s Flash Scalp
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  Deteksi Koin Urutan Pertama (#1 Top Gainer) Binance Futures ➔ Open BUY ➔ Auto-Close 20 Detik!
                </p>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                config?.is_active 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${config?.is_active ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                {config?.is_active ? 'BOT ACTIVE (AUTONOMOUS)' : 'BOT STOPPED'}
              </span>

              {/* Strategy Mode Badge */}
              <span className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border font-semibold ${
                config?.strategy_mode === 'SESSION_HOURS'
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              }`}>
                {config?.strategy_mode === 'SESSION_HOURS' ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    Sesi: <strong>{getSessionPresetLabel(config?.session_preset, config?.session_start_time, config?.session_end_time)}</strong>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Mode: <strong>Flash Scalp ({config?.hold_seconds || 20}s)</strong>
                  </>
                )}
              </span>

              {/* Trailing Stop Badge */}
              {config?.trailing_stop_enabled && (
                <span className="px-3 py-1 rounded-full text-xs bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-teal-400" />
                  Trailing: <strong>{config?.trailing_callback_percent}% Callback (+{config?.trailing_activation_percent}% Aktif)</strong>
                </span>
              )}

              <span className="px-3 py-1 rounded-full text-xs bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                Notional: <strong className="text-white">${config?.notional_usd || 50} USD</strong>
              </span>

              <span className="px-3 py-1 rounded-full text-xs bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Leverage: <strong className="text-white">{config?.leverage || 10}x</strong>
              </span>

              <span className="px-3 py-1 rounded-full text-xs bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Min Gain: <strong className="text-white">+{config?.min_gain_percent || 3}%</strong>
              </span>

              {config?.is_compound && (
                <span className="px-3 py-1 rounded-full text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  Auto-Compound: <strong>AKTIF</strong>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm flex items-center gap-2 border border-slate-700 transition shadow-lg"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Pengaturan
            </button>

            {config?.is_active ? (
              <button
                onClick={() => setShowStopModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-rose-900/30 transition transform hover:-translate-y-0.5"
              >
                <Square className="w-4 h-4" />
                STOP BOT
              </button>
            ) : (
              <button
                onClick={handleStartBot}
                disabled={isStarting}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-amber-900/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                {isStarting ? 'Memulai...' : 'START BOT'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Session Waiting Alert if bot is active in SESSION_HOURS and scanning */}
      {config?.is_active && !isHolding && config?.strategy_mode === 'SESSION_HOURS' && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/40 p-5 mb-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Mode Sesi Jam Trading Aktif: {getSessionPresetLabel(config.session_preset, config.session_start_time, config.session_end_time)}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Bot akan otomatis membuka posisi BUY untuk koin urutan #1 (Top Gainer) saat sesi dibuka, menahannya selama sesi berjalan, dan otomatis menutup order saat jam tutup selesai.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Target Tutup: <strong className="text-white font-mono">{config.session_end_time} WIB</strong></span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LIVE ACTIVE SCALPING CARD (IF CURRENTLY HOLDING POSITION)
      ───────────────────────────────────────────────────────────── */}
      {isHolding && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/60 to-slate-900 border-2 border-amber-500/80 p-6 md:p-8 shadow-2xl mb-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-amber-500/20">
            <div>
              <div className="flex items-center gap-2">
                {config.strategy_mode === 'SESSION_HOURS' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500 text-white animate-pulse">
                    <Globe className="w-3.5 h-3.5" />
                    {getSessionPresetLabel(config.session_preset, config.session_start_time, config.session_end_time).toUpperCase()} IN PROGRESS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500 text-slate-950 animate-pulse">
                    <Flame className="w-3.5 h-3.5" />
                    FLASH SCALP IN PROGRESS
                  </span>
                )}
                <span className="text-xs font-medium text-amber-300/80 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                  Round #{config.round_number || 1}
                </span>
                {config.trailing_stop_enabled && (
                  <span className="text-xs font-bold text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded-md border border-teal-500/30 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Trailing Stop ON
                  </span>
                )}
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-2 flex items-center gap-3">
                {config.current_symbol}
                <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  BUY / LONG
                </span>
              </h2>
            </div>

            {/* Countdown or Session Badge */}
            <div className="flex flex-col items-end">
              {config.strategy_mode === 'SESSION_HOURS' ? (
                <>
                  <div className="text-xs uppercase tracking-wider text-indigo-300 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Target Jam Tutup Sesi
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold text-indigo-300 font-mono tracking-tight flex items-baseline gap-1 mt-1">
                    {config.session_end_time} <span className="text-sm font-normal text-slate-400">WIB</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Order otomatis di-close saat sesi berakhir
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">Sisa Waktu Hold</div>
                  <div className="text-4xl md:text-5xl font-extrabold text-amber-400 font-mono tracking-tight flex items-baseline gap-1 mt-1">
                    {secondsRemaining}
                    <span className="text-lg font-normal text-slate-400">/ {targetHold}s</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800/80 h-3 rounded-full mt-4 overflow-hidden relative border border-slate-700">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                config.strategy_mode === 'SESSION_HOURS'
                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 animate-pulse w-full'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
              style={{ width: config.strategy_mode === 'SESSION_HOURS' ? '100%' : `${progressPercent}%` }}
            ></div>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Harga Entry</div>
              <div className="text-lg md:text-xl font-bold text-white mt-1 font-mono">
                ${config.entry_price || '-'}
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Harga Mark Live</div>
              <div className="text-lg md:text-xl font-bold text-cyan-300 mt-1 font-mono">
                ${realPos?.markPrice?.toFixed(4) || config.entry_price || '-'}
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Notional & Leverage</div>
              <div className="text-lg md:text-xl font-bold text-white mt-1">
                ${config.notional_usd} <span className="text-xs font-normal text-slate-400">({config.leverage}x)</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${
              isPnlPositive 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
            }`}>
              <div className="text-xs font-medium opacity-80">Floating PnL Live</div>
              <div className="text-lg md:text-xl font-extrabold mt-1 font-mono">
                {isPnlPositive ? '+' : ''}${floatPnl.toFixed(4)} ({isPnlPositive ? '+' : ''}{floatRoe.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Trailing Stop Real-Time Card */}
          {config.trailing_stop_enabled && (() => {
            const peakPrice = config.peak_price || config.entry_price || 0;
            const currentMark = realPos?.markPrice || config.entry_price || 0;
            const pullbackPct = peakPrice > 0 ? ((peakPrice - currentMark) / peakPrice) * 100 : 0;
            const trailingTriggerPrice = peakPrice > 0 ? peakPrice * (1 - (config.trailing_callback_percent || 1.0) / 100) : 0;
            const peakGainPct = config.entry_price ? ((peakPrice - config.entry_price) / config.entry_price) * 100 : 0;
            const isActivated = peakGainPct >= (config.trailing_activation_percent || 1.0);

            return (
              <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-teal-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <Target className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Trailing Stop Real-Time</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isActivated ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isActivated ? '🟢 AKTIF MENGUNCI PUNCAK' : `⏳ MENUNGGU TRIGGER (+${config.trailing_activation_percent}%)`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Harga Puncak: <strong className="text-white font-mono">${peakPrice ? peakPrice.toFixed(4) : '-'}</strong> | Trigger Close: <strong className="text-amber-300 font-mono">${trailingTriggerPrice ? trailingTriggerPrice.toFixed(4) : '-'}</strong> (-{config.trailing_callback_percent}% dari puncak)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Pullback dari Puncak</span>
                    <span className={`text-sm font-bold ${pullbackPct >= (config.trailing_callback_percent || 1.0) ? 'text-rose-400' : 'text-teal-300'}`}>
                      {pullbackPct.toFixed(2)}% / {config.trailing_callback_percent}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end mt-4">
            <button
              onClick={handleManualClosePosition}
              disabled={isManualClosing}
              className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 border border-rose-500/50"
            >
              <XCircle className="w-3.5 h-3.5" />
              {isManualClosing ? 'Menutup...' : 'Tutup Sekarang (Market Close Darurat)'}
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATS SUMMARY ROW
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Total Scalp Trades</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.totalTrades} Rounds</div>
          <div className="text-xs text-slate-500 mt-0.5">Semua eksekusi 20 detik</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Win Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{stats.winCount} Win / {stats.lossCount} Loss</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Total Net Profit Realized</div>
          <div className={`text-2xl font-bold mt-1 ${stats.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.totalNetProfit >= 0 ? '+' : ''}${stats.totalNetProfit.toFixed(4)} USDT
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Sudah bersih dipotong komisi</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Juara Terakhir Ditrading</div>
          <div className="text-2xl font-bold text-amber-300 mt-1 font-mono">
            {config?.last_bought_symbol || 'Belum Ada'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Menunggu juara berikutnya</div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LEADERBOARD PODIUM: TOP GAINERS REALTIME
      ───────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Podium Top Gainers Real-Time Binance Futures</h2>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            Live Sync 1.5s
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topGainers.slice(0, 3).map((coin, idx) => {
            const isRank1 = idx === 0;
            const isRank2 = idx === 1;
            const isRank3 = idx === 2;
            const isCurrentlyTraded = isHolding && config?.current_symbol === coin.symbol;
            const isLastBought = config?.last_bought_symbol === coin.symbol;

            return (
              <div
                key={coin.symbol}
                className={`relative overflow-hidden rounded-xl p-5 border transition-all ${
                  isRank1
                    ? 'bg-gradient-to-b from-amber-950/40 to-slate-900 border-amber-500/70 shadow-lg shadow-amber-950/30'
                    : isRank2
                    ? 'bg-slate-900/90 border-slate-700'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                {isRank1 && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    TARGET #1 SCALPER
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isRank1 ? 'bg-amber-500 text-slate-950' : isRank2 ? 'bg-slate-300 text-slate-950' : 'bg-amber-800 text-amber-200'
                    }`}>
                      #{idx + 1}
                    </span>
                    <span className="text-xl font-bold text-white font-mono">{coin.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-emerald-400 font-mono">
                      +{coin.priceChangePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <div>
                    <span>Harga Terkini:</span>
                    <strong className="block text-slate-200 font-mono mt-0.5">${coin.lastPrice}</strong>
                  </div>
                  <div>
                    <span>Volume 24 Jam:</span>
                    <strong className="block text-slate-200 font-mono mt-0.5">
                      ${Math.round(coin.quoteVolume / 1e6)}M USD
                    </strong>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  {isCurrentlyTraded ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 animate-pulse" /> Sedang Di-Scalp
                    </span>
                  ) : isLastBought ? (
                    <span className="text-slate-400 italic">Sudah Diperdagangkan (Menunggu Disalip)</span>
                  ) : isRank1 ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Siap Dieksekusi jika ganti #1
                    </span>
                  ) : (
                    <span className="text-slate-500">Antrian #{idx + 1}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MIDDLE ROW: TOP 10 GAINERS TABLE & MONOSPACE TERMINAL LOGS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Top 10 Gainers Table */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Top 10 Koin Gainers Binance Futures</h3>
            </div>
            <span className="text-xs text-slate-400">Total 700+ pair USDT</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3 text-right">24h Gain %</th>
                  <th className="py-2.5 px-3 text-right">Harga Mark</th>
                  <th className="py-2.5 px-3 text-right">24h High</th>
                  <th className="py-2.5 px-3 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {topGainers.slice(0, 10).map((coin) => {
                  const isLeader = coin.rank === 1;
                  return (
                    <tr
                      key={coin.symbol}
                      className={`hover:bg-slate-800/40 transition ${
                        isLeader ? 'bg-amber-500/10 font-bold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          isLeader ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          #{coin.rank}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white font-sans font-bold flex items-center gap-1.5">
                        {coin.symbol}
                        {isLeader && <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        +{coin.priceChangePercent.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        ${coin.lastPrice}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        ${coin.highPrice}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        ${Math.round(coin.quoteVolume / 1e6)}M
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monospace Interactive Terminal Logs */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span className="text-xs font-semibold text-slate-400 ml-2">Terminal Logs Scalper</span>
            </div>
            <button
              onClick={handleClearLogs}
              title="Bersihkan Log"
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div ref={logsContainerRef} className="flex-1 overflow-y-auto max-h-80 space-y-1.5 text-[11px] pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic py-8 text-center">Menunggu aktivitas scalp...</div>
            ) : (
              logs.map((log) => {
                let badgeClass = "text-cyan-400";
                if (log.level === 'SUCCESS') badgeClass = "text-emerald-400 font-bold";
                if (log.level === 'WARN') badgeClass = "text-amber-400";
                if (log.level === 'ERROR') badgeClass = "text-rose-400 font-bold";

                return (
                  <div key={log.id} className="leading-relaxed">
                    <span className="text-slate-500 mr-1.5">
                      [{new Date(log.created_at).toLocaleTimeString('id-ID')}]
                    </span>
                    <span className={`${badgeClass} mr-1.5`}>[{log.category}]</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TRADE HISTORY & EXPORT TO EXCEL
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-white text-base">Riwayat Trade Top Gainer Bot</h3>
            <p className="text-xs text-slate-400">Setiap order open, jam sesi, exit trailing stop, & auto-close dicatat secara akurat dari Binance.</p>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={history.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-950/30"
          >
            <Download className="w-4 h-4" />
            Download Excel (.xlsx)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Round #</th>
                <th className="py-2.5 px-3">Koin</th>
                <th className="py-2.5 px-3">Strategi</th>
                <th className="py-2.5 px-3">Alasan Exit</th>
                <th className="py-2.5 px-3">Notional & Lev</th>
                <th className="py-2.5 px-3">Entry Price</th>
                <th className="py-2.5 px-3">Exit Price</th>
                <th className="py-2.5 px-3">Puncak (Peak)</th>
                <th className="py-2.5 px-3">Durasi</th>
                <th className="py-2.5 px-3 text-right">Net PnL ($)</th>
                <th className="py-2.5 px-3 text-right">ROE %</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-500 italic">
                    Belum ada riwayat trade yang selesai. Jalankan bot untuk memulai!
                  </td>
                </tr>
              ) : (
                history.map((item) => {
                  const isWin = item.net_pnl_usd >= 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 font-bold text-slate-300">#{item.round_number}</td>
                      <td className="py-3 px-3 text-white font-sans font-bold">{item.symbol}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.strategy_mode === 'SESSION_HOURS'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {item.strategy_mode === 'SESSION_HOURS' ? '🏛️ Sesi' : '⚡ 20s Scalp'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.exit_reason === 'TRAILING_STOP'
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            : item.exit_reason === 'SESSION_END'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : item.exit_reason === 'STOP_LOSS'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {item.exit_reason === 'TRAILING_STOP'
                            ? '🎯 Trailing Stop'
                            : item.exit_reason === 'SESSION_END'
                            ? '🏁 Tutup Sesi'
                            : item.exit_reason === 'STOP_LOSS'
                            ? '🛑 Stop Loss'
                            : item.exit_reason === 'MANUAL_CLOSED'
                            ? '✋ Manual'
                            : '⏱️ Time Exit'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        ${item.notional_usd} <span className="text-slate-500">({item.leverage}x)</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">${item.entry_price}</td>
                      <td className="py-3 px-3 text-slate-300">${item.exit_price || '-'}</td>
                      <td className="py-3 px-3 text-cyan-300 font-mono">
                        {item.peak_price ? `$${item.peak_price}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-amber-300">{item.hold_seconds}s</td>
                      <td className={`py-3 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${item.net_pnl_usd.toFixed(4)}
                      </td>
                      <td className={`py-3 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}{item.net_pnl_percent.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {new Date(item.opened_at).toLocaleTimeString('id-ID')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SETTINGS MODAL
      ───────────────────────────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative my-8">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-400" />
              Pengaturan Top Gainer Scalper & Sesi Trading
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Pilih mode strategi perdagangan, sesi jam trading, fitur trailing stop, serta manajemen modal.
            </p>

            <div className="space-y-5">
              {/* 1. STRATEGY MODE SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Mode Strategi Perdagangan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStrategyMode('FLASH_SCALP')}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      strategyMode === 'FLASH_SCALP'
                        ? 'bg-amber-500/20 border-amber-500/80 text-white shadow-lg shadow-amber-950/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Flame className={`w-4 h-4 ${strategyMode === 'FLASH_SCALP' ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                      <span className="font-bold text-xs text-white">⚡ Flash Scalp 20s</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Buka BUY instan saat ada koin baru menduduki peringkat #1, tahan {holdSeconds}s, lalu auto-close.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStrategyMode('SESSION_HOURS')}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      strategyMode === 'SESSION_HOURS'
                        ? 'bg-indigo-500/20 border-indigo-500/80 text-white shadow-lg shadow-indigo-950/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className={`w-4 h-4 ${strategyMode === 'SESSION_HOURS' ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
                      <span className="font-bold text-xs text-white">🏛️ Sesi Jam Trading</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Buka BUY koin #1 saat jam buka sesi, tahan selama sesi, & auto-close saat jam tutup selesai.
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. IF SESSION_HOURS SELECTED: SESSION CONFIGURATION */}
              {strategyMode === 'SESSION_HOURS' && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-indigo-300 mb-2 flex items-center justify-between">
                      <span>Pilih Preset Sesi Jam Pasar (WIB)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Waktu Indonesia Barat (UTC+7)</span>
                    </label>

                    {/* Sesi Asia */}
                    <div className="mb-2.5">
                      <div className="text-[11px] font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                        <span>⛩️ Sesi Asia (Tokyo / Sydney / HK)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => applySessionPreset('ASIA_MORNING')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                            sessionPreset === 'ASIA_MORNING'
                              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          Asia Pagi (Tokyo)
                          <span className="block text-[10px] opacity-80 font-mono">06:00 - 12:00</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applySessionPreset('ASIA')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                            sessionPreset === 'ASIA'
                              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          Asia Full Day
                          <span className="block text-[10px] opacity-80 font-mono">07:00 - 15:00</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applySessionPreset('ASIA_LONDON')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                            sessionPreset === 'ASIA_LONDON'
                              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          Asia-London Pre
                          <span className="block text-[10px] opacity-80 font-mono">11:00 - 17:00</span>
                        </button>
                      </div>
                    </div>

                    {/* Sesi London / Eropa */}
                    <div className="mb-2.5">
                      <div className="text-[11px] font-bold text-sky-400 mb-1 flex items-center gap-1.5">
                        <span>🏰 Sesi London (European Market)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => applySessionPreset('LONDON_OPEN')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                            sessionPreset === 'LONDON_OPEN'
                              ? 'bg-sky-600 text-white border-sky-400 shadow-md font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          London Open
                          <span className="block text-[10px] opacity-80 font-mono">14:00 - 18:00</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applySessionPreset('LONDON')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                            sessionPreset === 'LONDON'
                              ? 'bg-sky-600 text-white border-sky-400 shadow-md font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          London Full
                          <span className="block text-[10px] opacity-80 font-mono">14:00 - 22:00</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applySessionPreset('OVERLAP')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                            sessionPreset === 'OVERLAP'
                              ? 'bg-sky-600 text-white border-sky-400 shadow-md font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          London-NY Overlap
                          <span className="block text-[10px] opacity-80 font-mono">19:00 - 23:00</span>
                        </button>
                      </div>
                    </div>

                    {/* Sesi New York & Multi Sesi */}
                    <div>
                      <div className="text-[11px] font-bold text-indigo-400 mb-1 flex items-center justify-between">
                        <span>🗽 Sesi New York & Multi-Sesi 24H</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => applySessionPreset('NEW_YORK_PRIME')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                            sessionPreset === 'NEW_YORK_PRIME'
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          NY Prime Open
                          <span className="block text-[10px] opacity-80 font-mono">20:00 - 00:00</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applySessionPreset('NEW_YORK')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                            sessionPreset === 'NEW_YORK'
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          NY Full Night
                          <span className="block text-[10px] opacity-80 font-mono">20:00 - 04:00</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applySessionPreset('ALL_3_SESSIONS')}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                            sessionPreset === 'ALL_3_SESSIONS'
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          🌍 3 Sesi Sehari
                          <span className="block text-[10px] opacity-80 font-mono">Asia + Lon + NY</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Jam Open & Jam Tutup Inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Jam Open Sesi (HH:mm WIB)
                      </label>
                      <input
                        type="text"
                        value={sessionStartTime}
                        onChange={(e) => {
                          setSessionStartTime(e.target.value);
                          setSessionPreset('CUSTOM');
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 font-mono text-center"
                        placeholder="Misal: 20:00"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Jam Tutup Sesi (HH:mm WIB)
                      </label>
                      <input
                        type="text"
                        value={sessionEndTime}
                        onChange={(e) => {
                          setSessionEndTime(e.target.value);
                          setSessionPreset('CUSTOM');
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 font-mono text-center"
                        placeholder="Misal: 04:00"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-indigo-300/80 block">
                    💡 Saat jam open tiba, bot akan menyergap pair peringkat #1. Begitu jam tutup tercapai, bot langsung mengeksekusi Market Sell untuk mengunci hasil.
                  </span>
                </div>
              )}

              {/* 3. IF FLASH_SCALP SELECTED: HOLD SECONDS */}
              {strategyMode === 'FLASH_SCALP' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Durasi Hold Scalp (Detik)
                  </label>
                  <div className="flex gap-2 mb-2">
                    {[10, 15, 20, 30, 60].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setHoldSeconds(sec)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          holdSeconds === sec
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={holdSeconds}
                    onChange={(e) => setHoldSeconds(parseInt(e.target.value) || 20)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="Durasi detik (default 20)"
                  />
                </div>
              )}

              {/* 4. TRAILING STOP SECTION */}
              <div className="p-4 rounded-xl bg-slate-950 border border-teal-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Trailing Stop Otomatis</div>
                      <div className="text-[11px] text-slate-400">Maksimalkan profit dengan mengunci harga puncak tertinggi (Peak)</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTrailingStopEnabled(!trailingStopEnabled)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      trailingStopEnabled ? 'bg-teal-500' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                      trailingStopEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {trailingStopEnabled && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                        Toleransi Callback dari Puncak (-% Pullback)
                      </label>
                      <div className="flex gap-2 mb-2">
                        {[0.5, 1.0, 1.5, 2.0, 3.0].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setTrailingCallbackPercent(rate)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                              trailingCallbackPercent === rate
                                ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        value={trailingCallbackPercent}
                        onChange={(e) => setTrailingCallbackPercent(parseFloat(e.target.value) || 1.0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-400 font-mono"
                        placeholder="Contoh: 1.0 (%)"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                        Ambang Aktivasi Trailing (+% Profit)
                      </label>
                      <div className="flex gap-2 mb-2">
                        {[0.0, 0.5, 1.0, 1.5, 2.0].map((act) => (
                          <button
                            key={act}
                            type="button"
                            onClick={() => setTrailingActivationPercent(act)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                              trailingActivationPercent === act
                                ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {act === 0 ? 'Langsung (0%)' : `+${act}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <span className="text-[11px] text-teal-300/80 block leading-relaxed">
                      🎯 Saat profit mencapai ambang aktivasi, bot mengunci harga tertinggi (peak). Jika harga berbalik turun sebesar callback % dari puncak, order seketika ditutup untuk mengunci cuan maksimal!
                    </span>
                  </div>
                )}
              </div>

              {/* 5. NOTIONAL USD & LEVERAGE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Ukuran Notional (USD)
                  </label>
                  <div className="flex gap-1.5 mb-2">
                    {[20, 50, 100, 250, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setNotionalUsd(val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          notionalUsd === val
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={notionalUsd}
                    onChange={(e) => setNotionalUsd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="Custom nominal USD"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Leverage Akun
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[3, 5, 10, 20].map((lev) => (
                      <button
                        key={lev}
                        type="button"
                        onClick={() => setLeverage(lev)}
                        className={`py-1 rounded-lg text-xs font-bold border transition ${
                          leverage === lev
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {lev}x
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    Margin terpakai: <strong className="text-white font-mono">${(notionalUsd / leverage).toFixed(2)} USDT</strong>
                  </div>
                </div>
              </div>

              {/* 6. MIN GAIN FILTER & EMERGENCY SL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Filter Minimal 24h Gain (+%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={minGainPercent}
                    onChange={(e) => setMinGainPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="Misal: 3.0 (%)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Emergency Stop Loss (-% ROE)</span>
                    <span className={`text-[10px] font-bold ${emergencySlPercent > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {emergencySlPercent > 0 ? `-${emergencySlPercent}% ROE` : '⚡ Tanpa SL (Off)'}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={emergencySlPercent}
                    onChange={(e) => setEmergencySlPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="0 = Tanpa Stop Loss"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {emergencySlPercent > 0 
                      ? `Bot otomatis cut loss jika minus mencapai -${emergencySlPercent}% ROE.` 
                      : '💡 Diisi 0 = Stop Loss dinonaktifkan (posisi ditahan sampai akhir sesi/scalp).'}
                  </span>
                </div>
              </div>

              {/* 7. AUTO-COMPOUND TOGGLE */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">Auto-Compound Profit</div>
                  <div className="text-[11px] text-slate-400">Tambahkan hasil keuntungan bersih ke modal notional berikutnya</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompound(!isCompound)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                    isCompound ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                    isCompound ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition disabled:opacity-50 shadow-lg shadow-amber-950/30"
              >
                {isSavingConfig ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STOP CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Hentikan Top Gainer Bot?</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Apakah Anda ingin menghentikan bot sekarang? Jika sedang ada posisi aktif, Anda dapat memilih untuk langsung menutupnya di Binance atau membiarkannya berjalan.
            </p>

            <div className="flex flex-col gap-2.5">
              {isHolding && (
                <button
                  type="button"
                  onClick={() => handleStopBot(true)}
                  disabled={isStopping}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Hentikan Bot & Tutup Posisi Aktif Sekarang
                </button>
              )}
              <button
                type="button"
                onClick={() => handleStopBot(false)}
                disabled={isStopping}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Hentikan Bot Saja (Biarkan Posisi Terbuka)
              </button>
              <button
                type="button"
                onClick={() => setShowStopModal(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-400 text-xs font-medium transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

