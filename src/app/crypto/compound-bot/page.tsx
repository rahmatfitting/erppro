"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Repeat,
  Play,
  Square,
  Search,
  CheckCircle2,
  AlertTriangle,
  Activity,
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  ArrowUpRight,
  Info
} from "lucide-react";

interface CompoundConfig {
  id: number;
  symbol: string;
  is_active: boolean;
  notional_usd: number;
  current_notional: number;
  leverage: number;
  compound_percent: number;
  stop_loss_percent: number | null;
  current_cycle: number;
  total_profit: number;
  entry_price: number | null;
  target_price: number | null;
  sl_price: number | null;
  quantity: number | null;
  last_check_at: string | null;
}

interface CompoundCycle {
  id: number;
  cycle_number: number;
  symbol: string;
  side: "BUY";
  notional_in: number;
  notional_out: number | null;
  entry_price: number;
  target_price: number;
  exit_price: number | null;
  quantity: number;
  leverage: number;
  pnl_usd: number;
  pnl_percent: number;
  status: "OPEN" | "TARGET_HIT" | "STOPPED" | "SL_HIT" | "ERROR";
  binance_buy_order_id: string | null;
  binance_sell_order_id: string | null;
  created_at: string;
  closed_at: string | null;
}

interface CompoundLog {
  id: number;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  category: string;
  message: string;
  created_at: string;
}

interface PairValidation {
  isValid: boolean;
  symbol?: string;
  lastPrice?: number;
  priceChangePercent?: number;
  highPrice?: number;
  lowPrice?: number;
  quoteVolume?: number;
  minNotional?: number;
  minQty?: number;
  stepSize?: number;
  tickSize?: number;
  error?: string;
}

const POPULAR_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT", "XRPUSDT"];
const NOTIONAL_PRESETS = [20, 50, 100, 250, 500];
const LEVERAGE_PRESETS = [3, 5, 10, 20, 50];
const COMPOUND_PRESETS = [0.5, 1.0, 1.5, 2.0, 3.0];

export default function CompoundBotPage() {
  // Form Configuration States
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [notionalUsd, setNotionalUsd] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(20);
  const [compoundPercent, setCompoundPercent] = useState<number>(1.0);
  const [enableStopLoss, setEnableStopLoss] = useState<boolean>(false);
  const [stopLossPercent, setStopLossPercent] = useState<number>(2.0);

  // Validation State
  const [validating, setValidating] = useState(false);
  const [pairInfo, setPairInfo] = useState<PairValidation | null>(null);

  // Bot State from Server
  const [config, setConfig] = useState<CompoundConfig | null>(null);
  const [activeCycle, setActiveCycle] = useState<CompoundCycle | null>(null);
  const [history, setHistory] = useState<CompoundCycle[]>([]);
  const [logs, setLogs] = useState<CompoundLog[]>([]);
  const [stats, setStats] = useState({
    totalCycles: 0,
    totalProfitUsd: 0,
    winRate: 0,
    currentNotional: 100
  });
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [hasApiKeys, setHasApiKeys] = useState(true);

  // UI Action states
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopWithClose, setStopWithClose] = useState(true);
  const [lastTickMessage, setLastTickMessage] = useState<string>("");

  const logContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch full bot state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto/compound-bot", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data.config);
        setActiveCycle(json.data.activeCycle);
        setHistory(json.data.history || []);
        setLogs(json.data.logs || []);
        setStats(json.data.stats || { totalCycles: 0, totalProfitUsd: 0, winRate: 0, currentNotional: 100 });
        if (json.data.livePrice) setLivePrice(json.data.livePrice);
        setHasApiKeys(json.data.hasApiKeys);

        // Pre-fill inputs from config if bot is running
        if (json.data.config?.is_active) {
          setSymbol(json.data.config.symbol);
          setLeverage(json.data.config.leverage);
          setCompoundPercent(json.data.config.compound_percent);
        }
      }
    } catch (err) {
      console.error("Gagal memuat status bot compound:", err);
    }
  }, []);

  // 2. Validate Pair Function
  const handleValidatePair = async (pairToValidate?: string) => {
    const sym = (pairToValidate || symbol).toUpperCase().trim();
    if (!sym) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/crypto/compound-bot/validate?symbol=${sym}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setPairInfo({
          isValid: true,
          symbol: json.symbol,
          lastPrice: json.lastPrice,
          priceChangePercent: json.priceChangePercent,
          highPrice: json.highPrice,
          lowPrice: json.lowPrice,
          quoteVolume: json.quoteVolume,
          minNotional: json.precision?.minNotional || 5,
          minQty: json.precision?.minQty || 0.001,
          stepSize: json.precision?.stepSize || 0.001,
          tickSize: json.precision?.tickSize || 0.01
        });
        setLivePrice(json.lastPrice);
      } else {
        setPairInfo({
          isValid: false,
          error: json.error || `Pair ${sym} tidak valid di Binance Futures USDT-M`
        });
      }
    } catch (err: any) {
      setPairInfo({
        isValid: false,
        error: err.message || "Gagal menghubungkan ke Binance"
      });
    } finally {
      setValidating(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchState();
    handleValidatePair(symbol);
  }, []);

  // 3. Engine Auto-Tick Loop (Every 3 seconds when bot is active)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (config?.is_active) {
        try {
          const res = await fetch("/api/crypto/compound-bot/tick", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          const json = await res.json();
          if (json.success && json.data) {
            if (json.data.currentPrice) {
              setLivePrice(json.data.currentPrice);
            }
            if (json.data.status === "COMPOUND_EXECUTED" || json.data.status === "STOP_LOSS_HIT") {
              fetchState(); // refresh state if target hit or SL
            }
            if (json.data.message) {
              setLastTickMessage(json.data.message);
            }
          }
        } catch (err) {
          console.error("Tick error:", err);
        }
      }
      // Periodic logs and history refresh every 6s
      fetchState();
    }, 3000);

    return () => clearInterval(interval);
  }, [config?.is_active, fetchState]);

  // 4. Start Bot Handler
  const handleStartBot = async () => {
    if (!pairInfo?.isValid) {
      alert("Harap lakukan 'Cek Pair' terlebih dahulu dan pastikan pair valid di Binance Futures.");
      return;
    }

    if (notionalUsd <= 0) {
      alert("Nominal Ukuran Posisi Notional harus lebih besar dari 0 USD.");
      return;
    }

    const confirmStart = window.confirm(
      `Konfirmasi Mulai Bot Compound:\n\n` +
      `• Pair: ${symbol.toUpperCase()}\n` +
      `• Posisi: BUY (LONG ONLY)\n` +
      `• Ukuran Notional Awal: $${notionalUsd} USD\n` +
      `• Leverage: ${leverage}x (Estimasi Margin: $${(notionalUsd / leverage).toFixed(2)} USDT)\n` +
      `• Target Compound: +${compoundPercent}% kenaikan harga\n` +
      `• Saat naik +${compoundPercent}%: Close otomatis lalu re-open dengan notional $${(notionalUsd * (1 + compoundPercent / 100)).toFixed(2)} USD!\n\n` +
      `Apakah Anda yakin ingin mengeksekusi order BUY perdana di Binance sekarang?`
    );

    if (!confirmStart) return;

    setStarting(true);
    try {
      const res = await fetch("/api/crypto/compound-bot/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase().trim(),
          notionalUsd,
          leverage,
          compoundPercent,
          stopLossPercent: enableStopLoss ? stopLossPercent : null
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message || "Bot Compound Future berhasil dimulai!");
        await fetchState();
      } else {
        alert(`Gagal memulai bot: ${json.error || "Terjadi kesalahan di Binance"}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message || "Gagal menghubungi server"}`);
    } finally {
      setStarting(false);
    }
  };

  // 5. Stop Bot Handler
  const handleStopBot = async () => {
    setStopping(true);
    try {
      const res = await fetch("/api/crypto/compound-bot/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closePosition: stopWithClose })
      });
      const json = await res.json();
      if (json.success) {
        setShowStopModal(false);
        alert(json.message || "Bot berhasil dihentikan!");
        await fetchState();
      } else {
        alert(`Gagal menghentikan bot: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setStopping(false);
    }
  };

  // 6. Clear Logs
  const handleClearLogs = async () => {
    if (!window.confirm("Bersihkan seluruh log riwayat aktivitas bot?")) return;
    setClearingLogs(true);
    try {
      const res = await fetch("/api/crypto/compound-bot/clear-logs", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        fetchState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClearingLogs(false);
    }
  };

  // Calculations for Live Blueprint Card
  const activeSymbol = activeCycle ? activeCycle.symbol : symbol.toUpperCase();
  const activeLev = config?.is_active ? config.leverage : leverage;
  const currentNotional = config?.is_active ? config.current_notional : notionalUsd;
  const marginEst = currentNotional / (activeLev || 1);
  const activeCompoundPct = config?.is_active ? config.compound_percent : compoundPercent;
  const nextNotionalPreview = currentNotional * (1 + activeCompoundPct / 100);

  // Active Cycle Live calculations
  let currentPnlUsd = 0;
  let currentPnlRoe = 0;
  let progressPct = 0;
  let currentPriceDisplay = livePrice || pairInfo?.lastPrice || 0;

  if (activeCycle && livePrice) {
    currentPnlUsd = (livePrice - activeCycle.entry_price) * activeCycle.quantity;
    currentPnlRoe = (currentPnlUsd / (activeCycle.notional_in / activeCycle.leverage)) * 100;
    const priceGainPct = ((livePrice - activeCycle.entry_price) / activeCycle.entry_price) * 100;
    progressPct = Math.min(100, Math.max(0, (priceGainPct / activeCompoundPct) * 100));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20 text-white">
              <Repeat className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Bot Compound Future (BUY Only)
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Otomatisasi Akumulasi Long Terus-Menerus: Tutup Posisi Saat Target Naik & Buka Kembali dengan Modal Ter-Compound
              </p>
            </div>
          </div>
        </div>

        {/* Global Bot Status Badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold shadow-inner ${
            config?.is_active
              ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-emerald-900/30"
              : "bg-slate-900/80 border-slate-800 text-slate-400"
          }`}>
            <span className={`w-3 h-3 rounded-full ${
              config?.is_active ? "bg-emerald-400 animate-ping" : "bg-slate-600"
            }`} />
            <span>{config?.is_active ? `RUNNING (Cycle #${config.current_cycle})` : "STATUS: STOPPED"}</span>
          </div>

          <button
            onClick={fetchState}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API Key Warning if missing */}
      {!hasApiKeys && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">Kredensial Binance API Belum Terdeteksi:</span> Pastikan variabel <code className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">BINANCE_API_KEY</code> dan <code className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">BINANCE_API_SECRET</code> sudah diatur di file <code className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">.env</code> atau <code className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">.env.local</code> agar bot dapat mengeksekusi order riil di Binance Futures.
          </div>
        </div>
      )}

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Siklus Compound</span>
            <Repeat className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.totalCycles} <span className="text-xs text-slate-400 font-normal">Siklus Sukses</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Win Rate Target: {stats.winRate}%
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Realized Profit</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-bold ${stats.totalProfitUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {stats.totalProfitUsd >= 0 ? "+" : ""}${stats.totalProfitUsd.toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-400">USDT</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Akumulasi profit dari siklus selesai
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Notional Berjalan Saat Ini</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300">
            ${stats.currentNotional.toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-400">USD</span>
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">
            {config?.is_active ? `Bertumbuh di Cycle #${config.current_cycle}` : "Siap dialokasikan"}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pair Aktif & Harga Pasar</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-slate-100 truncate">
            {activeSymbol}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-mono">
            {livePrice ? `$${livePrice.toLocaleString()}` : "Memuat harga..."}
          </div>
        </div>
      </div>

      {/* Main Grid: Control & Live Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols): Configuration & Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 md:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Setup Parameter Compound
              </h2>
              {config?.is_active && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  LOCKED SAAT BOT AKTIF
                </span>
              )}
            </div>

            {/* 1. Pilih Pair & Cek Validasi */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>1. Pilih Pair Futures (USDT-M)</span>
                <span className="text-[10px] text-slate-400">Contoh: BTCUSDT, ETHUSDT</span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    disabled={config?.is_active}
                    placeholder="BTCUSDT"
                    className="w-full pl-3 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold tracking-wider text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleValidatePair()}
                  disabled={validating || config?.is_active}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950"
                >
                  {validating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Cek...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Cek Pair
                    </>
                  )}
                </button>
              </div>

              {/* Quick Select Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {POPULAR_PAIRS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={config?.is_active}
                    onClick={() => {
                      setSymbol(p);
                      handleValidatePair(p);
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      symbol === p
                        ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-300"
                        : "bg-slate-950 hover:bg-slate-800 border border-slate-800/80 text-slate-400"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Pair Validation Result Card */}
              {pairInfo && (
                <div className={`mt-2 p-3 rounded-xl border text-xs ${
                  pairInfo.isValid
                    ? "bg-emerald-950/40 border-emerald-600/40 text-emerald-200"
                    : "bg-rose-950/40 border-rose-600/40 text-rose-300"
                }`}>
                  {pairInfo.isValid ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Pair Valid & Aktif di Binance Futures
                        </span>
                        <span className="font-mono text-slate-100">
                          ${pairInfo.lastPrice?.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-300 pt-1 border-t border-emerald-900/40">
                        <div>
                          Perubahan 24j:{" "}
                          <span className={(pairInfo.priceChangePercent || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {(pairInfo.priceChangePercent || 0) >= 0 ? "+" : ""}{pairInfo.priceChangePercent}%
                          </span>
                        </div>
                        <div>Min Notional: <span className="text-slate-100">${pairInfo.minNotional} USD</span></div>
                        <div>High 24j: <span className="text-slate-100">${pairInfo.highPrice}</span></div>
                        <div>Low 24j: <span className="text-slate-100">${pairInfo.lowPrice}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{pairInfo.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Ukuran Posisi Notional (USD) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>2. Ukuran Posisi Notional Awal (USD)</span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Nilai Kontrak Total di Pasar
                </span>
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="1"
                  min="5"
                  value={notionalUsd}
                  onChange={(e) => setNotionalUsd(parseFloat(e.target.value) || 0)}
                  disabled={config?.is_active}
                  className="w-full pl-8 pr-14 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">USD</span>
              </div>

              {/* Notional Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {NOTIONAL_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={config?.is_active}
                    onClick={() => setNotionalUsd(val)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      notionalUsd === val
                        ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-300"
                        : "bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400"
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Leverage Setting */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>3. Leverage</span>
                <span className="text-[10px] text-slate-400">
                  Estimasi Margin: ${(notionalUsd / (leverage || 1)).toFixed(2)} USDT
                </span>
              </label>

              <div className="flex items-center gap-1.5 flex-wrap">
                {LEVERAGE_PRESETS.map((lev) => (
                  <button
                    key={lev}
                    type="button"
                    disabled={config?.is_active}
                    onClick={() => setLeverage(lev)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      leverage === lev
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950"
                        : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Compound Persen (Target Naik) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>4. Target Compound Kenaikan Harga (%)</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Posisi BUY Only</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={compoundPercent}
                  onChange={(e) => setCompoundPercent(parseFloat(e.target.value) || 0)}
                  disabled={config?.is_active}
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>

              {/* Compound Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {COMPOUND_PRESETS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    disabled={config?.is_active}
                    onClick={() => setCompoundPercent(pct)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      compoundPercent === pct
                        ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-300"
                        : "bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400"
                    }`}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Optional Stop Loss */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Proteksi Stop Loss (Opsional)
                </label>
                <button
                  type="button"
                  disabled={config?.is_active}
                  onClick={() => setEnableStopLoss(!enableStopLoss)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                    enableStopLoss
                      ? "bg-rose-950/60 border-rose-500/50 text-rose-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  {enableStopLoss ? "SL Aktif" : "Tanpa SL"}
                </button>
              </div>

              {enableStopLoss && (
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={stopLossPercent}
                    onChange={(e) => setStopLossPercent(parseFloat(e.target.value) || 0)}
                    disabled={config?.is_active}
                    placeholder="2.0"
                    className="w-full pl-3 pr-10 py-1.5 rounded-xl bg-slate-950 border border-rose-900/60 text-xs font-semibold text-rose-200 focus:outline-none focus:border-rose-500"
                  />
                  <span className="absolute right-3.5 top-2 text-xs text-rose-400 font-bold">-%</span>
                </div>
              )}
            </div>

            {/* Live Blueprint Calculation Card */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-200 flex items-center gap-1 text-[11px] text-emerald-400 uppercase tracking-wider">
                <Zap className="w-3 h-3" />
                Blueprint Siklus Compound
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                <div>Ukuran Posisi: <span className="font-bold text-slate-100">${currentNotional.toFixed(2)} USD</span></div>
                <div>Margin Terpakai: <span className="font-bold text-slate-100">${marginEst.toFixed(2)} USDT</span></div>
                <div>Target Naik: <span className="font-bold text-emerald-400">+{activeCompoundPct}%</span></div>
                <div>Profit Per Siklus: <span className="font-bold text-emerald-400">+${(currentNotional * (activeCompoundPct / 100)).toFixed(2)} USDT</span></div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Notional Siklus Berikutnya:</span>
                <span className="font-bold text-cyan-300">
                  ${nextNotionalPreview.toFixed(2)} USD (+{activeCompoundPct}%)
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS: START & STOP */}
            <div className="pt-2 space-y-2">
              {!config?.is_active ? (
                <button
                  type="button"
                  onClick={handleStartBot}
                  disabled={starting || !pairInfo?.isValid}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                >
                  {starting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Mengeksekusi BUY di Binance...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      START BOT COMPOUND (BUY)
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowStopModal(true)}
                  disabled={stopping}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer animate-pulse"
                >
                  <Square className="w-4 h-4 fill-white" />
                  STOP BOT COMPOUND
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Active Monitoring & Terminal Logs */}
        <div className="lg:col-span-7 space-y-6">

          {/* Active Live Position Card */}
          <div className={`p-5 md:p-6 rounded-2xl border backdrop-blur-md transition-all ${
            config?.is_active
              ? "bg-slate-900/90 border-emerald-500/40 shadow-xl shadow-emerald-950/20"
              : "bg-slate-900/60 border-slate-800"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className={`w-3 h-3 rounded-full ${
                  config?.is_active ? "bg-emerald-400 animate-ping" : "bg-slate-600"
                }`} />
                <h3 className="font-semibold text-slate-100 text-sm md:text-base">
                  {config?.is_active ? `Posisi Berjalan (Cycle #${config.current_cycle})` : "Pemantauan Siklus (Idle)"}
                </h3>
              </div>

              {activeCycle && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                  LONG {activeCycle.symbol} • {activeCycle.leverage}x
                </span>
              )}
            </div>

            {config?.is_active && activeCycle ? (
              <div className="mt-4 space-y-4">
                {/* Price Matrix */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Harga Beli (Entry)</div>
                    <div className="text-base font-mono font-bold text-slate-200 mt-0.5">
                      ${activeCycle.entry_price.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Harga Pasar (Live)</div>
                    <div className="text-base font-mono font-bold text-cyan-300 mt-0.5 animate-pulse">
                      ${livePrice ? livePrice.toLocaleString() : "..."}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-emerald-400 uppercase font-semibold">Target Exit (+{config.compound_percent}%)</div>
                    <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">
                      ${activeCycle.target_price.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Unrealized PnL</div>
                    <div className={`text-base font-mono font-bold mt-0.5 ${
                      currentPnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {currentPnlUsd >= 0 ? "+" : ""}${currentPnlUsd.toFixed(2)} ({currentPnlRoe.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                {/* Compound Progress Bar */}
                <div className="space-y-1.5 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      Progres Menuju Target Exit (+{config.compound_percent}%)
                    </span>
                    <span className="font-mono font-bold text-emerald-300">
                      {progressPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400 transition-all duration-500 shadow-sm"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Entry: ${activeCycle.entry_price}</span>
                    <span>Jarak ke Target: ${(activeCycle.target_price - currentPriceDisplay).toFixed(2)}</span>
                    <span className="text-emerald-400 font-semibold">Target: ${activeCycle.target_price}</span>
                  </div>
                </div>

                {/* Sizing Details */}
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div>Kuantitas Koin: <span className="font-mono text-slate-200">{activeCycle.quantity}</span></div>
                  <div>Modal Posisi: <span className="font-mono text-slate-200">${activeCycle.notional_in.toFixed(2)} USD</span></div>
                  <div>Order ID: <span className="font-mono text-slate-300">#{activeCycle.binance_buy_order_id}</span></div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-500">
                <Repeat className="w-10 h-10 text-slate-700" />
                <p className="text-sm font-medium text-slate-400">Bot sedang tidak aktif</p>
                <p className="text-xs max-w-sm text-slate-500">
                  Pilih pair, atur nominal notional dan leverage di panel kiri, lalu klik START untuk memulai order compound.
                </p>
              </div>
            )}
          </div>

          {/* Terminal & Logs Container */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-slate-200 text-sm">
                  Log Eksekusi & Monitoring Real-Time
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={clearingLogs || logs.length === 0}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Hapus Log
                </button>
              </div>
            </div>

            {/* Terminal Window */}
            <div
              ref={logContainerRef}
              className="h-64 overflow-y-auto p-3.5 rounded-xl bg-slate-950 border border-slate-900 font-mono text-xs space-y-2 select-text"
            >
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-10">Belum ada aktivitas yang dicatat.</div>
              ) : (
                logs.map((log) => {
                  let badgeColor = "bg-slate-800 text-slate-300";
                  if (log.category === "START") badgeColor = "bg-cyan-900/50 text-cyan-300 border border-cyan-700/50";
                  if (log.category === "BUY") badgeColor = "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50";
                  if (log.category === "TARGET_HIT") badgeColor = "bg-emerald-800 text-white font-bold border border-emerald-500 animate-pulse";
                  if (log.category === "COMPOUND") badgeColor = "bg-purple-900/60 text-purple-300 border border-purple-600/50";
                  if (log.category === "CLOSE") badgeColor = "bg-blue-900/50 text-blue-300 border border-blue-700/50";
                  if (log.category === "STOP") badgeColor = "bg-amber-900/50 text-amber-300 border border-amber-700/50";
                  if (log.level === "ERROR") badgeColor = "bg-rose-900/60 text-rose-200 border border-rose-600/50";

                  const timeStr = new Date(log.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  });

                  return (
                    <div key={log.id} className="flex items-start gap-2 text-slate-300 hover:bg-slate-900/50 p-1 rounded transition-colors">
                      <span className="text-slate-500 text-[10px] shrink-0 pt-0.5">{timeStr}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${badgeColor}`}>
                        {log.category || log.level}
                      </span>
                      <span className="leading-relaxed break-words">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* History Table Section */}
      <div className="p-5 md:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-semibold text-slate-100 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Riwayat Siklus Compound (Cycle History)
            </h3>
            <p className="text-xs text-slate-400">
              Daftar seluruh siklus perdagangan compound yang telah dieksekusi oleh bot
            </p>
          </div>

          <div className="text-xs text-slate-400">
            Total Siklus Tercatat: <span className="font-bold text-slate-200">{history.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Siklus #</th>
                <th className="py-3 px-3">Pair</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Notional Masuk</th>
                <th className="py-3 px-3">Harga Beli</th>
                <th className="py-3 px-3">Target Exit</th>
                <th className="py-3 px-3">Harga Tutup</th>
                <th className="py-3 px-3">Realized PnL</th>
                <th className="py-3 px-3">Waktu Buka / Tutup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    Belum ada riwayat siklus compound. Mulai bot untuk mencatat siklus perdana.
                  </td>
                </tr>
              ) : (
                history.map((cycle) => {
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {cycle.status}
                    </span>
                  );

                  if (cycle.status === "OPEN") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-600/50 animate-pulse">
                        RUNNING
                      </span>
                    );
                  } else if (cycle.status === "TARGET_HIT") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-600/50">
                        🎯 TARGET HIT
                      </span>
                    );
                  } else if (cycle.status === "SL_HIT") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/60 text-rose-300 border border-rose-600/50">
                        🛑 STOP LOSS
                      </span>
                    );
                  } else if (cycle.status === "STOPPED") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-600/50">
                        STOPPED
                      </span>
                    );
                  }

                  const timeOpen = new Date(cycle.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit"
                  });
                  const timeClose = cycle.closed_at
                    ? new Date(cycle.closed_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "-";

                  return (
                    <tr key={cycle.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-100">
                        Cycle #{cycle.cycle_number}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-semibold">
                        {cycle.symbol} <span className="text-[10px] text-slate-500">{cycle.leverage}x</span>
                      </td>
                      <td className="py-3 px-3 font-sans">{statusBadge}</td>
                      <td className="py-3 px-3 text-slate-200">
                        ${cycle.notional_in.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        ${cycle.entry_price.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-emerald-400">
                        ${cycle.target_price.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        {cycle.exit_price ? `$${cycle.exit_price.toLocaleString()}` : "-"}
                      </td>
                      <td className={`py-3 px-3 font-bold ${
                        cycle.pnl_usd >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {cycle.status === "OPEN" ? (
                          <span className="text-slate-500 font-normal italic">Berjalan...</span>
                        ) : (
                          `${cycle.pnl_usd >= 0 ? "+" : ""}$${cycle.pnl_usd.toFixed(2)} (${cycle.pnl_percent >= 0 ? "+" : ""}${cycle.pnl_percent.toFixed(2)}%)`
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-400 font-sans">
                        {timeOpen} ➔ {timeClose}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STOP Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-100">
                Konfirmasi Hentikan Bot Compound
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda sedang menghentikan bot compound. Apakah Anda ingin sekaligus menutup posisi pasar aktif di akun Binance Futures saat ini?
            </p>

            <div className="space-y-2 pt-2">
              <label
                onClick={() => setStopWithClose(true)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  stopWithClose
                    ? "bg-rose-950/40 border-rose-500/60 text-rose-200"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <div className="text-xs">
                  <div className="font-bold">Tutup Posisi Sekarang (Rekomendasi)</div>
                  <div className="text-[11px] text-slate-400">Eksekusi Market Sell di Binance untuk mengamankan saldo.</div>
                </div>
                <input
                  type="radio"
                  checked={stopWithClose}
                  onChange={() => setStopWithClose(true)}
                  className="accent-rose-500"
                />
              </label>

              <label
                onClick={() => setStopWithClose(false)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  !stopWithClose
                    ? "bg-amber-950/40 border-amber-500/60 text-amber-200"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <div className="text-xs">
                  <div className="font-bold">Biarkan Posisi Terbuka</div>
                  <div className="text-[11px] text-slate-400">Hanya hentikan otomasi bot, posisi ditutup manual di Binance.</div>
                </div>
                <input
                  type="radio"
                  checked={!stopWithClose}
                  onChange={() => setStopWithClose(false)}
                  className="accent-amber-500"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowStopModal(false)}
                disabled={stopping}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleStopBot}
                disabled={stopping}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950"
              >
                {stopping ? "Menghentikan..." : "Ya, Hentikan Bot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
