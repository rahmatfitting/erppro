"use client";

import { useState } from "react";
import { 
  X, 
  Sparkles, 
  Target, 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare, 
  Copy, 
  Loader2,
  FileText,
  BarChart3,
  Phone
} from "lucide-react";

interface AuditModalProps {
  lead: any;
  onClose: () => void;
}

export function AuditModal({ lead, onClose }: AuditModalProps) {
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<any>(lead.audit_data || null);
  const [copied, setCopied] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id }),
      });
      const data = await res.json();
      if (data.audit) {
        setAudit(data.audit);
      }
    } catch (err) {
      console.error("Audit failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <Sparkles className="h-7 w-7 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white leading-tight">{lead.name}</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Digital Presence Audit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {!audit && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="h-24 w-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                <FileText className="h-10 w-10 text-indigo-400" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Siap Analisis?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">AI akan menganalisis data bisnis ini dan membuatkan strategi penawaran terbaik.</p>
              </div>
              <button 
                onClick={runAudit}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <Sparkles className="h-5 w-5" />
                JALANKAN AUDIT SEKARANG
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">AI Sedang Berpikir...</p>
            </div>
          )}

          {audit && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {/* Score & Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Digital Score</span>
                  <div className="relative h-24 w-24 flex items-center justify-center">
                    <svg className="h-full w-full -rotate-90">
                      <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
                      <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={251} strokeDashoffset={251 - (251 * audit.digital_score / 100)} className="text-indigo-600" />
                    </svg>
                    <span className="absolute text-2xl font-black text-slate-800 dark:text-white">{audit.digital_score}</span>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-3">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    ANALISIS AI
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    "{audit.analysis}"
                  </p>
                </div>
              </div>

              {/* Pain Points */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-widest">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  Titik Kelemahan (Pain Points)
                </h4>
                <div className="grid gap-3">
                  {audit.pain_points.map((point: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
                      <div className="h-2 w-2 rounded-full bg-rose-500" />
                      <span className="text-sm font-bold text-rose-700 dark:text-rose-400">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solution */}
              <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 space-y-3">
                <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-2 uppercase tracking-widest">
                  <CheckCircle2 className="h-4 w-4" />
                  Solusi Website
                </h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  {audit.solution}
                </p>
              </div>

              {/* Pitch */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-widest">
                    <MessageSquare className="h-4 w-4 text-indigo-500" />
                    HOT WHATSAPP PITCH
                  </h4>
                  <button 
                    onClick={() => copyToClipboard(audit.whatsapp_pitch)}
                    className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all"
                  >
                    {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'TERSALIN!' : 'SALIN PESAN'}
                  </button>
                </div>
                <div className="p-6 rounded-3xl bg-slate-900 text-slate-300 text-sm leading-relaxed relative group">
                  {audit.whatsapp_pitch}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {audit && (
          <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-sm font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Tutup
            </button>
            <a 
              href={`https://wa.me/${lead.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(audit.whatsapp_pitch)}`}
              target="_blank"
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98] flex items-center gap-3"
            >
              <Phone className="h-4 w-4" />
              HUBUNGI VIA WA
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
