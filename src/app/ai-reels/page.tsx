"use client";

import { useState } from "react";
import { 
  Camera, 
  Play, 
  Settings, 
  Sparkles, 
  Zap, 
  Search, 
  Video, 
  Music, 
  FileText, 
  Instagram, 
  BarChart3, 
  Plus, 
  ExternalLink,
  ChevronRight,
  Clock,
  Download,
   CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Database,
  List
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AIReelsPage() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [isProcessing, setIsProcessing] = useState(false);
  const [shopeeUrl, setShopeeUrl] = useState("");
  const [shopeeCookies, setShopeeCookies] = useState("");
  const [igCookies, setIgCookies] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [enableVoice, setEnableVoice] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [bulkUrls, setBulkUrls] = useState("");
  const [inventory, setInventory] = useState<any[]>([]);

  const handleSaveCookies = async (platform: 'shopee' | 'instagram') => {
    const cookies = platform === 'shopee' ? shopeeCookies : igCookies;
    if (!cookies) return;
    try {
      await fetch('/api/ai-reels/cookies', {
        method: 'POST',
        body: JSON.stringify({ cookies, platform }),
        headers: { 'Content-Type': 'application/json' }
      });
      alert(`Cookies ${platform} berhasil disimpan!`);
    } catch (e) {
      alert(`Gagal menyimpan cookies ${platform}.`);
    }
  };

  const steps = [
    { name: 'Scraping', status: activeTask?.step >= 1 ? 'completed' : activeTask?.step === 0 ? 'processing' : 'pending', duration: activeTask?.step >= 1 ? '45s' : activeTask?.step === 0 ? 'Running...' : '-' },
    { name: 'AI Scripting', status: activeTask?.step >= 2 ? 'completed' : activeTask?.step === 1 ? 'processing' : 'pending', duration: activeTask?.step >= 2 ? '12s' : activeTask?.step === 1 ? 'Running...' : '-' },
    { name: 'Voice Generation', status: activeTask?.step >= 3 ? 'completed' : activeTask?.step === 2 ? 'processing' : 'pending', duration: activeTask?.step >= 3 ? '8s' : activeTask?.step === 2 ? 'Running...' : '-' },
    { name: 'Video Rendering', status: activeTask?.step >= 4 ? 'completed' : activeTask?.step === 3 ? 'processing' : 'pending', duration: activeTask?.step >= 4 ? '1m 20s' : activeTask?.step === 3 ? 'Running...' : '-' },
    { name: 'IG Publishing', status: activeTask?.step >= 5 ? 'completed' : activeTask?.step === 4 ? 'processing' : 'pending', duration: activeTask?.step >= 5 ? 'Done' : activeTask?.step === 4 ? 'Running...' : '-' },
  ];

  const handleStartAutomation = async () => {
    // Sanitize URL: Extract actual URL if logs were pasted by mistake
    const urlMatch = shopeeUrl.match(/https?:\/\/[^\s]+/);
    const cleanUrl = urlMatch ? urlMatch[0] : shopeeUrl;

    if (!cleanUrl || !cleanUrl.startsWith('http')) {
      alert("Silakan masukkan link Shopee yang valid.");
      return;
    }

    setIsProcessing(true);
    setActiveTask({
      id: `REEL-${Math.floor(Math.random() * 9000) + 1000}`,
      name: "Connecting to Pipeline...",
      step: 0,
      product: null,
      script: null
    });

    try {
      const response = await fetch('/api/ai-reels/generate', {
        method: 'POST',
        body: JSON.stringify({ 
          url: cleanUrl,
          generateVoice: enableVoice,
          isMobile: isMobile
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setActiveTask((prev: any) => ({ 
          ...prev, 
          step: 5, 
          product: result.data.product,
          script: result.data.script 
        }));
      }
    } catch (error) {
      console.error("Automation failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkScreening = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
    if (urls.length === 0) return alert("Silakan masukkan minimal satu link Shopee.");

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai-reels/screen', {
        method: 'POST',
        body: JSON.stringify({ urls }),
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setBulkUrls("");
        fetchInventory();
      }
    } catch (error) {
      console.error("Screening failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoHunt = async (keyword: string) => {
    setIsProcessing(true);
    try {
      console.log("[Auto-Hunt] Discovering viral product links...");
      const discoverRes = await fetch('/api/ai-reels/discover', {
        method: 'POST',
        body: JSON.stringify({ keyword }),
        headers: { 'Content-Type': 'application/json' }
      });
      const discoverData = await discoverRes.json();
      
      if (discoverData.success && discoverData.data.length > 0) {
        console.log(`[Auto-Hunt] Found ${discoverData.data.length} links. Starting screening...`);
        // Jalankan screening untuk link-link yang ditemukan
        const screenRes = await fetch('/api/ai-reels/screen', {
          method: 'POST',
          body: JSON.stringify({ urls: discoverData.data }),
          headers: { 'Content-Type': 'application/json' }
        });
        const screenData = await screenRes.json();
        
        if (screenData.success) {
          alert(`Auto-Hunt Selesai! ${screenData.data.length} produk viral berhasil masuk inventory.`);
          fetchInventory();
        }
      } else {
        alert("Tidak menemukan produk viral dengan keyword tersebut. Coba keyword lain.");
      }
    } catch (error) {
      console.error("Auto-hunt failed:", error);
      alert("Gagal berburu produk. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/ai-reels/screen');
      const result = await response.json();
      if (result.success) setInventory(result.data);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    }
  };

  // Initial fetch
  useState(() => {
    fetchInventory();
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-slate-900 to-black px-8 py-12 shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 font-black text-xs mb-4 tracking-[0.2em] uppercase">
            <Sparkles className="h-4 w-4" />
            <span>Next-Gen Content Automation</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl lg:text-6xl">
            AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Affiliate</span> Reels
          </h1>
          <p className="mt-6 max-w-2xl text-slate-400 text-lg leading-relaxed">
            Otomasi penuh dari pencarian produk Shopee viral, pembuatan script AI, pengisian suara, hingga upload otomatis ke Instagram Reels.
          </p>
        </div>
        
        {/* Animated Orbs */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-96 w-96 bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-3">
          {[
            { id: 'pipeline', label: 'Automation Pipeline', icon: Zap },
            { id: 'inventory', label: 'Product Inventory', icon: Database },
            { id: 'library', label: 'Video Library', icon: Video },
            { id: 'cookies', label: 'Cookies & Settings', icon: Settings },
            { id: 'accounts', label: 'Social Accounts', icon: Instagram },
            { id: 'analytics', label: 'Performance', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all",
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xl shadow-slate-200/50 dark:shadow-none border border-indigo-100 dark:border-indigo-900/50"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-8">
          {activeTab === 'pipeline' && (
            <>
              {/* Product Scraper Input */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center">
                    <Search className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-slate-900 dark:text-white">Start New Automation</h4>
                    <p className="text-sm text-slate-500">Paste your target Shopee product link below.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={shopeeUrl}
                    onChange={(e) => setShopeeUrl(e.target.value)}
                    placeholder="https://shopee.co.id/product-link-here..." 
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all h-14"
                  />
                  <button 
                    onClick={handleStartAutomation}
                    disabled={isProcessing || !shopeeUrl}
                    className="bg-indigo-600 disabled:opacity-50 text-white px-8 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                    GENERATE REEL
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button 
                    onClick={() => setEnableVoice(!enableVoice)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      enableVoice 
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                        : "bg-slate-50 text-slate-400 border border-slate-100"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded-full flex items-center justify-center transition-all",
                      enableVoice ? "bg-indigo-600" : "bg-slate-300"
                    )}>
                      {enableVoice && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    Generate Voice AI
                  </button>

                  <button 
                    onClick={() => setIsMobile(!isMobile)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      isMobile 
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                        : "bg-slate-50 text-slate-400 border border-slate-100"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded-full flex items-center justify-center transition-all",
                      isMobile ? "bg-indigo-600" : "bg-slate-300"
                    )}>
                      {isMobile && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    Scraper via HP (Mobile)
                  </button>

                  <span className="text-[10px] text-slate-400 font-medium italic">
                    {enableVoice ? "Bot will generate audio narration using AI Voice." : "Bot will skip audio generation."}
                  </span>
                </div>
              </div>

              {/* Bulk Screening Input */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 bg-purple-100 dark:bg-purple-950/30 rounded-2xl flex items-center justify-center">
                    <List className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-slate-900 dark:text-white">Bulk Product Screening</h4>
                    <p className="text-sm text-slate-500">Paste multiple URLs (one per line) to scan for videos.</p>
                  </div>
                </div>
                <textarea 
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  placeholder="https://shopee.co.id/product-1&#10;https://shopee.co.id/product-2"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-6 text-xs font-mono mb-4 min-h-[120px] focus:ring-2 focus:ring-purple-500 transition-all"
                />
                <button 
                  onClick={handleBulkScreening}
                  disabled={isProcessing || !bulkUrls}
                  className="w-full bg-purple-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                  RUN SCREENING ENGINE
                </button>

                <div className="relative my-8 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
                  <span className="relative px-4 bg-white dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">Or Let Bot Hunt for You</span>
                </div>

                <div className="flex gap-3">
                  <input 
                    type="text" 
                    id="huntKeyword"
                    placeholder="Search keyword (e.g. viral, unik, murah)"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-xs font-bold focus:ring-2 focus:ring-amber-500 transition-all h-14"
                  />
                  <button 
                    onClick={() => {
                      const kw = (document.getElementById('huntKeyword') as HTMLInputElement).value;
                      handleAutoHunt(kw);
                    }}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 disabled:opacity-50 text-white px-8 rounded-2xl font-black text-sm hover:from-amber-600 hover:to-orange-700 transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-orange-500/20"
                  >
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                    AUTO-HUNT VIRAL
                  </button>
                </div>
              </div>

              {/* Pipeline Tracker - Visible only when task is active */}
              {activeTask && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-black text-xl text-slate-900 dark:text-white">Active Pipeline Tracker</h3>
                      <p className="text-sm text-slate-500 mt-1">ID: #{activeTask.id} — Processing Product Assets</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest">
                      {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      {isProcessing ? 'In Progress' : 'Completed'}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-100 dark:bg-slate-800" />
                    <div className="grid grid-cols-5 gap-4">
                      {steps.map((step, i) => (
                        <div key={i} className="relative z-10 flex flex-col items-center text-center">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 transition-all duration-500",
                            step.status === 'completed' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                            step.status === 'processing' ? "bg-indigo-600 text-white animate-pulse shadow-lg shadow-indigo-600/20" :
                            "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          )}>
                            {step.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : 
                             step.status === 'processing' ? <Loader2 className="h-5 w-5 animate-spin" /> :
                             <span className="text-xs font-black">{i + 1}</span>}
                          </div>
                          <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{step.name}</span>
                          <span className="mt-1 text-[10px] font-bold text-slate-500">{step.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

                {/* AI Scripting Preview */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <div className="h-12 w-12 bg-purple-100 dark:bg-purple-950/30 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-white mb-2">AI Script Generation</h4>
                  <p className="text-sm text-slate-500 mb-6">Generated script preview for current active product.</p>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-xs italic text-slate-600 dark:text-slate-400 border-l-4 border-purple-500">
                    {activeTask?.script ? (
                      <>
                        <p className="font-black text-indigo-600 mb-1">SCRIPT (VOICE):</p>
                        <p className="mb-4">{activeTask.script.script}</p>
                        <p className="font-black text-purple-600 mb-1">CAPTION (IG):</p>
                        <p className="whitespace-pre-wrap">{activeTask.script.caption}</p>
                      </>
                    ) : "Waiting for AI generation..."}
                  </div>
                </div>
            </>
          )}

          {activeTab === 'inventory' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white">Product Inventory</h3>
                  <p className="text-sm text-slate-500">Screened products ready for AI Video Pipeline.</p>
                </div>
                <button onClick={fetchInventory} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 transition-all">
                  <Clock className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Product Info</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Stats</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Video</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {inventory.length > 0 ? inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                              {item.image_url && <img src={item.image_url} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <div className="max-w-xs">
                              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.title}</p>
                              <a href={item.affiliate_url} target="_blank" className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1 mt-1">
                                View Link <ExternalLink className="h-2 w-2" />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                              <Sparkles className="h-3 w-3 text-amber-500" /> {item.rating}
                            </div>
                            <div className="text-[10px] text-slate-500">{item.sold} sold</div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {item.has_video ? (
                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 w-fit">
                              <Video className="h-3 w-3" /> Ready
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 w-fit">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                             item.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                           )}>
                             {item.status}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                          <button 
                            onClick={() => { setShopeeUrl(item.affiliate_url); setActiveTab('pipeline'); }}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                          >
                            <Zap className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 text-slate-400">
                            <Database className="h-12 w-12 opacity-20" />
                            <p className="font-bold">No products in inventory yet.</p>
                            <button onClick={() => setActiveTab('pipeline')} className="text-indigo-500 text-xs hover:underline">Run screening to find products</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'library' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="group relative bg-slate-900 rounded-3xl overflow-hidden aspect-[9/16] shadow-lg transition-all hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer">
                      <Play className="h-8 w-8 fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 z-20">
                    <p className="text-xs font-black text-white/60 mb-1 uppercase tracking-widest">Rendered 2h ago</p>
                    <h5 className="text-sm font-bold text-white line-clamp-2">Vacuum Cleaner Wireless Pro X10</h5>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Shopee Cookies */}
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="max-w-2xl">
                  <div className="h-16 w-16 bg-orange-100 dark:bg-orange-950/30 rounded-3xl flex items-center justify-center mb-8">
                    <Search className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Shopee Session</h3>
                  <p className="text-slate-500 leading-relaxed mb-10">
                    Paste JSON Cookies Shopee Anda di sini untuk menghindari Captcha.
                  </p>

                  <div className="space-y-6">
                    <textarea 
                      value={shopeeCookies}
                      onChange={(e) => setShopeeCookies(e.target.value)}
                      placeholder='Paste Shopee JSON cookies...'
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-[1.5rem] p-6 text-xs font-mono focus:ring-2 focus:ring-orange-500 h-48 transition-all"
                    />
                    <button 
                      onClick={() => handleSaveCookies('shopee')}
                      className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-orange-700 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      SIMPAN COOKIES SHOPEE
                    </button>
                  </div>
                </div>
              </div>

              {/* Instagram Cookies */}
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="max-w-2xl">
                  <div className="h-16 w-16 bg-pink-100 dark:bg-pink-950/30 rounded-3xl flex items-center justify-center mb-8">
                    <Instagram className="h-8 w-8 text-pink-600" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Instagram Session</h3>
                  <p className="text-slate-500 leading-relaxed mb-10">
                    Paste JSON Cookies Instagram Anda di sini untuk upload otomatis tanpa login ulang.
                  </p>

                  <div className="space-y-6">
                    <textarea 
                      value={igCookies}
                      onChange={(e) => setIgCookies(e.target.value)}
                      placeholder='Paste Instagram JSON cookies...'
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-[1.5rem] p-6 text-xs font-mono focus:ring-2 focus:ring-pink-500 h-48 transition-all"
                    />
                    <button 
                      onClick={() => handleSaveCookies('instagram')}
                      className="bg-pink-600 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-pink-700 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      SIMPAN COOKIES INSTAGRAM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
