'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, TrendingUp, AlertTriangle, ChevronRight, Activity, Filter } from 'lucide-react';
import clsx from 'clsx'; // Assuming clsx is installed based on package.json

interface EmaStatuses {
  h4: string;
  daily: string;
}

interface EmaRawData {
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
  timestamp: string;
}

interface ScreenerCoin {
  symbol: string;
  name: string | null;
  status: string;
  statuses: EmaStatuses;
  raw: Record<string, EmaRawData>;
}

export default function EMAScreenerDashboard() {
  const [data, setData] = useState<ScreenerCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, STRONG_BULLISH, BULLISH, BEARISH, STRONG_BEARISH

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/screener');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch screener data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/screener', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchData(); // Refresh data after scan
      } else {
        setError(json.error || 'Failed to run scan');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'STRONG_BULLISH':
        return <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse">STELLAR BULL</span>;
      case 'BULLISH':
        return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold tracking-wide">BULLISH</span>;
      case 'STRONG_BEARISH':
        return <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.3)]">DEEP BEAR</span>;
      case 'BEARISH':
        return <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-semibold tracking-wide">BEARISH</span>;
      default:
        return <span className="px-3 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-full text-xs font-medium tracking-normal">NEUTRAL</span>;
    }
  };

  const getTfBadge = (tfStatus: string) => {
    if (tfStatus === 'BULLISH') return <div className="flex justify-center"><div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div></div>;
    if (tfStatus === 'BEARISH') return <div className="flex justify-center"><div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div></div>;
    return <div className="flex justify-center"><div className="w-4 h-4 rounded-full bg-gray-600"></div></div>;
  };

  const filteredData = data.filter(coin => {
    if (searchQuery && !coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType !== 'ALL') {
      if (filterType === 'STRONG_BULLISH' && coin.status !== 'STRONG_BULLISH') return false;
      if (filterType === 'BULLISH' && !['STRONG_BULLISH', 'BULLISH'].includes(coin.status)) return false;
      if (filterType === 'BEARISH' && !['STRONG_BEARISH', 'BEARISH'].includes(coin.status)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header Section */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-3xl opacity-50 -z-10 rounded-full pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-lg flex items-center gap-3">
                <Activity className="w-10 h-10 text-indigo-400" />
                Crypto Engine
              </h1>
              <p className="mt-2 text-gray-400 text-lg font-light tracking-wide max-w-2xl">
                Multi-timeframe Exponential Moving Average screener. Scanning Binance for aligned institutional trends across H4, Daily, Weekly, and Monthly charts.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={fetchData}
                disabled={loading}
                className="group relative px-6 py-3 overflow-hidden rounded-xl bg-gray-800 border border-gray-700 hover:border-indigo-500 transition-all duration-300 ease-out text-sm font-semibold hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
                Refresh
              </button>
              <button
                onClick={runScan}
                disabled={loading}
                className="group relative px-6 py-3 overflow-hidden rounded-xl bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 transition-all duration-300 ease-out text-sm font-semibold hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50 flex items-center gap-2 text-white"
              >
                <Activity className={clsx("w-4 h-4", loading && "animate-pulse")} />
                {loading ? 'Scanning Matrix...' : 'Run New Scan'}
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl">
            <p className="text-gray-400 text-sm font-medium mb-1">Total Monitored</p>
            <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">{data.length || '--'}</p>
          </div>
          <div className="bg-gray-800/40 backdrop-blur-xl border border-green-500/20 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
              <TrendingUp className="w-16 h-16 text-green-400" />
            </div>
            <p className="text-green-400/80 text-sm font-medium mb-1">Stellar Bulls</p>
            <p className="text-3xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]">
              {data.filter(d => d.status === 'STRONG_BULLISH').length || '0'}
            </p>
          </div>
          <div className="bg-gray-800/40 backdrop-blur-xl border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
              <Activity className="w-16 h-16 text-indigo-400" />
            </div>
            <p className="text-indigo-400/80 text-sm font-medium mb-1">Emerging Bulls</p>
            <p className="text-3xl font-bold text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]">
              {data.filter(d => d.status === 'BULLISH').length || '0'}
            </p>
          </div>
          <div className="bg-gray-800/40 backdrop-blur-xl border border-red-500/20 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
            <p className="text-red-400/80 text-sm font-medium mb-1">Deep Bears</p>
            <p className="text-3xl font-bold text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">
              {data.filter(d => d.status === 'STRONG_BEARISH').length || '0'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700/80 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
              placeholder="Search by Symbol (e.g. BTC, ETH)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center bg-gray-900/30 p-1 rounded-xl border border-gray-800">
            {[
              { id: 'ALL', label: 'All Pairs' },
              { id: 'STRONG_BULLISH', label: 'Strong Bullish' },
              { id: 'BULLISH', label: 'Bullish (H4+D1)' },
              { id: 'BEARISH', label: 'Bearish' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                  filterType === f.id 
                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-gray-900/40 backdrop-blur-2xl border border-gray-800/80 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/60 border-b border-gray-700/50">
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest rounded-tl-3xl">Asset</th>
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">H4</th>
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">Daily</th>
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest text-right">Trend Status</th>
                  <th className="px-6 py-5 rounded-tr-3xl"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-medium animate-pulse">Initializing Data Stream...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((coin, i) => (
                    <tr 
                      key={coin.symbol} 
                      className="group hover:bg-gray-800/30 transition-colors duration-200"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-gray-200 font-bold border border-gray-600 group-hover:border-indigo-400 transition-colors shadow-inner">
                            {coin.symbol.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-base font-bold text-gray-100 group-hover:text-indigo-400 transition-colors tracking-wide flex items-center gap-2">
                              {coin.symbol}
                              {coin.status === 'STRONG_BULLISH' && (
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Binance Futures</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {getTfBadge(coin.statuses.h4)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {getTfBadge(coin.statuses.daily)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        {getStatusBadge(coin.status)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <button className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Filter className="w-12 h-12 text-gray-600 mb-3 opacity-50" />
                        <p className="text-lg font-medium text-gray-400">No coins match your rigorous filters.</p>
                        <p className="text-sm mt-1">Adjust criteria to discover opportunities.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
