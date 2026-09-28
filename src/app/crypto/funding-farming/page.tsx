"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Coins, 
  RefreshCcw, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Info, 
  ShieldCheck, 
  ShieldAlert, 
  Search,
  ArrowRight,
  ExternalLink,
  Timer,
  FileDown,
  Play,
  Square,
  Sliders,
  Wallet,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Trash2,
  History,
  Layers,
  Sparkles,
  DollarSign,
  RotateCcw,
  ArrowLeftRight,
  Percent,
  Target
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

export default function FundingFarmingPage() {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'bot' | 'history' | 'scanner'>('bot');

  // Scanner State
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(Date.now());

  // Card-level Reverse State: symbol -> boolean
  const [cardReverseMap, setCardReverseMap] = useState<Record<string, boolean>>({});

  // Bot State
  const [botState, setBotState] = useState<any>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Config Form State (Bot)
  const [notionalUsd, setNotionalUsd] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(5);
  const [openSecondsBefore, setOpenSecondsBefore] = useState<number>(30);
  const [closeSecondsAfter, setCloseSecondsAfter] = useState<number>(10);
  const [minFundingRatePercent, setMinFundingRatePercent] = useState<number>(0.01);
  const [botIsReverse, setBotIsReverse] = useState<boolean>(false);
  const [botRrRatio, setBotRrRatio] = useState<'NONE' | 'PROFIT' | '1:1' | '1:2' | '1:3'>('NONE');
  const [botBaseSlPercent, setBotBaseSlPercent] = useState<number>(1.5);
  const [botIsCompound, setBotIsCompound] = useState<boolean>(false);
  const [botCloseOnProfit, setBotCloseOnProfit] = useState<boolean>(false);
  const [botMinProfitUsd, setBotMinProfitUsd] = useState<number>(0);
  const [botMaxHoldSeconds, setBotMaxHoldSeconds] = useState<number>(300);

  // 1-Click Quick Order Modal State
  const [quickOrderModal, setQuickOrderModal] = useState<{
    isOpen: boolean;
    symbol: string;
    markPrice: number;
    fundingRate: number;
    baseRecommendation: 'LONG' | 'SHORT';
    isReverse: boolean;
    rrRatio: '1:1' | '1:2' | '1:3';
    notionalUsd: number;
    leverage: number;
    baseSlPercent: number;
    nextFundingTime?: number;
    openAfterPayout?: boolean;
  }>({
    isOpen: false,
    symbol: '',
    markPrice: 0,
    fundingRate: 0,
    baseRecommendation: 'LONG',
    isReverse: false,
    rrRatio: '1:2',
    notionalUsd: 20,
    leverage: 10,
    baseSlPercent: 1.5,
    nextFundingTime: 0,
    openAfterPayout: true
  });

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderToast, setOrderToast] = useState<{ show: boolean; success: boolean; message: string } | null>(null);

  // Scheduled Reverse Order waiting for fee payout
  const [scheduledOrder, setScheduledOrder] = useState<{
    symbol: string;
    side: 'BUY' | 'SELL';
    notionalUsd: number;
    leverage: number;
    rrRatio: '1:1' | '1:2' | '1:3';
    baseSlPercent: number;
    isReverse: boolean;
    targetFundingTime: number;
  } | null>(null);

  // Terminal Logs autoscroll
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);

  // Fetch Bot State
  const fetchBotState = async () => {
    try {
      const res = await fetch('/api/crypto/funding-farming/bot', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setBotState(json.data);
        if (json.data.config) {
          setNotionalUsd(json.data.config.notional_usd || 100);
          setLeverage(json.data.config.leverage || 5);
          setOpenSecondsBefore(json.data.config.open_seconds_before || 30);
          setCloseSecondsAfter(json.data.config.close_seconds_after || 10);
          setMinFundingRatePercent((json.data.config.min_funding_rate || 0.0001) * 100);
          setBotIsReverse(Boolean(json.data.config.is_reverse));
          setBotRrRatio(json.data.config.rr_ratio || 'NONE');
          setBotBaseSlPercent(json.data.config.base_sl_percent || 1.5);
          setBotIsCompound(Boolean(json.data.config.is_compound));
          setBotCloseOnProfit(Boolean(json.data.config.close_on_profit) || json.data.config.rr_ratio === 'PROFIT');
          setBotMinProfitUsd(parseFloat(json.data.config.min_profit_usd) || 0);
          setBotMaxHoldSeconds(parseInt(json.data.config.max_hold_seconds) || 300);
        }
      }
    } catch (err) {
      console.error("Failed to fetch bot state", err);
    } finally {
      setBotLoading(false);
    }
  };

  // Tick Bot (Client-side watchdog & periodic execution)
  const triggerTick = async () => {
    try {
      const res = await fetch('/api/crypto/funding-farming/bot/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.success && json.data?.state) {
        setBotState(json.data.state);
      }
    } catch (err) {
      console.warn("Tick error:", err);
    }
  };

  // Fetch Market Scanner Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crypto/funding-farming');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch funding data", err);
    } finally {
      setLoading(false);
    }
  };

  // Open Config Modal & ensure form values match current saved config
  const handleOpenConfigModal = () => {
    if (botState?.config) {
      setNotionalUsd(botState.config.notional_usd || 100);
      setLeverage(botState.config.leverage || 5);
      setOpenSecondsBefore(botState.config.open_seconds_before || 30);
      setCloseSecondsAfter(botState.config.close_seconds_after || 10);
      setMinFundingRatePercent((botState.config.min_funding_rate || 0.0001) * 100);
      setBotIsReverse(Boolean(botState.config.is_reverse));
      setBotRrRatio(botState.config.rr_ratio || 'NONE');
      setBotBaseSlPercent(botState.config.base_sl_percent || 1.5);
      setBotIsCompound(Boolean(botState.config.is_compound));
      setBotCloseOnProfit(Boolean(botState.config.close_on_profit) || botState.config.rr_ratio === 'PROFIT');
      setBotMinProfitUsd(parseFloat(botState.config.min_profit_usd) || 0);
      setBotMaxHoldSeconds(parseInt(botState.config.max_hold_seconds) || 300);
    }
    setShowConfigModal(true);
  };

  // Start Bot Handler
  const handleStartBot = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/crypto/funding-farming/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionalUsd,
          leverage,
          openSecondsBefore,
          closeSecondsAfter,
          minFundingRate: minFundingRatePercent / 100,
          isReverse: botIsReverse,
          rrRatio: botRrRatio,
          baseSlPercent: botBaseSlPercent,
          isCompound: botIsCompound,
          closeOnProfit: botCloseOnProfit || botRrRatio === 'PROFIT',
          minProfitUsd: botMinProfitUsd,
          maxHoldSeconds: botMaxHoldSeconds
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setBotState(json.data);
        if (json.data.config) {
          setBotIsCompound(Boolean(json.data.config.is_compound));
          setBotCloseOnProfit(Boolean(json.data.config.close_on_profit) || json.data.config.rr_ratio === 'PROFIT');
        }
        setShowConfigModal(false);
      } else {
        alert(json.error || 'Gagal memulai bot');
      }
    } catch (err: any) {
      alert(err.message || 'Error memulai bot');
    } finally {
      setIsStarting(false);
    }
  };

  // Stop Bot Handler
  const handleStopBot = async (closePosition: boolean = false) => {
    setIsStopping(true);
    try {
      const res = await fetch('/api/crypto/funding-farming/bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closePosition })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setBotState(json.data);
        setShowStopConfirmModal(false);
      } else {
        alert(json.error || 'Gagal menghentikan bot');
      }
    } catch (err: any) {
      alert(err.message || 'Error menghentikan bot');
    } finally {
      setIsStopping(false);
    }
  };

  // Save Config Handler
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/crypto/funding-farming/bot/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionalUsd,
          leverage,
          openSecondsBefore,
          closeSecondsAfter,
          minFundingRate: minFundingRatePercent / 100,
          isReverse: botIsReverse,
          rrRatio: botRrRatio,
          baseSlPercent: botBaseSlPercent,
          isCompound: botIsCompound,
          closeOnProfit: botCloseOnProfit || botRrRatio === 'PROFIT',
          minProfitUsd: botMinProfitUsd,
          maxHoldSeconds: botMaxHoldSeconds
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setBotState(json.data);
        if (json.data.config) {
          setBotIsCompound(Boolean(json.data.config.is_compound));
          setBotCloseOnProfit(Boolean(json.data.config.close_on_profit) || json.data.config.rr_ratio === 'PROFIT');
        }
        setShowConfigModal(false);
      } else {
        alert(json.error || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      alert(err.message || 'Error menyimpan pengaturan');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    try {
      await fetch('/api/crypto/funding-farming/bot/clear-logs', { method: 'POST' });
      if (botState) {
        setBotState({ ...botState, logs: [] });
      }
    } catch (err) {
      console.error("Clear logs error:", err);
    }
  };

  // Open Quick Order Modal for a coin
  const openOrderModal = (coin: any, isReverseDefault: boolean = false, rrDefault: '1:1' | '1:2' | '1:3' = '1:2') => {
    const baseRec = coin.recommendation as 'LONG' | 'SHORT';
    const isRev = isReverseDefault || Boolean(cardReverseMap[coin.symbol]);

    setQuickOrderModal({
      isOpen: true,
      symbol: coin.symbol,
      markPrice: parseFloat(coin.markPrice) || 0,
      fundingRate: parseFloat(coin.fundingRate) || 0,
      baseRecommendation: baseRec,
      isReverse: isRev,
      rrRatio: rrDefault,
      notionalUsd: 20,
      leverage: 10,
      baseSlPercent: 1.5,
      nextFundingTime: coin.nextFundingTime || 0,
      openAfterPayout: isRev
    });
  };

  // Execute 1-Click Order directly to Binance Futures
  const handleExecuteOrder = async () => {
    // Determine effective side:
    let effectiveSide: 'BUY' | 'SELL';
    if (quickOrderModal.baseRecommendation === 'LONG') {
      effectiveSide = quickOrderModal.isReverse ? 'SELL' : 'BUY';
    } else {
      effectiveSide = quickOrderModal.isReverse ? 'BUY' : 'SELL';
    }

    // If Reverse mode and user wants to wait for settlement fee payout
    if (
      quickOrderModal.isReverse && 
      quickOrderModal.openAfterPayout && 
      quickOrderModal.nextFundingTime && 
      quickOrderModal.nextFundingTime > Date.now()
    ) {
      setScheduledOrder({
        symbol: quickOrderModal.symbol,
        side: effectiveSide,
        notionalUsd: quickOrderModal.notionalUsd,
        leverage: quickOrderModal.leverage,
        rrRatio: quickOrderModal.rrRatio,
        baseSlPercent: quickOrderModal.baseSlPercent,
        isReverse: true,
        targetFundingTime: quickOrderModal.nextFundingTime
      });
      setQuickOrderModal(prev => ({ ...prev, isOpen: false }));
      setOrderToast({
        show: true,
        success: true,
        message: `⏳ Order REVERSE ${quickOrderModal.symbol} terkunci! Akan otomatis dieksekusi tepat saat fee selesai dibayarkan bursa agar posisi BEBAS DARI POTONGAN FEE MINUS.`
      });
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/crypto/funding-farming/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: quickOrderModal.symbol,
          side: effectiveSide,
          notionalUsd: quickOrderModal.notionalUsd,
          leverage: quickOrderModal.leverage,
          rrRatio: quickOrderModal.rrRatio,
          baseSlPercent: quickOrderModal.baseSlPercent,
          isReverse: quickOrderModal.isReverse
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const sideLabel = d.side === 'BUY' ? 'LONG (BUY)' : 'SHORT (SELL)';
        const revLabel = d.isReverse ? ' [REVERSE]' : '';
        const msg = `Berhasil! Order ${revLabel} ${d.symbol} ${sideLabel} @ $${d.fillPrice} berhasil dieksekusi! Target ${d.rrRatio} | SL: $${d.stopLossPrice} | TP: $${d.takeProfitPrice}`;
        
        setOrderToast({ show: true, success: true, message: msg });
        setQuickOrderModal(prev => ({ ...prev, isOpen: false }));
        fetchBotState();
      } else {
        setOrderToast({ show: true, success: false, message: json.error || 'Gagal mengeksekusi order' });
      }
    } catch (err: any) {
      setOrderToast({ show: true, success: false, message: err.message || 'Error koneksi saat order' });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Execute scheduled order immediately on demand
  const handleExecuteScheduledNow = async (orderItem: any) => {
    setScheduledOrder(null);
    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/crypto/funding-farming/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: orderItem.symbol,
          side: orderItem.side,
          notionalUsd: orderItem.notionalUsd,
          leverage: orderItem.leverage,
          rrRatio: orderItem.rrRatio,
          baseSlPercent: orderItem.baseSlPercent,
          isReverse: orderItem.isReverse
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setOrderToast({
          show: true,
          success: true,
          message: `Berhasil! Order REVERSE ${d.symbol} ${d.side === 'BUY' ? 'LONG (BUY)' : 'SHORT (SELL)'} @ $${d.fillPrice} berhasil dieksekusi langsung!`
        });
        fetchBotState();
      } else {
        setOrderToast({ show: true, success: false, message: json.error || 'Gagal mengeksekusi order' });
      }
    } catch (err: any) {
      setOrderToast({ show: true, success: false, message: err.message || 'Error koneksi saat order' });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Toggle card-level reverse
  const toggleCardReverse = (symbol: string, reverse: boolean) => {
    setCardReverseMap(prev => ({
      ...prev,
      [symbol]: reverse
    }));
  };

  // Export Scanner to Excel
  const handleExport = () => {
    if (filtered.length === 0) return;
    exportToExcel({
      title: "Funding Fee Farming Scanner Report",
      subtitle: `Generated: ${new Date().toLocaleString()}`,
      fileName: `Funding_Farming_Scanner_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Funding Rate", key: "fundingRate", format: (v) => (parseFloat(v) * 100).toFixed(4) + "%" },
        { header: "Mark Price", key: "markPrice", format: (v) => parseFloat(v).toLocaleString() },
        { header: "Recommendation", key: "recommendation" },
        { header: "Market Condition", key: "marketCondition" },
        { header: "Is Extreme", key: "isExtreme", format: (v) => v ? "YES" : "NO" },
        { header: "Next Funding Time", key: "nextFundingTime", format: (v) => new Date(v).toLocaleString('id-ID') },
      ],
      data: filtered,
    });
  };

  // Export History to Excel
  const handleExportHistory = () => {
    if (!botState?.history || botState.history.length === 0) return;
    exportToExcel({
      title: "Funding Farming Bot Round History",
      subtitle: `Total Rounds: ${botState.history.length} | Net Realized Profit: $${(botState.stats?.totalNetProfit || 0).toFixed(4)} USDT`,
      fileName: `Funding_Bot_History_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Round #", key: "round_number" },
        { header: "Symbol", key: "symbol" },
        { header: "Side", key: "side" },
        { header: "Notional USD", key: "notional_usd", format: (v) => `$${parseFloat(v).toFixed(2)}` },
        { header: "Leverage", key: "leverage", format: (v) => `${v}x` },
        { header: "Funding Rate", key: "funding_rate", format: (v) => `${(parseFloat(v) * 100).toFixed(4)}%` },
        { header: "Entry Price", key: "entry_price", format: (v) => parseFloat(v).toFixed(4) },
        { header: "Exit Price", key: "exit_price", format: (v) => v ? parseFloat(v).toFixed(4) : '-' },
        { header: "Funding Fee ($)", key: "funding_fee_usd", format: (v) => `+$${parseFloat(v).toFixed(4)}` },
        { header: "Price PnL ($)", key: "trade_pnl_usd", format: (v) => `$${parseFloat(v).toFixed(4)}` },
        { header: "Commission ($)", key: "commission_usd", format: (v) => `-$${parseFloat(v).toFixed(4)}` },
        { header: "Net Realized PnL ($)", key: "net_pnl_usd", format: (v) => `$${parseFloat(v).toFixed(4)}` },
        { header: "Net ROE %", key: "net_pnl_percent", format: (v) => `${parseFloat(v).toFixed(2)}%` },
        { header: "Status", key: "status" },
        { 
          header: "Alasan Exit", 
          key: "exit_reason", 
          format: (v) => v === 'TOTAL_PROFIT_CLOSE' ? 'Total Profit (PnL+Fee)' : v === 'TP_HIT' ? 'Take Profit' : v === 'SL_HIT' ? 'Stop Loss' : v === 'TIMEOUT_EXIT' ? 'Timeout' : v === 'TIME_EXIT' ? 'Fee Lock (+10s)' : (v || '-') 
        },
        { header: "Waktu Open", key: "opened_at", format: (v) => new Date(v).toLocaleString('id-ID') },
        { header: "Waktu Selesai", key: "closed_at", format: (v) => v ? new Date(v).toLocaleString('id-ID') : '-' },
      ],
      data: botState.history,
    });
  };

  // Initial and periodic polling
  useEffect(() => {
    fetchBotState();
    fetchData();

    // 1-second countdown clock
    const clockInterval = setInterval(() => setNow(Date.now()), 1000);

    // 3-second watchdog & tick loop
    const tickInterval = setInterval(() => {
      triggerTick();
    }, 3000);

    // 60-second scanner refresh
    const scannerInterval = setInterval(() => {
      fetchData();
    }, 60000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(tickInterval);
      clearInterval(scannerInterval);
    };
  }, []);

  // Auto-scroll logs inside container only (do not scroll webpage)
  useEffect(() => {
    if (autoScrollLogs && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [botState?.logs, autoScrollLogs]);

  // Scheduled Reverse Order Watchdog: Execute automatically when settlement timestamp passes
  useEffect(() => {
    if (!scheduledOrder) return;
    const interval = setInterval(async () => {
      const nowMs = Date.now();
      if (nowMs >= scheduledOrder.targetFundingTime + 500) {
        const orderToRun = { ...scheduledOrder };
        setScheduledOrder(null);
        try {
          const res = await fetch('/api/crypto/funding-farming/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: orderToRun.symbol,
              side: orderToRun.side,
              notionalUsd: orderToRun.notionalUsd,
              leverage: orderToRun.leverage,
              rrRatio: orderToRun.rrRatio,
              baseSlPercent: orderToRun.baseSlPercent,
              isReverse: orderToRun.isReverse
            })
          });
          const json = await res.json();
          if (json.success && json.data) {
            const d = json.data;
            const sideLabel = d.side === 'BUY' ? 'LONG (BUY)' : 'SHORT (SELL)';
            setOrderToast({
              show: true,
              success: true,
              message: `🎉 Settlement fee selesai! Order REVERSE ${d.symbol} ${sideLabel} @ $${d.fillPrice} berhasil dibuka tanpa potongan fee minus!`
            });
            fetchBotState();
          } else {
            setOrderToast({
              show: true,
              success: false,
              message: json.error || 'Gagal mengeksekusi order reverse terjadwal'
            });
          }
        } catch (err: any) {
          setOrderToast({
            show: true,
            success: false,
            message: err.message || 'Error saat eksekusi reverse terjadwal'
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledOrder]);


  // Toast Auto-dismiss
  useEffect(() => {
    if (orderToast?.show) {
      const timer = setTimeout(() => {
        setOrderToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [orderToast]);

  // Format countdown string
  const formatCountdown = (nextTime: number) => {
    const diff = nextTime - now;
    if (diff <= 0) return "SETTLEMENT IN PROGRESS";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}j ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const filtered = useMemo(() => {
    return data.filter(item => 
      item.symbol.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const botConfig = botState?.config;
  const botStats = botState?.stats;
  const isBotActive = Boolean(botConfig?.is_active);
  const targetCandidate = botState?.targetCandidate;
  const candidates = botState?.candidates || [];
  const accountBalance = botConfig?.account_balance;
  const realPosition = botConfig?.real_position;
  const isHolding = botConfig?.current_state === 'HOLDING_FOR_FUNDING';
  const isWaitingPayout = botConfig?.current_state === 'WAITING_PAYOUT';

  // Calculate live countdown to settlement for active target
  const activeNextFundingTime = isHolding || isWaitingPayout
    ? (botConfig?.target_next_funding_time || 0)
    : (targetCandidate?.nextFundingTime || 0);

  const secondsToSettlement = Math.max(0, Math.floor((activeNextFundingTime - now) / 1000));
  const isEntryWindow = secondsToSettlement <= (botConfig?.open_seconds_before || 30) && secondsToSettlement > 0;

  // Modal Live Calculations for SL & TP
  const modalCalculations = useMemo(() => {
    const { markPrice, baseRecommendation, isReverse, rrRatio, notionalUsd: modalNotional, leverage: modalLev, baseSlPercent: modalSl } = quickOrderModal;
    if (!markPrice || markPrice <= 0) {
      return { effectiveSide: 'BUY', effectiveSideText: 'LONG', slPrice: 0, tpPrice: 0, marginUsd: 0, maxLossUsd: 0, targetProfitUsd: 0 };
    }

    const effectiveSide = (baseRecommendation === 'LONG' ? (isReverse ? 'SELL' : 'BUY') : (isReverse ? 'BUY' : 'SELL')) as 'BUY' | 'SELL';
    const effectiveSideText = effectiveSide === 'BUY' ? 'LONG (BUY)' : 'SHORT (SELL)';

    const mult = rrRatio === '1:1' ? 1 : rrRatio === '1:2' ? 2 : 3;
    const slRatio = (modalSl || 1.5) / 100;
    const tpRatio = slRatio * mult;

    let slPrice = 0;
    let tpPrice = 0;

    if (effectiveSide === 'BUY') {
      slPrice = markPrice * (1 - slRatio);
      tpPrice = markPrice * (1 + tpRatio);
    } else {
      slPrice = markPrice * (1 + slRatio);
      tpPrice = markPrice * (1 - tpRatio);
    }

    const marginUsd = modalNotional / (modalLev || 1);
    const maxLossUsd = modalNotional * slRatio;
    const targetProfitUsd = modalNotional * tpRatio;

    return {
      effectiveSide,
      effectiveSideText,
      slPrice,
      tpPrice,
      marginUsd,
      maxLossUsd,
      targetProfitUsd,
      slPercent: modalSl,
      tpPercent: (modalSl * mult).toFixed(2)
    };
  }, [quickOrderModal]);

  return (
    <div className="space-y-8 pb-24 min-h-screen text-slate-100">
      
      {/* Toast Feedback Banner */}
      {orderToast && (
        <div className={`fixed top-6 right-6 z-50 p-4 px-6 rounded-3xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 max-w-lg ${
          orderToast.success 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          {orderToast.success ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-rose-400 shrink-0" />
          )}
          <div className="text-xs font-bold leading-relaxed">{orderToast.message}</div>
          <button 
            onClick={() => setOrderToast(null)}
            className="ml-auto text-slate-400 hover:text-white text-xs font-black p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Scheduled Reverse Order Banner */}
      {scheduledOrder && (
        <div className="p-4 px-6 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-amber-400 flex items-center gap-2">
                <span>🛡️ Order REVERSE Terjadwal: {scheduledOrder.symbol} ({scheduledOrder.side === 'BUY' ? 'LONG' : 'SHORT'})</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-[10px] text-amber-300 font-mono font-bold">Bebas Fee Minus</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Menunggu fee settlement selesai. Order akan otomatis dikirim ke Binance dalam <strong className="text-white font-mono">{formatCountdown(scheduledOrder.targetFundingTime)}</strong> (+1s).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExecuteScheduledNow(scheduledOrder)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase transition-all"
            >
              ⚡ Buka Sekarang Langsung
            </button>
            <button
              onClick={() => setScheduledOrder(null)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs uppercase transition-all"
            >
              Batalkan
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          HERO & BOT MASTER CONTROL BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-12 rounded-[48px] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 h-96 w-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
        <div className="absolute -bottom-24 -left-24 h-96 w-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-1000"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Zap className="h-3.5 w-3.5 animate-pulse" /> Autonomous Funding Arbitrage & Reverse Scalper
              </span>
              <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                isBotActive 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}>
                <div className={`h-2 w-2 rounded-full ${isBotActive ? 'bg-emerald-400' : 'bg-slate-500'}`}></div>
                {isBotActive ? `BOT AKTIF (ROUND #${botConfig?.round_number || 1})` : 'BOT BERHENTI (STOPPED)'}
              </span>
              {botConfig?.is_reverse && (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center gap-1.5">
                  <RotateCcw className="h-3 w-3" /> Bot Mode: REVERSE
                </span>
              )}
              {botConfig?.is_compound && (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" /> Compound: IYA (+Profit)
                </span>
              )}
              {(botConfig?.close_on_profit || botConfig?.rr_ratio === 'PROFIT') && (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5 shadow-sm">
                  <Target className="h-3 w-3" /> Auto-Close: Total Profit (≥ ${(botConfig?.min_profit_usd || 0).toFixed(2)})
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase italic drop-shadow-sm">
              Funding <span className="text-indigo-400">Farming Bot</span>
            </h1>
            <p className="text-slate-400 max-w-2xl font-medium text-xs md:text-sm leading-relaxed">
              Otomatis memindai koin dengan <span className="text-white font-bold">Funding Fee Terbesar</span>. Mendukung mode <span className="text-indigo-400 font-bold">Normal Arbitrase</span> maupun mode <span className="text-amber-400 font-bold">🔄 REVERSE (Kebalikan)</span> dengan target rasio <span className="text-emerald-400 font-bold">RR 1:1, 1:2, atau 1:3</span>. Posisi dibuka otomatis sebelum payout dan ditutup sesuai target profit/loss.
            </p>
          </div>
          
          {/* Action Button & Configuration Trigger */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-950/60 backdrop-blur-xl p-4 md:p-6 rounded-[36px] border border-white/10 shadow-2xl">
            {isBotActive ? (
              <button 
                onClick={() => {
                  if (isHolding) {
                    setShowStopConfirmModal(true);
                  } else {
                    handleStopBot(false);
                  }
                }}
                disabled={isStopping}
                className="px-8 py-5 rounded-3xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm tracking-wider uppercase flex items-center gap-3 shadow-[0_0_40px_rgba(225,29,72,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Square className="h-5 w-5 fill-current" />
                {isStopping ? 'Menghentikan...' : 'STOP BOT'}
              </button>
            ) : (
              <button 
                onClick={handleStartBot}
                disabled={isStarting}
                className="px-8 py-5 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wider uppercase flex items-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Play className="h-5 w-5 fill-current" />
                {isStarting ? 'Memulai...' : 'START BOT'}
              </button>
            )}

            <button 
              onClick={handleOpenConfigModal}
              className="p-4 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95"
              title="Pengaturan Parameter Bot"
            >
              <Sliders className="h-6 w-6" />
            </button>

            <button 
              onClick={() => {
                fetchBotState();
                fetchData();
              }}
              className="p-4 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all hover:rotate-180"
              title="Refresh Data Sekarang"
            >
              <RefreshCcw className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Quick Parameters Badges */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-black">Notional:</span>
            <span className="text-white font-mono">${botConfig?.notional_usd || notionalUsd} USD</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-black">Leverage:</span>
            <span className="text-indigo-400 font-mono">{botConfig?.leverage || leverage}x</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-black">Mode Arah:</span>
            <span className={`font-mono font-bold ${botConfig?.is_reverse ? 'text-amber-400' : 'text-emerald-400'}`}>
              {botConfig?.is_reverse ? '🔄 REVERSE (Kebalikan)' : '🟢 Normal'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-black">Target Exit:</span>
            <span className="text-indigo-400 font-mono font-bold">
              {botConfig?.rr_ratio === 'PROFIT'
                ? `⚡ Total Profit (≥ $${(botConfig?.min_profit_usd || 0).toFixed(2)})`
                : botConfig?.rr_ratio && botConfig.rr_ratio !== 'NONE'
                ? `RR ${botConfig.rr_ratio}`
                : `Fee Lock (+${botConfig?.close_seconds_after || 10}s)${botConfig?.close_on_profit ? ' + Profit Exit' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-black">Open Timing:</span>
            <span className="text-amber-400 font-mono">&lt; {botConfig?.open_seconds_before || openSecondsBefore}s</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-black">Compound:</span>
            <span className={`font-mono font-bold ${botConfig?.is_compound ? 'text-emerald-400' : 'text-slate-400'}`}>
              {botConfig?.is_compound ? '📈 IYA (+Profit)' : '⚪ TIDAK'}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          REAL BINANCE WALLET & PERFORMANCE STATS CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Real Binance Wallet Equity */}
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-[36px] border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-indigo-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Binance
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Saldo Real Futures (USDT)</div>
            <div className="text-2xl font-black text-white font-mono">
              ${accountBalance ? accountBalance.totalWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </div>
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>Margin Tersedia:</span>
              <span className="text-emerald-400 font-mono font-bold">
                ${accountBalance ? accountBalance.availableBalance.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Realized Net Profit */}
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-[36px] border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${
              (botStats?.totalNetProfit || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              <DollarSign className="h-6 w-6" />
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
              (botStats?.totalNetProfit || 0) >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {(botStats?.totalNetProfit || 0) >= 0 ? 'PROFIT' : 'LOSS'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Net Realized Profit</div>
            <div className={`text-2xl font-black font-mono ${
              (botStats?.totalNetProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {(botStats?.totalNetProfit || 0) >= 0 ? '+' : ''}${(botStats?.totalNetProfit || 0).toFixed(4)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>Fee Diterima:</span>
              <span className="text-emerald-400 font-mono font-bold">+${(botStats?.totalFundingFeeEarned || 0).toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Floating Unrealized PnL (Live) */}
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-[36px] border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Activity className="h-6 w-6" />
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-wider border border-amber-500/20">
              Floating Position
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Floating Unrealized PnL</div>
            <div className={`text-2xl font-black font-mono ${
              (accountBalance?.totalUnrealizedProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {(accountBalance?.totalUnrealizedProfit || 0) >= 0 ? '+' : ''}${(accountBalance?.totalUnrealizedProfit || 0).toFixed(4)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>Status Posisi:</span>
              <span className={`font-black uppercase text-[10px] ${isHolding ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>
                {isHolding ? `HOLDING (${botConfig?.current_symbol})` : 'NO POSITION (IDLE)'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Rounds & Win Rate */}
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-[36px] border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="h-11 w-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <History className="h-6 w-6" />
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-wider border border-purple-500/20">
              Win Rate: {(botStats?.winRate || 0).toFixed(1)}%
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Rounds Farming</div>
            <div className="text-2xl font-black text-white font-mono">
              {botStats?.totalRounds || 0} <span className="text-sm font-medium text-slate-400">Siklus</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>Menang / Kalah:</span>
              <span className="text-slate-300 font-mono font-bold">
                <span className="text-emerald-400">{botStats?.winCount || 0}W</span> - <span className="text-rose-400">{botStats?.lossCount || 0}L</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          ACTIVE TARGET OR LIVE ACTIVE POSITION CARD
      ───────────────────────────────────────────────────────────── */}
      {isHolding ? (
        // STATE 1: Bot is actively HOLDING a coin for funding fee settlement!
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 p-8 rounded-[40px] border-2 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.2)] relative overflow-hidden animate-pulse-subtle">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/30">
                  <Activity className="h-4 w-4 animate-spin" /> Sedang Menahan Posisi (Holding)
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/10 text-white font-mono text-xs font-black uppercase">
                  Round #{botConfig?.round_number}
                </span>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic font-mono">
                  {botConfig?.current_symbol}
                </h2>
                <div className={`px-4 py-1.5 rounded-2xl font-black text-xs uppercase tracking-wider ${
                  botConfig?.current_side === 'SHORT' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {botConfig?.current_side} (Posisi Aktif)
                </div>
              </div>
              <p className="text-slate-300 text-xs md:text-sm font-medium">
                Posisi dibuka di Binance Futures. Menunggu settlement funding rate <span className="text-amber-400 font-bold font-mono">{((botConfig?.target_funding_rate || 0) * 100).toFixed(4)}%</span>. Bot akan otomatis menutup posisi segera setelah settlement fee selesai.
              </p>
            </div>

            <div className="flex flex-wrap lg:flex-col items-end gap-4">
              <div className="bg-slate-950/80 p-5 rounded-3xl border border-white/10 flex flex-wrap items-center gap-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Harga Entry</div>
                  <div className="text-lg font-mono font-black text-white">${botConfig?.entry_price?.toFixed(4)}</div>
                </div>
                <div className="h-8 w-[1px] bg-slate-800"></div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Harga Mark Riil</div>
                  <div className="text-lg font-mono font-black text-indigo-400">
                    ${realPosition ? realPosition.markPrice.toFixed(4) : (botConfig?.entry_price?.toFixed(4) || '-')}
                  </div>
                </div>
                {botConfig?.sl_price && (
                  <>
                    <div className="h-8 w-[1px] bg-slate-800"></div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-rose-400 uppercase">Stop Loss</div>
                      <div className="text-lg font-mono font-black text-rose-400">${botConfig.sl_price.toFixed(4)}</div>
                    </div>
                  </>
                )}
                {botConfig?.tp_price && (
                  <>
                    <div className="h-8 w-[1px] bg-slate-800"></div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-emerald-400 uppercase">Take Profit</div>
                      <div className="text-lg font-mono font-black text-emerald-400">${botConfig.tp_price.toFixed(4)}</div>
                    </div>
                  </>
                )}
                <div className="h-8 w-[1px] bg-slate-800"></div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">PnL Harga</div>
                  <div className={`text-lg font-mono font-black ${
                    (realPosition?.unRealizedProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {(realPosition?.unRealizedProfit || 0) >= 0 ? '+' : ''}${(realPosition?.unRealizedProfit || 0).toFixed(4)}
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-slate-800"></div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Funding Fee</div>
                  <div className="text-lg font-mono font-black text-emerald-400">
                    +${(botConfig?.estimated_funding_fee || ((botConfig?.notional_usd || 100) * Math.abs(botConfig?.target_funding_rate || 0))).toFixed(4)}
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-slate-800"></div>
                {(() => {
                  const estFee = botConfig?.estimated_funding_fee || ((botConfig?.notional_usd || 100) * Math.abs(botConfig?.target_funding_rate || 0));
                  const pricePnl = realPosition ? realPosition.unRealizedProfit : 0;
                  const totalNet = pricePnl + estFee;
                  const isProfit = totalNet >= (botConfig?.min_profit_usd || 0);
                  return (
                    <div className={`space-y-1 px-3.5 py-1.5 rounded-2xl border transition-all ${
                      isProfit 
                        ? 'bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/30' 
                        : 'bg-rose-500/10 border-rose-500/30'
                    }`}>
                      <div className="text-[10px] font-black uppercase flex items-center justify-between gap-2">
                        <span className={isProfit ? 'text-emerald-300' : 'text-rose-300'}>Total (PnL+Fee)</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                          isProfit ? 'bg-emerald-500 text-slate-950 font-black animate-pulse' : 'bg-rose-500/30 text-rose-300'
                        }`}>
                          {isProfit ? 'PROFIT' : 'MINUS'}
                        </span>
                      </div>
                      <div className={`text-lg font-mono font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalNet >= 0 ? '+' : ''}${totalNet.toFixed(4)}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-3">
                {botConfig?.rr_ratio === 'PROFIT' || botConfig?.close_on_profit ? (
                  (() => {
                    const estFee = botConfig?.estimated_funding_fee || ((botConfig?.notional_usd || 100) * Math.abs(botConfig?.target_funding_rate || 0));
                    const pricePnl = realPosition ? realPosition.unRealizedProfit : 0;
                    const totalNet = pricePnl + estFee;
                    const minProf = botConfig?.min_profit_usd || 0;
                    const isProfit = totalNet >= minProf;
                    return (
                      <div className={`px-5 py-3 rounded-2xl border font-black text-xs uppercase flex items-center gap-2 transition-all ${
                        isProfit 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/20 animate-pulse' 
                          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      }`}>
                        <Target className="h-4 w-4 text-emerald-400 animate-pulse" />
                        {isProfit 
                          ? `🎯 SIAP AUTO-CLOSE (Total Net +$${totalNet.toFixed(4)} ≥ $${minProf.toFixed(2)})`
                          : `🎯 Target: Total Profit ≥ $${minProf.toFixed(2)} USD`}
                      </div>
                    );
                  })()
                ) : botConfig?.rr_ratio && botConfig.rr_ratio !== 'NONE' ? (
                  <div className="px-5 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-black text-xs uppercase flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-400 animate-pulse" />
                    Target: RR {botConfig.rr_ratio} (Hold to TP/SL)
                  </div>
                ) : (
                  <div className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs uppercase flex items-center gap-2">
                    <Timer className="h-4 w-4 animate-bounce" />
                    Auto-Exit: {formatCountdown(activeNextFundingTime + ((botConfig?.close_seconds_after || 10) * 1000))}
                  </div>
                )}
                <button
                  onClick={() => handleStopBot(true)}
                  disabled={isStopping}
                  className="px-5 py-3 rounded-2xl bg-rose-600/80 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all"
                  title="Tutup Posisi Sekarang Manual"
                >
                  <Square className="h-4 w-4 fill-current" /> Tutup Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : isWaitingPayout ? (
        // STATE 1B: Bot has ARMED a target for REVERSE, holding open until fee payout passes!
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 p-8 rounded-[40px] border-2 border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative overflow-hidden animate-pulse-subtle">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/30">
                  <ShieldCheck className="h-4 w-4" /> Mode Reverse: Menunggu Fee Payout Selesai
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-black uppercase border border-amber-500/30">
                  Target Terkunci (Bebas Fee Minus)
                </span>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic font-mono">
                  {botConfig?.current_symbol}
                </h2>
                <div className="px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30">
                  🔄 Order: {botConfig?.current_side || ((botConfig?.target_funding_rate || 0) > 0 ? 'BUY / LONG' : 'SELL / SHORT')} (REVERSE)
                </div>
              </div>

              <p className="text-slate-300 text-xs md:text-sm font-medium max-w-xl">
                Target koin telah dikunci! Bot <strong>menahan pembukaan posisi</strong> sampai waktu settlement ({((botConfig?.target_funding_rate || 0) * 100).toFixed(4)}%) terlewati, lalu otomatis membuka posisi REVERSE tepat di detik +1 pasca-settlement agar posisi Anda <strong>100% BEBAS DARI POTONGAN FEE MINUS</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-slate-950/80 p-5 rounded-3xl border border-white/10 flex items-center gap-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Funding Rate Target</div>
                  <div className="text-xl font-mono font-black text-amber-400">
                    {((botConfig?.target_funding_rate || 0) * 100).toFixed(4)}%
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-slate-800"></div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Ukuran Notional</div>
                  <div className="text-xl font-mono font-black text-white">
                    ${botConfig?.notional_usd} <span className="text-xs text-indigo-400">({botConfig?.leverage}x)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-3xl border-2 bg-amber-500/20 border-amber-500 text-amber-400 flex flex-col items-center justify-center min-w-[200px] animate-pulse">
                <div className="text-[9px] font-black uppercase text-amber-300 mb-1 flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" /> Countdown Settlement Fee
                </div>
                <div className="text-2xl font-black font-mono tracking-wider">
                  {formatCountdown(botConfig?.target_next_funding_time || 0)}
                </div>
                <div className="text-[9px] font-black uppercase tracking-tighter mt-1 text-white">
                  ⚡ Auto-Open Posisi Pasca-Fee
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : targetCandidate ? (
        // STATE 2: Bot is SCANNING / WAITING for settlement countdown (< 30s)
        <div className={`p-8 rounded-[40px] border-2 transition-all relative overflow-hidden ${
          isEntryWindow 
            ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.3)] ring-4 ring-rose-500/20'
            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isEntryWindow
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                }`}>
                  <Zap className="h-4 w-4" /> 
                  {isEntryWindow ? 'ENTRY WINDOW AKTIF (< 30s)!' : 'TARGET KOIN DENGAN FEE TERBESAR'}
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/5 text-slate-400 font-mono text-xs font-bold uppercase border border-slate-800">
                  Binance Futures USDT-M
                </span>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic font-mono">
                  {targetCandidate.symbol}
                </h2>
                <div className={`px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg ${
                  targetCandidate.recommendation === 'SHORT' 
                    ? 'bg-rose-500 text-white shadow-rose-500/30' 
                    : 'bg-emerald-500 text-white shadow-emerald-500/30'
                }`}>
                  Sinyal Funding: {targetCandidate.recommendation}
                </div>
                {/* 1-Click Reverse Quick Order Trigger */}
                <button
                  onClick={() => openOrderModal(targetCandidate, true, '1:2')}
                  className="px-4 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Quick Reverse ({targetCandidate.recommendation === 'LONG' ? 'SELL' : 'BUY'})
                </button>
              </div>

              <p className="text-slate-400 text-xs md:text-sm font-medium max-w-xl">
                {targetCandidate.recommendation === 'SHORT'
                  ? `Funding Rate bernilai POSITIF (${(targetCandidate.fundingRate * 100).toFixed(4)}%). Normal: SHORT (terima fee). Reverse: BUY (scalp breakout/momentum) dengan RR.`
                  : `Funding Rate bernilai NEGATIF (${(targetCandidate.fundingRate * 100).toFixed(4)}%). Normal: LONG (terima fee). Reverse: SELL (scalp dump/momentum) dengan RR.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-slate-950/80 p-5 rounded-3xl border border-white/10 flex items-center gap-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Funding Rate</div>
                  <div className={`text-xl font-mono font-black ${
                    targetCandidate.fundingRate > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {(targetCandidate.fundingRate * 100).toFixed(4)}%
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-slate-800"></div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Est. Fee Diterima</div>
                  <div className="text-xl font-mono font-black text-emerald-400">
                    +${targetCandidate.estimatedFeeUsd.toFixed(4)} USDT
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-slate-800"></div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Harga Mark</div>
                  <div className="text-xl font-mono font-black text-white">
                    ${targetCandidate.markPrice.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className={`p-5 rounded-3xl border-2 flex flex-col items-center justify-center min-w-[180px] ${
                isEntryWindow 
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-bounce' 
                  : 'bg-slate-950/80 border-slate-800 text-slate-300'
              }`}>
                <div className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" /> Countdown Settlement
                </div>
                <div className="text-xl font-black font-mono tracking-wider">
                  {formatCountdown(targetCandidate.nextFundingTime)}
                </div>
                <div className="text-[9px] font-black uppercase tracking-tighter mt-1 text-amber-400">
                  Auto-Open: &lt; {botConfig?.open_seconds_before || 30} Detik
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          TAB NAVIGATION CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <button
            onClick={() => setActiveTab('bot')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all ${
              activeTab === 'bot'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Activity className="h-4 w-4" /> Bot Monitor & Leaderboard
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <History className="h-4 w-4" /> Riwayat Siklus & PnL ({botState?.history?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all ${
              activeTab === 'scanner'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Coins className="h-4 w-4" /> Full Market Scanner & Reverse ({filtered.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'scanner' && (
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" /> Export Scanner
            </button>
          )}

          {activeTab === 'history' && (
            <button
              onClick={handleExportHistory}
              disabled={!botState?.history || botState.history.length === 0}
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" /> Export Riwayat
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: BOT MONITOR, LEADERBOARD, & MONOSPACE TERMINAL LOGS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'bot' && (
        <div className="space-y-8">
          
          {/* Top Candidates Leaderboard */}
          <div className="bg-slate-900/80 rounded-[40px] border border-slate-800 p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-2.5">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  Upcoming Settlement Candidates (Fee Tertinggi)
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Koin yang mendekati jadwal settlement terdekat. Klik salah satu rasio RR untuk eksekusi 1-Click Normal atau Reverse.
                </p>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60 self-start sm:self-auto">
                Auto-Ranked by Absolute Rate
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-black text-slate-500">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Sisi Funding</th>
                    <th className="py-3 px-4">Funding Rate</th>
                    <th className="py-3 px-4">Mark Price</th>
                    <th className="py-3 px-4">Sisa Waktu</th>
                    <th className="py-3 px-4 text-center">1-Click Reverse</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {candidates.slice(0, 8).map((cand: any, idx: number) => {
                    const isTop = idx === 0;
                    const isShort = cand.recommendation === 'SHORT';
                    const candTimeLeft = cand.nextFundingTime - now;
                    const candIsReady = candTimeLeft <= (botConfig?.open_seconds_before || 30) * 1000 && candTimeLeft > 0;
                    const revSide = isShort ? 'BUY' : 'SELL';

                    return (
                      <tr key={cand.symbol} className={`hover:bg-white/[0.02] transition-colors ${
                        isTop ? 'bg-indigo-500/5 font-semibold' : ''
                      }`}>
                        <td className="py-4 px-4 font-mono font-black text-slate-400">
                          {isTop ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500 text-white text-[9px] font-black uppercase">#1 Target</span>
                          ) : (
                            `#${idx + 1}`
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-white flex items-center gap-2">
                          {cand.symbol}
                          {cand.isExtreme && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[8px] font-black uppercase">
                              &gt;0.5%
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                            isShort ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {cand.recommendation}
                          </span>
                        </td>
                        <td className={`py-4 px-4 font-mono font-black ${
                          cand.fundingRate > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {(cand.fundingRate * 100).toFixed(4)}%
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-300">
                          ${cand.markPrice.toFixed(4)}
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <span className={`${candIsReady ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-400'}`}>
                            {formatCountdown(cand.nextFundingTime)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {(['1:1', '1:2', '1:3'] as const).map(rr => (
                              <button
                                key={rr}
                                onClick={() => openOrderModal(cand, true, rr)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-mono font-black uppercase border transition-all ${
                                  revSide === 'SELL' 
                                    ? 'bg-rose-500/10 hover:bg-rose-500 border-rose-500/30 text-rose-400 hover:text-white' 
                                    : 'bg-emerald-500/10 hover:bg-emerald-500 border-emerald-500/30 text-emerald-400 hover:text-white'
                                }`}
                                title={`Reverse ${revSide} dengan RR ${rr}`}
                              >
                                {revSide} {rr}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => openOrderModal(cand, false, '1:2')}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-wider transition-all"
                          >
                            Order
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Monospace Terminal Log Box */}
          <div className="bg-slate-950 rounded-[40px] border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase italic tracking-tight">
                    Funding Bot Console & Activity Logs
                  </h3>
                  <div className="text-[10px] font-medium text-slate-500">
                    Auto-refreshed via tick engine (3s watchdog)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoScrollLogs} 
                    onChange={e => setAutoScrollLogs(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0" 
                  />
                  Auto-Scroll
                </label>
                <button
                  onClick={handleClearLogs}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-rose-400 text-[10px] font-black uppercase flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Logs
                </button>
              </div>
            </div>

            {/* Monospace Log Viewer */}
            <div ref={logsContainerRef} className="bg-slate-900/60 rounded-3xl p-5 border border-slate-800/80 font-mono text-xs max-h-96 overflow-y-auto space-y-2">
              {(!botState?.logs || botState.logs.length === 0) ? (
                <div className="text-slate-600 text-center py-12 italic">
                  Belum ada log aktivitas bot. Klik "START BOT" untuk memulai pemantauan.
                </div>
              ) : (
                botState.logs.map((log: any) => {
                  let badgeColor = 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
                  if (log.category === 'START' || log.category === 'CYCLE_COMPLETE' || log.category === 'MANUAL_ORDER' || log.level === 'SUCCESS') {
                    badgeColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
                  } else if (log.category === 'STOP' || log.category === 'OPEN_TRIGGER' || log.level === 'WARN') {
                    badgeColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
                  } else if (log.level === 'ERROR') {
                    badgeColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
                  }

                  return (
                    <div key={log.id} className="flex items-start gap-3 leading-relaxed hover:bg-white/[0.02] p-1 rounded-lg">
                      <span className="text-[10px] text-slate-500 shrink-0 select-none">
                        [{new Date(log.created_at).toLocaleTimeString('id-ID')}]
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${badgeColor}`}>
                        {log.category}
                      </span>
                      <span className="text-slate-300 break-words flex-1">
                        {log.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: RIWAYAT ROUND & REALIZED PNL HISTORY
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/80 rounded-[40px] border border-slate-800 p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-2.5">
                <History className="h-5 w-5 text-indigo-400" />
                Riwayat Siklus Farming & Realized PnL
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Catatan eksekusi posisi riil Binance Futures, funding fee yang diterima, trading PnL, dan net profit/loss.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-500 text-[10px] uppercase font-black mr-2">Total Net Profit:</span>
                <span className={`font-mono font-black ${
                  (botStats?.totalNetProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {(botStats?.totalNetProfit || 0) >= 0 ? '+' : ''}${(botStats?.totalNetProfit || 0).toFixed(4)} USDT
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-black text-slate-500">
                  <th className="py-3 px-4">Round #</th>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Sisi</th>
                  <th className="py-3 px-4">Notional & Lev</th>
                  <th className="py-3 px-4">Funding Rate</th>
                  <th className="py-3 px-4">Entry ➔ Exit</th>
                  <th className="py-3 px-4">Funding Fee</th>
                  <th className="py-3 px-4">Price PnL</th>
                  <th className="py-3 px-4">Net Realized PnL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(!botState?.history || botState.history.length === 0) ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-500 italic">
                      Belum ada riwayat siklus farming yang selesai.
                    </td>
                  </tr>
                ) : (
                  botState.history.map((h: any) => {
                    const isProfit = h.net_pnl_usd >= 0;
                    return (
                      <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4 font-mono font-black text-slate-400">
                          #{h.round_number}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-white">
                          {h.symbol}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            h.side === 'SHORT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {h.side}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-300">
                          ${h.notional_usd} <span className="text-[10px] text-indigo-400 font-bold">({h.leverage}x)</span>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-300">
                          {(h.funding_rate * 100).toFixed(4)}%
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-400">
                          ${h.entry_price.toFixed(4)} ➔ <span className="text-white font-bold">${h.exit_price ? h.exit_price.toFixed(4) : '-'}</span>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                          +${h.funding_fee_usd.toFixed(4)}
                        </td>
                        <td className={`py-4 px-4 font-mono font-bold ${
                          h.trade_pnl_usd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {h.trade_pnl_usd >= 0 ? '+' : ''}${h.trade_pnl_usd.toFixed(4)}
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <div className={`font-black text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${h.net_pnl_usd.toFixed(4)}
                          </div>
                          <div className={`text-[10px] font-bold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isProfit ? '+' : ''}{h.net_pnl_percent.toFixed(2)}% ROE
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                              h.status === 'CLOSED'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                              {h.status}
                            </span>
                            {h.exit_reason && (
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border whitespace-nowrap ${
                                h.exit_reason === 'TOTAL_PROFIT_CLOSE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                                  : h.exit_reason === 'TP_HIT'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                  : h.exit_reason === 'SL_HIT'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : h.exit_reason === 'TIMEOUT_EXIT'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {h.exit_reason === 'TOTAL_PROFIT_CLOSE'
                                  ? '🎯 Total Profit'
                                  : h.exit_reason === 'TP_HIT'
                                  ? '🎯 Take Profit'
                                  : h.exit_reason === 'SL_HIT'
                                  ? '🛑 Stop Loss'
                                  : h.exit_reason === 'TIMEOUT_EXIT'
                                  ? '⏱️ Timeout'
                                  : '⏳ Fee Lock (+10s)'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-[10px] text-slate-500">
                          {h.closed_at ? new Date(h.closed_at).toLocaleTimeString('id-ID') : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: FULL MARKET SCANNER (WITH 1-CLICK REVERSE & RR CARDS)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div className="space-y-8">
          
          {/* Global Filter & Stats */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
            <div className="flex items-center gap-6 overflow-x-auto w-full md:w-auto pb-2">
              <div className="bg-slate-900 px-6 py-4 rounded-3xl border border-slate-800 shadow-sm flex items-center gap-4 min-w-[180px]">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase">Opportunities</div>
                  <div className="text-lg font-black text-white">{filtered.length} Pairs</div>
                </div>
              </div>
              <div className="bg-slate-900 px-6 py-4 rounded-3xl border border-slate-800 shadow-sm flex items-center gap-4 min-w-[200px]">
                <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase">Extreme (&gt;0.5%)</div>
                  <div className="text-lg font-black text-rose-500">{filtered.filter(i => i.isExtreme).length} Alerts</div>
                </div>
              </div>
            </div>

            <div className="relative w-full md:w-72 group">
              <input 
                type="text" 
                placeholder="Search Symbol..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 px-12 py-4 rounded-3xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-white placeholder-slate-500"
              />
              <Search className="h-5 w-5 text-slate-400 absolute left-4 top-4 group-focus-within:text-indigo-500 transition-colors" />
            </div>
          </div>

          {/* Scanner Grid */}
          {loading && filtered.length === 0 ? (
            <div className="py-40 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="h-20 w-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-500">
                  <Zap className="h-8 w-8" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white uppercase">Scanning Futures Market...</h3>
                <p className="text-slate-500 font-medium italic mt-2 uppercase text-[10px] tracking-widest">Fetching Premium Index & Volatility Data</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-40 bg-slate-900/50 rounded-[48px] border-4 border-dashed border-slate-800 flex flex-col items-center justify-center text-center gap-4 mx-4">
              <ShieldCheck className="h-16 w-16 text-slate-700" />
              <div>
                <h3 className="text-xl font-black text-white uppercase transition-all">Market Sedang Stabil</h3>
                <p className="text-slate-500 font-bold max-w-sm mt-3 uppercase text-[10px] tracking-widest leading-loose">Tidak ditemukan koin dengan funding rate di atas threshold 0.01% saat ini.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
              {filtered.map((item) => {
                const isPositive = item.fundingRate > 0;
                const timeLeft = item.nextFundingTime - now;
                const isReady = timeLeft <= 3 * 60 * 1000 && timeLeft > 0;
                const isImpulsive = item.marketCondition === 'IMPULSIVE';
                const isSideways = item.marketCondition === 'SIDEWAYS';

                // Check card-level Reverse status
                const isCardReverse = Boolean(cardReverseMap[item.symbol]);
                // If base recommendation is LONG:
                // - Normal -> LONG (BUY)
                // - Reverse -> SHORT (SELL)
                // If base recommendation is SHORT:
                // - Normal -> SHORT (SELL)
                // - Reverse -> LONG (BUY)
                const baseSide = item.recommendation as 'LONG' | 'SHORT';
                const effectiveSide = isCardReverse 
                  ? (baseSide === 'LONG' ? 'SHORT (SELL)' : 'LONG (BUY)')
                  : (baseSide === 'LONG' ? 'LONG (BUY)' : 'SHORT (SELL)');

                const isEffectiveBuy = effectiveSide.startsWith('LONG');

                return (
                  <div key={item.symbol} className={`relative bg-slate-900 p-8 rounded-[40px] border-2 transition-all transition-duration-500 group overflow-hidden ${
                    isCardReverse
                      ? 'border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20'
                      : item.isExtreme 
                        ? 'border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20' 
                        : 'border-slate-800 hover:border-slate-700'
                  }`}>
                    
                    {/* Header: Symbol & Action Badge */}
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono">{item.symbol}</h2>
                          {item.isExtreme && (
                            <div className="px-2 py-1 bg-indigo-500 text-white text-[8px] font-black rounded-lg uppercase animate-pulse">Extreme</div>
                          )}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ExternalLink className="h-3 w-3" /> Binance Futures
                        </div>
                      </div>

                      {/* Direction Badge reflecting Normal or Reverse */}
                      <div className={`px-4 py-2 rounded-2xl flex items-center gap-1.5 font-black text-xs transition-all shadow-lg ${
                        isEffectiveBuy 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                          : 'bg-rose-500 text-white shadow-rose-500/30'
                      }`}>
                        {isEffectiveBuy ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {isCardReverse ? `REVERSE: ${effectiveSide}` : item.recommendation}
                      </div>
                    </div>

                    {/* Stats Box */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-3xl bg-slate-800/50 border border-slate-700 group-hover:bg-indigo-500/5 transition-colors">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Funding Rate</div>
                        <div className={`text-xl font-mono font-black ${(item.fundingRate * 100).toFixed(4).startsWith('-') ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {(item.fundingRate * 100).toFixed(4)}%
                        </div>
                      </div>
                      <div className="p-4 rounded-3xl bg-slate-800/50 border border-slate-700">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Mark Price</div>
                        <div className="text-xl font-mono font-black text-white">
                          ${item.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </div>
                      </div>
                    </div>

                    {/* Countdown */}
                    <div className="mb-6">
                      <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isReady ? 'bg-rose-950/20 border-rose-500 ring-4 ring-rose-500/10' : 'bg-slate-800/30 border-slate-700'}`}>
                        <div className="flex items-center gap-3">
                          <Timer className={`h-5 w-5 ${isReady ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
                          <div className="space-y-0.5">
                            <div className="text-[8px] font-black text-slate-400 uppercase">Time to Payout</div>
                            <div className={`text-xs font-mono font-black ${isReady ? 'text-rose-500' : 'text-slate-400'}`}>{formatCountdown(item.nextFundingTime)}</div>
                          </div>
                        </div>
                        {isReady && <div className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Ready Entry!</div>}
                      </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────
                        INTERACTIVE REVERSE & RR EXECUTION BAR (NEW FEATURE)
                    ───────────────────────────────────────────────────────── */}
                    <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800 space-y-4 mb-4">
                      {/* Normal vs Reverse Switch */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400">Pilihan Arah:</span>
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
                          <button
                            onClick={() => toggleCardReverse(item.symbol, false)}
                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                              !isCardReverse 
                                ? 'bg-slate-800 text-white shadow' 
                                : 'text-slate-500 hover:text-white'
                            }`}
                          >
                            Normal ({item.recommendation})
                          </button>
                          <button
                            onClick={() => toggleCardReverse(item.symbol, true)}
                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                              isCardReverse 
                                ? (isEffectiveBuy ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30')
                                : 'text-amber-400 hover:text-white'
                            }`}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reverse ({baseSide === 'LONG' ? 'SELL' : 'BUY'})
                          </button>
                        </div>
                      </div>

                      {/* RR Buttons (1:1, 1:2, 1:3) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-500">
                          <span>Target RR (Auto SL & TP):</span>
                          <span className="text-indigo-400 font-mono">SL: 1.5%</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {(['1:1', '1:2', '1:3'] as const).map(rr => (
                            <button
                              key={rr}
                              onClick={() => openOrderModal(item, isCardReverse, rr)}
                              className={`py-2 px-1 rounded-2xl font-mono font-black text-xs uppercase border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                isEffectiveBuy
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500 border-emerald-500/30 text-emerald-400 hover:text-white shadow-emerald-500/10'
                                  : 'bg-rose-500/10 hover:bg-rose-500 border-rose-500/30 text-rose-400 hover:text-white shadow-rose-500/10'
                              } hover:scale-105 active:scale-95`}
                            >
                              <span className="tracking-wider">RR {rr}</span>
                              <span className="text-[8px] font-normal opacity-75">
                                {rr === '1:1' ? 'TP +1.5%' : rr === '1:2' ? 'TP +3.0%' : 'TP +4.5%'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 1-Click Modal Open Button */}
                      <button
                        onClick={() => openOrderModal(item, isCardReverse, '1:2')}
                        className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                          isEffectiveBuy
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                        }`}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        {isCardReverse ? `Buka Posisi REVERSE ${effectiveSide}` : `Buka Posisi ${item.recommendation}`}
                      </button>
                    </div>

                    {/* Bottom Status & Trade Now Link */}
                    <div className="flex items-center justify-between p-3.5 px-5 rounded-[22px] bg-slate-950 text-white transition-all hover:pr-4 group/btn">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-2 w-2 rounded-full animate-ping ${isImpulsive ? 'bg-rose-500' : isSideways ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                        <div className="text-[10px] font-black uppercase tracking-widest">{item.marketCondition}</div>
                      </div>
                      <a 
                        href={`https://www.binance.com/en/futures/${item.symbol}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 group-hover/btn:text-white transition-colors"
                      >
                        BINANCE CHART <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Strategy Guide */}
          <div className="bg-slate-950 p-12 rounded-[56px] border border-slate-800 mx-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 text-slate-800 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <Zap className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-white mb-10 flex items-center gap-4 uppercase italic tracking-tighter">
                <span className="h-10 w-10 bg-indigo-500 text-white rounded-2xl flex items-center justify-center italic">!</span>
                Pro-Trader Strategy Guide: Normal vs Reverse Arbitrage
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 font-bold text-xs uppercase tracking-widest leading-loose">
                <div className="space-y-6">
                  <div className="text-indigo-500 font-black text-4xl italic">01</div>
                  <div className="text-slate-500 border-l-4 border-indigo-500 pl-6">
                    <span className="text-white font-black">Mode Normal (Funding Arbitrage):</span><br />
                    Membuka posisi sesuai kaidah arbitrase untuk menerima pembayaran fee (Short jika rate positif, Long jika rate negatif). Target keluar: <span className="text-indigo-400 font-bold">10 detik setelah fee masuk</span>.
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="text-indigo-500 font-black text-4xl italic">02</div>
                  <div className="text-slate-500 border-l-4 border-amber-500 pl-6">
                    <span className="text-amber-400 font-black">Mode 🔄 Reverse (Counter-Trend / Scalp):</span><br />
                    Membuka posisi <span className="text-white font-black">KEBALIKAN</span> sinyal fee (misal sinyal Long, Anda buka <span className="text-rose-400 font-black">SELL</span>). Cocok saat koin sedang dump parah atau terjadi momentum breakout yang menentang arus arbitrase.
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="text-indigo-500 font-black text-4xl italic">03</div>
                  <div className="text-slate-500 border-l-4 border-emerald-500 pl-6">
                    <span className="text-emerald-400 font-black">Target Risk:Reward (RR 1:1, 1:2, 1:3):</span><br />
                    Secara otomatis memasang <span className="text-white font-black">Stop Loss &amp; Take Profit</span> di Binance via Algo Order. Risiko modal terukur presisi tanpa perlu memantau layar terus-menerus.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: 1-CLICK QUICK ORDER (NORMAL & REVERSE WITH RR)
      ───────────────────────────────────────────────────────────── */}
      {quickOrderModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[36px] max-w-xl w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start px-6 py-5 sm:px-8 border-b border-slate-800 shrink-0 bg-slate-900">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-2xl font-black text-white uppercase italic font-mono">
                    {quickOrderModal.symbol}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-mono font-black">
                    Live: ${quickOrderModal.markPrice.toFixed(4)}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  Funding Rate: <span className="font-mono text-white font-bold">{(quickOrderModal.fundingRate * 100).toFixed(4)}%</span> (Sinyal Dasar: {quickOrderModal.baseRecommendation})
                </div>
              </div>

              <button 
                onClick={() => setQuickOrderModal(prev => ({ ...prev, isOpen: false }))}
                className="p-2 text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

              {/* Mode Arah Toggle (Normal vs Reverse) */}
              <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-400 block">
                Pilih Mode Arah Posisi
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setQuickOrderModal(prev => ({ ...prev, isReverse: false }))}
                  className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                    !quickOrderModal.isReverse
                      ? (quickOrderModal.baseRecommendation === 'LONG' ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30' : 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30')
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🟢 Normal ({quickOrderModal.baseRecommendation === 'LONG' ? 'BUY / LONG' : 'SELL / SHORT'})
                </button>

                <button
                  type="button"
                  onClick={() => setQuickOrderModal(prev => ({ ...prev, isReverse: true }))}
                  className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                    quickOrderModal.isReverse
                      ? (quickOrderModal.baseRecommendation === 'LONG' ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30' : 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30')
                      : 'bg-slate-950 border-slate-800 text-amber-400 hover:text-white'
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  🔄 REVERSE ({quickOrderModal.baseRecommendation === 'LONG' ? 'SELL / SHORT' : 'BUY / LONG'})
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {quickOrderModal.isReverse 
                  ? '⚡ Mode Reverse Aktif: Membuka posisi KEBALIKAN dari sinyal funding fee pasar.' 
                  : 'Mode Normal: Membuka posisi searah kaidah arbitrase funding fee.'}
              </p>
            </div>

            {/* Reverse Timing Option: Tunggu Fee Selesai vs Langsung Buka */}
            {quickOrderModal.isReverse && (
              <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Waktu Open Posisi Reverse
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 font-bold">
                    {quickOrderModal.nextFundingTime && quickOrderModal.nextFundingTime > now 
                      ? `Fee Settlement: ${formatCountdown(quickOrderModal.nextFundingTime)}`
                      : 'Fee Telah Selesai'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickOrderModal(prev => ({ ...prev, openAfterPayout: true }))}
                    className={`py-2.5 px-3 rounded-2xl text-[11px] font-black uppercase transition-all flex flex-col items-center justify-center border ${
                      quickOrderModal.openAfterPayout
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🛡️ Tunggu Fee Selesai</span>
                    <span className="text-[9px] font-bold opacity-80">(Rekomendasi Bebas Fee Minus)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickOrderModal(prev => ({ ...prev, openAfterPayout: false }))}
                    className={`py-2.5 px-3 rounded-2xl text-[11px] font-black uppercase transition-all flex flex-col items-center justify-center border ${
                      !quickOrderModal.openAfterPayout
                        ? 'bg-slate-800 text-white border-slate-700 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>⚡ Eksekusi Sekarang</span>
                    <span className="text-[9px] font-bold opacity-80">(Buka Sebelum Payout)</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-300">
                  {quickOrderModal.openAfterPayout ? (
                    <span className="text-emerald-300">
                      ✅ <strong>Proteksi Aktif:</strong> Order akan otomatis dieksekusi <strong>tepat setelah fee settlement selesai</strong> (+1s) agar posisi Anda tidak terpotong fee minus oleh Binance!
                    </span>
                  ) : (
                    <span className="text-rose-300">
                      ⚠️ <strong>Peringatan:</strong> Posisi langsung dibuka saat ini. Posisi Anda akan terpotong fee minus saat settlement funding fee tiba di bursa!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Pilihan Risk:Reward (RR 1:1, 1:2, 1:3) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase text-slate-400">
                  Pilihan Target Risk:Reward (RR)
                </label>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  Base SL: {quickOrderModal.baseSlPercent}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(['1:1', '1:2', '1:3'] as const).map(rr => (
                  <button
                    key={rr}
                    type="button"
                    onClick={() => setQuickOrderModal(prev => ({ ...prev, rrRatio: rr }))}
                    className={`py-3 rounded-2xl font-mono text-xs font-black uppercase transition-all flex flex-col items-center justify-center border ${
                      quickOrderModal.rrRatio === rr
                        ? (modalCalculations.effectiveSide === 'BUY' ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30' : 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30')
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-black">RR {rr}</span>
                    <span className="text-[9px] font-normal opacity-80">
                      {rr === '1:1' ? 'TP: +1.5%' : rr === '1:2' ? 'TP: +3.0%' : 'TP: +4.5%'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notional USD & Leverage Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-1.5">
                  Ukuran Notional (USD)
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={quickOrderModal.notionalUsd} 
                    onChange={e => setQuickOrderModal(prev => ({ ...prev, notionalUsd: Math.max(5, parseFloat(e.target.value) || 0) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-white font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-slate-400 text-xs font-mono font-bold">USD</span>
                </div>
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[10, 20, 50, 100, 250].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuickOrderModal(prev => ({ ...prev, notionalUsd: amt }))}
                      className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-black transition-all ${
                        quickOrderModal.notionalUsd === amt 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-1.5">
                  Leverage
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 5, 10, 20].map(lev => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setQuickOrderModal(prev => ({ ...prev, leverage: lev }))}
                      className={`py-2 rounded-xl font-mono text-xs font-black transition-all ${
                        quickOrderModal.leverage === lev 
                          ? 'bg-indigo-600 text-white shadow' 
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 mt-2">
                  Margin Terpakai: <span className="font-mono text-white font-bold">${modalCalculations.marginUsd.toFixed(2)} USDT</span>
                </div>
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80 font-bold">
                <span className="text-slate-400 uppercase text-[10px]">Aksi Order:</span>
                <span className={`font-mono uppercase font-black ${
                  modalCalculations.effectiveSide === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {quickOrderModal.isReverse ? '🔄 REVERSE: ' : ''}{modalCalculations.effectiveSideText}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="space-y-1">
                  <div className="text-[9px] uppercase text-slate-500 font-black">Stop Loss ({modalCalculations.slPercent}%)</div>
                  <div className="text-rose-400 font-bold">${modalCalculations.slPrice.toFixed(4)}</div>
                  <div className="text-[10px] text-slate-500">Maks Rugi: -${modalCalculations.maxLossUsd.toFixed(2)}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] uppercase text-slate-500 font-black">Take Profit ({modalCalculations.tpPercent}%)</div>
                  <div className="text-emerald-400 font-bold">${modalCalculations.tpPrice.toFixed(4)}</div>
                  <div className="text-[10px] text-slate-500">Target Laba: +${modalCalculations.targetProfitUsd.toFixed(2)}</div>
                </div>
              </div>
            </div>

            </div>

            {/* Action Buttons (Pinned Footer) */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 sm:px-8 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md shrink-0">
              <button
                type="button"
                onClick={() => setQuickOrderModal(prev => ({ ...prev, isOpen: false }))}
                className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs uppercase transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteOrder}
                disabled={isSubmittingOrder}
                className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 ${
                  modalCalculations.effectiveSide === 'BUY'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                }`}
              >
                <Zap className="h-4 w-4" />
                {isSubmittingOrder 
                  ? 'Mengeksekusi di Binance...' 
                  : quickOrderModal.isReverse && quickOrderModal.openAfterPayout && quickOrderModal.nextFundingTime && quickOrderModal.nextFundingTime > now
                  ? `Kunci & Open Pasca-Fee (${formatCountdown(quickOrderModal.nextFundingTime)})`
                  : `Buka Posisi ${modalCalculations.effectiveSideText} (${quickOrderModal.rrRatio})`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: PENGATURAN PARAMETER BOT (AUTONOMOUS)
      ───────────────────────────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-[36px] max-w-xl w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header (Pinned) */}
            <div className="flex justify-between items-center px-6 py-5 sm:px-8 border-b border-slate-800/80 shrink-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sliders className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                  Pengaturan Bot Funding
                </h3>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white text-base font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Bot Mode: Normal vs Reverse */}
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-2">
                  Mode Arah Bot
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBotIsReverse(false)}
                    className={`py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-all ${
                      !botIsReverse
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🟢 Normal Arbitrase
                  </button>
                  <button
                    type="button"
                    onClick={() => setBotIsReverse(true)}
                    className={`py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                      botIsReverse
                        ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/30'
                        : 'bg-slate-950 border-slate-800 text-amber-400 hover:text-white'
                    }`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    🔄 REVERSE (Kebalikan)
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {botIsReverse 
                    ? '🔄 Mode Reverse: Bot membalik arah posisi dan otomatis MENAHAN open sampai fee payout bursa selesai (+1s pasca-settlement), sehingga posisi Anda 100% BEBAS DARI POTONGAN FEE MINUS!'
                    : '🟢 Mode Normal Arbitrase: Bot membuka posisi sebelum settlement untuk memanen funding fee dari bursa.'}
                </p>
              </div>

              {/* Bot Exit Strategy: Fee Lock, Total Profit, or Target RR */}
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-2">
                  Target Exit &amp; Strategi Close
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['NONE', 'PROFIT', '1:1', '1:2', '1:3'] as const).map(rr => (
                    <button
                      key={rr}
                      type="button"
                      onClick={() => {
                        setBotRrRatio(rr);
                        if (rr === 'PROFIT') {
                          setBotCloseOnProfit(true);
                        }
                      }}
                      className={`py-2.5 rounded-2xl font-mono text-xs font-black uppercase border transition-all ${
                        botRrRatio === rr
                          ? rr === 'PROFIT'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                            : 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {rr === 'NONE' ? '⏳ Fee Lock' : rr === 'PROFIT' ? '⚡ Total Profit' : `RR ${rr}`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {botRrRatio === 'PROFIT'
                    ? '⚡ Mode Total Profit: Bot menahan posisi sampai hasil dari akumulasi PnL Posisi + Funding Fee menghasilkan Total Profit (Net > $0.00 / Target). Posisi tidak dipaksa tutup di 10 detik.'
                    : botRrRatio === 'NONE' 
                    ? '⏳ Mode Fee Lock: Posisi ditutup otomatis via Market Order setelah settlement fee selesai (+10s).'
                    : `🎯 Mode Target ${botRrRatio}: Bot TIDAK menutup di 10 detik. Posisi di-HOLD di Binance sampai Take Profit atau Stop Loss tersentuh.`}
                </p>
              </div>

              {/* Fitur Pilihan Auto-Close Total Profit (PnL + Fee) */}
              <div className={`p-5 rounded-3xl border transition-all ${
                botCloseOnProfit || botRrRatio === 'PROFIT'
                  ? 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/20'
                  : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-white block">
                        Close Jika Total Profit (PnL + Fee &gt; 0)
                      </label>
                      <span className="text-[10px] text-slate-400 block">
                        Tutup otomatis begitu akumulasi floating PnL dan perolehan Fee menghasilkan profit bersih
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                    botCloseOnProfit || botRrRatio === 'PROFIT'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {botCloseOnProfit || botRrRatio === 'PROFIT' ? '🟢 AKTIF' : '⚪ NON-AKTIF'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBotCloseOnProfit(true);
                      if (botRrRatio === 'NONE') {
                        setBotRrRatio('PROFIT');
                      }
                    }}
                    className={`py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider border transition-all ${
                      botCloseOnProfit || botRrRatio === 'PROFIT'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🟢 IYA (Close Saat Profit)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBotCloseOnProfit(false);
                      if (botRrRatio === 'PROFIT') {
                        setBotRrRatio('NONE');
                      }
                    }}
                    className={`py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider border transition-all ${
                      !botCloseOnProfit && botRrRatio !== 'PROFIT'
                        ? 'bg-slate-800 text-white border-slate-700 shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚪ TIDAK (Waktu Standard)
                  </button>
                </div>

                {(botCloseOnProfit || botRrRatio === 'PROFIT') && (
                  <div className="space-y-4 pt-3 border-t border-slate-800/80 animate-in fade-in duration-200">
                    {/* Minimal Net Profit USD */}
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-300 block mb-1.5 flex items-center justify-between">
                        <span>Minimal Target Net Profit (USD)</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">
                          ≥ ${botMinProfitUsd.toFixed(2)} USD
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.05"
                          value={botMinProfitUsd}
                          onChange={e => setBotMinProfitUsd(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="0.00"
                        />
                        <span className="text-slate-400 text-xs font-bold font-mono">USD</span>
                      </div>
                      {/* Preset Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[
                          { label: '$0.00 (Break Even / Untung)', val: 0 },
                          { label: '+$0.20', val: 0.2 },
                          { label: '+$0.50', val: 0.5 },
                          { label: '+$1.00', val: 1.0 },
                          { label: '+$2.00', val: 2.0 },
                        ].map(chip => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setBotMinProfitUsd(chip.val)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                              botMinProfitUsd === chip.val
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        $0.00 artinya posisi langsung ditutup begitu hasil akumulasi (PnL Posisi + Funding Fee) bernilai profit (&gt; $0.00).
                      </p>
                    </div>

                    {/* Emergency Stop Loss */}
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-300 block mb-1.5 flex items-center justify-between">
                        <span>Proteksi Stop Loss Darurat (-%)</span>
                        <span className="text-[10px] text-rose-400 font-mono font-bold">
                          -{botBaseSlPercent}% ROE
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={botBaseSlPercent}
                          onChange={e => setBotBaseSlPercent(Math.max(0.5, parseFloat(e.target.value) || 1.5))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono font-bold text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                        <span className="text-slate-400 text-xs font-bold">%</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[1.0, 1.5, 2.0, 3.0, 5.0].map(sl => (
                          <button
                            key={sl}
                            type="button"
                            onClick={() => setBotBaseSlPercent(sl)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                              botBaseSlPercent === sl
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            -{sl}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Max Hold Timeout */}
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-300 block mb-1.5 flex items-center justify-between">
                        <span>Maksimal Waktu Tahan (Timeout Setelah Payout)</span>
                        <span className="text-[10px] text-amber-400 font-mono font-bold">
                          {botMaxHoldSeconds === 0 ? 'Tanpa Batas' : `${botMaxHoldSeconds} Detik (${Math.floor(botMaxHoldSeconds / 60)} Menit)`}
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Tanpa Batas (Tahan sampai Profit)', val: 0 },
                          { label: '2 Menit (120s)', val: 120 },
                          { label: '5 Menit (300s)', val: 300 },
                          { label: '10 Menit (600s)', val: 600 }
                        ].map(to => (
                          <button
                            key={to.label}
                            type="button"
                            onClick={() => setBotMaxHoldSeconds(to.val)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                              botMaxHoldSeconds === to.val
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {to.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Jika koin belum kunjung menyentuh target profit setelah payout dalam durasi ini, bot menutup posisi untuk keamanan.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notional USD */}
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-2">
                  Ukuran Notional Posisi (USD)
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={notionalUsd} 
                    onChange={e => setNotionalUsd(Math.max(5, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-mono font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Contoh: 100"
                  />
                  <span className="text-slate-400 text-sm font-bold font-mono">USD</span>
                </div>
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {[20, 50, 100, 250, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNotionalUsd(amt)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition-all ${
                        notionalUsd === amt 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Compound Profit (IYA / TIDAK) */}
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-2 flex items-center justify-between">
                  <span>Compound Profit ke Notional Berikutnya?</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    botIsCompound 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {botIsCompound ? '📈 AKTIF (+PROFIT)' : 'TIDAK (NOTIONAL TETAP)'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBotIsCompound(true)}
                    className={`py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                      botIsCompound
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🟢 IYA (Compound Profit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBotIsCompound(false)}
                    className={`py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-all ${
                      !botIsCompound
                        ? 'bg-slate-800 text-white border-slate-700 shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚪ TIDAK (Notional Tetap)
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {botIsCompound
                    ? 'Jika dipilih IYA: Setiap ronde yang menghasilkan profit (+net PnL) akan otomatis ditambahkan ke modal Notional USD koin berikutnya.'
                    : 'Jika dipilih TIDAK: Nilai Notional USD tetap konstan sesuai input nominal di atas pada setiap putaran.'}
                </p>
              </div>

              {/* Leverage */}
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-2">
                  Leverage Pengungkit
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 10, 20].map(lev => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setLeverage(lev)}
                      className={`py-3 rounded-2xl font-mono text-sm font-black transition-all ${
                        leverage === lev 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Estimasi Margin terpakai: <span className="text-white font-mono font-bold">${(notionalUsd / leverage).toFixed(2)} USDT</span>.
                </p>
              </div>

              {/* Entry Timing (Seconds Before) & Exit Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 block mb-2">
                    Auto-Open Sebelum Payout
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={openSecondsBefore} 
                      onChange={e => setOpenSecondsBefore(Math.max(5, parseInt(e.target.value) || 30))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono font-bold text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <span className="text-slate-400 text-xs font-bold">Detik</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {botIsReverse 
                      ? 'Mode Reverse: Durasi penguncian koin sebelum settlement. Bot menahan order dan otomatis open setelah fee dibayar (+1s).' 
                      : 'Rekomendasi: 20-30s sebelum settlement snapshot.'}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 block mb-2 flex items-center justify-between">
                    <span>Auto-Close Setelah Payout</span>
                    {botRrRatio !== 'NONE' && (
                      <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        Di-Hold (Mode RR)
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={closeSecondsAfter} 
                      disabled={botRrRatio !== 'NONE'}
                      onChange={e => setCloseSecondsAfter(Math.max(3, parseInt(e.target.value) || 10))}
                      className={`w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 font-mono font-bold text-base focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                        botRrRatio !== 'NONE' ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-white'
                      }`}
                    />
                    <span className="text-slate-400 text-xs font-bold">Detik</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {botRrRatio !== 'NONE' 
                      ? 'Dinonaktifkan saat mode RR aktif (posisi di-hold sampai TP / SL tersentuh di Binance).'
                      : 'Rekomendasi: 5-15s (hanya aktif saat mode Fee Lock).'}
                  </span>
                </div>
              </div>

              {/* Min Funding Rate */}
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-2">
                  Minimum Funding Rate (%)
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    step="0.01"
                    value={minFundingRatePercent} 
                    onChange={e => setMinFundingRatePercent(parseFloat(e.target.value) || 0.01)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono font-bold text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-slate-400 text-xs font-bold">%</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Hanya open posisi jika koin tertinggi memiliki rate ≥ threshold ini.</span>
              </div>
            </div>

            {/* Modal Footer (Pinned) */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 sm:px-8 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md shrink-0">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95"
              >
                {isSavingConfig ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: KONFIRMASI STOP SAAT ADA POSISI AKTIF
      ───────────────────────────────────────────────────────────── */}
      {showStopConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">
              Posisi {botConfig?.current_symbol} Sedang Aktif!
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
              Bot saat ini sedang menahan posisi <span className="text-white font-bold">{botConfig?.current_symbol} {botConfig?.current_side}</span> di Binance Futures. Apakah Anda ingin menutup posisi ini di Binance sekarang atau membiarkannya tetap terbuka?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleStopBot(true)}
                disabled={isStopping}
                className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
              >
                <Square className="h-4 w-4 fill-current" />
                {isStopping ? 'Memproses...' : 'Tutup Posisi di Binance & STOP'}
              </button>
              <button
                onClick={() => handleStopBot(false)}
                disabled={isStopping}
                className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Biarkan Posisi Terbuka & STOP Bot
              </button>
              <button
                onClick={() => setShowStopConfirmModal(false)}
                className="w-full py-3 text-slate-500 hover:text-white font-bold text-xs uppercase transition-colors"
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
