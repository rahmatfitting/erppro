"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Flame,
  Activity,
  Layers,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Send,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  DollarSign,
  Compass,
  Calendar,
  X,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Globe,
  Radio,
  SlidersHorizontal,
  Info
} from "lucide-react";

interface NarrativeItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  score: number;
  velocity: "VERY HIGH" | "HIGH" | "MODERATE" | "LOW";
  velocity_pct: number;
  social_growth_24h: number;
  volume_growth_24h: number;
  onchain_growth_24h: number;
  news_count_24h: number;
  top_coins: string[];
  status: "ACTIVE" | "EMERGING" | "COOLING";
}

interface CoinOpportunity {
  id: number;
  symbol: string;
  name: string;
  narrative_slug: string;
  narrative_name: string;
  chain: string;
  price: number;
  price_change_1h: number;
  price_change_24h: number;
  price_change_7d: number;
  price_change_30d: number;
  volume_24h: number;
  market_cap: number;
  fdv: number;
  circulating_pct: number;
  ath_distance_pct: number;
  
  // On-Chain Layer
  active_address_growth_7d: number;
  active_address_growth_30d: number;
  new_address_growth_30d: number;
  whale_net_flow_usd: number;
  whale_action: "ACCUMULATION" | "DISTRIBUTION" | "NEUTRAL";
  exchange_netflow_usd: number;
  exchange_flow_status: "NET OUTFLOW" | "NET INFLOW" | "BALANCED";
  top10_concentration_pct: number;
  holder_growth_30d: number;
  tvl_usd: number;
  tvl_growth_30d: number;
  protocol_revenue_30d: number;
  revenue_growth_30d: number;
  
  // Derivatives Layer
  open_interest_usd: number;
  oi_change_24h: number;
  funding_rate: number;
  funding_percentile: number;
  funding_status: "NORMAL" | "CROWDED LONG" | "NEGATIVE SQUEEZE";
  short_liquidation_24h: number;
  long_liquidation_24h: number;
  
  // Token Unlock
  next_unlock_date: string | null;
  unlock_amount_pct: number;
  unlock_usd_value: number;
  unlock_risk: "LOW" | "MEDIUM" | "HIGH";
  
  // Narrative & Social
  social_growth_24h: number;
  narrative_velocity_pct: number;
  news_mentions_24h: number;
  search_trend_score: number;
  
  // Scores
  onchain_score: number;
  narrative_score: number;
  market_momentum_score: number;
  liquidity_score: number;
  derivatives_score: number;
  tokenomics_score: number;
  opportunity_score: number;
  
  signal_classification: "EARLY_ACCUMULATION" | "NARRATIVE_BREAKOUT" | "CROWDED_RISK" | "DISTRIBUTION_WARNING";
  catalyst_summary: string;
}

interface CatalystEvent {
  id: number;
  coin_symbol: string;
  title: string;
  event_type: "Mainnet" | "Listing" | "Partnership" | "Token Unlock" | "Protocol Upgrade" | "Airdrop" | "Staking" | "ETF";
  event_date: string;
  importance: "CRITICAL" | "HIGH" | "MEDIUM";
  source: string;
  status: "UPCOMING" | "COMPLETED";
}

export default function NarrativeOnChainPage() {
  // Global Data
  const [narratives, setNarratives] = useState<NarrativeItem[]>([]);
  const [coins, setCoins] = useState<CoinOpportunity[]>([]);
  const [catalysts, setCatalysts] = useState<CatalystEvent[]>([]);
  const [macro, setMacro] = useState({
    marketRegime: "SELECTIVE RISK-ON",
    btcDominance: 57.8,
    altcoinBreadth: 68
  });
  const [stats, setStats] = useState({
    totalNarratives: 8,
    topNarrative: "AI Agents",
    topCoin: "TAO",
    highConvictionCount: 4,
    earlyAccumulationCount: 3
  });

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [sendingAlert, setSendingAlert] = useState<Record<string, boolean>>({});

  // Active Tab
  const [activeTab, setActiveTab] = useState<"WATCHLIST" | "NARRATIVES" | "ONCHAIN" | "CATALYSTS">("WATCHLIST");

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNarrative, setSelectedNarrative] = useState("ALL");
  const [selectedSignal, setSelectedSignal] = useState("ALL");
  const [minScore, setMinScore] = useState<number>(0);
  const [whaleOnly, setWhaleOnly] = useState(false);
  const [unlockFilter, setUnlockFilter] = useState("ALL");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Modal: 5-Layer Deep Dive Detail
  const [selectedCoin, setSelectedCoin] = useState<CoinOpportunity | null>(null);

  // Fetch Dashboard Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/crypto/narrative-onchain", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setNarratives(json.data.narratives || []);
        setCoins(json.data.coins || []);
        setCatalysts(json.data.catalysts || []);
        setMacro({
          marketRegime: json.data.marketRegime || "SELECTIVE RISK-ON",
          btcDominance: json.data.btcDominance || 57.8,
          altcoinBreadth: json.data.altcoinBreadth || 68
        });
        setStats(json.data.stats || {
          totalNarratives: 8,
          topNarrative: "AI Agents",
          topCoin: "TAO",
          highConvictionCount: 0,
          earlyAccumulationCount: 0
        });
      }
    } catch (err) {
      console.error("Gagal memuat data Opportunity Monitor:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger Scanner & Refresh
  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/crypto/narrative-onchain/scan", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data) {
        setNarratives(json.data.narratives || []);
        setCoins(json.data.coins || []);
        setCatalysts(json.data.catalysts || []);
        alert("Pemindaian selesai! Data harga pasar, on-chain, dan skor telah diperbarui.");
      }
    } catch (err: any) {
      alert("Gagal scan: " + err.message);
    } finally {
      setScanning(false);
    }
  };

  // Dispatch Alert to Telegram
  const handleSendTelegram = async (type: "NARRATIVE" | "COIN", slugOrSymbol: string) => {
    setSendingAlert((prev) => ({ ...prev, [slugOrSymbol]: true }));
    try {
      const res = await fetch("/api/crypto/narrative-onchain/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, slugOrSymbol })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || "Alert berhasil dikirimkan ke Telegram!");
      } else {
        alert(json.error || "Gagal mengirim alert.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSendingAlert((prev) => ({ ...prev, [slugOrSymbol]: false }));
    }
  };

  // Filtered Coins
  const filteredCoins = useMemo(() => {
    return coins.filter((coin) => {
      // Search
      const matchSearch =
        searchQuery === "" ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Narrative
      const matchNar = selectedNarrative === "ALL" || coin.narrative_slug === selectedNarrative;

      // Signal
      const matchSignal = selectedSignal === "ALL" || coin.signal_classification === selectedSignal;

      // Min Score
      const matchScore = coin.opportunity_score >= minScore;

      // Whale
      const matchWhale = !whaleOnly || coin.whale_action === "ACCUMULATION";

      // Unlock Risk
      const matchUnlock = unlockFilter === "ALL" || coin.unlock_risk === unlockFilter;

      return matchSearch && matchNar && matchSignal && matchScore && matchWhale && matchUnlock;
    });
  }, [coins, searchQuery, selectedNarrative, selectedSignal, minScore, whaleOnly, unlockFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 shadow-lg shadow-orange-500/20 text-white">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 bg-clip-text text-transparent">
                  Crypto Narrative & On-Chain Opportunity Monitor
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 border border-orange-500/40 text-orange-300">
                  5-LAYER INTEL
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400">
                Penyaring Peluang Institusional: Deteksi Narasi Bertumbuh, Validasi Adopsi On-Chain & Akumulasi Whale, Serta Evaluasi Derivatif & Tokenomics
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Memindai Pasar..." : "Scan Market & On-Chain"}
          </button>

          <button
            type="button"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all ${
              showFilterDrawer
                ? "bg-orange-950/60 border-orange-500/60 text-orange-300"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Filter className="w-4 h-4 text-orange-400" />
            Filter Scanner
          </button>

          <button
            type="button"
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Market Regime & Macro Intelligence Banner */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-amber-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Kondisi Rezim Pasar Kripto
            </div>
            <div className="text-lg md:text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {macro.marketRegime}
              </span>
              <span className="text-xs text-slate-400 font-normal">
                (Rotasi Kapital Terfokus ke Narasi Beradopsi Riil)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">BTC Dominance</span>
              <span className="font-mono font-bold text-amber-400">{macro.btcDominance}%</span>
            </div>
            <div className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${macro.btcDominance}%` }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Altcoin Breadth</span>
              <span className="font-mono font-bold text-emerald-400">{macro.altcoinBreadth}/100</span>
            </div>
            <div className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${macro.altcoinBreadth}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("WATCHLIST")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "WATCHLIST"
              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Compass className="w-4 h-4" />
          Watchlist Kandidat ({filteredCoins.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("NARRATIVES")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "NARRATIVES"
              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Flame className="w-4 h-4" />
          Hot Narratives Leaderboard ({narratives.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ONCHAIN")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "ONCHAIN"
              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Activity className="w-4 h-4" />
          On-Chain & Whale Radar
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CATALYSTS")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "CATALYSTS"
              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Token Unlock & Katalis ({catalysts.length})
        </button>
      </div>

      {/* Filter Drawer / Search Header */}
      {showFilterDrawer && (
        <div className="p-4 md:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
              Parameter Filter Scanner
            </h3>
            <button
              type="button"
              onClick={() => {
                setSelectedNarrative("ALL");
                setSelectedSignal("ALL");
                setMinScore(0);
                setWhaleOnly(false);
                setUnlockFilter("ALL");
                setSearchQuery("");
              }}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium"
            >
              Reset Filter
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            {/* Filter by Narrative */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Sektor Narasi</label>
              <select
                value={selectedNarrative}
                onChange={(e) => setSelectedNarrative(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">Semua Narasi</option>
                {narratives.map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Signal Classification */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Klasifikasi Sinyal</label>
              <select
                value={selectedSignal}
                onChange={(e) => setSelectedSignal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">Semua Sinyal</option>
                <option value="EARLY_ACCUMULATION">🟢 Early Accumulation</option>
                <option value="NARRATIVE_BREAKOUT">🔵 Narrative Breakout</option>
                <option value="CROWDED_RISK">🟠 Crowded / Late Risk</option>
                <option value="DISTRIBUTION_WARNING">🔴 Distribution Warning</option>
              </select>
            </div>

            {/* Min Score */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Min Opportunity Score:</span>
                <span className="font-bold text-amber-400 font-mono">{minScore}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            {/* Unlock Risk */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Batas Risiko Unlock</label>
              <select
                value={unlockFilter}
                onChange={(e) => setUnlockFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
              >
                <option value="ALL">Semua Level Risiko</option>
                <option value="LOW">🟢 Low Risk Saja</option>
                <option value="MEDIUM">🟡 Medium Risk</option>
                <option value="HIGH">🔴 High Risk</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={whaleOnly}
                onChange={(e) => setWhaleOnly(e.target.checked)}
                className="accent-orange-500 rounded"
              />
              <span>Hanya Koin dengan Akumulasi Whale (Whale Netflow Positif 🐋)</span>
            </label>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: WATCHLIST KANDIDAT UTAMA (CORE WATCHLIST)                         */}
      {/* ========================================================================= */}
      {activeTab === "WATCHLIST" && (
        <div className="space-y-4">
          {/* Search bar & count */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari simbol atau nama koin (TAO, NEAR, ONDO, HYPE)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="text-xs text-slate-400">
              Menampilkan <span className="font-bold text-slate-200">{filteredCoins.length}</span> dari {coins.length} kandidat
            </div>
          </div>

          {/* Opportunity Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Kandidat Koin</th>
                    <th className="py-3 px-3">Sektor Narasi</th>
                    <th className="py-3 px-3">Opportunity Score</th>
                    <th className="py-3 px-3">Klasifikasi Sinyal</th>
                    <th className="py-3 px-3">On-Chain Score</th>
                    <th className="py-3 px-3">Whale Flow (30d)</th>
                    <th className="py-3 px-3">Exchange Flow</th>
                    <th className="py-3 px-3">Derivatives Status</th>
                    <th className="py-3 px-3">Token Unlock</th>
                    <th className="py-3 px-4 text-center">Aksi Analisis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredCoins.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                        Tidak ada kandidat koin yang sesuai dengan filter pencarian Anda.
                      </td>
                    </tr>
                  ) : (
                    filteredCoins.map((coin) => {
                      // Signal badge styling
                      let signalBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                          🟢 Early Accumulation
                        </span>
                      );
                      if (coin.signal_classification === "NARRATIVE_BREAKOUT") {
                        signalBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                            🔵 Narrative Breakout
                          </span>
                        );
                      } else if (coin.signal_classification === "CROWDED_RISK") {
                        signalBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                            🟠 Crowded / Late
                          </span>
                        );
                      } else if (coin.signal_classification === "DISTRIBUTION_WARNING") {
                        signalBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300">
                            🔴 Distribution
                          </span>
                        );
                      }

                      // Unlock Risk
                      const unlockBadge =
                        coin.unlock_risk === "LOW" ? (
                          <span className="text-emerald-400 font-semibold text-[11px]">🟢 Low Risk</span>
                        ) : coin.unlock_risk === "MEDIUM" ? (
                          <span className="text-amber-400 font-semibold text-[11px]">🟡 {coin.unlock_amount_pct}% (Med)</span>
                        ) : (
                          <span className="text-rose-400 font-bold text-[11px]">🔴 {coin.unlock_amount_pct}% (High)</span>
                        );

                      return (
                        <tr key={coin.symbol} className="hover:bg-slate-800/40 transition-colors">
                          {/* Symbol & Price */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-bold text-sm text-slate-100 flex items-center gap-1">
                                  ${coin.symbol}
                                  <span className="text-[10px] text-slate-500 font-normal">({coin.name})</span>
                                </div>
                                <div className="text-[11px] text-slate-300 mt-0.5">
                                  ${coin.price.toLocaleString()}{" "}
                                  <span className={coin.price_change_24h >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                    ({coin.price_change_24h >= 0 ? "+" : ""}{coin.price_change_24h}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Narrative Category */}
                          <td className="py-3 px-3 font-sans">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                              {coin.narrative_name}
                            </span>
                          </td>

                          {/* Composite Opportunity Score */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-bold ${
                                  coin.opportunity_score >= 80
                                    ? "text-emerald-400"
                                    : coin.opportunity_score >= 65
                                    ? "text-amber-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {coin.opportunity_score}
                              </span>
                              <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    coin.opportunity_score >= 80
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                      : "bg-gradient-to-r from-amber-500 to-orange-400"
                                  }`}
                                  style={{ width: `${coin.opportunity_score}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Signal */}
                          <td className="py-3 px-3 font-sans">{signalBadge}</td>

                          {/* On-Chain Score */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-200">{coin.onchain_score}/100</div>
                            <div className="text-[10px] text-emerald-400">
                              Addr: +{coin.active_address_growth_7d}%
                            </div>
                          </td>

                          {/* Whale Netflow */}
                          <td className="py-3 px-3">
                            <div className="text-slate-200 font-semibold">
                              +${(coin.whale_net_flow_usd / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-[10px] text-cyan-400 font-sans">
                              {coin.whale_action === "ACCUMULATION" ? "🐋 Akumulasi" : "Netral"}
                            </div>
                          </td>

                          {/* Exchange Flow */}
                          <td className="py-3 px-3 font-sans">
                            {coin.exchange_flow_status === "NET OUTFLOW" ? (
                              <span className="text-emerald-400 font-semibold text-[11px]">
                                🟢 Outflow (-${(Math.abs(coin.exchange_netflow_usd) / 1000000).toFixed(1)}M)
                              </span>
                            ) : (
                              <span className="text-rose-400 font-semibold text-[11px]">
                                🔴 Inflow (+${(coin.exchange_netflow_usd / 1000000).toFixed(1)}M)
                              </span>
                            )}
                          </td>

                          {/* Derivatives */}
                          <td className="py-3 px-3">
                            <div className="text-slate-200 font-semibold">
                              OI: +{coin.oi_change_24h}%
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              Rate: {(coin.funding_rate * 100).toFixed(3)}%
                            </div>
                          </td>

                          {/* Unlock */}
                          <td className="py-3 px-3 font-sans">{unlockBadge}</td>

                          {/* Actions */}
                          <td className="py-3 px-4 font-sans text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedCoin(coin)}
                                className="px-2.5 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/40 text-orange-300 text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Detail 5-Layer
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSendTelegram("COIN", coin.symbol)}
                                disabled={sendingAlert[coin.symbol]}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                title="Kirim Alert ke Telegram"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HOT NARRATIVES LEADERBOARD                                        */}
      {/* ========================================================================= */}
      {activeTab === "NARRATIVES" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {narratives.map((nar) => (
              <div
                key={nar.slug}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col justify-between hover:border-orange-500/50 transition-all duration-200 space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {nar.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        nar.velocity === "VERY HIGH"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                      }`}
                    >
                      ⚡ {nar.velocity} (+{nar.velocity_pct}%)
                    </span>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-bold text-base text-slate-100">{nar.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{nar.description}</p>
                  </div>

                  {/* Growth Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center font-mono">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase">Social</div>
                      <div className="text-xs font-bold text-emerald-400">+{nar.social_growth_24h}%</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase">Volume</div>
                      <div className="text-xs font-bold text-cyan-400">+{nar.volume_growth_24h}%</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase">On-Chain</div>
                      <div className="text-xs font-bold text-amber-400">+{nar.onchain_growth_24h}%</div>
                    </div>
                  </div>

                  {/* Top Coins Chips */}
                  <div className="mt-4 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Kandidat Koin Terdepan:</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {nar.top_coins.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                        >
                          ${c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Momentum:</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">{nar.score}/100</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendTelegram("NARRATIVE", nar.slug)}
                    disabled={sendingAlert[nar.slug]}
                    className="px-2.5 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Alert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ON-CHAIN & WHALE RADAR                                            */}
      {/* ========================================================================= */}
      {activeTab === "ONCHAIN" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Pertumbuhan Alamat Aktif 30 Hari Tertinggi
              </h3>
              <div className="divide-y divide-slate-800 text-xs">
                {coins
                  .slice()
                  .sort((a, b) => b.active_address_growth_30d - a.active_address_growth_30d)
                  .slice(0, 5)
                  .map((c) => (
                    <div key={c.symbol} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-200">${c.symbol}</div>
                        <div className="text-[10px] text-slate-500">{c.narrative_name}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-emerald-400 font-bold">+{c.active_address_growth_30d}%</div>
                        <div className="text-[10px] text-slate-400">7D: +{c.active_address_growth_7d}%</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Net Flow Akumulasi Paus (Whale Flow)
              </h3>
              <div className="divide-y divide-slate-800 text-xs">
                {coins
                  .slice()
                  .sort((a, b) => b.whale_net_flow_usd - a.whale_net_flow_usd)
                  .slice(0, 5)
                  .map((c) => (
                    <div key={c.symbol} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-200">${c.symbol}</div>
                        <div className="text-[10px] text-cyan-400">🐋 Whale Accumulation</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-emerald-400 font-bold">+${(c.whale_net_flow_usd / 1000000).toFixed(1)}M</div>
                        <div className="text-[10px] text-slate-400">Outflow: Netral</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Pertumbuhan Pendapatan Protokol (Revenue)
              </h3>
              <div className="divide-y divide-slate-800 text-xs">
                {coins
                  .filter((c) => c.revenue_growth_30d > 0)
                  .sort((a, b) => b.revenue_growth_30d - a.revenue_growth_30d)
                  .slice(0, 5)
                  .map((c) => (
                    <div key={c.symbol} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-200">${c.symbol}</div>
                        <div className="text-[10px] text-slate-500">Rev: ${(c.protocol_revenue_30d / 1000000).toFixed(1)}M</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-amber-400 font-bold">+{c.revenue_growth_30d}%</div>
                        <div className="text-[10px] text-slate-400">Adopsi Nyata 30d</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TOKEN UNLOCK & CATALYST CALENDAR                                   */}
      {/* ========================================================================= */}
      {activeTab === "CATALYSTS" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                Jadwal Katalis Ekosistem & Peringatan Unlock Token
              </h3>
              <span className="text-xs text-slate-400">Diperbarui berdasarkan roadmap protokol</span>
            </div>

            <div className="divide-y divide-slate-800/80 text-xs">
              {catalysts.map((cat) => (
                <div key={cat.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-xl font-mono font-bold bg-slate-950 border border-slate-800 text-slate-100 text-sm">
                      ${cat.coin_symbol}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-200 text-sm">{cat.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Tipe: <span className="text-orange-300 font-medium">{cat.event_type}</span> • Sumber: {cat.source}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        cat.importance === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {cat.importance}
                    </span>
                    <div className="font-mono text-xs text-slate-300 mt-1">{cat.event_date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5-LAYER DEEP DIVE ANALYTICS MODAL                                        */}
      {/* ========================================================================= */}
      {selectedCoin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-600/20 border border-orange-500/40 text-orange-400 font-mono font-bold text-lg">
                  ${selectedCoin.symbol}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-100">{selectedCoin.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {selectedCoin.signal_classification.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Sektor: <strong className="text-slate-200">{selectedCoin.narrative_name}</strong> • Chain: {selectedCoin.chain}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCoin(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-950 to-orange-950/40 border border-orange-900/40 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Opportunity Score</div>
                <div className="text-3xl font-extrabold text-amber-400 font-mono mt-0.5">
                  {selectedCoin.opportunity_score} <span className="text-sm font-normal text-slate-400">/ 100</span>
                </div>
              </div>
              <div className="text-right text-xs text-slate-300">
                <div>Harga Terkini: <strong className="text-slate-100">${selectedCoin.price.toLocaleString()}</strong></div>
                <div>Volume 24j: <strong className="text-slate-100">${(selectedCoin.volume_24h / 1000000).toFixed(1)}M</strong></div>
              </div>
            </div>

            {/* 5-Layer Breakdown Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Analisis 5-Layer Bukti Institusional
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Layer 1: Narrative & Attention */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-semibold text-orange-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> Layer 1: Narrative & Social Attention (20%)
                  </div>
                  <div className="text-slate-300 space-y-1 font-mono text-[11px]">
                    <div>Pertumbuhan Atensi Sosial 24j: +{selectedCoin.social_growth_24h}%</div>
                    <div>Kecepatan Narasi (Velocity): +{selectedCoin.narrative_velocity_pct}%</div>
                    <div>Penyebutan Berita/Media 24j: {selectedCoin.news_mentions_24h} artikel</div>
                    <div>Skor Narrative Momentum: <strong className="text-amber-400">{selectedCoin.narrative_score}/100</strong></div>
                  </div>
                </div>

                {/* Layer 2: On-Chain Adoption */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Layer 2: On-Chain Actual Adoption (30%)
                  </div>
                  <div className="text-slate-300 space-y-1 font-mono text-[11px]">
                    <div>Pertumbuhan Alamat Aktif 7D / 30D: +{selectedCoin.active_address_growth_7d}% / +{selectedCoin.active_address_growth_30d}%</div>
                    <div>Pengguna Baru (New Addresses): +{selectedCoin.new_address_growth_30d}%</div>
                    <div>TVL Ekosistem: ${selectedCoin.tvl_usd > 0 ? `${(selectedCoin.tvl_usd / 1000000).toFixed(1)}M (+${selectedCoin.tvl_growth_30d}%)` : "N/A"}</div>
                    <div>Skor On-Chain: <strong className="text-cyan-400">{selectedCoin.onchain_score}/100</strong></div>
                  </div>
                </div>

                {/* Layer 3: Whale & Exchange Flow */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Layer 3: Whale & Exchange Netflow (15%)
                  </div>
                  <div className="text-slate-300 space-y-1 font-mono text-[11px]">
                    <div>Aksi Paus: <strong className="text-emerald-300">{selectedCoin.whale_action}</strong> (+${(selectedCoin.whale_net_flow_usd / 1000000).toFixed(1)}M)</div>
                    <div>Arus Bursa: <strong className="text-emerald-300">{selectedCoin.exchange_flow_status}</strong> (${(selectedCoin.exchange_netflow_usd / 1000000).toFixed(1)}M)</div>
                    <div>Konsentrasi Top 10 Holder: {selectedCoin.top10_concentration_pct}%</div>
                    <div>Pertumbuhan Jumlah Holder 30d: +{selectedCoin.holder_growth_30d}%</div>
                  </div>
                </div>

                {/* Layer 4: Market & Derivatives */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Layer 4: Market & Derivatives (25%)
                  </div>
                  <div className="text-slate-300 space-y-1 font-mono text-[11px]">
                    <div>Open Interest: ${(selectedCoin.open_interest_usd / 1000000).toFixed(1)}M (+{selectedCoin.oi_change_24h}%)</div>
                    <div>Tarif Pendanaan (Funding): {(selectedCoin.funding_rate * 100).toFixed(4)}% ({selectedCoin.funding_status})</div>
                    <div>Likuidasi 24j: Short ${(selectedCoin.short_liquidation_24h / 1000000).toFixed(1)}M / Long ${(selectedCoin.long_liquidation_24h / 1000000).toFixed(1)}M</div>
                    <div>Skor Derivatif: <strong className="text-amber-400">{selectedCoin.derivatives_score}/100</strong></div>
                  </div>
                </div>
              </div>

              {/* Layer 5: Tokenomics & Unlock */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Layer 5: Tokenomics & Upcoming Unlock Risk (10%)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                  <div>Market Cap: ${(selectedCoin.market_cap / 1000000).toFixed(0)}M</div>
                  <div>FDV: ${(selectedCoin.fdv / 1000000).toFixed(0)}M</div>
                  <div>Circulating: {selectedCoin.circulating_pct}%</div>
                  <div>Status Unlock: <strong className={selectedCoin.unlock_risk === "LOW" ? "text-emerald-400" : "text-amber-400"}>{selectedCoin.unlock_risk} RISK</strong></div>
                </div>
                {selectedCoin.catalyst_summary && (
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    📌 <em>{selectedCoin.catalyst_summary}</em>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCoin(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => handleSendTelegram("COIN", selectedCoin.symbol)}
                disabled={sendingAlert[selectedCoin.symbol]}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-950"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingAlert[selectedCoin.symbol] ? "Mengirim..." : "Kirim Alert ke Telegram"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
