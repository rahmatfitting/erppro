"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  Crown,
  RefreshCcw,
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  ArrowUpRight,
  Info,
  Award,
  Activity,
  DollarSign,
  Filter,
  FileDown,
  Search,
  ExternalLink,
  X,
  Maximize2,
  Clock,
  Layers,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Compass
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from "recharts";
import { exportToExcel } from "@/lib/exportUtils";

interface SignalItem {
  symbol: string;
  score: number;
  setup: 'WHALE_ACCUMULATION' | 'SHORT_SQUEEZE' | 'SMART_BREAKOUT' | 'STEALTH_DIP_BUY' | 'WATCHLIST';
  setupTitle: string;
  setupDescription: string;
  price: number;
  priceChange24h: number;
  topTraderPositionRatio: number;
  topTraderPositionLongPercent: number;
  topTraderAccountRatio: number;
  globalRetailRatio: number;
  contrarianDivergence: number;
  takerBuySellRatio: number;
  takerBuyVol: number;
  takerSellVol: number;
  openInterest: number;
  openInterestValue: number;
  oiChangePercent: number;
  fundingRate: number;
  fundingRatePercent: number;
  basis: number;
  basisRatePercent: number;
  oiMcapRatio: number;
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  reasons: string[];
}

interface EightChartsData {
  symbol: string;
  period: string;
  openInterestSeries: any[];
  topAccountSeries: any[];
  topPositionSeries: any[];
  globalRetailSeries: any[];
  takerVolumeSeries: any[];
  basisSeries: any[];
  fundingRateSeries: any[];
  oiMcapSeries: any[];
}

const TIMEFRAMES = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
];

const SETUP_FILTERS = [
  { label: "Semua Setup", value: "ALL" },
  { label: "🚀 Whale Accumulation", value: "WHALE_ACCUMULATION" },
  { label: "⚡ Short Squeeze Trap", value: "SHORT_SQUEEZE" },
  { label: "💎 Smart Breakout", value: "SMART_BREAKOUT" },
  { label: "🛡️ Stealth Dip Buy", value: "STEALTH_DIP_BUY" },
];

// Circular Score Ring Component
function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "#10b981" : score >= 65 ? "#f59e0b" : score >= 50 ? "#06b6d4" : "#94a3b8";
  const radius = 24;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="60" height="60" className="rotate-[-90deg]">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="#334155" strokeWidth="4" />
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-black" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

export default function HedgeFundBuyPage() {
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSetup, setSelectedSetup] = useState("ALL");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Modal / Detail state for 8 charts
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [activeSignal, setActiveSignal] = useState<SignalItem | null>(null);
  const [period, setPeriod] = useState("5m");
  const [chartsData, setChartsData] = useState<EightChartsData | null>(null);
  const [loadingCharts, setLoadingCharts] = useState(false);

  // Binance 1-Click Order state
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderSignal, setOrderSignal] = useState<SignalItem | null>(null);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [notionalUsd, setNotionalUsd] = useState<number>(20);
  const [leverage, setLeverage] = useState<number>(20);
  const [tpMode, setTpMode] = useState<'TP1' | 'TP2' | 'NONE'>('TP1');
  const [slMode, setSlMode] = useState<'AUTO' | 'NONE'>('AUTO');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customSL, setCustomSL] = useState<string>('');
  const [customTP, setCustomTP] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccessResult, setOrderSuccessResult] = useState<any>(null);
  const [orderErrorMessage, setOrderErrorMessage] = useState<string | null>(null);

  const openOrderModal = (signal: SignalItem) => {
    setOrderSignal(signal);
    setOrderType('MARKET');
    setNotionalUsd(20);
    setLeverage(20);
    setTpMode('TP1');
    setSlMode('AUTO');
    setCustomPrice(signal.entryMin ? signal.entryMin.toFixed(4) : signal.price.toFixed(4));
    setCustomSL(signal.stopLoss ? signal.stopLoss.toFixed(4) : (signal.price * 0.978).toFixed(4));
    setCustomTP(signal.tp1 ? signal.tp1.toFixed(4) : (signal.price * 1.045).toFixed(4));
    setOrderSuccessResult(null);
    setOrderErrorMessage(null);
    setOrderModalOpen(true);
  };

  const closeOrderModal = () => {
    setOrderModalOpen(false);
    setOrderSignal(null);
    setOrderSuccessResult(null);
    setOrderErrorMessage(null);
  };

  const handleTpModeChange = (mode: 'TP1' | 'TP2' | 'NONE') => {
    setTpMode(mode);
    if (!orderSignal) return;
    if (mode === 'TP1') {
      setCustomTP(orderSignal.tp1 ? orderSignal.tp1.toFixed(4) : (orderSignal.price * 1.045).toFixed(4));
    } else if (mode === 'TP2') {
      setCustomTP(orderSignal.tp2 ? orderSignal.tp2.toFixed(4) : (orderSignal.price * 1.08).toFixed(4));
    } else {
      setCustomTP('');
    }
  };

  const handleExecuteOrder = async () => {
    if (!orderSignal) return;
    setSubmittingOrder(true);
    setOrderErrorMessage(null);
    setOrderSuccessResult(null);

    try {
      const res = await fetch('/api/crypto/hedgefund-buy/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: orderSignal.symbol,
          orderType,
          notionalUsd,
          marginUsd: notionalUsd / leverage,
          leverage,
          entryPrice: orderType === 'LIMIT' ? parseFloat(customPrice) : orderSignal.price,
          stopLoss: slMode === 'AUTO' && customSL ? parseFloat(customSL) : null,
          takeProfit: tpMode !== 'NONE' && customTP ? parseFloat(customTP) : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOrderSuccessResult(data.data);
      } else {
        setOrderErrorMessage(data.error || 'Gagal mengeksekusi order di Binance');
      }
    } catch (err: any) {
      setOrderErrorMessage(err?.message || 'Terjadi kesalahan jaringan');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Fetch Signals List
  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/hedgefund-buy");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSignals(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch Hedge Fund Buy signals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Auto-refresh every 60s if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchSignals();
    }, 60000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchSignals]);

  // Run Pro Deep Scan
  const handleScan = async () => {
    if (
      !confirm(
        "Hedge Fund Deep Scan: Sistem akan menganalisis 8 metrik derivatif Binance Futures (Whale Position, Taker Volume, Basis, OI, Funding Rate) untuk mendeteksi koin BUY terbaik (±15-25 detik). Lanjutkan?"
      )
    )
      return;

    setScanning(true);
    try {
      const res = await fetch("/api/crypto/hedgefund-buy/scan?limit=25");
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "Deep Scan selesai!");
        fetchSignals();
      } else {
        alert(data.message || data.error || "Deep Scan gagal.");
      }
    } catch (err: any) {
      alert("Deep Scan gagal: " + (err?.message || "Koneksi bermasalah"));
    } finally {
      setScanning(false);
    }
  };

  // Fetch 8 charts for active symbol
  const fetchCharts = useCallback(async (symbol: string, timePeriod: string) => {
    setLoadingCharts(true);
    try {
      const res = await fetch(`/api/crypto/hedgefund-buy/detail?symbol=${symbol}&period=${timePeriod}`);
      const json = await res.json();
      if (json.success && json.data) {
        setChartsData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch 8 charts:", err);
    } finally {
      setLoadingCharts(false);
    }
  }, []);

  const openChartsModal = (signal: SignalItem) => {
    setActiveSymbol(signal.symbol);
    setActiveSignal(signal);
    fetchCharts(signal.symbol, period);
  };

  const closeChartsModal = () => {
    setActiveSymbol(null);
    setActiveSignal(null);
    setChartsData(null);
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (activeSymbol) {
      fetchCharts(activeSymbol, newPeriod);
    }
  };

  // Export filtered table to Excel
  const handleExport = () => {
    if (filteredSignals.length === 0) return;
    exportToExcel({
      title: "Hedge Fund Buy Radar Report",
      subtitle: `Generated: ${new Date().toLocaleString()}`,
      fileName: `Hedge_Fund_Buy_${new Date().toISOString().split("T")[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Score", key: "score" },
        { header: "Setup", key: "setupTitle" },
        { header: "Price ($)", key: "price", format: (v) => parseFloat(v).toLocaleString() },
        { header: "24h Change (%)", key: "priceChange24h", format: (v) => parseFloat(v).toFixed(2) + "%" },
        { header: "Whale Pos L/S", key: "topTraderPositionRatio", format: (v) => parseFloat(v).toFixed(2) + "x" },
        { header: "Whale Long %", key: "topTraderPositionLongPercent", format: (v) => parseFloat(v).toFixed(1) + "%" },
        { header: "Retail L/S", key: "globalRetailRatio", format: (v) => parseFloat(v).toFixed(2) + "x" },
        { header: "Taker Buy Ratio", key: "takerBuySellRatio", format: (v) => parseFloat(v).toFixed(2) + "x" },
        { header: "OI (USD)", key: "openInterestValue", format: (v) => "$" + (parseFloat(v) / 1000000).toFixed(1) + "M" },
        { header: "Funding Rate (%)", key: "fundingRatePercent", format: (v) => parseFloat(v).toFixed(4) + "%" },
        { header: "Basis ($)", key: "basis", format: (v) => parseFloat(v).toFixed(2) },
        { header: "Entry Range", key: "entryMin", format: (_, r) => `$${r.entryMin?.toFixed(4)} - $${r.entryMax?.toFixed(4)}` },
        { header: "Stop Loss", key: "stopLoss", format: (v) => "$" + parseFloat(v).toFixed(4) },
        { header: "Target TP1", key: "tp1", format: (v) => "$" + parseFloat(v).toFixed(4) },
      ],
      data: filteredSignals,
    });
  };

  // Filtered list
  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      const matchSearch = s.symbol.toLowerCase().includes(search.toLowerCase());
      const matchSetup = selectedSetup === "ALL" || s.setup === selectedSetup;
      return matchSearch && matchSetup;
    });
  }, [signals, search, selectedSetup]);

  // Aggregate Stats
  const topPick = signals.length > 0 ? signals[0] : null;
  const highConvictionCount = signals.filter((s) => s.score >= 75).length;
  const avgWhaleLong =
    signals.length > 0
      ? (
          signals.reduce((acc, s) => acc + (s.topTraderPositionLongPercent || 50), 0) /
          signals.length
        ).toFixed(1)
      : "50.0";
  const avgTakerRatio =
    signals.length > 0
      ? (
          signals.reduce((acc, s) => acc + (s.takerBuySellRatio || 1.0), 0) / signals.length
        ).toFixed(2)
      : "1.00";

  return (
    <div className="space-y-8 pb-24 text-slate-100 min-h-screen">
      {/* Institutional Grade Hero Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border border-slate-800 shadow-2xl p-8 md:p-12">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <ShieldCheck className="h-64 w-64 text-amber-500" />
        </div>

        {/* Ambient glow effects */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Crown className="h-3.5 w-3.5 text-amber-400" /> Institutional Alpha Model
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Activity className="h-3 w-3 animate-pulse" /> 8-Factor Derivatives
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Hedge Fund Buy Radar
            </h1>

            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Monitoring koin berpeluang <strong className="text-emerald-400">BUY / LONG</strong> terbaik
              berdasarkan metrik kuantitatif Hedge Fund: akumulasi posisi Whale vs Retail, Taker Buy Flow,
              Pertumbuhan Minat Terbuka (OI), Tarif Pendanaan negatif, dan Basis Futures.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={handleScan}
                disabled={scanning}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm md:text-base rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {scanning ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-slate-950" />}
                {scanning ? "Menganalisis 8 Derivatif..." : "Run Pro Deep Scan"}
              </button>

              <button
                onClick={fetchSignals}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-2xl border border-slate-700 transition-all"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh Data
              </button>

              <label className="flex items-center gap-2.5 px-4 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-xs font-semibold text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500/20"
                />
                Auto-Refresh (60s)
              </label>
            </div>
          </div>

          {/* Quick Alpha Pick Widget */}
          {topPick && (
            <div className="w-full lg:w-80 bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-amber-400" /> #1 Conviction Buy
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SCORE {topPick.score}/100
                </span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-2xl font-black text-white">{topPick.symbol}</h3>
                  <p className="text-xs text-slate-400">
                    ${topPick.price > 1 ? topPick.price.toLocaleString() : topPick.price.toFixed(4)}
                  </p>
                </div>
                <div
                  className={`text-right font-bold text-sm ${
                    topPick.priceChange24h >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {topPick.priceChange24h >= 0 ? "+" : ""}
                  {topPick.priceChange24h.toFixed(2)}%
                </div>
              </div>

              <div className="space-y-2 py-2 border-y border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Whale Pos Long</span>
                  <span className="font-black text-emerald-400">
                    {topPick.topTraderPositionLongPercent.toFixed(0)}% ({topPick.topTraderPositionRatio.toFixed(2)}x)
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Taker Buy Pressure</span>
                  <span className="font-black text-cyan-400">{topPick.takerBuySellRatio.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Funding Rate</span>
                  <span
                    className={`font-bold ${
                      topPick.fundingRate < 0 ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {topPick.fundingRatePercent.toFixed(4)}%
                  </span>
                </div>
              </div>

              <button
                onClick={() => openChartsModal(topPick)}
                className="mt-4 w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black text-xs rounded-xl flex items-center justify-center gap-2 border border-amber-500/30 transition-all"
              >
                Buka Terminal 8 Chart <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>High Conviction Buys</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{highConvictionCount}</div>
          <p className="text-xs text-slate-500 mt-1">Koin dengan skor Alpha ≥ 75/100</p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Avg Whale Long Dominance</span>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{avgWhaleLong}%</div>
          <p className="text-xs text-slate-500 mt-1">Rata-rata modal Top Trader di posisi Long</p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Avg Taker Inflow</span>
            <Zap className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-400">{avgTakerRatio}x</div>
          <p className="text-xs text-slate-500 mt-1">Tekanan agresif market buy vs sell</p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Koin Tersaring</span>
            <Compass className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">{signals.length}</div>
          <p className="text-xs text-slate-500 mt-1">Futures pairs dari Binance FAPI</p>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {SETUP_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedSetup(f.value)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedSetup === f.value
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 md:w-64">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari simbol misal BTC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <button
            onClick={handleExport}
            disabled={filteredSignals.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all disabled:opacity-50"
            title="Export Excel"
          >
            <FileDown className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Main Monitoring Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh] relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-950 shadow-md">
              <tr className="bg-slate-950 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-5">Koin &amp; Harga</th>
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-4 text-center">HF Buy Score</th>
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-5">Setup Institusional</th>
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-4 text-right">Whale Pos L/S</th>
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-4 text-right">Retail L/S</th>
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-4 text-right">Taker Buy/Sell</th>
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-4 text-right">Minat Terbuka (OI)</th>
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-4 text-right">Funding Rate</th>
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-4 text-right">Basis ($)</th>
                <th className="sticky top-0 z-30 bg-slate-950 py-4 px-5 text-center">Aksi Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading && signals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <RefreshCcw className="h-8 w-8 animate-spin mx-auto text-amber-500 mb-3" />
                    <p className="font-semibold text-sm">Memuat data derivatif Hedge Fund...</p>
                  </td>
                </tr>
              ) : filteredSignals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <SlidersHorizontal className="h-8 w-8 mx-auto text-slate-600 mb-3" />
                    <p className="font-semibold text-sm">Tidak ada sinyal yang sesuai dengan filter.</p>
                  </td>
                </tr>
              ) : (
                filteredSignals.map((item, idx) => {
                  const isHighConviction = item.score >= 75;

                  return (
                    <tr
                      key={item.symbol}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => openChartsModal(item)}
                    >
                      {/* Symbol & Price */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-500 w-4">{idx + 1}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">
                                {item.symbol}
                              </span>
                              {isHighConviction && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  HOT
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-medium text-slate-300">
                                ${item.price > 1 ? item.price.toLocaleString() : item.price.toFixed(4)}
                              </span>
                              <span
                                className={`font-bold text-[10px] ${
                                  item.priceChange24h >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {item.priceChange24h >= 0 ? "+" : ""}
                                {item.priceChange24h.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* HF Score */}
                      <td className="py-4 px-4 text-center">
                        <ScoreRing score={item.score} />
                      </td>

                      {/* Setup Tag */}
                      <td className="py-4 px-5">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black ${
                              item.setup === "WHALE_ACCUMULATION"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : item.setup === "SHORT_SQUEEZE"
                                ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                : item.setup === "SMART_BREAKOUT"
                                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {item.setup === "WHALE_ACCUMULATION" && <Crown className="h-3 w-3 text-amber-400 shrink-0" />}
                            {item.setup === "SHORT_SQUEEZE" && <Zap className="h-3 w-3 text-rose-400 shrink-0" />}
                            {item.setup === "SMART_BREAKOUT" && <TrendingUp className="h-3 w-3 text-cyan-400 shrink-0" />}
                            {item.setup === "STEALTH_DIP_BUY" && <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />}
                            {item.setup === "WATCHLIST" && <Activity className="h-3 w-3 text-slate-400 shrink-0" />}
                            {item.setupTitle.replace(/^[^\w]+/, '').trim() || item.setupTitle}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1 max-w-xs line-clamp-1">
                            {item.reasons[0] || item.setupDescription}
                          </p>
                        </div>
                      </td>

                      {/* Whale Position Ratio */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-black text-sm text-emerald-400">
                          {item.topTraderPositionRatio.toFixed(2)}x
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.topTraderPositionLongPercent.toFixed(0)}% Long
                        </div>
                      </td>

                      {/* Retail Global Ratio */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-slate-300">
                          {item.globalRetailRatio.toFixed(2)}x
                        </div>
                        <div className="text-[10px]">
                          {item.contrarianDivergence >= 0.3 ? (
                            <span className="text-emerald-400 font-bold">Whale &gt; Retail</span>
                          ) : (
                            <span className="text-slate-500">Neutral</span>
                          )}
                        </div>
                      </td>

                      {/* Taker Buy Ratio */}
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-black text-xs ${
                            item.takerBuySellRatio >= 1.05
                              ? "bg-emerald-500/20 text-emerald-300"
                              : item.takerBuySellRatio >= 0.95
                              ? "bg-slate-800 text-slate-300"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {item.takerBuySellRatio.toFixed(2)}x
                        </span>
                      </td>

                      {/* Open Interest */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-slate-200">
                          ${(item.openInterestValue / 1000000).toFixed(1)}M
                        </div>
                        <div
                          className={`text-[10px] font-bold ${
                            item.oiChangePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {item.oiChangePercent >= 0 ? "+" : ""}
                          {item.oiChangePercent.toFixed(1)}% (5m)
                        </div>
                      </td>

                      {/* Funding Rate */}
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`font-mono font-bold ${
                            item.fundingRate < 0
                              ? "text-emerald-400"
                              : item.fundingRate <= 0.0001
                              ? "text-slate-300"
                              : "text-amber-400"
                          }`}
                        >
                          {item.fundingRatePercent.toFixed(4)}%
                        </span>
                        <div className="text-[9px] text-slate-500">
                          {item.fundingRate < 0 ? "Shorts Pay" : "Normal"}
                        </div>
                      </td>

                      {/* Basis */}
                      <td className="py-4 px-4 text-right">
                        <div
                          className={`font-mono font-bold ${
                            item.basis >= 0 ? "text-emerald-400" : "text-slate-400"
                          }`}
                        >
                          {item.basis >= 0 ? "+" : ""}
                          {item.basis.toFixed(2)}
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openOrderModal(item)}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                            title="Order Beli (LONG) ke Binance"
                          >
                            <Zap className="h-3.5 w-3.5 fill-slate-950" /> Order
                          </button>
                          <button
                            onClick={() => openChartsModal(item)}
                            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105"
                          >
                            <BarChart3 className="h-3.5 w-3.5 text-amber-400" /> 8 Chart
                          </button>
                          <a
                            href={`https://www.tradingview.com/chart/?symbol=BINANCE:${item.symbol}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all"
                            title="TradingView"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8-CHART INSTITUTIONAL TERMINAL MODAL (IDENTICAL TO USER REFERENCE IMAGES) */}
      {/* ========================================================================= */}
      {activeSymbol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 md:p-6 overflow-y-auto">
          <div className="relative w-full max-w-7xl max-h-[95vh] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 bg-slate-900/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30">
                  <Crown className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-white">{activeSymbol}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ALPHA SCORE {activeSignal?.score || 85}/100
                    </span>
                    <span className="text-sm font-bold text-slate-300">
                      ${activeSignal ? (activeSignal.price > 1 ? activeSignal.price.toLocaleString() : activeSignal.price.toFixed(4)) : "0.0000"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Terminal 8 Derivatif Kuantitatif Binance Futures (Identik dengan Tampilan Resmi)
                  </p>
                </div>
              </div>

              {/* Timeframe selector & Close button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => handlePeriodChange(tf.value)}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        period === tf.value
                          ? "bg-amber-500 text-slate-950"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={closeChartsModal}
                  className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/60">
              {/* Executive Trade Blueprint Banner */}
              {activeSignal && (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" /> Institutional Trade Blueprint
                      </span>
                      <h4 className="text-base font-black text-white mt-1">
                        {activeSignal.setupTitle}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                        {activeSignal.reasons.join(" • ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Entry Zone</div>
                        <div className="font-black text-white">
                          ${activeSignal.entryMin.toFixed(4)} - ${activeSignal.entryMax.toFixed(4)}
                        </div>
                      </div>
                      <div className="bg-slate-950/80 border border-rose-500/30 px-3.5 py-2 rounded-xl">
                        <div className="text-[10px] text-rose-400 uppercase font-bold">Stop Loss</div>
                        <div className="font-black text-rose-300">${activeSignal.stopLoss.toFixed(4)}</div>
                      </div>
                      <div className="bg-slate-950/80 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
                        <div className="text-[10px] text-emerald-400 uppercase font-bold">TP1 (1:2 R:R)</div>
                        <div className="font-black text-emerald-300">${activeSignal.tp1.toFixed(4)}</div>
                      </div>
                      <div className="bg-slate-950/80 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
                        <div className="text-[10px] text-emerald-400 uppercase font-bold">TP2 (1:3.5 R:R)</div>
                        <div className="font-black text-emerald-300">${activeSignal.tp2.toFixed(4)}</div>
                      </div>

                      <button
                        onClick={() => openOrderModal(activeSignal)}
                        className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap"
                      >
                        <Zap className="h-4 w-4 fill-slate-950" /> 1-Click Order ke Binance
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loadingCharts ? (
                <div className="py-24 text-center text-slate-500">
                  <RefreshCcw className="h-10 w-10 animate-spin mx-auto text-amber-500 mb-3" />
                  <p className="font-bold text-sm text-slate-300">Mengambil 8 Seri Grafik Derivatif...</p>
                  <p className="text-xs text-slate-500 mt-1">Binance Futures API ({period} resolution)</p>
                </div>
              ) : (
                /* The 8 Charts Grid: 3 columns or 2 columns */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* ------------------------------------------------------------- */}
                  {/* CHART 1: Minat Terbuka (Open Interest & Notional Value) */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">Minat Terbuka</h4>
                        <Info className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {period} • Tunggal
                      </span>
                    </div>

                    <div className="h-48 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData?.openInterestSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748b" }} />
                          <YAxis yAxisId="oi" orientation="left" tick={{ fontSize: 9, fill: "#f59e0b" }} domain={["auto", "auto"]} />
                          <YAxis yAxisId="notional" orientation="right" tick={{ fontSize: 9, fill: "#94a3b8" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                            formatter={(v: any, name?: any) => [
                              name === "Minat Terbuka" ? parseFloat(v).toLocaleString() : "$" + parseFloat(v).toLocaleString(),
                              name ?? ""
                            ]}
                          />
                          <Bar yAxisId="oi" dataKey="openInterest" name="Minat Terbuka" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                          <Line yAxisId="notional" type="monotone" dataKey="notionalValue" name="Nilai Nosional" stroke="#94a3b8" strokeWidth={2} dot={{ r: 2 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-amber-500 inline-block rounded-xs" /> Minat Terbuka
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-0.5 bg-slate-400 inline-block" /> Nilai Nosional
                      </span>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* CHART 2: Rasio Long / Short Top Trader (Akun) */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">Rasio Long / Short Top Trader (Akun)</h4>
                        <Info className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {period}
                      </span>
                    </div>

                    <div className="h-48 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartsData?.topAccountSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748b" }} />
                          <YAxis tick={{ fontSize: 9, fill: "#eab308" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                            formatter={(v: any) => [parseFloat(v).toFixed(4), "Rasio Akun"]}
                          />
                          <Line type="monotone" dataKey="longShortRatio" stroke="#eab308" strokeWidth={2} dot={{ r: 2, fill: "#eab308" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-amber-400 mt-2">
                      <span className="w-2 h-2 rounded-full border border-amber-400" /> Rasio Long/Short (Akun)
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* CHART 3: Rasio Long / Short Top Trader (Posisi) */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">Rasio Long / Short Top Trader (Posisi)</h4>
                        <Info className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {period}
                      </span>
                    </div>

                    <div className="h-48 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartsData?.topPositionSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748b" }} />
                          <YAxis tick={{ fontSize: 9, fill: "#eab308" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                            formatter={(v: any) => [parseFloat(v).toFixed(4), "Rasio Posisi"]}
                          />
                          <Line type="monotone" dataKey="longShortRatio" stroke="#eab308" strokeWidth={2} dot={{ r: 2, fill: "#eab308" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-amber-400 mt-2">
                      <span className="w-2 h-2 rounded-full border border-amber-400" /> Rasio Long / Short (Posisi)
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* CHART 4: Rasio Long/Short (Global Retail) */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">Rasio Long/Short (Global Retail)</h4>
                        <Info className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {period}
                      </span>
                    </div>

                    <div className="h-48 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartsData?.globalRetailSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748b" }} />
                          <YAxis tick={{ fontSize: 9, fill: "#eab308" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                            formatter={(v: any) => [parseFloat(v).toFixed(4), "Rasio Retail"]}
                          />
                          <Line type="monotone" dataKey="longShortRatio" stroke="#eab308" strokeWidth={2} dot={{ r: 2, fill: "#eab308" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-amber-400 mt-2">
                      <span className="w-2 h-2 rounded-full border border-amber-400" /> Rasio Long/Short
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* CHART 5: Volume Beli/Jual Taker */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">Volume Beli/Jual Taker</h4>
                        <Info className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {period}
                      </span>
                    </div>

                    <div className="h-48 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData?.takerVolumeSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748b" }} />
                          <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                            formatter={(v: any, name?: any) => [parseFloat(v).toLocaleString(), name ?? ""]}
                          />
                          <Bar dataKey="sellVol" name="Volume Jual Taker" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="buyVol" name="Volume Beli Taker" fill="#10b981" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-rose-500 inline-block rounded-xs" /> Volume Jual Taker
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-emerald-500 inline-block rounded-xs" /> Volume Beli Taker
                      </span>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* CHART 6: Dasar (Basis: Futures vs Index vs Dasar) */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">Dasar (Basis & Spread)</h4>
                        <Info className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {period}
                      </span>
                    </div>

                    <div className="h-48 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartsData?.basisSeries || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748b" }} />
                          <YAxis yAxisId="price" tick={{ fontSize: 9, fill: "#94a3b8" }} domain={["auto", "auto"]} />
                          <YAxis yAxisId="basis" orientation="right" tick={{ fontSize: 9, fill: "#eab308" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                            formatter={(v: any, name?: any) => [parseFloat(v).toFixed(2), name ?? ""]}
                          />
                          <Area yAxisId="basis" type="monotone" dataKey="basis" name="Dasar" fill="#eab308" stroke="#eab308" fillOpacity={0.15} />
                          <Line yAxisId="price" type="monotone" dataKey="futuresPrice" name="Harga Futures" stroke="#eab308" strokeWidth={1.5} dot={{ r: 2 }} />
                          <Line yAxisId="price" type="monotone" dataKey="indexPrice" name="Indeks Harga" stroke="#38bdf8" strokeWidth={1.5} dot={{ r: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-2 h-2 rounded-full border border-amber-400" /> Harga Futures
                      </span>
                      <span className="flex items-center gap-1 text-cyan-400">
                        <span className="w-2 h-2 rounded-full border border-cyan-400" /> Indeks Harga
                      </span>
                      <span className="flex items-center gap-1 text-amber-300">
                        <span className="w-2 h-2 bg-amber-500/30 inline-block rounded-xs" /> Dasar
                      </span>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* CHART 7: Tarif Pendanaan (Funding Rate - 40 Periods) */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">Tarif Pendanaan (Funding Rate)</h4>
                        <Info className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        40 Kali Terakhir
                      </span>
                    </div>

                    <div className="h-48 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartsData?.fundingRateSeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 8, fill: "#64748b" }} interval={8} />
                          <YAxis tick={{ fontSize: 9, fill: "#eab308" }} domain={["auto", "auto"]} />
                          <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                            formatter={(v: any) => [parseFloat(v).toFixed(4) + "%", "Funding Rate"]}
                          />
                          <Line type="monotone" dataKey="fundingRatePercent" stroke="#eab308" strokeWidth={2} dot={{ r: 2, fill: "#eab308" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-amber-400 mt-2">
                      <span className="w-2 h-2 rounded-full border border-amber-400" /> Tarif Pendanaan (%)
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* CHART 8: Rasio Minat Terbuka terhadap Kapitalisasi Pasar */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:col-span-2 lg:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">
                          Rasio Minat Terbuka terhadap Kapitalisasi Pasar (OI / Market Cap)
                        </h4>
                        <Info className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {period}
                      </span>
                    </div>

                    <div className="h-48 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartsData?.oiMcapSeries || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#64748b" }} />
                          <YAxis yAxisId="price" tick={{ fontSize: 9, fill: "#eab308" }} domain={["auto", "auto"]} />
                          <YAxis yAxisId="ratio" orientation="right" tick={{ fontSize: 9, fill: "#94a3b8" }} domain={["auto", "auto"]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                            formatter={(v: any, name?: any) => [
                              name === "Harga" ? "$" + parseFloat(v).toLocaleString() : parseFloat(v).toFixed(2) + "%",
                              name ?? ""
                            ]}
                          />
                          <Line yAxisId="price" type="monotone" dataKey="price" name="Harga" stroke="#eab308" strokeWidth={1.5} dot={{ r: 2, fill: "#eab308" }} />
                          <Line yAxisId="ratio" type="monotone" dataKey="oiMcapRatio" name="Rasio OI/MCap" stroke="#94a3b8" strokeWidth={1.5} dot={{ r: 2, fill: "#94a3b8" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-2 h-2 rounded-full border border-amber-400" /> Harga
                      </span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <span className="w-2 h-2 rounded-full border border-slate-300" /> Rasio OI / MCap (%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Data disinkronkan langsung dari Binance Perpetual Futures API
              </span>
              <button
                onClick={closeChartsModal}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
              >
                Tutup Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1-CLICK BINANCE DIRECT ORDER MODAL                                         */}
      {/* ========================================================================= */}
      {orderModalOpen && orderSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/30">
                  <Zap className="h-5 w-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{orderSignal.symbol}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      LONG (BUY)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Harga Pasar: <strong className="text-white">${orderSignal.price > 1 ? orderSignal.price.toLocaleString() : orderSignal.price.toFixed(4)}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={closeOrderModal}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Success Result Box */}
              {orderSuccessResult ? (
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3 text-emerald-400 font-black text-sm">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                    Order Beli Berhasil Dikirim ke Binance!
                  </div>
                  <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Order ID:</span>
                      <span className="text-white font-bold">{orderSuccessResult.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ukuran Posisi Notional:</span>
                      <span className="text-amber-400 font-bold">${(orderSuccessResult.positionSizeUsd || 0).toFixed(2)} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Margin Terpakai:</span>
                      <span className="text-white font-bold">${(orderSuccessResult.marginUsd || 0).toFixed(2)} USDT ({orderSuccessResult.leverage}x)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jumlah Eksekusi:</span>
                      <span className="text-white font-bold">{orderSuccessResult.executedQty} {orderSignal.symbol.replace('USDT', '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-emerald-400 font-bold">{orderSuccessResult.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Auto Stop Loss:</span>
                      <span className={orderSuccessResult.stopLoss === 'Tanpa SL' ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                        {orderSuccessResult.stopLoss === 'Tanpa SL' ? 'Tanpa SL (Manual)' : `$${orderSuccessResult.stopLoss}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Auto Take Profit:</span>
                      <span className={orderSuccessResult.takeProfit === 'Tanpa TP' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {orderSuccessResult.takeProfit === 'Tanpa TP' ? 'Tanpa TP (Manual)' : `$${orderSuccessResult.takeProfit}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={closeOrderModal}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              ) : (
                <>
                  {/* Error Notification */}
                  {orderErrorMessage && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs text-rose-300">
                      <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Gagal Eksekusi:</strong>
                        <p className="mt-0.5">{orderErrorMessage}</p>
                      </div>
                    </div>
                  )}

                  {/* Order Type Toggle */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Tipe Eksekusi
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setOrderType('MARKET')}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                          orderType === 'MARKET'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Zap className="h-3.5 w-3.5" /> Best Market (Instant)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('LIMIT')}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                          orderType === 'LIMIT'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Target className="h-3.5 w-3.5" /> Limit (Entry Zone)
                      </button>
                    </div>
                  </div>

                  {/* Limit Price Input if LIMIT selected */}
                  {orderType === 'LIMIT' && (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Harga Limit Masuk ($)
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Zone: ${orderSignal.entryMin.toFixed(4)} - ${orderSignal.entryMax.toFixed(4)}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {/* Notional Position Size Selection */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                          Ukuran Posisi Notional (USD)
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Total nilai kontrak yang dibuka di Binance Futures
                        </span>
                      </div>
                      <span className="text-xs font-black text-amber-400 font-mono">${notionalUsd} USD</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 mb-2">
                      {[10, 20, 50, 100, 250].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setNotionalUsd(amt)}
                          className={`py-2 rounded-xl text-xs font-black transition-all ${
                            notionalUsd === amt
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                      <input
                        type="number"
                        min={5}
                        step="1"
                        value={notionalUsd}
                        onChange={(e) => setNotionalUsd(Math.max(1, parseFloat(e.target.value) || 0))}
                        placeholder="Contoh: 20"
                        className="w-full pl-8 pr-16 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">USD</span>
                    </div>
                  </div>

                  {/* Leverage Selector */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Leverage
                      </label>
                      <span className="text-xs font-black text-amber-400">{leverage}x</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[3, 5, 10, 20].map((lev) => (
                        <button
                          key={lev}
                          type="button"
                          onClick={() => setLeverage(lev)}
                          className={`py-2 rounded-xl text-xs font-black transition-all ${
                            leverage === lev
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {lev}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Take Profit Target Mode */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Target Take Profit
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {tpMode === 'NONE' ? 'Bebas / Exit Manual' : 'Otomatis Pasang Take Profit'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleTpModeChange('TP1')}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          tpMode === 'TP1'
                            ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold text-emerald-400">TP1 (1:2)</div>
                        <div className="text-xs font-black font-mono mt-0.5">${orderSignal.tp1.toFixed(4)}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">Konservatif (+4.5%)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTpModeChange('TP2')}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          tpMode === 'TP2'
                            ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold text-emerald-400">TP2 (1:3.5)</div>
                        <div className="text-xs font-black font-mono mt-0.5">${orderSignal.tp2.toFixed(4)}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">Institusional (+8.0%)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTpModeChange('NONE')}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          tpMode === 'NONE'
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold text-amber-400">Tanpa TP</div>
                        <div className="text-xs font-black mt-0.5 text-slate-200">Manual Exit</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">Hold tanpa batas TP</div>
                      </button>
                    </div>
                  </div>

                  {/* SL & TP Custom Input Fields with Optional Toggles */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Stop Loss Input & Toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-rose-400 uppercase">
                          Stop Loss ($)
                        </label>
                        <button
                          type="button"
                          onClick={() => setSlMode(slMode === 'AUTO' ? 'NONE' : 'AUTO')}
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md transition-all ${
                            slMode === 'NONE'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {slMode === 'NONE' ? '⚡ Tanpa SL' : 'Matikan SL'}
                        </button>
                      </div>

                      {slMode === 'NONE' ? (
                        <div className="w-full px-3 py-2 bg-slate-950/80 border border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-400 flex items-center justify-center gap-1">
                          Tanpa Stop Loss (Manual)
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          value={customSL}
                          onChange={(e) => setCustomSL(e.target.value)}
                          placeholder="Harga SL..."
                          className="w-full px-3 py-2 bg-slate-950 border border-rose-500/30 rounded-xl text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-500"
                        />
                      )}
                    </div>

                    {/* Take Profit Input & Toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-emerald-400 uppercase">
                          Take Profit ($)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleTpModeChange(tpMode === 'NONE' ? 'TP1' : 'NONE')}
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md transition-all ${
                            tpMode === 'NONE'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {tpMode === 'NONE' ? '⚡ Tanpa TP' : 'Matikan TP'}
                        </button>
                      </div>

                      {tpMode === 'NONE' ? (
                        <div className="w-full px-3 py-2 bg-slate-950/80 border border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-400 flex items-center justify-center gap-1">
                          Tanpa Take Profit (Manual)
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          value={customTP}
                          onChange={(e) => setCustomTP(e.target.value)}
                          placeholder="Harga TP..."
                          className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                        />
                      )}
                    </div>
                  </div>

                  {/* Live Position & Risk/Reward Card */}
                  {(() => {
                    const posNotional = notionalUsd;
                    const marginKepakai = posNotional / (leverage || 1);
                    const refP = orderType === 'LIMIT' && parseFloat(customPrice) > 0 ? parseFloat(customPrice) : orderSignal.price;
                    const coinQty = refP > 0 ? posNotional / refP : 0;
                    
                    const slP = parseFloat(customSL) || (refP * 0.978);
                    const slPct = refP > 0 ? Math.abs((refP - slP) / refP) : 0.022;
                    const slLossUsd = posNotional * slPct;
                    const slRoePct = slPct * leverage * 100;

                    const tpP = parseFloat(customTP) || (refP * (tpMode === 'TP1' ? 1.045 : 1.08));
                    const tpPct = refP > 0 ? Math.abs((tpP - refP) / refP) : (tpMode === 'TP1' ? 0.045 : 0.08);
                    const tpProfitUsd = posNotional * tpPct;
                    const tpRoePct = tpPct * leverage * 100;

                    return (
                      <div className="p-4 bg-slate-950/90 border border-slate-800/90 rounded-2xl space-y-2.5 text-xs shadow-inner">
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Ukuran Posisi (Notional):</span>
                          <strong className="text-white font-mono font-bold text-sm">
                            ${posNotional.toFixed(2)} USDT <span className="text-xs text-slate-400 font-normal">(~{coinQty.toFixed(3)} {orderSignal.symbol.replace('USDT', '')})</span>
                          </strong>
                        </div>

                        <div className="flex justify-between items-center py-2 px-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl">
                          <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Estimasi Margin Terpakai:
                          </span>
                          <strong className="text-amber-400 font-mono font-black text-sm">
                            ${marginKepakai.toFixed(2)} USDT <span className="text-[11px] text-slate-400 font-normal">({leverage}x)</span>
                          </strong>
                        </div>

                        <div className="flex justify-between text-slate-400 pt-1">
                          <span>Maksimal Risiko (Stop Loss):</span>
                          {slMode === 'NONE' ? (
                            <strong className="text-amber-400 font-bold">
                              Tanpa SL (Risiko Terbuka / Manual Exit)
                            </strong>
                          ) : (
                            <strong className="text-rose-400 font-mono font-bold">
                              -${slLossUsd.toFixed(2)} (-{slRoePct.toFixed(1)}% ROE)
                            </strong>
                          )}
                        </div>

                        <div className="flex justify-between text-slate-400">
                          <span>Target Profit:</span>
                          {tpMode === 'NONE' ? (
                            <strong className="text-amber-400 font-bold">
                              Tanpa TP (Bebas / Manual Exit)
                            </strong>
                          ) : (
                            <strong className="text-emerald-400 font-mono font-bold">
                              +${tpProfitUsd.toFixed(2)} (+{tpRoePct.toFixed(1)}% ROE)
                            </strong>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Submit Button */}
                  <button
                    onClick={handleExecuteOrder}
                    disabled={submittingOrder}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submittingOrder ? (
                      <>
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        Mengeksekusi ke Akun Binance...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 fill-slate-950" />
                        Konfirmasi Beli (LONG) {orderSignal.symbol}
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-500">
                    Order dieksekusi secara instan via Binance Futures FAPI beserta Stop Loss &amp; Take Profit otomatis.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
