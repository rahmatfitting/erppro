"use client";
import { useState, useEffect } from "react";
import {
  Clock,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Zap,
  Target,
  Info,
  ChevronRight,
  CircleDot,
  Shield,
  BarChart3,
} from "lucide-react";

const TIMEFRAMES = [
  { label: "15 Menit", value: "15m" },
  { label: "1 Jam",    value: "1h"  },
  { label: "4 Jam",    value: "4h"  },
  { label: "1 Hari",   value: "1d"  },
];

const CONF_STYLE: Record<string, { label: string; color: string; border: string }> = {
  SNIPER:   { label: "💣 SNIPER ENTRY", color: "text-amber-600",   border: "border-amber-300 dark:border-amber-700" },
  STRONG:   { label: "🔥 STRONG SETUP", color: "text-emerald-600", border: "border-emerald-200 dark:border-emerald-800" },
  MODERATE: { label: "⚠️ MODERATE",     color: "text-blue-500",    border: "border-blue-100 dark:border-blue-900" },
  NOISE:    { label: "— NOISE",         color: "text-slate-400",   border: "border-slate-100 dark:border-slate-800" },
};

function PhaseFlow({ accu, manip, dist }: { accu: boolean; manip: string; dist: boolean }) {
  const phases = [
    { label: "📦 Accum",  active: accu                          },
    { label: "⚡ Sweep",  active: manip !== 'none'              },
    { label: "🚀 Expand", active: dist                          },
  ];
  return (
    <div className="flex items-center gap-1">
      {phases.map((p, i) => (
        <div key={i} className="flex items-center gap-0.5">
          <div className={`px-2 py-0.5 text-[9px] font-black rounded ${p.active ? "bg-slate-900 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
            {p.label}
          </div>
          {i < phases.length - 1 && <ChevronRight className={`h-3 w-3 ${p.active ? "text-slate-400" : "text-slate-200"}`} />}
        </div>
      ))}
    </div>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const max = 12;
  const pct = Math.min((score / max) * 100, 100);
  const color = score >= 10 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
    : score >= 7 ? "bg-emerald-500" : "bg-blue-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-black">
        <span className="text-slate-400">Score</span>
        <span className="text-slate-900 dark:text-white">{score}<span className="text-slate-400">/12</span></span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ICTPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [timeframe, setTimeframe] = useState("1h");
  const [bias, setBias] = useState("ALL");
  const [minScore, setMinScore] = useState(4);
  const [killzoneNow, setKillzoneNow] = useState<{ active: boolean; session: string }>({ active: false, session: "None" });

  // Live Killzone Clock
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const wibHour = (now.getUTCHours() + 7) % 24;
      const isLondon  = wibHour >= 14 && wibHour < 17;
      const isNY      = wibHour >= 19 && wibHour < 22;
      setKillzoneNow({
        active: isLondon || isNY,
        session: isLondon ? "London" : isNY ? "New York" : "None",
      });
    };
    check();
    const interval = setInterval(check, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchSignals = async (tf = timeframe, b = bias, ms = minScore) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/ict?interval=${tf}&bias=${b}&minScore=${ms}`);
      const data = await res.json();
      if (data.success) setSignals(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSignals(); }, [timeframe, bias, minScore]);

  const handleScan = async () => {
    const tfLabel = TIMEFRAMES.find(t => t.value === timeframe)?.label;
    if (!confirm(`ICT AMD Scan (${tfLabel}): Analisis Accumulation + Sweep + Expansion pada 50 pair Binance (±25 detik). Lanjutkan?`)) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/crypto/ict/scan?interval=${timeframe}`);
      const data = await res.json();
      alert(data.message || "Scan selesai");
      fetchSignals();
    } catch {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">

      {/* Live Kill Zone Banner */}
      <div className={`px-6 py-4 rounded-2xl flex items-center justify-between transition-all ${
        killzoneNow.active
          ? "bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30"
          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${killzoneNow.active ? "bg-slate-900 animate-ping" : "bg-slate-300"}`} />
          <Clock className="h-4 w-4" />
          <span className="font-black text-sm uppercase tracking-widest">
            {killzoneNow.active ? `🟢 KILL ZONE AKTIF — ${killzoneNow.session}` : "Kill Zone Tidak Aktif Saat ini"}
          </span>
        </div>
        <div className="text-xs font-black opacity-70">London 14-17 WIB · NY 19-22 WIB</div>
      </div>

      {/* Timeframe Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-fit shadow-inner">
        {TIMEFRAMES.map(tf => (
          <button key={tf.value} onClick={() => setTimeframe(tf.value)}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${timeframe === tf.value ? "bg-white dark:bg-slate-900 text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >{tf.label}</button>
        ))}
      </div>

      {/* Header */}
      <div className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
          <Target className="h-48 w-48 text-amber-500" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-[0.25em] mb-2">
              <Shield className="h-4 w-4" /> ICT Smart Money Model
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase leading-none">Kill Zone + AMD</h1>
            <p className="text-sm text-slate-500 mt-2 max-w-lg">
              Mendeteksi urutan <strong>Accumulation → Manipulation → Distribution</strong> beserta timing Kill Zone London &amp; New York.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchSignals()} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-200 transition-all">
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleScan} disabled={scanning}
              className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-2xl font-black text-sm shadow-lg shadow-amber-500/30 disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              {scanning ? "Scanning AMD..." : "Run ICT Scan"}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {["ALL", "BULLISH", "BEARISH"].map(b => (
            <button key={b} onClick={() => setBias(b)}
              className={`px-5 py-2.5 text-xs font-black rounded-2xl border transition-all ${
                bias === b ? "bg-amber-500 text-slate-900 border-amber-500 shadow-lg" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800"
              }`}
            >{b === 'ALL' ? 'All Signals' : b === 'BULLISH' ? '🟢 Bullish' : '🔴 Bearish'}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl">
          <span className="text-[10px] font-black text-slate-400 uppercase">Min Score</span>
          <input type="range" min={4} max={12} step={1} value={minScore}
            onChange={e => setMinScore(parseInt(e.target.value))}
            className="w-24 h-1.5 appearance-none bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer accent-amber-500"
          />
          <span className="text-sm font-black text-amber-600 w-5">{minScore}</span>
        </div>
        <div className="text-xs font-black text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl">
          {signals.length} Setups Ditemukan
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 animate-pulse font-bold">Menganalisa pola AMD...</div>
      ) : signals.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 italic">
          Belum ada sinyal ICT. Klik <strong>"Run ICT Scan"</strong> untuk memulai.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {signals.map(s => {
            const conf = CONF_STYLE[s.confidence] || CONF_STYLE.NOISE;
            const isBull = s.bias === 'BULLISH';
            return (
              <div key={s.nomor}
                className={`bg-white dark:bg-slate-900 p-7 rounded-3xl border-2 transition-all hover:scale-[1.01] ${conf.border}`}
              >
                {/* Symbol + Confidence */}
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{s.symbol}</h3>
                    <span className={`text-[10px] font-black mt-1 block ${conf.color}`}>{conf.label}</span>
                  </div>
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                    isBull ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-rose-100 dark:bg-rose-900/20"
                  }`}>
                    {isBull ? <TrendingUp className="h-6 w-6 text-emerald-600" /> : <TrendingDown className="h-6 w-6 text-rose-600" />}
                  </div>
                </div>

                {/* Score */}
                <div className="mb-5"><ScoreMeter score={s.score} /></div>

                {/* Phase Flow */}
                <div className="mb-5">
                  <PhaseFlow accu={!!s.accumulation} manip={s.manipulation} dist={!!s.distribution} />
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {s.killzone_active ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[9px] font-black rounded-lg border border-amber-200 dark:border-amber-800">
                      <Clock className="h-3 w-3" /> {s.killzone_session} KZ
                    </span>
                  ) : null}
                  {s.equal_highs ? (
                    <span className="px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 text-[9px] font-black rounded-lg border border-violet-200 dark:border-violet-800">EQH</span>
                  ) : null}
                  {s.equal_lows ? (
                    <span className="px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 text-[9px] font-black rounded-lg border border-violet-200 dark:border-violet-800">EQL</span>
                  ) : null}
                  {s.bos ? (
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[9px] font-black rounded-lg border border-indigo-200 dark:border-indigo-800">BOS</span>
                  ) : null}
                  {s.volume_spike ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 text-[9px] font-black rounded-lg border border-cyan-200 dark:border-cyan-800">
                      <Zap className="h-3 w-3" /> Vol Spike
                    </span>
                  ) : null}
                  {s.manipulation !== 'none' ? (
                    <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-[9px] font-black rounded-lg border border-rose-200 dark:border-rose-800">
                      {s.manipulation === 'sweep_low' ? '⚡ Sweep Low' : '⚡ Sweep High'}
                    </span>
                  ) : null}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="text-[10px] text-slate-400 font-black">
                    {new Date(s.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <a href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`} target="_blank"
                    className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-amber-600 transition-colors uppercase"
                  >
                    Chart <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AMD Guide Card */}
      <div className="bg-slate-950 text-white p-8 rounded-3xl">
        <h3 className="font-black uppercase tracking-widest text-amber-500 mb-6 flex items-center gap-2 text-sm">
          <Info className="h-4 w-4" /> ICT AMD Model
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "📦", title: "Accumulation", body: "Pasar ranging sempit (range < 1.2× ATR). Biasanya ada Equal Highs/Lows — tanda institusi membangun posisi secara diam-diam." },
            { icon: "⚡", title: "Manipulation (Sweep)", body: "Harga menerobos level high/low sebelumnya (stop hunt) namun segera close kembali ke dalam range. Ini adalah 'jebakan' untuk retail." },
            { icon: "🚀", title: "Distribution (Expansion)", body: "Setelah sweep, pasar meledak searah niat institusi. Candle besar (body > 1.5× avg) dan Break of Structure mengonfirmasi fase ini." },
          ].map(p => (
            <div key={p.title} className="bg-slate-800/50 rounded-2xl p-5">
              <div className="text-2xl mb-2">{p.icon}</div>
              <div className="font-black text-white text-sm mb-2 uppercase">{p.title}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[11px] text-amber-400 font-bold">
          💣 <strong>Score ≥ 10 = SNIPER ENTRY:</strong> Killzone aktif (+2) + Accumulation (+2) + Sweep (+3) + BOS (+3) + Volume (+2) = 12 maks. Score 10+ mengindikasikan setup institusional dengan timing sesi yang tepat.
        </div>
      </div>
    </div>
  );
}
