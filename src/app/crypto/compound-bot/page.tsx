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
  PlusCircle,
  ArrowDownRight,
  Sparkles,
  X,
  Coins,
  Settings2,
  StopCircle,
  AlarmClockOff,
  Target,
  Crosshair
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
  target_cycles?: number | null;
  target_price_goal?: number | null;
  current_cycle: number;
  total_profit: number;
  entry_price: number | null;
  target_price: number | null;
  sl_price: number | null;
  quantity: number | null;
  last_check_at: string | null;
  real_position?: RealPosition | null;
  dca_auto_enabled?: boolean;
  dca_drop_percent?: number | null;
  dca_notional_usd?: number | null;
  dca_trigger_price?: number | null;
  dca_executed?: boolean;
  dca_count?: number;
  auto_stop_hours?: number | null;
  auto_stop_at?: string | null;
  sl_reopen_enabled?: boolean;
  sl_waiting_reopen?: boolean;
  sl_hit_time?: string | null;
  sl_last_checked_kline_time?: number | null;
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
  dca_count?: number;
  dca_added_notional?: number;
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
const STOP_HOURS_PRESETS = [0, 1, 2, 4, 8, 12, 24];

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
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [formSymbol, setFormSymbol] = useState("ETHUSDT");
  const [formNotional, setFormNotional] = useState<number>(100);
  const [formLeverage, setFormLeverage] = useState<number>(20);
  const [formCompoundPct, setFormCompoundPct] = useState<number>(1.0);
  const [formEnableSL, setFormEnableSL] = useState<boolean>(false);
  const [formSLPct, setFormSLPct] = useState<number>(2.0);
  const [formSLReopenEnabled, setFormSLReopenEnabled] = useState<boolean>(true); // default true when SL is enabled
  const [formAutoStopHours, setFormAutoStopHours] = useState<number>(8); // default 8 jam, 0 = Nonstop
  const [formTargetCycles, setFormTargetCycles] = useState<number>(0); // 0 = Bebas / tanpa batas cycle, > 0 = target max cycle
  const [formTargetPriceGoal, setFormTargetPriceGoal] = useState<number>(0); // 0 = Bebas / tanpa target harga, > 0 = target price (auto-stop & close)
  const [formStartImmediately, setFormStartImmediately] = useState<boolean>(true);

  // 1-Second Tick for smooth live countdown display
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTimerTick((prev) => (prev + 1) % 10000), 1000);
    return () => clearInterval(t);
  }, []);

  // Helper to format remaining time until auto-stop
  const formatCountdown = (autoStopAt: string | null | undefined) => {
    if (!autoStopAt) return null;
    const diff = new Date(autoStopAt).getTime() - Date.now();
    if (diff <= 0) return "WAKTU HABIS (AUTO-CLOSING)";
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Validation State
  const [validating, setValidating] = useState(false);
  const [pairInfo, setPairInfo] = useState<PairValidation | null>(null);

  // Modal: Stop Confirmation
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopTargetSymbol, setStopTargetSymbol] = useState<string>("ALL");
  const [stopWithClose, setStopWithClose] = useState(true);

  // Modal: DCA Position
  const [showDcaModal, setShowDcaModal] = useState(false);
  const [selectedDcaCoin, setSelectedDcaCoin] = useState<CompoundConfig | null>(null);
  const [dcaMode, setDcaMode] = useState<"INSTANT" | "AUTO_DIP">("INSTANT");
  const [instantNotional, setInstantNotional] = useState<number>(50);
  const [autoDropPercent, setAutoDropPercent] = useState<number>(2.0);
  const [autoNotional, setAutoNotional] = useState<number>(50);
  const [dcaSubmitting, setDcaSubmitting] = useState(false);

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
            // Check if any compound executed, DCA triggered, or SL hit to refresh full state
            const hasTrigger = json.data.coins?.some(
              (c: any) =>
                c.status === "COMPOUND_EXECUTED" ||
                c.status === "STOP_LOSS_HIT" ||
                c.status === "DCA_TRIGGERED" ||
                c.status === "TARGET_PRICE_REACHED" ||
                c.status === "TARGET_CYCLE_REACHED" ||
                c.status === "AUTO_STOPPED_TIMER_EXPIRED"
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
    autoStopHours?: number | null;
    targetCycles?: number | null;
    targetPriceGoal?: number | null;
    slReopenEnabled?: boolean | null;
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
          stopLossPercent: coinConfig.stopLossPercent,
          autoStopHours: coinConfig.autoStopHours,
          targetCycles: coinConfig.targetCycles,
          targetPriceGoal: coinConfig.targetPriceGoal,
          slReopenEnabled: coinConfig.slReopenEnabled !== undefined ? coinConfig.slReopenEnabled : formSLReopenEnabled
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
          stopLossPercent: formEnableSL ? formSLPct : null,
          autoStopHours: formAutoStopHours > 0 ? formAutoStopHours : null,
          targetCycles: formTargetCycles > 0 ? formTargetCycles : null,
          targetPriceGoal: formTargetPriceGoal > 0 ? formTargetPriceGoal : null,
          slReopenEnabled: formEnableSL ? formSLReopenEnabled : false
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

  // Open modal to configure / edit an existing coin
  const handleOpenEditModal = (coin: CompoundConfig) => {
    setIsEditingExisting(true);
    setFormSymbol(coin.symbol);
    setFormNotional(coin.notional_usd);
    setFormLeverage(coin.leverage);
    setFormCompoundPct(coin.compound_percent);
    setFormEnableSL(Boolean(coin.stop_loss_percent));
    setFormSLPct(coin.stop_loss_percent || 2.0);
    setFormSLReopenEnabled(coin.sl_reopen_enabled !== undefined ? Boolean(coin.sl_reopen_enabled) : true);
    setFormAutoStopHours(coin.auto_stop_hours || 0);
    setFormTargetCycles(coin.target_cycles || 0);
    setFormTargetPriceGoal(coin.target_price_goal || 0);
    handleValidatePair(coin.symbol);
    setShowAddModal(true);
  };

  // Cancel pending H4 re-open after Stop Loss
  const handleCancelSlReopen = async (symbol: string) => {
    if (!confirm(`Batalkan status siaga re-open candle H4 untuk ${symbol}?\n\nBot akan tetap berstatus STOPPED dan tidak akan membuka posisi baru secara otomatis.`)) {
      return;
    }
    const sym = symbol.toUpperCase().trim();
    setActionLoading((prev) => ({ ...prev, [sym]: true }));
    try {
      const res = await fetch("/api/crypto/compound-bot/cancel-sl-reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || `Status siaga re-open H4 untuk ${sym} berhasil dibatalkan.`);
        await fetchState();
      } else {
        alert(`Gagal membatalkan: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [sym]: false }));
    }
  };

  // Clear / remove Target Price Goal for a coin
  const handleClearTargetPrice = async (symbol: string) => {
    if (!confirm(`Hapus pengaturan target price untuk ${symbol}? Bot akan tetap beroperasi dalam mode bebas tanpa batas harga target.`)) {
      return;
    }
    const sym = symbol.toUpperCase().trim();
    setActionLoading((prev) => ({ ...prev, [sym]: true }));
    try {
      const res = await fetch("/api/crypto/compound-bot/clear-target-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || `Target price ${sym} berhasil dihapus.`);
        await fetchState();
      } else {
        alert(`Gagal menghapus target price: ${json.error}`);
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

  // 7. Stop / Cancel Auto-Stop Hourly Timer for a coin
  const handleStopTimer = async (symbol: string) => {
    const coin = coins.find((c) => c.symbol === symbol);
    const isRunning = coin?.is_active;

    const confirmMsg = isRunning
      ? `Hentikan fitur hitung mundur jam untuk ${symbol}?\n\nBot akan tetap berjalan aktif dalam mode Nonstop tanpa auto-close posisi.`
      : `Hapus konfigurasi timer auto-stop untuk ${symbol} dan ubah ke mode Nonstop?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading((prev) => ({ ...prev, [symbol]: true }));
    try {
      const res = await fetch("/api/crypto/compound-bot/stop-timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || `Fitur jam untuk ${symbol} berhasil dihentikan.`);
        await fetchState();
      } else {
        alert(`Gagal menghentikan fitur jam: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [symbol]: false }));
    }
  };

  // 8. Delete Coin Config
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

  // 9. DCA Handlers
  const handleOpenDcaModal = (coin: CompoundConfig) => {
    setSelectedDcaCoin(coin);
    const defaultNotional = coin.notional_usd ? Math.max(10, Math.round(coin.notional_usd * 0.5)) : 50;
    setInstantNotional(defaultNotional);
    setAutoDropPercent(coin.dca_drop_percent || 2.0);
    setAutoNotional(coin.dca_notional_usd || defaultNotional);
    setDcaMode(coin.dca_auto_enabled ? "AUTO_DIP" : "INSTANT");
    setShowDcaModal(true);
  };

  const handleExecuteInstantDca = async () => {
    if (!selectedDcaCoin) return;
    if (!instantNotional || instantNotional <= 0) {
      alert("Nominal tambahan notional harus lebih dari 0 USD.");
      return;
    }

    setDcaSubmitting(true);
    try {
      const res = await fetch("/api/crypto/compound-bot/dca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INSTANT",
          symbol: selectedDcaCoin.symbol,
          notionalUsd: instantNotional
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message || `DCA Instan ${selectedDcaCoin.symbol} berhasil!`);
        setShowDcaModal(false);
        await fetchState();
      } else {
        alert(`Gagal DCA: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDcaSubmitting(false);
    }
  };

  const handleSetAutoDca = async () => {
    if (!selectedDcaCoin) return;
    if (!autoDropPercent || autoDropPercent <= 0) {
      alert("Target persentase penurunan harus lebih dari 0%.");
      return;
    }
    if (!autoNotional || autoNotional <= 0) {
      alert("Nominal tambahan notional harus lebih dari 0 USD.");
      return;
    }

    setDcaSubmitting(true);
    try {
      const res = await fetch("/api/crypto/compound-bot/dca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_AUTO",
          symbol: selectedDcaCoin.symbol,
          dropPercent: autoDropPercent,
          notionalUsd: autoNotional
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message || `Auto DCA untuk ${selectedDcaCoin.symbol} berhasil diaktifkan!`);
        setShowDcaModal(false);
        await fetchState();
      } else {
        alert(`Gagal memasang Auto DCA: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDcaSubmitting(false);
    }
  };

  const handleCancelAutoDca = async () => {
    if (!selectedDcaCoin) return;
    if (!window.confirm(`Batalkan Auto DCA penurunan untuk ${selectedDcaCoin.symbol}?`)) return;

    setDcaSubmitting(true);
    try {
      const res = await fetch("/api/crypto/compound-bot/dca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CANCEL_AUTO",
          symbol: selectedDcaCoin.symbol
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message || `Auto DCA untuk ${selectedDcaCoin.symbol} telah dibatalkan.`);
        setShowDcaModal(false);
        await fetchState();
      } else {
        alert(`Gagal membatalkan Auto DCA: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDcaSubmitting(false);
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
              setIsEditingExisting(false);
              setFormSymbol("ETHUSDT");
              setFormNotional(100);
              setFormLeverage(20);
              setFormCompoundPct(1.0);
              setFormEnableSL(false);
              setFormSLPct(2.0);
              setFormAutoStopHours(8); // Default 8 jam
              setFormTargetCycles(0); // Default nonstop cycle
              setFormTargetPriceGoal(0); // Default tanpa target harga
              setFormSLReopenEnabled(true);
              setShowAddModal(true);
              handleValidatePair("ETHUSDT");
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
                setIsEditingExisting(false);
                setFormSymbol("ETHUSDT");
                setFormNotional(100);
                setFormLeverage(20);
                setFormCompoundPct(1.0);
                setFormEnableSL(false);
                setFormSLPct(2.0);
                setFormAutoStopHours(8);
                setFormTargetCycles(0);
                setFormTargetPriceGoal(0);
                setFormSLReopenEnabled(true);
                setShowAddModal(true);
                handleValidatePair("ETHUSDT");
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

                        {/* Status Badge, Auto-Stop Countdown & DCA Indicators */}
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Live Auto-Stop Countdown Badge & Stop Timer Button */}
                          {coin.is_active && coin.auto_stop_at && (
                            <div className="flex items-center gap-1 bg-amber-950/80 border border-amber-500/60 rounded-full pl-2.5 pr-1 py-0.5 shadow-sm">
                              <div
                                className="flex items-center gap-1 text-[10px] font-bold text-amber-300"
                                title={`Auto-Stop: Posisi akan otomatis ditutup setelah durasi ${coin.auto_stop_hours} jam habis`}
                              >
                                <Clock className="w-3 h-3 text-amber-400 animate-spin-slow" />
                                <span className="font-mono">{formatCountdown(coin.auto_stop_at)}</span>
                                <span className="text-[9px] text-amber-400 font-normal">({coin.auto_stop_hours}j)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStopTimer(coin.symbol)}
                                disabled={actionLoading[coin.symbol] || isLoading}
                                className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-950 hover:bg-rose-900 border border-rose-600/60 hover:border-rose-400 text-rose-300 hover:text-white text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                title={`Hentikan fitur hitung mundur jam untuk ${coin.symbol} (Bot tetap aktif berjalan Nonstop)`}
                              >
                                <AlarmClockOff className="w-2.5 h-2.5 text-rose-400" />
                                <span>Hentikan Jam</span>
                              </button>
                            </div>
                          )}

                          {!coin.is_active && coin.auto_stop_hours && coin.auto_stop_hours > 0 ? (
                            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full pl-2 pr-1 py-0.5">
                              <span
                                className="text-[10px] font-bold text-slate-300 flex items-center gap-1"
                                title={`Timer Auto-Stop ${coin.auto_stop_hours} jam telah dikonfigurasi dan akan aktif saat bot di-START`}
                              >
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                                Timer: {coin.auto_stop_hours}j
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStopTimer(coin.symbol)}
                                disabled={actionLoading[coin.symbol] || isLoading}
                                className="p-0.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title={`Hentikan fitur jam / hapus timer ${coin.auto_stop_hours}j untuk ${coin.symbol} (Jadikan Nonstop)`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : null}

                          {coin.dca_auto_enabled && coin.dca_drop_percent && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 border border-amber-500/60 text-amber-300 flex items-center gap-1"
                              title={`Auto DCA Aktif: Menunggu penurunan -${coin.dca_drop_percent}% (Pemicu: $${coin.dca_trigger_price ? coin.dca_trigger_price.toFixed(4) : '-'}) untuk tambah +$${coin.dca_notional_usd} USD`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              Auto DCA: -{coin.dca_drop_percent}%
                            </span>
                          )}

                          {coin.dca_count && coin.dca_count > 0 ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950/90 border border-purple-600/60 text-purple-300"
                              title={`Posisi telah di-DCA sebanyak ${coin.dca_count} kali`}
                            >
                              DCA x{coin.dca_count}
                            </span>
                          ) : null}

                          {/* Target Cycle Badge */}
                          {coin.target_cycles && coin.target_cycles > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shadow-sm ${
                                coin.is_active
                                  ? "bg-cyan-950/80 border-cyan-500/60 text-cyan-300"
                                  : "bg-slate-800 border-slate-700 text-slate-300"
                              }`}
                              title={`Target: Bot otomatis STOP setelah Cycle #${coin.target_cycles} Take Profit`}
                            >
                              <Target className="w-2.5 h-2.5 text-cyan-400" />
                              {coin.is_active ? `Target: C#${coin.current_cycle}/${coin.target_cycles}` : `Target: ${coin.target_cycles} Cycle`}
                            </span>
                          ) : null}

                          {/* Target Price Goal Badge */}
                          {coin.target_price_goal && coin.target_price_goal > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shadow-sm ${
                                coin.is_active
                                  ? "bg-indigo-950/80 border-indigo-500/60 text-indigo-300"
                                  : "bg-slate-800 border-slate-700 text-slate-300"
                              }`}
                              title={`Target Price: Bot otomatis STOP & close posisi saat harga menyentuh $${coin.target_price_goal.toLocaleString()}`}
                            >
                              <Crosshair className="w-2.5 h-2.5 text-indigo-400" />
                              TP: ${coin.target_price_goal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearTargetPrice(coin.symbol);
                                }}
                                className="ml-0.5 p-0.5 rounded hover:bg-indigo-800/60 hover:text-rose-300 transition-colors cursor-pointer"
                                title="Hapus Target Price"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ) : null}

                          {/* SIAGA RE-OPEN CANDLE H4 BADGE */}
                          {coin.sl_waiting_reopen && !coin.is_active ? (
                            <span
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/90 border border-amber-500/70 text-amber-300 flex items-center gap-1 shadow-md shadow-amber-950/40 animate-pulse"
                              title="Bot sedang siaga menunggu penutupan candle H4 (Close > Open Prev) untuk open kembali otomatis pasca Stop Loss"
                            >
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              SIAGA RE-OPEN (H4)
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelSlReopen(coin.symbol);
                                }}
                                className="ml-1 p-0.5 rounded hover:bg-amber-900/60 hover:text-white transition-colors cursor-pointer"
                                title="Batalkan Siaga Re-Open"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ) : null}

                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              coin.is_active
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                                : "bg-slate-800 border border-slate-700 text-slate-400"
                            }`}
                          >
                            {coin.is_active ? `CYCLE #${coin.current_cycle}` : "STOPPED"}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(coin)}
                              disabled={isLoading}
                              className="p-1 rounded text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Pengaturan Target Cycle & Durasi Auto-Stop Koin"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                            </button>
                            {!coin.is_active && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCoin(coin.symbol)}
                                disabled={isLoading}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Hapus Koin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

                            {/* Target Price Goal Active Row */}
                            {coin.target_price_goal && coin.target_price_goal > 0 && (
                              <div className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-900/50 text-indigo-200 font-mono">
                                <span className="flex items-center gap-1.5 text-indigo-400 font-sans font-semibold">
                                  <Crosshair className="w-3.5 h-3.5" /> Target Price:
                                </span>
                                <span className="font-bold text-slate-100">
                                  ${coin.target_price_goal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                  {livePrice > 0 ? (
                                    <span className={`text-[10px] ml-1.5 font-normal ${livePrice >= coin.target_price_goal ? "text-emerald-400 font-bold" : "text-indigo-300/80"}`}>
                                      ({livePrice >= coin.target_price_goal ? "Tercapai!" : `${(((coin.target_price_goal - livePrice) / livePrice) * 100).toFixed(2)}% lagi`})
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Stopped / Ready Setup */
                          <div className="space-y-2.5">
                            {/* Status Siaga Re-Open H4 Banner */}
                            {coin.sl_waiting_reopen && !coin.is_active && (
                              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    Siaga Re-Open Pasca Stop Loss
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelSlReopen(coin.symbol)}
                                    disabled={actionLoading[coin.symbol] || isLoading}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 hover:bg-rose-950 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-200 transition-all cursor-pointer"
                                  >
                                    Batalkan Siaga
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                  Bot memantau konfirmasi candle <strong>4 Jam (H4)</strong>. Begitu candle H4 saat ini resmi tutup dengan <strong>Close &gt; Open candle sebelumnya</strong>, bot akan otomatis membuka kembali Cycle #1 sesuai notional (${coin.notional_usd.toFixed(2)}) &amp; settingan.
                                </p>
                                <div className="text-[10px] text-amber-300/90 font-mono bg-amber-950/70 px-2.5 py-1.5 rounded-lg border border-amber-800/60 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                    Memantau Candle H4
                                  </span>
                                  <span className="text-emerald-400 font-bold">Auto-Open: Siap</span>
                                </div>
                              </div>
                            )}

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
                                <span>Target Siklus:</span>
                                <span className="font-mono font-bold text-cyan-400">
                                  {coin.target_cycles && coin.target_cycles > 0 ? `${coin.target_cycles} Cycle (Auto-Stop saat TP)` : "Bebas / Tanpa Batas"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Target Price:</span>
                                <span className="font-mono font-bold text-indigo-400">
                                  {coin.target_price_goal && coin.target_price_goal > 0
                                    ? `$${coin.target_price_goal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} (Auto-Stop)`
                                    : "Bebas / Tanpa Batas"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Re-Open Pasca SL:</span>
                                <span className={`font-mono font-bold ${coin.sl_reopen_enabled ? "text-emerald-400" : "text-slate-400"}`}>
                                  {coin.sl_reopen_enabled ? "Aktif (Candle H4)" : "Nonaktif"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Estimasi Margin:</span>
                                <span className="font-mono font-bold text-slate-200">${effectiveMargin.toFixed(2)} USDT</span>
                              </div>
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
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                      {/* DCA Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenDcaModal(coin)}
                        disabled={isLoading}
                        className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                          coin.dca_auto_enabled
                            ? "bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white shadow-amber-950/40 border border-amber-400/50"
                            : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/40 hover:border-amber-500/70"
                        }`}
                        title="Tambah Posisi Notional (DCA Instan / Auto Dip)"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        DCA
                        {coin.dca_count && coin.dca_count > 0 ? (
                          <span className="px-1 py-0.2 rounded bg-amber-950 text-[9px] text-amber-200">
                            x{coin.dca_count}
                          </span>
                        ) : null}
                      </button>

                      {/* Tombol Hentikan Jam (Saat bot aktif berjalan dengan timer) */}
                      {coin.is_active && coin.auto_stop_at && (
                        <button
                          type="button"
                          onClick={() => handleStopTimer(coin.symbol)}
                          disabled={actionLoading[coin.symbol] || isLoading}
                          className="px-3 py-2.5 rounded-xl bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 hover:text-amber-100 border border-amber-600/50 hover:border-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                          title={`Hentikan fitur hitung mundur jam untuk ${coin.symbol} (Bot tetap aktif berjalan Nonstop)`}
                        >
                          <AlarmClockOff className="w-3.5 h-3.5 text-amber-400" />
                          <span>Hentikan Jam</span>
                        </button>
                      )}

                      {/* Tombol Batalkan Siaga Re-Open jika bot STOPPED tapi sedang siaga H4 */}
                      {!coin.is_active && coin.sl_waiting_reopen && (
                        <button
                          type="button"
                          onClick={() => handleCancelSlReopen(coin.symbol)}
                          disabled={actionLoading[coin.symbol] || isLoading}
                          className="px-3 py-2.5 rounded-xl bg-amber-950/70 hover:bg-rose-950 text-amber-300 hover:text-rose-200 border border-amber-600/50 hover:border-rose-500 font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-md cursor-pointer"
                          title={`Batalkan status siaga re-open H4 untuk ${coin.symbol}`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Batal Siaga</span>
                        </button>
                      )}

                      {/* Start / Stop Button */}
                      {coin.is_active ? (
                        <button
                          type="button"
                          onClick={() => {
                            setStopTargetSymbol(coin.symbol);
                            setShowStopModal(true);
                          }}
                          disabled={isLoading}
                          className="flex-1 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-950 cursor-pointer"
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
                              stopLossPercent: coin.stop_loss_percent,
                              autoStopHours: coin.auto_stop_hours,
                              targetCycles: coin.target_cycles,
                              targetPriceGoal: coin.target_price_goal,
                              slReopenEnabled: coin.sl_reopen_enabled
                            })
                          }
                          disabled={isLoading}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950 cursor-pointer"
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
                if (log.category === "DCA") badgeColor = "bg-amber-900/80 text-amber-300 border border-amber-500/60 font-bold";
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
                          {cycle.dca_count && cycle.dca_count > 0 ? (
                            <span
                              className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-600/60 inline-flex items-center"
                              title={`Posisi ditambah ${cycle.dca_count}x DCA (+${cycle.dca_added_notional ? `$${cycle.dca_added_notional.toFixed(2)}` : ''})`}
                            >
                              +{cycle.dca_count} DCA
                            </span>
                          ) : null}
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

      {/* Modal: Tambah / Edit Koin */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {isEditingExisting ? (
                  <>
                    <Settings2 className="w-5 h-5 text-emerald-400" />
                    Pengaturan Koin • {formSymbol}
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-emerald-400" />
                    Tambah Koin Bot Compound Baru
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
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
                {formEnableSL && (
                  <p className="text-[11px] text-rose-400/90 leading-relaxed italic">
                    *Jika harga turun menyentuh level Stop Loss (<strong>-{formSLPct}%</strong>), bot <strong>otomatis STOP</strong> dan <strong>menutup posisi aktif di Binance</strong> untuk mencegah kerugian lebih besar.
                  </p>
                )}
                {formEnableSL && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 cursor-pointer">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Auto Re-Open Pasca SL (Candle H4)
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormSLReopenEnabled(!formSLReopenEnabled)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                          formSLReopenEnabled
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-950"
                            : "bg-slate-900 text-slate-400 border-slate-700"
                        }`}
                      >
                        {formSLReopenEnabled ? "AKTIF" : "NONAKTIF"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Jika menyentuh SL, bot akan <strong>otomatis open kembali</strong> sesuai settingan begitu candle <strong>H4 resmi ditutup</strong> dengan harga penutupan (Close) <strong>lebih tinggi dari harga Open candle sebelumnya</strong> (Reversal Bullish).
                    </p>
                  </div>
                )}
              </div>

              {/* Durasi Operasional Bot (Pilihan Auto-Stop) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Durasi Operasional Bot (Auto-Stop)
                  </label>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    {formAutoStopHours > 0 ? `Otomatis STOP Setelah ${formAutoStopHours} Jam` : "Nonstop (Manual Stop)"}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormAutoStopHours(0)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      formAutoStopHours === 0
                        ? "bg-slate-800 text-slate-100 border-slate-600 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    Nonstop
                  </button>
                  {[1, 2, 4, 8, 12, 24].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setFormAutoStopHours(hours)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        formAutoStopHours === hours
                          ? "bg-amber-600/90 text-white border-amber-400 shadow-md shadow-amber-950/40"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-600/40"
                      }`}
                    >
                      {hours === 8 ? "8 Jam ★" : `${hours} Jam`}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formAutoStopHours === 0 ? "" : formAutoStopHours}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormAutoStopHours(isNaN(val) ? 0 : val);
                    }}
                    placeholder="Input jam kustom (misal: 8)"
                    className="w-full pl-3 pr-12 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3.5 top-2 text-xs text-amber-400 font-bold">Jam</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  *Setelah bot di-START, bot akan beroperasi sampai <strong>{formAutoStopHours > 0 ? `${formAutoStopHours} jam` : 'X jam'}</strong> kemudian otomatis <strong>STOP</strong> dan <strong>menutup posisi pasar koin tersebut</strong> yang masih open di Binance.
                </p>
              </div>

              {/* Target Cycle Bot (Auto-Stop saat TP) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    Target Cycle Bot (Auto-Stop saat TP)
                  </label>
                  <span className="text-[10px] text-cyan-400 font-semibold">
                    {formTargetCycles > 0 ? `Stop Otomatis di Cycle #${formTargetCycles} TP` : "Bebas / Tanpa Batas Cycle"}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormTargetCycles(0)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      formTargetCycles === 0
                        ? "bg-slate-800 text-slate-100 border-slate-600 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    Bebas
                  </button>
                  {[3, 5, 8, 10].map((cyc) => (
                    <button
                      key={cyc}
                      type="button"
                      onClick={() => setFormTargetCycles(cyc)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        formTargetCycles === cyc
                          ? "bg-cyan-600/90 text-white border-cyan-400 shadow-md shadow-cyan-950/40"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-600/40"
                      }`}
                    >
                      {cyc === 5 ? "5 Cycle ★" : `${cyc} Cycle`}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formTargetCycles === 0 ? "" : formTargetCycles}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormTargetCycles(isNaN(val) ? 0 : val);
                    }}
                    placeholder="Input target cycle kustom (misal: 5)"
                    className="w-full pl-3 pr-16 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3.5 top-2 text-xs text-cyan-400 font-bold">Cycle</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  *Jika disetel <strong>{formTargetCycles > 0 ? `${formTargetCycles} cycle` : 'misal 5 cycle'}</strong>, saat Cycle #{formTargetCycles > 0 ? formTargetCycles : '5'} Take Profit (TP), bot <strong>otomatis STOP</strong>, mengunci profit, dan tidak membuka cycle berikutnya.
                </p>
              </div>

              {/* Target Price yang Dituju (Auto-Stop saat Sampai Target Harga) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                    Target Price yang Dituju (Auto-Stop & Close Posisi)
                  </label>
                  <span className="text-[10px] text-indigo-400 font-semibold">
                    {formTargetPriceGoal > 0 ? `Stop di $${formTargetPriceGoal.toLocaleString()}` : "Bebas / Tanpa Batas Harga"}
                  </span>
                </div>

                {/* Preset Chips based on live pair price */}
                {pairInfo?.lastPrice && pairInfo.lastPrice > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[2, 5, 10, 15, 25].map((pct) => {
                        const calculatedPrice = parseFloat((pairInfo.lastPrice! * (1 + pct / 100)).toFixed(4));
                        const isSelected = Math.abs(formTargetPriceGoal - calculatedPrice) < 0.0001;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setFormTargetPriceGoal(calculatedPrice)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600/90 text-white border-indigo-400 shadow-md shadow-indigo-950/40"
                                : "bg-slate-950 text-slate-300 border-slate-800 hover:border-indigo-600/40"
                            }`}
                          >
                            +{pct}% (${calculatedPrice.toLocaleString()})
                          </button>
                        );
                      })}
                      {formTargetPriceGoal > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormTargetPriceGoal(0)}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 cursor-pointer"
                        >
                          Bebas (Hapus Target)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Target Price Input */}
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formTargetPriceGoal === 0 ? "" : formTargetPriceGoal}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormTargetPriceGoal(isNaN(val) ? 0 : val);
                    }}
                    placeholder="Input harga target (misal: 95000 atau 2.850)"
                    className="w-full pl-3 pr-16 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3.5 top-2 text-xs text-indigo-400 font-bold">USD</span>
                </div>

                {formTargetPriceGoal > 0 && pairInfo?.lastPrice && (
                  <div className="text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-900/60 p-2 rounded-lg flex items-center justify-between">
                    <span>Jarak dari harga pasar saat ini:</span>
                    <span className="font-mono font-bold">
                      {formTargetPriceGoal > pairInfo.lastPrice ? "+" : ""}
                      {(((formTargetPriceGoal - pairInfo.lastPrice) / pairInfo.lastPrice) * 100).toFixed(2)}%
                      {formTargetPriceGoal <= pairInfo.lastPrice && (
                        <span className="text-rose-400 ml-1.5 font-sans">(⚠️ Harus di atas harga saat ini ${pairInfo.lastPrice.toLocaleString()})</span>
                      )}
                    </span>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  *Jika harga koin menyentuh atau melampaui <strong>{formTargetPriceGoal > 0 ? `$${formTargetPriceGoal.toLocaleString()}` : 'target price yang ditentukan'}</strong>, bot otomatis <strong>STOP</strong> dan <strong>menutup seluruh posisi pasar aktif di Binance</strong> untuk mengamankan profit.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              {coins.find((c) => c.symbol === formSymbol)?.is_active ? (
                <button
                  type="button"
                  onClick={handleSaveCoinOnly}
                  disabled={!pairInfo?.isValid}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Simpan Perubahan Pengaturan
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveCoinOnly}
                    disabled={!pairInfo?.isValid}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
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
                        stopLossPercent: formEnableSL ? formSLPct : null,
                        autoStopHours: formAutoStopHours > 0 ? formAutoStopHours : null,
                        targetCycles: formTargetCycles > 0 ? formTargetCycles : null,
                        targetPriceGoal: formTargetPriceGoal > 0 ? formTargetPriceGoal : null,
                        slReopenEnabled: formEnableSL ? formSLReopenEnabled : false
                      })
                    }
                    disabled={!pairInfo?.isValid || Boolean(formTargetPriceGoal > 0 && pairInfo?.lastPrice && formTargetPriceGoal <= pairInfo.lastPrice)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    {isEditingExisting ? "Simpan & START" : "Simpan & Langsung START"}
                  </button>
                </>
              )}
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

      {/* Modal: DCA (Tambah Posisi Notional) */}
      {showDcaModal && selectedDcaCoin && (() => {
        const coin = selectedDcaCoin;
        const activeCycle = activeCyclesMap[coin.symbol];
        const realPos = coin.real_position || activeCycle?.real_position;
        const livePrice = realPos?.markPrice || livePrices[coin.symbol] || coin.entry_price || 0;
        const currentEntry = (realPos && realPos.entryPrice > 0)
          ? realPos.entryPrice
          : (activeCycle?.entry_price || coin.entry_price || livePrice);
        const currentQty = (realPos && realPos.positionAmt !== 0)
          ? Math.abs(realPos.positionAmt)
          : (activeCycle?.quantity || coin.quantity || (currentEntry > 0 ? coin.notional_usd / currentEntry : 0));
        const currentNotional = (realPos && realPos.notional > 0)
          ? realPos.notional
          : (coin.is_active ? coin.current_notional : coin.notional_usd);
        const leverage = realPos?.leverage || coin.leverage || 20;
        const compoundPercent = coin.compound_percent || 1.0;

        // Instant DCA calculations
        const instantMargin = instantNotional / leverage;
        const instantNewTotalNotional = currentNotional + instantNotional;
        const instantAddedQty = livePrice > 0 ? (instantNotional / livePrice) : 0;
        const instantNewTotalQty = currentQty + instantAddedQty;
        const instantEstNewEntry = (instantNewTotalQty > 0 && livePrice > 0)
          ? (((currentQty * currentEntry) + (instantAddedQty * livePrice)) / instantNewTotalQty)
          : livePrice;
        const instantEstNewTarget = instantEstNewEntry * (1 + compoundPercent / 100);
        const currentTarget = currentEntry * (1 + compoundPercent / 100);

        // Auto DCA calculations
        const autoTriggerPrice = currentEntry * (1 - autoDropPercent / 100);
        const autoMargin = autoNotional / leverage;
        const autoAddedQty = autoTriggerPrice > 0 ? (autoNotional / autoTriggerPrice) : 0;
        const autoNewTotalQty = currentQty + autoAddedQty;
        const autoEstNewEntry = (autoNewTotalQty > 0 && autoTriggerPrice > 0)
          ? (((currentQty * currentEntry) + (autoAddedQty * autoTriggerPrice)) / autoNewTotalQty)
          : autoTriggerPrice;
        const autoEstNewTarget = autoEstNewEntry * (1 + compoundPercent / 100);

        // Live gap to existing trigger
        const existingTrigger = coin.dca_trigger_price || (currentEntry * (1 - (coin.dca_drop_percent || 2) / 100));
        const distanceToTriggerPct = (livePrice > 0 && existingTrigger > 0)
          ? (((livePrice - existingTrigger) / livePrice) * 100)
          : 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-md shadow-amber-950/40">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      DCA Posisi • {coin.symbol}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tambah posisi notional untuk meratakan harga entri & mempercepat target profit
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDcaModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Bar Koin */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Ukuran Posisi Saat Ini:</span>
                  <span className="font-mono font-bold text-slate-100">
                    ${currentNotional.toFixed(2)} USD <span className="text-[10px] text-cyan-400 font-normal">({(currentNotional / leverage).toFixed(2)} USDT @ {leverage}x)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Harga Entri Rata-Rata:</span>
                  <span className="font-mono font-bold text-slate-200">
                    ${currentEntry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Harga Pasar Live (Mark):</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {livePrice ? `$${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "Memuat..."}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Target Exit Saat Ini (+{compoundPercent}%):</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${currentTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                </div>
              </div>

              {/* Inactive Notice if Stopped */}
              {!coin.is_active ? (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 space-y-3 text-center">
                  <div className="text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Koin ini sedang STOPPED (tidak ada posisi aktif berjalan).
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Fitur DCA digunakan untuk menambah modal pada posisi koin yang sedang terbuka di Binance. Silakan mulai bot (START) koin ini terlebih dahulu.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDcaModal(false);
                      handleStartCoin({
                        symbol: coin.symbol,
                        notionalUsd: coin.notional_usd,
                        leverage: coin.leverage,
                        compoundPercent: coin.compound_percent,
                        stopLossPercent: coin.stop_loss_percent
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-950 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    START {coin.symbol} Sekarang
                  </button>
                </div>
              ) : (
                <>
                  {/* Mode Tab Switcher */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDcaMode("INSTANT")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        dcaMode === "INSTANT"
                          ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-md shadow-amber-950/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Langsung Tambah Posisi
                    </button>

                    <button
                      type="button"
                      onClick={() => setDcaMode("AUTO_DIP")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        dcaMode === "AUTO_DIP"
                          ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-md shadow-amber-950/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      Otomatis Saat Penurunan
                      {coin.dca_auto_enabled && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
                      )}
                    </button>
                  </div>

                  {/* TAB 1: INSTANT DCA */}
                  {dcaMode === "INSTANT" && (
                    <div className="space-y-4">
                      {/* Input Notional */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                          <span>Nominal Tambahan Notional (USD)</span>
                          <span className="text-[10px] text-slate-400">
                            Estimasi Margin: +${instantMargin.toFixed(2)} USDT
                          </span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2 text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            min="5"
                            value={instantNotional}
                            onChange={(e) => setInstantNotional(parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-12 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:border-amber-500"
                          />
                          <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">USD</span>
                        </div>

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {[10, 20, 50, 100, 250, 500].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setInstantNotional(val)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                instantNotional === val
                                  ? "bg-amber-600 text-white border border-amber-500"
                                  : "bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400"
                              }`}
                            >
                              +${val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Simulation Card */}
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-600/30 space-y-2.5 text-xs">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Simulasi Dampak DCA Langsung
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">Total Notional Baru</span>
                            <span className="font-mono font-bold text-slate-100">
                              ${instantNewTotalNotional.toFixed(2)} USD
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">Margin Terpakai Tambahan</span>
                            <span className="font-mono font-bold text-cyan-300">
                              +${instantMargin.toFixed(2)} USDT
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">Entry Rata-Rata Baru</span>
                            <div className="font-mono font-bold text-slate-200 mt-0.5">
                              ${instantEstNewEntry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </div>
                            <span className="text-[9px] text-emerald-400 block">Lebih dekat ke harga live</span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">Target Exit Baru (+{compoundPercent}%)</span>
                            <div className="font-mono font-bold text-emerald-400 mt-0.5">
                              ${instantEstNewTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </div>
                            <span className="text-[9px] text-cyan-400 block">Jauh lebih cepat tercapai!</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed italic">
                          *Market Buy akan langsung dikirim ke Binance Futures. Koin akan tergabung otomatis dalam posisi aktif saat ini.
                        </p>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={handleExecuteInstantDca}
                        disabled={dcaSubmitting || instantNotional <= 0}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                      >
                        {dcaSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Mengeksekusi BUY di Binance...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Eksekusi Tambah Posisi (+${instantNotional} USD) Sekarang
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* TAB 2: AUTO DCA DIP */}
                  {dcaMode === "AUTO_DIP" && (
                    <div className="space-y-4">
                      {/* Active Auto DCA Status Banner */}
                      {coin.dca_auto_enabled && (
                        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/60 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                              Auto DCA Sedang Aktif & Memantau
                            </span>
                            <button
                              type="button"
                              onClick={handleCancelAutoDca}
                              disabled={dcaSubmitting}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-950 hover:bg-rose-900 border border-rose-600/60 text-rose-300 transition-colors cursor-pointer"
                            >
                              Batalkan Auto DCA
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">Menunggu Penurunan:</span>
                              <span className="font-mono font-bold text-amber-400">
                                -{coin.dca_drop_percent}%
                              </span>
                            </div>

                            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">Level Pemicu (Trigger):</span>
                              <span className="font-mono font-bold text-slate-100">
                                ${coin.dca_trigger_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) || "-"}
                              </span>
                            </div>

                            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">Tambahan Notional:</span>
                              <span className="font-mono font-bold text-cyan-300">
                                +${coin.dca_notional_usd} USD
                              </span>
                            </div>

                            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">Jarak ke Pemicu:</span>
                              <span className={`font-mono font-bold ${distanceToTriggerPct > 0 ? "text-slate-300" : "text-amber-400"}`}>
                                {distanceToTriggerPct > 0 ? `${distanceToTriggerPct.toFixed(2)}% lagi` : "Sangat dekat!"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Drop % Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                          <span>{coin.dca_auto_enabled ? "Perbarui" : "Atur"} Target Penurunan Harga (%)</span>
                          <span className="text-[10px] text-amber-400 font-semibold font-mono">
                            Pemicu: ${autoTriggerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={autoDropPercent}
                            onChange={(e) => setAutoDropPercent(parseFloat(e.target.value) || 0)}
                            className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:border-amber-500"
                          />
                          <span className="absolute right-3.5 top-2 text-xs text-amber-400 font-bold">-%</span>
                        </div>

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {[1.0, 1.5, 2.0, 3.0, 5.0, 7.5, 10.0].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setAutoDropPercent(pct)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                autoDropPercent === pct
                                  ? "bg-amber-600 text-white border border-amber-500"
                                  : "bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400"
                              }`}
                            >
                              -{pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notional to Add */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                          <span>Nominal Tambahan Notional (USD)</span>
                          <span className="text-[10px] text-slate-400">
                            Estimasi Margin: +${autoMargin.toFixed(2)} USDT
                          </span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2 text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            min="5"
                            value={autoNotional}
                            onChange={(e) => setAutoNotional(parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-12 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:border-amber-500"
                          />
                          <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">USD</span>
                        </div>

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {[20, 50, 100, 250, 500].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setAutoNotional(val)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                autoNotional === val
                                  ? "bg-amber-600 text-white border border-amber-500"
                                  : "bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400"
                              }`}
                            >
                              +${val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Auto DCA Simulation Card */}
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-600/30 space-y-2 text-xs">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          Simulasi Jika Pemicu Penurunan (-{autoDropPercent}%) Tersentuh
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">Harga Pemicu Eksekusi</span>
                            <span className="font-mono font-bold text-amber-300">
                              ${autoTriggerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">Estimasi Total Notional</span>
                            <span className="font-mono font-bold text-slate-100">
                              ${(currentNotional + autoNotional).toFixed(2)} USD
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">Entry Rata-Rata Baru</span>
                            <span className="font-mono font-bold text-slate-200">
                              ${autoEstNewEntry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">Target Exit Baru (+{compoundPercent}%)</span>
                            <span className="font-mono font-bold text-emerald-400">
                              ${autoEstNewTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed italic">
                          *Bot tick engine dan background runner memantau harga setiap 3 detik. Saat harga menyentuh pemicu, order buy dieksekusi seketika.
                        </p>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={handleSetAutoDca}
                        disabled={dcaSubmitting || autoDropPercent <= 0 || autoNotional <= 0}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                      >
                        {dcaSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Menyimpan Pengaturan Auto DCA...
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-4 h-4" />
                            {coin.dca_auto_enabled ? "Perbarui" : "Pasang"} Auto DCA (-{autoDropPercent}% / +${autoNotional} USD)
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Close Button */}
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDcaModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
