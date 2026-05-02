"use client";
import { useState, useEffect } from "react";
import {
  GitBranch,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  BarChart3,
  Filter,
  Zap,
  Info,
  CheckCircle2,
  XCircle,
  MinusCircle,
  FileDown
} from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

const TYPE_FILTERS = [
  { label: "All Signals", value: "ALL" },
  { label: "🟢 Bullish Divergence", value: "BULLISH" },
  { label: "🔴 Bearish Divergence", value: "BEARISH" },
];

const CONFIDENCE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  HIGH:   { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600", label: "🔥 HIGH" },
  STRONG: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600", label: "✅ STRONG" },
  WEAK:   { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-500", label: "⚠️ WEAK" },
  NOISE:  { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-400", label: "NOISE" },
};

const TF_ORDER = ['15m', '1h', '4h', '1d'];

function TFBadge({ tf, value }: { tf: string; value: string }) {
  const isB = value === 'BULLISH';
  const isN = value === 'NEUTRAL';
  return (
    <div className={`flex flex-col items-center gap-1`}>
      <span className="text-[9px] font-black text-slate-400 uppercase">{tf}</span>
      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
        isN  ? "bg-slate-100 dark:bg-slate-800 text-slate-400" :
        isB  ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" :
               "bg-rose-100 dark:bg-rose-900/20 text-rose-600"
      }`}>
        {isN ? "—" : isB ? "BULL" : "BEAR"}
      </span>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const max = 10;
  const pct = Math.min((score / max) * 100, 100);
  const color = score >= 9 ? "bg-amber-500" : score >= 6 ? "bg-emerald-500" : score >= 3 ? "bg-blue-500" : "bg-slate-300";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-black">
        <span className="text-slate-400">Score</span>
        <span className="text-slate-900 dark:text-white">{score}<span className="text-slate-400">/10</span></span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DivergencePage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [minScore, setMinScore] = useState(3);

  const fetchSignals = async (type = typeFilter, ms = minScore) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/divergence?type=${type}&minScore=${ms}`);
      const data = await res.json();
      if (data.success) setSignals(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSignals(); }, [typeFilter, minScore]);

  const handleScan = async () => {
    if (!confirm("Divergence Deep Scan: Memproses RSI + MACD + Swing pada 4 TF × 50 coin (±60 detik). Lanjutkan?")) return;
    setScanning(true);
    try {
      const res = await fetch("/api/crypto/divergence/scan");
      const data = await res.json();
      alert(data.message || "Scan selesai");
      fetchSignals();
    } catch {
      alert("Scan gagal");
    } finally {
      setScanning(false);
    }
  };

  const handleExport = () => {
    if (signals.length === 0) return;
    exportToExcel({
      title: "Divergence Screener Report",
      subtitle: `Generated: ${new Date().toLocaleString()}`,
      fileName: `Divergence_Scan_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: "Symbol", key: "symbol" },
        { header: "Dominant Type", key: "dominant_type" },
        { header: "Score", key: "score" },
        { header: "Confidence", key: "confidence" },
        { header: "15m", key: "tf_15m" },
        { header: "1h", key: "tf_1h" },
        { header: "4h", key: "tf_4h" },
        { header: "1d", key: "tf_1d" },
        { header: "MACD Confirm", key: "macd_confirms", format: (v) => v ? "YES" : "NO" },
        { header: "Volume Spike", key: "volume_spike", format: (v) => v ? "YES" : "NO" },
      ],
      data: signals,
    });
  };

  const bullish = signals.filter(s => s.dominant_type === 'BULLISH');
  const bearish  = signals.filter(s => s.dominant_type === 'BEARISH');

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 overflow-hidden shadow-sm">
        <div className="absolute -right-8 -top-8 opacity-5 pointer-events-none">
          <GitBranch className="h-48 w-48 text-violet-600" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-violet-600 font-black text-[10px] uppercase tracking-[0.25em] mb-2">
              <GitBranch className="h-4 w-4" /> Momentum Analysis
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase leading-none">Divergence Screener</h1>
            <p className="text-sm text-slate-500 mt-2 max-w-lg">
              Mendeteksi RSI + MACD Divergence di 15m, 1H, 4H &amp; 1D dengan Hedge Fund Scoring System.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchSignals()} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-200 transition-all">
              <RefreshCcw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button 
              onClick={handleExport}
              disabled={signals.length === 0}
              className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-200 transition-all"
              title="Export Excel"
            >
              <FileDown className="h-5 w-5" />
            </button>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-violet-500/30 disabled:opacity-50"
            >
              {scanning ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
              {scanning ? "Analyzing..." : "Deep Scan"}
            </button>
          </div>
        </div>
      </div>

      {/* Scoring Guide */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "🔥 Institutional", range: "≥ 9", color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700" },
          { label: "✅ Strong", range: "6–8", color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700" },
          { label: "⚠️ Weak Setup", range: "3–5", color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600" },
          { label: "🔕 Noise", range: "0–2", color: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400" },
        ].map(s => (
          <div key={s.range} className={`p-4 rounded-2xl border ${s.color} flex justify-between items-center`}>
            <span className="text-xs font-black">{s.label}</span>
            <span className="text-xs font-black opacity-70">{s.range}</span>
          </div>
        ))}
      </div>

      {/* Control Row */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-5 py-2.5 text-xs font-black rounded-2xl border transition-all ${
                typeFilter === f.value
                  ? "bg-violet-600 text-white border-violet-600 shadow-lg"
                  : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase">Min Score</span>
          <input
            type="range" min={0} max={9} step={1}
            value={minScore}
            onChange={e => setMinScore(parseInt(e.target.value))}
            className="w-24 h-1.5 appearance-none bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer accent-violet-600"
          />
          <span className="text-sm font-black text-violet-600 w-4">{minScore}</span>
        </div>
        <div className="text-xs font-black text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl">
          🟢 {bullish.length} Bullish &nbsp;·&nbsp; 🔴 {bearish.length} Bearish
        </div>
      </div>

      {/* Signal Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold animate-pulse">Menghitung divergensi multi-timeframe...</div>
      ) : signals.length === 0 ? (
        <div className="py-24 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 italic">
          Tidak ada sinyal. Klik <strong>"Deep Scan"</strong> untuk analisis divergensi.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {signals.map(s => {
            const conf = CONFIDENCE_STYLE[s.confidence] || CONFIDENCE_STYLE.NOISE;
            const isBull = s.dominant_type === 'BULLISH';
            const tfData: Record<string, string> = {
              '15m': s.tf_15m, '1h': s.tf_1h, '4h': s.tf_4h, '1d': s.tf_1d
            };
            return (
              <div
                key={s.nomor}
                className={`bg-white dark:bg-slate-900 p-7 rounded-3xl border-2 transition-all hover:scale-[1.01] ${
                  isBull
                    ? "border-emerald-100 dark:border-emerald-900/30"
                    : "border-rose-100 dark:border-rose-900/30"
                }`}
              >
                {/* Top Bar */}
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{s.symbol}</h3>
                    <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-lg text-[10px] font-black ${conf.bg} ${conf.text}`}>
                      {conf.label}
                    </span>
                  </div>
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                    isBull ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-rose-100 dark:bg-rose-900/20"
                  }`}>
                    {isBull
                      ? <TrendingUp className="h-6 w-6 text-emerald-600" />
                      : <TrendingDown className="h-6 w-6 text-rose-600" />
                    }
                  </div>
                </div>

                {/* Score Bar */}
                <div className="mb-5">
                  <ScoreBar score={parseFloat(s.score)} />
                </div>

                {/* TF Matrix */}
                <div className="flex justify-between mb-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                  {TF_ORDER.map(tf => <TFBadge key={tf} tf={tf} value={tfData[tf] || 'NEUTRAL'} />)}
                </div>

                {/* Indicators */}
                <div className="flex gap-2 flex-wrap mb-5">
                  {s.macd_confirms ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 text-[10px] font-black rounded-lg border border-violet-100 dark:border-violet-800">
                      <CheckCircle2 className="h-3 w-3" /> MACD Confirm
                    </span>
                  ) : null}
                  {s.volume_spike ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[10px] font-black rounded-lg border border-amber-100 dark:border-amber-800">
                      <Zap className="h-3 w-3" /> Volume Spike
                    </span>
                  ) : null}
                  {!s.macd_confirms && !s.volume_spike && (
                    <span className="text-[10px] text-slate-400 font-bold italic">RSI Only</span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">
                  <span className="text-[10px] text-slate-400 font-black">
                    {new Date(s.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <a
                    href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-violet-600 transition-colors uppercase"
                  >
                    Chart <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logic Guide */}
      <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Info className="h-4 w-4 text-violet-600" /> Cara Membaca Divergence
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] font-bold text-slate-500 leading-relaxed">
          <div className="flex gap-3">
            <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">🟢</div>
            <div>
              <span className="text-slate-700 dark:text-slate-300 font-black">Bullish Divergence</span><br />
              Harga membuat Lower Low, tapi RSI membuat Higher Low. Artinya momentum jual melemah — potensi reversal ke atas.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-10 bg-rose-100 dark:bg-rose-900/20 text-rose-600 rounded-xl flex items-center justify-center shrink-0">🔴</div>
            <div>
              <span className="text-slate-700 dark:text-slate-300 font-black">Bearish Divergence</span><br />
              Harga membuat Higher High, tapi RSI membuat Lower High. Artinya momentum beli melemah — potensi reversal ke bawah.
            </div>
          </div>
        </div>
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl text-[11px] font-bold text-amber-700 dark:text-amber-400">
          💡 <strong>Hedge Fund Scoring:</strong> Bobot: 15m=1 · 1H=2 · 4H=3 · 1D=4. Score ≥ 9 berarti divergensi terdeteksi di semua TF secara bersamaan (Institutional Setup). Tambahan 0.5 poin jika MACD atau Volume mengonfirmasi.
        </div>
      </div>
    </div>
  );
}
