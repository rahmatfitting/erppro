"use client";

import React, { useState, useEffect } from 'react';
import { Activity, Search, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, BarChart2, Zap, Target } from 'lucide-react';
import clsx from 'clsx';

export default function VolumeScreenerDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/crypto/volume');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch data');
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
      const res = await fetch('/api/crypto/volume/scan', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchData();
      } else {
        setError(json.error || 'Failed to run scan');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    !searchQuery || item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case 'ACCUMULATION':
        return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse">ACCUMULATION (ABSORPTION)</span>;
      case 'DISTRIBUTION':
        return <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.3)]">DISTRIBUTION</span>;
      case 'BUYING_PRESSURE':
        return <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-bold tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.2)]">BUYING PRESSURE</span>;
      case 'SELLING_PRESSURE':
        return <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.2)]">SELLING PRESSURE</span>;
      default:
        return <span className="px-3 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-full text-xs font-medium tracking-normal">NEUTRAL</span>;
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200 font-sans selection:bg-indigo-500/30 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header Section */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-teal-500/20 to-blue-500/20 blur-3xl opacity-50 -z-10 rounded-full pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 drop-shadow-lg flex items-center gap-3">
                <BarChart2 className="w-10 h-10 text-green-400" />
                Volume Spike AI
              </h1>
              <p className="mt-2 text-gray-400 text-lg font-light tracking-wide max-w-2xl">
                Smart Money Flow Scanner. Mendeteksi anomali volume uang (USD) untuk mencari akumulasi dan distribusi bandar.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={fetchData}
                disabled={loading}
                className="group relative px-6 py-3 overflow-hidden rounded-xl bg-gray-800 border border-gray-700 hover:border-green-500 transition-all duration-300 ease-out text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
                Refresh
              </button>
              <button
                onClick={runScan}
                disabled={loading}
                className="group relative px-6 py-3 overflow-hidden rounded-xl bg-green-600 border border-green-500 hover:bg-green-500 transition-all duration-300 ease-out text-sm font-semibold hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50 flex items-center gap-2 text-white"
              >
                <Zap className={clsx("w-4 h-4", loading && "animate-pulse text-yellow-300")} />
                {loading ? 'Scanning Markets...' : 'Scan Volume Spikes'}
              </button>
            </div>
          </div>
        </div>

        {/* Interpretasi (The Legend) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl flex flex-col justify-center">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" /> Deteksi Smart Money
             </h3>
             <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                  <span className="text-gray-300">Vol. Spike + Harga Tertahan</span>
                  <span className="text-yellow-400 font-bold text-xs">ACCUMULATION</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                  <span className="text-gray-300">Vol. Spike + Harga Naik</span>
                  <span className="text-green-400 font-bold text-xs">BUY PRESSURE</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                  <span className="text-gray-300">Vol. Spike + Harga Turun</span>
                  <span className="text-red-400 font-bold text-xs">SELL PRESSURE</span>
                </li>
             </ul>
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-yellow-900/20 to-gray-900/50 border border-yellow-500/20 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BarChart2 className="w-24 h-24" />
              </div>
              <h4 className="text-lg font-bold text-yellow-400 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                Absorption (Accumulation)
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed max-w-[90%]">
                Terjadi <strong>Volume Spike yang sangat besar</strong> namun harga tidak turun (atau membentuk ekor bawah panjang). Ini indikasi kuat "Smart Money" sedang menyerap semua tekanan jual dari retail secara diam-diam.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/20 to-gray-900/50 border border-purple-500/20 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingDown className="w-24 h-24" />
              </div>
              <h4 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                Distribution (Trap)
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed max-w-[90%]">
                Volume meledak sangat tinggi, tetapi harga <strong>gagal naik</strong> atau membentuk ekor atas yang panjang. Bandar sedang mendistribusikan barangnya ke retail yang sedang FOMO. Waspada jebakan dump!
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700/80 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
            placeholder="Cari koin (ex: SOLUSDT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-gray-900/40 backdrop-blur-2xl border border-gray-800/80 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/60 border-b border-gray-700/50">
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Waktu Scan</th>
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Asset</th>
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Money Volume (USD)</th>
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Spike Mult</th>
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Score</th>
                  <th className="px-6 py-5 text-xs font-semibold text-gray-400 uppercase tracking-widest text-right">AI Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-medium animate-pulse">Analyzing Order Books & Volumes...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item, i) => (
                    <tr 
                      key={item.id} 
                      className="group hover:bg-gray-800/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center font-bold text-gray-300 border border-gray-700">
                            {item.symbol.charAt(0)}
                          </div>
                          <div>
                             <span className="font-bold text-gray-100 block">{item.symbol}</span>
                             <span className={clsx(
                                "text-[10px] font-bold uppercase",
                                item.bias === 'BULLISH' ? "text-green-500" : "text-red-500"
                             )}>{item.bias} BIAS</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                           <span className="font-mono text-gray-200 font-bold text-sm">
                             {formatCurrency(item.money_volume)}
                           </span>
                           <span className="text-[10px] text-gray-500 font-mono">
                             Avg: {formatCurrency(item.metadata?.avgVolumeUSD || 0)}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <Zap className={clsx("w-4 h-4", item.metadata?.spikeMultiplier > 3 ? "text-yellow-400" : "text-gray-500")} />
                           <span className="font-mono font-bold text-gray-300">
                             {Number(item.metadata?.spikeMultiplier || 0).toFixed(1)}x
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={clsx(
                          "px-2 py-1 rounded text-xs font-bold",
                          item.score >= 5 ? "bg-green-500/10 text-green-400" :
                          item.score <= -2 ? "bg-red-500/10 text-red-400" :
                          "bg-yellow-500/10 text-yellow-400"
                        )}>
                          {item.score > 0 ? '+' : ''}{item.score} pts
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        {getSignalBadge(item.signal_type)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      Tidak ada anomali volume yang signifikan saat ini.
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
