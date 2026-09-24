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
  Plus,
  X,
  Coins,
  Settings2,
  StopCircle
} from "lucide-react";

interface RealPosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unRealizedProfit: number;
  liquidationPrice: number;
  leverage: number;
  marginType: string;
  notional: number;
  marginUsd: number;
  roePercent: number;
  isolatedMargin: number;
}

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
  real_position?: RealPosition | null;
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
  real_position?: RealPosition | null;
  is_real_pnl?: boolean;
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
  // Global Data from Server
  const [coins, setCoins] = useState<CompoundConfig[]>([]);
  const [activeCyclesMap, setActiveCyclesMap] = useState<Record<string, CompoundCycle>>({});
  const [history, setHistory] = useState<CompoundCycle[]>([]);
  const [logs, setLogs] = useState<CompoundLog[]>([]);
  const [stats, setStats] = useState({
    totalCoins: 0,
    activeCoins: 0,
    totalCycles: 0,
    totalProfitUsd: 0,
    totalActiveNotional: 0,
    winRate: 0
  });
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [hasApiKeys, setHasApiKeys] = useState(true);
  const [filterCoin, setFilterCoin] = useState<string>("ALL");

  // Modal: Add / Edit Coin
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSymbol, setFormSymbol] = useState("ETHUSDT");
  const [formNotional, setFormNotional] = useState<number>(100);
  const [formLeverage, setFormLeverage] = useState<number>(20);
  const [formCompoundPct, setFormCompoundPct] = useState<number>(1.0);
  const [formEnableSL, setFormEnableSL] = useState<boolean>(false);
  const [formSLPct, setFormSLPct] = useState<number>(2.0);
  const [formStartImmediately, setFormStartImmediately] = useState<boolean>(true);

  // Validation State
  const [validating, setValidating] = useState(false);
  const [pairInfo, setPairInfo] = useState<PairValidation | null>(null);

  // Modal: Stop Confirmation
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopTargetSymbol, setStopTargetSymbol] = useState<string>("ALL");
  const [stopWithClose, setStopWithClose] = useState(true);

  // Action Loading states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [clearingLogs, setClearingLogs] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch full state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto/compound-bot", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setCoins(json.data.coins || []);
        setActiveCyclesMap(json.data.activeCyclesMap || {});
        setHistory(json.data.history || []);
        setLogs(json.data.logs || []);
        setStats(json.data.stats || {
          totalCoins: 0,
          activeCoins: 0,
          totalCycles: 0,
          totalProfitUsd: 0,
          totalActiveNotional: 0,
          winRate: 0
        });
        if (json.data.livePrices) setLivePrices(json.data.livePrices);
        setHasApiKeys(json.data.hasApiKeys);
      }
    } catch (err) {
      console.error("Gagal memuat status bot compound:", err);
    }
  }, []);

  // 2. Pair Validation
  const handleValidatePair = async (symToValidate?: string) => {
    const sym = (symToValidate || formSymbol).toUpperCase().trim();
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
  }, [fetchState]);

  // 3. Engine Auto-Tick Loop (Every 3 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      const hasActive = coins.some((c) => c.is_active);
      if (hasActive) {
        try {
          const res = await fetch("/api/crypto/compound-bot/tick", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          const json = await res.json();
          if (json.success && json.data) {
            // Check if any compound executed or SL hit to refresh full state
            const hasTrigger = json.data.coins?.some(
              (c: any) => c.status === "COMPOUND_EXECUTED" || c.status === "STOP_LOSS_HIT"
            );
            if (hasTrigger) {
              fetchState();
            }
          }
        } catch (err) {
          console.error("Tick error:", err);
        }
      }
      fetchState();
    }, 3000);

    return () => clearInterval(interval);
  }, [coins, fetchState]);

  // 4. Start Bot for a specific coin
  const handleStartCoin = async (coinConfig: {
    symbol: string;
    notionalUsd: number;
    leverage: number;
    compoundPercent: number;
    stopLossPercent?: number | null;
  }) => {
    const sym = coinConfig.symbol.toUpperCase().trim();
    setActionLoading((prev) => ({ ...prev, [sym]: true }));

    try {
      const res = await fetch("/api/crypto/compound-bot/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sym,
          notionalUsd: coinConfig.notionalUsd,
          leverage: coinConfig.leverage,
          compoundPercent: coinConfig.compoundPercent,
          stopLossPercent: coinConfig.stopLossPercent
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message || `Bot compound untuk ${sym} berhasil dimulai!`);
        setShowAddModal(false);
        await fetchState();
      } else {
        alert(`Gagal memulai ${sym}: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [sym]: false }));
    }
  };

  // 5. Save coin config without starting
  const handleSaveCoinOnly = async () => {
    const sym = formSymbol.toUpperCase().trim();
    if (!sym) return;

    setActionLoading((prev) => ({ ...prev, [sym]: true }));
    try {
      const res = await fetch("/api/crypto/compound-bot/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sym,
          notionalUsd: formNotional,
          leverage: formLeverage,
          compoundPercent: formCompoundPct,
          stopLossPercent: formEnableSL ? formSLPct : null
        })
      });

      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        await fetchState();
      } else {
        alert(`Gagal menyimpan: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [sym]: false }));
    }
  };

  // 6. Stop Handler (Single or ALL)
  const handleConfirmStop = async () => {
    const target = stopTargetSymbol;
    setActionLoading((prev) => ({ ...prev, [target]: true }));

    try {
      const res = await fetch("/api/crypto/compound-bot/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: target,
          closePosition: stopWithClose
        })
      });

      const json = await res.json();
      if (json.success) {
        setShowStopModal(false);
        alert(json.message || "Bot berhasil dihentikan.");
        await fetchState();
      } else {
        alert(`Gagal menghentikan: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [target]: false }));
    }
  };

  // 7. Delete Coin Config
  const handleDeleteCoin = async (sym: string) => {
    if (!window.confirm(`Hapus koin ${sym} dari daftar pemantauan bot?`)) return;

    setActionLoading((prev) => ({ ...prev, [sym]: true }));
    try {
      const res = await fetch("/api/crypto/compound-bot/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym })
      });
      const json = await res.json();
      if (json.success) {
        await fetchState();
      } else {
        alert(json.error);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [sym]: false }));
    }
  };

  // 8. Clear Logs
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

  // Filtered lists
  const filteredHistory = filterCoin === "ALL"
    ? history
    : history.filter((h) => h.symbol === filterCoin);

  const filteredLogs = filterCoin === "ALL"
    ? logs
    : logs.filter((l) => l.message.includes(filterCoin));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 shadow-lg shadow-emerald-500/20 text-white">
              <Repeat className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Bot Compound Future (Multi-Coin BUY Only)
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Otomatisasi Multi-Koin Independen: Setiap Koin Berjalan, Menutup Posisi Saat Target Hit, dan Re-Open Ter-Compound Sendiri-Sendiri
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Add Coin Button */}
          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              handleValidatePair(formSymbol);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Koin Baru
          </button>

          {/* Stop All Button */}
          {stats.activeCoins > 0 && (
            <button
              type="button"
              onClick={() => {
                setStopTargetSymbol("ALL");
                setShowStopModal(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-600/50 text-rose-300 font-semibold text-xs md:text-sm flex items-center gap-1.5 transition-all shadow-md"
            >
              <StopCircle className="w-4 h-4 text-rose-400" />
              STOP ALL ({stats.activeCoins})
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={fetchState}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
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
            <span className="font-semibold">Kredensial Binance API Belum Dikonfigurasi:</span> Pastikan variabel <code className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">BINANCE_API_KEY</code> dan <code className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">BINANCE_API_SECRET</code> sudah diisi di file <code className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">.env</code> agar order BUY/SELL dapat dieksekusi ke Binance.
          </div>
        </div>
      )}

      {/* Global Summary Statistics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Status Koin Aktif</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.activeCoins} <span className="text-xs text-slate-400 font-normal">/ {stats.totalCoins} Koin</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {stats.activeCoins > 0 ? "Multi-Engine Berjalan" : "Semua Koin Berhenti"}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Realized Profit (Akumulasi)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-bold ${stats.totalProfitUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {stats.totalProfitUsd >= 0 ? "+" : ""}${stats.totalProfitUsd.toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-400">USDT</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total keuntungan seluruh koin
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Notional Berjalan</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300">
            ${stats.totalActiveNotional.toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-400">USD</span>
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">
            Nilai kontrak total aktif di pasar
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Siklus Compound Selesai</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {stats.totalCycles} <span className="text-xs text-slate-400 font-normal">Siklus Sukses</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            Win Rate Target: {stats.winRate}%
          </div>
        </div>
      </div>

      {/* Multi-Coin Active Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Daftar Bot Koin ({coins.length})
          </h2>

          {coins.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Filter Tampilan:</span>
              <select
                value={filterCoin}
                onChange={(e) => setFilterCoin(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Semua Koin ({coins.length})</option>
                {coins.map((c) => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.symbol} ({c.is_active ? "RUNNING" : "STOPPED"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {coins.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
            <Coins className="w-12 h-12 text-slate-700 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-300">Belum Ada Koin yang Ditambahkan</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Mulai otomasi compound Anda dengan menambahkan koin pertama (misal BTCUSDT, ETHUSDT, atau SOLUSDT).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                handleValidatePair(formSymbol);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-950"
            >
              <Plus className="w-4 h-4" />
              Tambah Koin Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {coins
              .filter((c) => filterCoin === "ALL" || c.symbol === filterCoin)
              .map((coin) => {
                const activeCycle = activeCyclesMap[coin.symbol];
                const realPos = coin.real_position || activeCycle?.real_position;
                const livePrice = realPos?.markPrice || livePrices[coin.symbol] || coin.entry_price || 0;
                const isLoading = actionLoading[coin.symbol] || false;

                // Live calculation: Prioritize real Binance live position and PnL
                let currentPnlUsd = 0;
                let currentPnlRoe = 0;
                let progressPct = 0;

                if (realPos && realPos.positionAmt !== 0) {
                  currentPnlUsd = realPos.unRealizedProfit;
                  currentPnlRoe = realPos.roePercent;
                  const effEntry = realPos.entryPrice > 0 ? realPos.entryPrice : (activeCycle?.entry_price || coin.entry_price || 0);
                  const effCurrent = realPos.markPrice > 0 ? realPos.markPrice : livePrice;
                  const priceGainPct = effEntry > 0 ? ((effCurrent - effEntry) / effEntry) * 100 : 0;
                  progressPct = Math.min(100, Math.max(0, (priceGainPct / coin.compound_percent) * 100));
                } else if (coin.is_active && activeCycle && livePrice && activeCycle.entry_price) {
                  currentPnlUsd = (livePrice - activeCycle.entry_price) * activeCycle.quantity;
                  const marginUsed = activeCycle.notional_in / (activeCycle.leverage || 1);
                  currentPnlRoe = (currentPnlUsd / (marginUsed || 1)) * 100;
                  const priceGainPct = ((livePrice - activeCycle.entry_price) / activeCycle.entry_price) * 100;
                  progressPct = Math.min(100, Math.max(0, (priceGainPct / coin.compound_percent) * 100));
                }

                const effectiveEntry = (realPos && realPos.entryPrice > 0)
                  ? realPos.entryPrice
                  : (activeCycle?.entry_price || coin.entry_price || 0);
                const effectiveTarget = effectiveEntry > 0
                  ? effectiveEntry * (1 + coin.compound_percent / 100)
                  : (activeCycle?.target_price || coin.target_price || 0);
                const effectiveNotional = (realPos && realPos.notional > 0)
                  ? realPos.notional
                  : (coin.is_active ? coin.current_notional : coin.notional_usd);
                const effectiveMargin = (realPos && realPos.marginUsd > 0)
                  ? realPos.marginUsd
                  : (effectiveNotional / (coin.leverage || 1));

                return (
                  <div
                    key={coin.symbol}
                    className={`rounded-2xl border p-5 transition-all duration-300 relative flex flex-col justify-between ${
                      coin.is_active
                        ? "bg-slate-900/90 border-emerald-500/50 shadow-xl shadow-emerald-950/20"
                        : "bg-slate-900/60 border-slate-800/90 opacity-90"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              coin.is_active ? "bg-emerald-400 animate-ping" : "bg-slate-600"
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-base text-slate-100">{coin.symbol}</h3>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                {realPos?.leverage || coin.leverage}x
                              </span>
                              {realPos && realPos.positionAmt !== 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  LIVE BINANCE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
                              <span>Mark: {livePrice ? `$${livePrice.toLocaleString()}` : "Memuat..."}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              coin.is_active
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                                : "bg-slate-800 border border-slate-700 text-slate-400"
                            }`}
                          >
                            {coin.is_active ? `CYCLE #${coin.current_cycle}` : "STOPPED"}
                          </span>

                          {!coin.is_active && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCoin(coin.symbol)}
                              disabled={isLoading}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                              title="Hapus Koin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="py-4 space-y-3.5">
                        {coin.is_active && (activeCycle || (realPos && realPos.positionAmt !== 0)) ? (
                          <>
                            {/* Active Cycle Price Stats */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
                                  <span>Harga Entri</span>
                                  {realPos && <span className="text-emerald-400 font-bold text-[9px]">BINANCE REAL</span>}
                                </div>
                                <div className="font-mono font-bold text-slate-200 mt-0.5">
                                  ${effectiveEntry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                                <div className="text-[10px] text-emerald-400 uppercase font-semibold">Target Exit (+{coin.compound_percent}%)</div>
                                <div className="font-mono font-bold text-emerald-400 mt-0.5">
                                  ${effectiveTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </div>
                              </div>
                            </div>

                            {/* Progress towards target */}
                            <div className="space-y-1 p-3 rounded-xl bg-slate-950 border border-slate-800">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3 text-emerald-400" /> Progres Target
                                </span>
                                <span className="font-mono font-bold text-emerald-300">
                                  {progressPct.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                                <span className="flex items-center gap-1">
                                  PnL {realPos ? "Asli Binance" : "Unrealized"}:
                                  {realPos && <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">Live</span>}
                                </span>
                                <span className={`font-mono font-bold ${currentPnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {currentPnlUsd >= 0 ? "+" : ""}${currentPnlUsd.toFixed(2)} USDT ({currentPnlRoe >= 0 ? "+" : ""}${currentPnlRoe.toFixed(2)}% ROE)
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Stopped / Ready Setup */
                          <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Ukuran Posisi:</span>
                              <span className="font-mono font-bold text-slate-100">${coin.notional_usd.toFixed(2)} USD</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Target Compound:</span>
                              <span className="font-mono font-bold text-emerald-400">+{coin.compound_percent}%</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Estimasi Margin:</span>
                              <span className="font-mono font-bold text-slate-200">${effectiveMargin.toFixed(2)} USDT</span>
                            </div>
                          </div>
                        )}

                        {/* Compound Details info */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span>Posisi: <strong className="text-slate-200 font-mono">${effectiveNotional.toFixed(2)} USDT</strong> {realPos && <span className="text-[10px] text-slate-400 font-normal">({Math.abs(realPos.positionAmt)} koin)</span>}</span>
                          <span>Margin: <strong className="text-cyan-300 font-mono">${effectiveMargin.toFixed(2)} USDT</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-800/80">
                      {coin.is_active ? (
                        <button
                          type="button"
                          onClick={() => {
                            setStopTargetSymbol(coin.symbol);
                            setShowStopModal(true);
                          }}
                          disabled={isLoading}
                          className="w-full py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-950"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          {isLoading ? "Menghentikan..." : `STOP ${coin.symbol}`}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleStartCoin({
                              symbol: coin.symbol,
                              notionalUsd: coin.notional_usd,
                              leverage: coin.leverage,
                              compoundPercent: coin.compound_percent,
                              stopLossPercent: coin.stop_loss_percent
                            })
                          }
                          disabled={isLoading}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          {isLoading ? "Membuka BUY..." : `START ${coin.symbol}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Logs & History Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Terminal Logs (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-slate-200 text-sm">
                Log Aktivitas Eksekusi
              </h3>
            </div>

            <button
              type="button"
              onClick={handleClearLogs}
              disabled={clearingLogs || logs.length === 0}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Bersihkan
            </button>
          </div>

          <div
            ref={logContainerRef}
            className="h-80 overflow-y-auto p-3.5 rounded-xl bg-slate-950 border border-slate-900 font-mono text-xs space-y-2 select-text"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-12">Belum ada catatan aktivitas.</div>
            ) : (
              filteredLogs.map((log) => {
                let badgeColor = "bg-slate-800 text-slate-300";
                if (log.category === "START") badgeColor = "bg-cyan-900/60 text-cyan-300 border border-cyan-700/50";
                if (log.category === "BUY") badgeColor = "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50";
                if (log.category === "TARGET_HIT") badgeColor = "bg-emerald-700 text-white font-bold border border-emerald-400";
                if (log.category === "COMPOUND") badgeColor = "bg-purple-900/60 text-purple-300 border border-purple-600/50";
                if (log.category === "CLOSE") badgeColor = "bg-blue-900/60 text-blue-300 border border-blue-700/50";
                if (log.category === "STOP") badgeColor = "bg-amber-900/60 text-amber-300 border border-amber-700/50";
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

        {/* History Table (7 Cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-slate-100 text-sm">
                Riwayat Siklus ({filteredHistory.length})
              </h3>
            </div>
          </div>

          <div className="h-80 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Siklus</th>
                  <th className="py-2.5 px-3">Pair</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Notional</th>
                  <th className="py-2.5 px-3">Entry ➔ Exit</th>
                  <th className="py-2.5 px-3">PnL</th>
                  <th className="py-2.5 px-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                      Belum ada riwayat siklus perdagangan compound.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((cycle) => {
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
                        <td className="py-2.5 px-3 font-bold text-slate-100">
                          #{cycle.cycle_number}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 font-semibold">
                          {cycle.symbol} <span className="text-[10px] text-slate-500">{cycle.leverage}x</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">{statusBadge}</td>
                        <td className="py-2.5 px-3 text-slate-200">
                          ${cycle.notional_in.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          ${cycle.entry_price.toLocaleString()} ➔ {cycle.exit_price ? `$${cycle.exit_price.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          {cycle.status === "OPEN" ? (
                            <span className="text-cyan-400 italic font-sans text-[11px]">Berjalan...</span>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold ${cycle.pnl_usd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {cycle.pnl_usd >= 0 ? "+" : ""}${cycle.pnl_usd.toFixed(2)} USDT
                                </span>
                                {cycle.is_real_pnl && (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                    REAL
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                ({cycle.pnl_percent >= 0 ? "+" : ""}{cycle.pnl_percent.toFixed(2)}%)
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 font-sans">
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
      </div>

      {/* Modal: Tambah Koin Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Tambah Koin Bot Compound Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Pair Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Pilih Pair Futures</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                    placeholder="ETHUSDT"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold tracking-wider text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleValidatePair()}
                    disabled={validating}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5"
                  >
                    {validating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Cek Pair
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {POPULAR_PAIRS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setFormSymbol(p);
                        handleValidatePair(p);
                      }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        formSymbol === p
                          ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-300"
                          : "bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {pairInfo && (
                  <div className={`p-3 rounded-xl border text-xs mt-2 ${
                    pairInfo.isValid
                      ? "bg-emerald-950/40 border-emerald-600/40 text-emerald-200"
                      : "bg-rose-950/40 border-rose-600/40 text-rose-300"
                  }`}>
                    {pairInfo.isValid ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" /> Pair Valid ({pairInfo.symbol})
                          </span>
                          <span className="font-mono text-slate-100">${pairInfo.lastPrice?.toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Min Notional: ${pairInfo.minNotional} USD • 24j: {pairInfo.priceChangePercent}%
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{pairInfo.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notional */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Ukuran Notional Awal (USD)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="5"
                    value={formNotional}
                    onChange={(e) => setFormNotional(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-12 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">USD</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {NOTIONAL_PRESETS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormNotional(val)}
                      className={`px-2.5 py-0.5 rounded text-[11px] ${
                        formNotional === val ? "bg-emerald-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leverage */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Leverage</span>
                  <span className="text-[10px] text-slate-400">
                    Estimasi Margin: ${(formNotional / (formLeverage || 1)).toFixed(2)} USDT
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  {LEVERAGE_PRESETS.map((lev) => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setFormLeverage(lev)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${
                        formLeverage === lev ? "bg-emerald-600 text-white border-emerald-500" : "bg-slate-950 text-slate-300 border-slate-800"
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Compound Target */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Target Compound Kenaikan Harga (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formCompoundPct}
                    onChange={(e) => setFormCompoundPct(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COMPOUND_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setFormCompoundPct(pct)}
                      className={`px-2.5 py-0.5 rounded text-[11px] ${
                        formCompoundPct === pct ? "bg-emerald-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Stop Loss Optional */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Proteksi Stop Loss</label>
                  <button
                    type="button"
                    onClick={() => setFormEnableSL(!formEnableSL)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                      formEnableSL ? "bg-rose-950/60 border-rose-500/50 text-rose-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    {formEnableSL ? "SL Aktif" : "Tanpa SL"}
                  </button>
                </div>
                {formEnableSL && (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={formSLPct}
                      onChange={(e) => setFormSLPct(parseFloat(e.target.value) || 0)}
                      className="w-full pl-3 pr-10 py-1.5 rounded-xl bg-slate-950 border border-rose-900/60 text-xs font-semibold text-rose-200"
                    />
                    <span className="absolute right-3.5 top-2 text-xs text-rose-400 font-bold">-%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveCoinOnly}
                disabled={!pairInfo?.isValid}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Simpan Saja (Idle)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleStartCoin({
                    symbol: formSymbol,
                    notionalUsd: formNotional,
                    leverage: formLeverage,
                    compoundPercent: formCompoundPct,
                    stopLossPercent: formEnableSL ? formSLPct : null
                  })
                }
                disabled={!pairInfo?.isValid}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Simpan & Langsung START
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Stop */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-100">
                Konfirmasi Hentikan Bot {stopTargetSymbol === "ALL" ? "Semua Koin" : stopTargetSymbol}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda sedang menghentikan bot compound{" "}
              <strong>{stopTargetSymbol === "ALL" ? "untuk SELURUH koin yang sedang aktif" : `untuk koin ${stopTargetSymbol}`}</strong>.
              Apakah Anda ingin sekaligus menutup posisi pasar aktif di akun Binance Futures saat ini?
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
                  <div className="text-[11px] text-slate-400">Hanya matikan otomasi bot, posisi koin tetap berjalan di Binance.</div>
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmStop}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950"
              >
                Ya, Hentikan {stopTargetSymbol === "ALL" ? "Semua" : stopTargetSymbol}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
