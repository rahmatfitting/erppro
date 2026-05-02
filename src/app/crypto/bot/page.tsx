"use client";

import { useState, useEffect, useCallback } from "react";
import { Power, BarChart2, ShieldAlert, Target, Save, Clock, Percent, Activity } from "lucide-react";

interface FVGConfig {
  id: number;
  is_active: boolean;
  mode: "BUY" | "SELL";
  max_daily_loss: number;
  leverage: number;
  initial_margin: number;
  is_compounding: boolean;
  coins: string[];
}

interface FVGPosition {
  id: number;
  symbol: string;
  side: "BUY" | "SELL";
  status: "OPEN" | "CLOSED";
  entry_price: string;
  tp_price: string;
  sl_price: string;
  margin_used: string;
  close_price: string;
  pnl: string;
  tx_id?: string;
  created_at: string;
  closed_at: string;
}

const AVAILABLE_COINS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "TRXUSDT"];

export default function FvgBotPage() {
  const [activeBotId, setActiveBotId] = useState(1);
  const [config, setConfig] = useState<FVGConfig | null>(null);
  const [openPositions, setOpenPositions] = useState<FVGPosition[]>([]);
  const [history, setHistory] = useState<FVGPosition[]>([]);
  const [todayPnl, setTodayPnl] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (botId: number) => {
    try {
      const [resCfg, resPos] = await Promise.all([
        fetch(`/api/crypto/bot/config?bot_id=${botId}`),
        fetch(`/api/crypto/bot/positions?bot_id=${botId}`)
      ]);
      const dataCfg = await resCfg.json();
      const dataPos = await resPos.json();

      if (dataCfg.success) setConfig(dataCfg.data);
      if (dataPos.success) {
        setOpenPositions(dataPos.data.open);
        setHistory(dataPos.data.history);
        setTodayPnl(dataPos.data.todayPnl);
      }
    } catch (err) {
      console.error("Failed to fetch bot data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString('id-ID')}] ${msg}`, ...prev].slice(0, 10));
  };

  const handleScan = useCallback(async () => {
    if (!config?.is_active) return;
    try {
      const res = await fetch("/api/crypto/bot/scan");
      const data = await res.json();
      if (data.success) {
        if (data.results.length > 0) {
          data.results.forEach((r: any) => addLog(`[Bot ${r.bot || '1'}] ${r.action} ${r.symbol}`));
          fetchData(activeBotId); // refresh data if something happened
        } else {
          addLog("Scan complete (No setups).");
        }
        if (data.message.includes("MAX DAILY LOSS")) {
          addLog("🚨 MAX DAILY LOSS REACHED! BOT IS OFF.");
          fetchData(activeBotId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [config?.is_active, activeBotId, fetchData]);

  useEffect(() => {
    setLoading(true);
    fetchData(activeBotId);
  }, [activeBotId, fetchData]);

  // Engine interval (runs every 10 seconds locally to simulate fast scanning)
  useEffect(() => {
    const tick = setInterval(() => {
      handleScan();
    }, 10000);
    return () => clearInterval(tick);
  }, [handleScan]);

  const updateConfig = async (updates: Partial<FVGConfig>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/crypto/bot/config?bot_id=${activeBotId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        addLog(`Config updated.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <div className="p-12 text-center text-rose-400 font-bold uppercase tracking-widest animate-pulse">Loading Bot Core...</div>;
  }

  const handleCoinToggle = (coin: string) => {
    const newCoins = config.coins.includes(coin)
      ? config.coins.filter(c => c !== coin)
      : [...config.coins, coin];
    updateConfig({ coins: newCoins });
  };

  const pnlPct = Math.min(100, Math.max(0, (-todayPnl / config.max_daily_loss) * 100));

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#09090E", color: "#e2e8f0" }}>
      {/* ── TAB SWITCHER ───────────────────────────────────── */}
      <div className="flex items-center gap-2 px-8 pt-8">
        <button 
          onClick={() => setActiveBotId(1)}
          className={`px-6 py-2.5 rounded-t-xl font-black text-sm uppercase tracking-widest transition-all ${activeBotId === 1 ? 'bg-[#0f0f1a] text-rose-400 border-t border-l border-r border-[#f43f5e33]' : 'bg-transparent text-slate-500 hover:text-slate-300'}`}
        >
          📝 Paper Trading
        </button>
        <button 
          onClick={() => setActiveBotId(2)}
          className={`px-6 py-2.5 rounded-t-xl font-black text-sm uppercase tracking-widest transition-all ${activeBotId === 2 ? 'bg-[#0f0f1a] text-amber-400 border-t border-l border-r border-amber-500/30' : 'bg-transparent text-slate-500 hover:text-slate-300'}`}
        >
          ⚡ Real Engine
        </button>
      </div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden p-8 mb-6 mx-8 rounded-b-3xl rounded-tr-3xl border`} style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #141428 50%, #0a0a14 100%)", borderColor: activeBotId === 1 ? "#f43f5e22" : "#f59e0b22" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl opacity-10" style={{ background: `radial-gradient(circle, ${activeBotId === 1 ? '#f43f5e' : '#f59e0b'}, transparent)` }} />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 ${activeBotId === 1 ? 'text-rose-400' : 'text-amber-400'}`}>
              <Activity className="h-3 w-3 animate-pulse" /> {activeBotId === 1 ? "Auto Trading Engine (Paper)" : "Live Futures Execution (Real Money)"}
            </span>
            <h1 className="text-4xl font-black tracking-tight" style={{ background: activeBotId === 1 ? "linear-gradient(90deg, #f43f5e, #fb7185, #fda4af)" : "linear-gradient(90deg, #f59e0b, #fcd34d, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              FVG 5M SNIPER BOT {activeBotId === 2 && "⚡"}
            </h1>
            <p className="text-slate-400 text-sm max-w-lg font-medium">
              {activeBotId === 1 ? "Simulasi Market secara live. Order hanya tersimpan di database lokal." : "Menembak Order MARKET dan SL/TP langsung ke Binance Futures API."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <button
              onClick={() => updateConfig({ is_active: !config.is_active })}
              disabled={saving}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl font-black text-lg transition-all shadow-xl ` + (config.is_active ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 border-rose-500" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border-slate-700")}
              style={{ border: "2px solid" }}
            >
              <Power className={`h-6 w-6 ${config.is_active ? "animate-pulse" : ""}`} />
              {config.is_active ? "BOT IS ACTIVE" : "ENGINE OFF"}
            </button>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2">{config.is_active ? "SCANNING INTERVAL: 10S" : "READY"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5 px-8">
        
        {/* ── SETTINGS ─────────────────────────────────────────────── */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-3xl border border-slate-800 p-6 flex flex-col gap-4" style={{ background: "#0f0f1a" }}>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <Target className="h-3.5 w-3.5 text-rose-400" /> Bot Configuration
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Trade Mode</label>
                <div className="flex rounded-xl overflow-hidden border border-slate-700">
                  <button onClick={() => updateConfig({ mode: 'BUY' })} className={`flex-1 py-2 text-xs font-black ${config.mode === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800'}`}>BUY ONLY</button>
                  <button onClick={() => updateConfig({ mode: 'SELL' })} className={`flex-1 py-2 text-xs font-black ${config.mode === 'SELL' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800'}`}>SELL ONLY</button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Leverage</label>
                <div className="flex border border-slate-700 rounded-xl bg-slate-800/50">
                  <input type="number" value={config.leverage} onChange={e => updateConfig({ leverage: Number(e.target.value) })} className="w-full bg-transparent text-white font-mono text-sm px-3 py-2 outline-none text-center" />
                  <span className="text-xs font-black text-slate-500 flex items-center px-3 border-l border-slate-700 tracking-widest">X</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Initial Margin ($)</label>
                <div className="flex border border-slate-700 rounded-xl bg-slate-800/50">
                  <input type="number" value={config.initial_margin} onChange={e => updateConfig({ initial_margin: Number(e.target.value) })} className="w-full bg-transparent text-white font-mono text-sm px-3 py-2 outline-none text-center" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Compounding</label>
                <button 
                  onClick={() => updateConfig({ is_compounding: !config.is_compounding })}
                  className={`w-full py-2 rounded-xl text-xs font-black border transition-all ${config.is_compounding ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}
                >
                  {config.is_compounding ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[9px] font-bold text-rose-400 uppercase tracking-widest flex justify-between">
                  <span>Max Daily Loss (USD)</span>
                  <span>Stop bot if loss &gt; {config.max_daily_loss}$</span>
                </label>
                <div className="flex border border-rose-500/30 rounded-xl bg-rose-500/5">
                  <span className="text-sm font-black text-rose-400 flex items-center px-3 border-r border-rose-500/20">$</span>
                  <input type="number" value={config.max_daily_loss} onChange={e => updateConfig({ max_daily_loss: Number(e.target.value) })} className="w-full bg-transparent text-white font-mono text-sm px-3 py-2 outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 p-6 flex flex-col gap-4" style={{ background: "#0f0f1a" }}>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <BarChart2 className="h-3.5 w-3.5 text-rose-400" /> Coin Selector (Max 1 Pos/Coin)
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COINS.map(coin => {
                const isActive = config.coins.includes(coin);
                return (
                  <button
                    key={coin}
                    onClick={() => handleCoinToggle(coin)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${isActive ? "bg-rose-500/15 text-rose-400 border-rose-500/40" : "bg-slate-800/50 text-slate-500 border-slate-700 hover:bg-slate-800"}`}
                  >
                    {coin}
                  </button>
                );
              })}
            </div>
            {config.coins.length === 0 && <p className="text-xs text-rose-400 font-bold mt-2">⚠️ Pilih minimal 1 koin agar bot dapat bekerja.</p>}
          </div>
        </div>

        {/* ── METRICS ────────────────────────────────────────────── */}
        <div className="xl:col-span-4 rounded-3xl border border-slate-800 p-6 flex flex-col justify-center relative overflow-hidden" style={{ background: "#0f0f1a" }}>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> Daily Guard
          </div>
          <div className="text-center mb-4">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total PnL Today</div>
            <div className={`text-3xl font-black font-mono ${todayPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {todayPnl > 0 ? "+" : ""}{todayPnl.toFixed(2)} <span className="text-lg text-slate-500">$</span>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-2xl p-3 mb-4 border border-slate-800/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Next Trade Margin</span>
              <span className="text-xs font-black text-white font-mono">
                ${(config.is_compounding ? (config.initial_margin + todayPnl) : config.initial_margin).toFixed(2)}
              </span>
            </div>
            <p className="text-[8px] text-slate-500 italic">
              {config.is_compounding ? "Compounded from daily performance." : "Static initial margin."}
            </p>
          </div>
          
          <div className="space-y-1 mt-2 relative z-10 w-full mb-1">
            <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 tracking-widest">
              <span>Risk Meter Limit</span>
              <span>{(config.max_daily_loss - Math.max(0, -todayPnl)).toFixed(2)}$ Left</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 transition-all rounded-full relative" 
                style={{ width: `${pnlPct}%` }} 
              >
                 <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 px-8">
        
        {/* OPEN POSITIONS */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-800 p-6" style={{ background: "#0f0f1a" }}>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Activity className="h-3.5 w-3.5 text-emerald-400" /> Active Positions ({openPositions.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                  <th className="pb-3 pl-6">Symbol</th>
                  <th className="pb-3">Side</th>
                  <th className="pb-3 text-right">Margin</th>
                  <th className="pb-3 text-right">Entry</th>
                  <th className="pb-3 text-right">TP (1.5R)</th>
                  <th className="pb-3 text-right">SL (ATR)</th>
                  {activeBotId === 2 && <th className="pb-3 text-right">Order ID</th>}
                  <th className="pb-3 text-right pr-6">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {openPositions.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-xs text-slate-600 font-bold">No active positions</td></tr>
                ) : openPositions.map(pos => (
                  <tr key={pos.id} className="hover:bg-slate-800/20">
                    <td className="py-3 pl-6 font-mono text-xs font-bold text-white">{pos.symbol}</td>
                    <td className="py-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${pos.side === 'BUY' ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-rose-400 border-rose-500/30 bg-rose-500/10"}`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-xs text-white">${Number(pos.margin_used).toFixed(2)}</td>
                    <td className="py-3 text-right font-mono text-xs text-slate-300">{Number(pos.entry_price).toFixed(4)}</td>
                    <td className="py-3 text-right font-mono text-xs text-emerald-400">{Number(pos.tp_price).toFixed(4)}</td>
                    <td className="py-3 text-right font-mono text-xs text-rose-400">{Number(pos.sl_price).toFixed(4)}</td>
                    {activeBotId === 2 && <td className="py-3 text-right font-mono text-[10px] text-slate-500">{pos.tx_id || '-'}</td>}
                    <td className="py-3 text-right pr-6 font-mono text-[10px] text-slate-500">{new Date(pos.created_at).toLocaleTimeString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOGS */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-800 p-6 flex flex-col h-72" style={{ background: "#0f0f1a" }}>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Clock className="h-3.5 w-3.5 text-slate-400" /> Engine Action Logs
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic">Waiting for bot activity...</p>
            ) : logs.map((l, i) => (
              <div key={i} className="text-[10px] font-mono text-slate-400 border-l-2 border-slate-700 pl-2">
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>

       {/* HISTORY */}
       <div className="mt-5 rounded-3xl border border-slate-800 p-6 mx-8" style={{ background: "#0f0f1a" }}>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            History ({activeBotId === 1 ? 'Closed Paper Trades' : 'Real Execute History'})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                  <th className="pb-3">Symbol</th>
                  <th className="pb-3">Side</th>
                  <th className="pb-3 text-right">Margin</th>
                  <th className="pb-3 text-right">Entry</th>
                  <th className="pb-3 text-right">Close</th>
                  <th className="pb-3 text-right">PnL (USD)</th>
                  <th className="pb-3 text-right pr-6">Closed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {history.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-xs text-slate-600 font-bold">No history available</td></tr>
                ) : history.map(pos => {
                  const pnl = Number(pos.pnl);
                  const isProfit = pnl > 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/20">
                      <td className="py-3 font-mono text-xs font-bold text-white">{pos.symbol}</td>
                      <td className="py-3">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${pos.side === 'BUY' ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-rose-400 border-rose-500/30 bg-rose-500/10"}`}>
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-xs text-slate-500">${Number(pos.margin_used).toFixed(2)}</td>
                      <td className="py-3 text-right font-mono text-xs text-slate-400">{Number(pos.entry_price).toFixed(4)}</td>
                      <td className="py-3 text-right font-mono text-xs text-slate-200">{Number(pos.close_price).toFixed(4)}</td>
                      <td className={`py-3 text-right font-mono text-xs font-black ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                        {isProfit ? "+" : ""}{pnl.toFixed(2)}$
                      </td>
                      <td className="py-3 text-right font-mono text-[10px] text-slate-500">
                        {new Date(pos.closed_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

    </div>
  );
}
