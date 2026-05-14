"use client";

import { useState } from "react";
import { 
  Bot, 
  Play, 
  Settings, 
  Terminal, 
  ShoppingCart, 
  Clock, 
  Zap, 
  ShieldCheck, 
  FileText,
  ExternalLink,
  Save,
  Trash2,
  Plus,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ShopeeBotPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showDocModal, setShowDocModal] = useState(false);
  const [docContent, setDocContent] = useState("");
  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Flash Sale Sample',
      url: 'https://shopee.co.id/product-example',
      checkoutTime: '2026-05-10 00:00:00',
      variant: 'Hitam, XL',
      status: 'Ready'
    }
  ]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-10 shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-orange-500 font-bold text-sm mb-3">
            <Zap className="h-4 w-4" />
            <span>PRODUCTION READY AUTOMATION</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight sm:text-4xl">
            Shopee <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Auto Checkout</span>
          </h1>
          <p className="mt-4 max-w-2xl text-slate-400 text-lg leading-relaxed">
            Sistem otomasi checkout tercanggih dengan presisi milidetik. Dirancang khusus untuk memenangkan Flash Sale dan Limited Drops.
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-64 w-64 bg-orange-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Bot },
            { id: 'config', label: 'Product Config', icon: Settings },
            { id: 'logs', label: 'Terminal Logs', icon: Terminal },
            { id: 'docs', label: 'Documentation', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all",
                activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                  : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Active Tasks', value: products.length, icon: ShoppingCart, color: 'text-blue-500' },
                  { label: 'Precision', value: '1ms', icon: Clock, color: 'text-emerald-500' },
                  { label: 'Anti-Detection', value: 'Active', icon: ShieldCheck, color: 'text-orange-500' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <stat.icon className={cn("h-6 w-6 mb-4", stat.color)} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-widest text-slate-700 dark:text-white">Active Campaigns</h3>
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <Plus className="h-4 w-4 text-orange-500" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map((p) => (
                    <div key={p.id} className="p-6 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-orange-100 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center">
                          <ShoppingCart className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">{p.name}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3" />
                            {p.checkoutTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">
                          {p.status}
                        </span>
                        <button className="h-10 w-10 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all">
                          <Play className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <h3 className="font-black text-lg text-slate-900 dark:text-white mb-6">Product Automation Config</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product URL</label>
                    <input 
                      type="text" 
                      defaultValue={products[0].url}
                      className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Checkout Time (ISO)</label>
                    <input 
                      type="text" 
                      defaultValue={products[0].checkoutTime}
                      className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Variant</label>
                    <input 
                      type="text" 
                      defaultValue={products[0].variant}
                      className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-orange-500/30 flex items-center gap-2 transition-all">
                    <Save className="h-4 w-4" />
                    SIMPAN KONFIGURASI
                  </button>
                  <button className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-black px-6 py-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                    TEST RUN
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 shadow-2xl font-mono">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 bg-red-500 rounded-full" />
                    <div className="h-3 w-3 bg-amber-500 rounded-full" />
                    <div className="h-3 w-3 bg-emerald-500 rounded-full" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold ml-4">TERMINAL - shopee-bot/logs/bot.log</span>
                </div>
                <button className="text-[10px] text-slate-500 hover:text-white font-bold transition-colors">CLEAR</button>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-emerald-500">[2026-05-09 11:15:22] INFO: Launching browser...</p>
                <p className="text-emerald-500">[2026-05-09 11:15:24] INFO: Using saved session state.</p>
                <p className="text-blue-400">[2026-05-09 11:15:25] INFO: Opening product: https://shopee.co.id/flash-sale-xxx</p>
                <p className="text-emerald-500">[2026-05-09 11:15:28] INFO: Selecting variant: Hitam, XL</p>
                <p className="text-amber-500">[2026-05-09 11:15:29] WARN: Scheduling task for: 2026-05-10 00:00:00.000</p>
                <p className="text-slate-400">Countdown: 48512.455s...</p>
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg text-slate-900 dark:text-white">Quick Start Guide</h3>
                <button 
                  onClick={async () => {
                    const res = await fetch('/api/shopee-bot/docs');
                    const data = await res.json();
                    if (data.content) {
                      setDocContent(data.content);
                      setShowDocModal(true);
                    }
                  }}
                  className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-orange-200 transition-all flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  BACA PANDUAN LENGKAP
                </button>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-800">
                  <p className="text-sm font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    PENTING: Pastikan Anda sudah login secara manual di bot sebelum menjalankan automasi.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-black text-slate-700 dark:text-white">1. Jalankan Script Login</h4>
                  <p className="text-sm text-slate-500">Buka terminal di root project dan jalankan:</p>
                  <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs">node shopee-bot/src/login.js</pre>
                  
                  <h4 className="font-black text-slate-700 dark:text-white pt-4">2. Jalankan Automasi</h4>
                  <p className="text-sm text-slate-500">Setelah login tersimpan, jalankan bot:</p>
                  <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs">node shopee-bot/src/checkout.js</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Full Documentation */}
      {showDocModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-500">
              <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Panduan Lengkap Bot Shopee
              </h3>
              <button 
                onClick={() => setShowDocModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 font-sans text-slate-700 dark:text-slate-300">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                {docContent}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowDocModal(false)}
                className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
