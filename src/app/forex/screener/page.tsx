"use client";
import { useState, useEffect } from "react";
import {
  Newspaper,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Zap,
  Globe,
  Clock,
  Info,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const IMPACT_COLOR: Record<string, string> = {
  High:   "bg-red-500",
  Medium: "bg-amber-400",
  Low:    "bg-slate-300 dark:bg-slate-600",
};

const SENTIMENT_STYLE: Record<string, { color: string; label: string }> = {
  bullish: { color: "text-emerald-500", label: "🟢 Bullish" },
  bearish: { color: "text-rose-500",    label: "🔴 Bearish" },
  neutral: { color: "text-slate-400",   label: "— Neutral"  },
  pending: { color: "text-amber-400",   label: "⏳ Pending"  },
};

const BIAS_COLOR: Record<string, string> = {
  STRONG:  "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  BULLISH: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  NEUTRAL: "text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  BEARISH: "text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
  WEAK:    "text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
};

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵",
  AUD: "🇦🇺", CAD: "🇨🇦", CHF: "🇨🇭", NZD: "🇳🇿",
};

function ProbabilityArc({ prob, action }: { prob: number; action: string }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = (prob / 100) * circ;
  const color = action === 'BUY' ? '#22c55e' : '#f43f5e';
  return (
    <div className="relative flex items-center justify-center">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-800" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{prob}%</span>
        <span className={`text-[8px] font-black uppercase ${action === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>{action}</span>
      </div>
    </div>
  );
}

export default function ForexScreenerPage() {
  const [pairs, setPairs] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState<'pairs' | 'news'>('pairs');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedPair, setExpandedPair] = useState<string | null>(null);

  const fetchData = async (t = tab, a = actionFilter) => {
    setLoading(true);
    try {
      const [pairRes, newsRes] = await Promise.all([
        fetch(`/api/forex?type=pairs&action=${a}`),
        fetch(`/api/forex?type=news`),
      ]);
      if (pairRes.ok) { const d = await pairRes.json(); if (d.success) setPairs(d.data); }
      if (newsRes.ok) { const d = await newsRes.json(); if (d.success) setNews(d.data); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [actionFilter]);

  const handleScan = async () => {
    if (!confirm("Forex Probability Scan: Mengambil data kalender ForexFactory minggu ini dan menghitung probabilitas setup (±15 detik). Lanjutkan?")) return;
    setScanning(true);
    try {
      const res = await fetch("/api/forex/scan");
      const data = await res.json();
      if (!data.success) { alert(`Error: ${data.error}`); return; }
      alert(data.message);
      fetchData();
    } catch {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  const highProb = pairs.filter(p => p.probability >= 75);

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.25em] mb-2">
              <Globe className="h-4 w-4" /> ForexFactory Intelligence
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase leading-none">Forex Probability</h1>
            <p className="text-sm text-slate-500 mt-2 max-w-lg">
              News → Sentiment Engine → Probability Score → Trade Decision. Data dari ForexFactory Calendar minggu ini.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchData()} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-200 transition-all">
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleScan} disabled={scanning}
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />}
              {scanning ? "Analyzing..." : "Scan Forex News"}
            </button>
          </div>
        </div>
      </div>

      {/* High Prob Alert */}
      {highProb.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 p-5 rounded-2xl flex items-center gap-4">
          <Zap className="h-6 w-6 text-amber-600 shrink-0" />
          <div>
            <span className="font-black text-amber-800 dark:text-amber-300 text-sm">🔥 HIGH PROBABILITY SETUPS: </span>
            <span className="text-sm text-amber-700 dark:text-amber-400 font-bold">
              {highProb.map(p => `${p.pair} ${p.action} (${p.probability}%)`).join(' · ')}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit shadow-inner">
        {[
          { key: 'pairs', label: '📊 Pair Setups' },
          { key: 'news',  label: '📰 News Feed' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-6 py-2.5 text-sm font-black rounded-xl transition-all ${tab === t.key ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Filter Chips (Pairs tab) */}
      {tab === 'pairs' && (
        <div className="flex gap-2">
          {["ALL", "BUY", "SELL"].map(a => (
            <button key={a} onClick={() => setActionFilter(a)}
              className={`px-5 py-2.5 text-xs font-black rounded-2xl border transition-all ${
                actionFilter === a ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800"
              }`}
            >{a === 'ALL' ? 'All Signals' : a === 'BUY' ? '🟢 BUY Only' : '🔴 SELL Only'}</button>
          ))}
          <div className="ml-auto text-xs font-black text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl">
            {pairs.length} Setup Ditemukan
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 animate-pulse font-bold">Memuat data ForexFactory...</div>
      ) : tab === 'pairs' ? (

        /* ── PAIR CARDS ─────────────────────────────────────────── */
        pairs.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 italic">
            Tidak ada setup. Klik <strong>"Scan Forex News"</strong> untuk mulai analisis.
          </div>
        ) : (
          <div className="space-y-4">
            {pairs.map(p => {
              const isBuy = p.action === 'BUY';
              const reasons = (p.reasoning || '').split(' | ');
              const isExpanded = expandedPair === p.pair;
              return (
                <div key={p.pair}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border-2 overflow-hidden transition-all ${
                    isBuy ? "border-emerald-100 dark:border-emerald-900/30" : "border-rose-100 dark:border-rose-900/30"
                  }`}
                >
                  {/* Main Row */}
                  <button
                    onClick={() => setExpandedPair(isExpanded ? null : p.pair)}
                    className="w-full text-left p-6 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-5">
                      <ProbabilityArc prob={p.probability} action={p.action} />
                      <div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{p.pair}</div>
                        <div className={`text-xs font-black mt-1 ${isBuy ? "text-emerald-500" : "text-rose-500"}`}>{p.action}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{p.sentiment}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className={`inline-flex px-3 py-1 rounded-xl text-xs font-black border ${
                          p.confidence === 'HIGH'   ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" :
                          p.confidence === 'MEDIUM' ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" :
                          "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                        }`}>{p.confidence}</div>
                        {p.killzone !== 'None' && (
                          <div className="flex items-center gap-1 mt-1.5 text-[9px] font-black text-amber-500">
                            <Clock className="h-3 w-3" /> {p.killzone} KZ
                          </div>
                        )}
                      </div>
                      {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-800/30 space-y-4">
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Fundamental Bias</div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{p.bias}</p>
                      </div>
                      {p.top_event && (
                        <div>
                          <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Trigger Event</div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">📰 {p.top_event}</p>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Reasoning</div>
                        <div className="space-y-1.5">
                          {reasons.map((r: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${isBuy ? "bg-emerald-500" : "bg-rose-500"}`} />
                              {r}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`https://www.tradingview.com/chart/?symbol=FX:${p.pair}`} target="_blank"
                          className="inline-flex items-center gap-1 text-[10px] font-black text-blue-500 hover:text-blue-700 transition-colors uppercase"
                        >
                          Open TradingView <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (

        /* ── NEWS FEED ──────────────────────────────────────────── */
        news.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 italic">
            Belum ada data berita. Klik <strong>"Scan Forex News"</strong> terlebih dahulu.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {["Tanggal", "Mata Uang", "Impact", "Event", "Actual", "Forecast", "Previous", "Sentimen", "Poin"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {news.map((n: any, i: number) => {
                  const sent = SENTIMENT_STYLE[n.sentiment] || SENTIMENT_STYLE.neutral;
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 font-bold whitespace-nowrap">
                        {new Date(n.event_date).toLocaleDateString("id-ID", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-black text-slate-900 dark:text-white">
                          {CURRENCY_FLAGS[n.currency] || ''} {n.currency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${IMPACT_COLOR[n.impact] || IMPACT_COLOR.Low}`} title={n.impact} />
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{n.title}</td>
                      <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{n.actual_val || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 font-bold">{n.forecast_val || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 font-bold">{n.previous_val || '—'}</td>
                      <td className={`px-4 py-3 font-black text-xs ${sent.color}`}>{sent.label}</td>
                      <td className="px-4 py-3">
                        <span className={`font-black text-xs ${n.points > 0 ? "text-emerald-500" : n.points < 0 ? "text-rose-500" : "text-slate-400"}`}>
                          {n.points > 0 ? `+${n.points}` : n.points}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ICT + Fundamental Fusion Guide */}
      <div className="bg-slate-950 text-white p-8 rounded-3xl">
        <h3 className="font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2 text-sm">
          <Info className="h-4 w-4" /> Cara Baca: News ≠ Direction
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-slate-400">
          {[
            { icon: "📰", title: "Fundamental Engine", body: "Actual vs Forecast → Skor sentimen per mata uang. High impact = bobot 3×. Indikator inversi (Unemployment) otomatis dibalik." },
            { icon: "⚡", title: "News = Liquidity Trigger", body: "Hedge fund tidak buy saat news bagus. Mereka sweep stop loss retail DULU, lalu entry searah berita. Gabungkan dengan Liquidity Sweep + ICT Kill Zone." },
            { icon: "🎯", title: "Gold Setup", body: "Probability tinggi jika: currency A STRONG (score +6) + currency B WEAK (score -6) + Kill Zone aktif + High Impact event yang sudah released." },
          ].map(p => (
            <div key={p.title} className="bg-slate-800/50 rounded-2xl p-5">
              <div className="text-2xl mb-2">{p.icon}</div>
              <div className="font-black text-white text-sm mb-2 uppercase">{p.title}</div>
              <p className="text-[11px] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
