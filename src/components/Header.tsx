"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Menu, CheckCheck, X, RefreshCw, FileText } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { menuData } from "./Sidebar";

interface Notif {
  nomor: number;
  modul: string;
  judul: string;
  isi: string;
  ref_kode: string;
  dibaca: number;
  dibuat_pada: string;
}

const MODULE_HREF: Record<string, string> = {
  "Permintaan Pembelian": "/pembelian/permintaan",
  "Order Pembelian": "/pembelian/order",
  "Penerimaan Barang": "/pembelian/penerimaan",
  "Nota Pembelian": "/pembelian/nota",
  "Retur Beli": "/pembelian/retur",
  "Nota Kredit Supplier": "/pembelian/nks",
  "Nota Debet Supplier": "/pembelian/nds",
  "Uang Muka Supplier": "/pembelian/ums",
  "Order Penjualan": "/penjualan/order",
  "Delivery Order": "/penjualan/delivery",
  "Surat Jalan": "/penjualan/surat-jalan",
  "Nota Penjualan": "/penjualan/nota",
  "Retur Jual": "/penjualan/retur",
  "Nota Kredit Customer": "/penjualan/nkc",
  "Nota Debet Customer": "/penjualan/ndc",
  "Uang Muka Customer": "/penjualan/umc",
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}


export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bellShake, setBellShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [transactionResults, setTransactionResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search for transactions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setTransactionResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setTransactionResults(data.data);
        }
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Flattened Menu List
  const flattenedMenus = useMemo(() => {
    const list: { title: string; href: string; icon: any; parent?: string }[] = [];
    menuData.forEach(section => {
      section.items.forEach(item => {
        if (item.subItems) {
          item.subItems.forEach(sub => {
            list.push({ title: sub.title, href: sub.href, icon: sub.icon, parent: item.title });
          });
        } else if (item.href) {
          list.push({ title: item.title, href: item.href, icon: item.icon, parent: section.title });
        }
      });
    });
    return list;
  }, []);

  const filteredMenus = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return flattenedMenus.filter((m: any) =>
      m.title.toLowerCase().includes(q) ||
      (m.parent?.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [searchQuery, flattenedMenus]);

  const totalResults = filteredMenus.length + transactionResults.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, transactionResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearch || totalResults === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalResults);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalResults) % totalResults);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredMenus.length) {
        const selected = filteredMenus[selectedIndex];
        router.push(selected.href);
      } else {
        const selected = transactionResults[selectedIndex - filteredMenus.length];
        router.push(selected.href);
      }
      setSearchQuery("");
      setShowSearch(false);
    } else if (e.key === 'Escape') {
      setShowSearch(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getPageTitle = () => {
    // if (pathname === "/") return "Dashboard Overview";
    // const parts = pathname.split('/').filter(Boolean);
    // return parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(" / ");
    if (pathname === "/") return "Dashboard Overview";

    const parts = pathname.split('/').filter(Boolean);

    return parts
      .slice(0, 2) // 👈 ambil hanya 2 level pertama
      .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" / ");


  };

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifikasi');
      const data = await res.json();
      if (data.success) {
        setNotifs(data.data);
        setUnread(data.unreadCount);
      }
    } catch { /* silent fail */ }
  }, []);

  // Session Sync Logic
  const [userSession, setUserSession] = useState<any>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (typeof window !== 'undefined') setIsOnline(true);
      
      const data = await res.json();
      if (data.success && data.data) {
        // Update local session state
        setUserSession(data.data);
        // Sync global variable for legacy compatibility if needed
        if (typeof window !== 'undefined') {
          (window as any).__USER__ = data.data;
        }
      }
    } catch { 
      if (typeof window !== 'undefined') setIsOnline(false);
    }
  }, []);

  // Initialize from global or fetch
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__USER__) {
      setUserSession((window as any).__USER__);
    } else {
      refreshSession();
    }
  }, [refreshSession]);

  // Tab Sync & Focus Refresh
  useEffect(() => {
    // 1. Sync via BroadcastChannel (immediate)
    const channel = new BroadcastChannel('erp-session-sync');
    channel.onmessage = (event) => {
      if (event.data === 'REFRESH_SESSION') {
        refreshSession();
      }
    };

    // 2. Sync via Focus (when user switches back to this tab)
    const handleFocus = () => {
      refreshSession();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshSession();
    });

    return () => {
      channel.close();
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSession]);

  // Web Push Subscription
  useEffect(() => {
    const subscribeToPush = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      
      try {
        const swReg = await navigator.serviceWorker.register('/sw.js');
        
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') return;

        // Fetch public key
        const res = await fetch('/api/notifikasi/push/config');
        const { data, success } = await res.json();
        if (!success) return;

        // Convert base64 public key to UInt8Array needed by subscribe
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };

        const subscription = await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey)
        });

        // Send to backend
        await fetch('/api/notifikasi/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });

      } catch (error) {
        console.error('Push Subscription failed:', error);
      }
    };

    subscribeToPush();
  }, []);

  // Offline Sync Messaging
  const [offlineToast, setOfflineToast] = useState<{show: boolean, msg: string, type: 'info'|'success'}>({show: false, msg: '', type: 'info'});
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OFFLINE_QUEUED') {
        setOfflineToast({ show: true, msg: 'Sistem Offline. Data disimpan & menunggu sinkronisasi.', type: 'info' });
        setTimeout(() => setOfflineToast(prev => ({ ...prev, show: false })), 5000);
      } else if (event.data && event.data.type === 'SYNC_SUCCESS') {
        setOfflineToast({ show: true, msg: `Sinkronisasi Offline Berhasil (${event.data.payload?.count || 1} data dikirim)`, type: 'success' });
        setTimeout(() => setOfflineToast(prev => ({ ...prev, show: false })), 8000);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }
    
    // Explicitly force sync when returning online, as background sync API can be delayed
    const handleOnline = () => {
      setIsOnline(true);
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'FORCE_SYNC' });
      } else if ('serviceWorker' in navigator) {
        // Fallback if controller isn't active yet but SW exists
        navigator.serviceWorker.ready.then(reg => {
          if (reg.active) reg.active.postMessage({ type: 'FORCE_SYNC' });
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Fallback Polling (since Windows Chrome with active localhost/VMWare adapters can miss offline events)
    const intervalId = setInterval(() => {
      fetch('/api/auth/session', { method: 'HEAD', cache: 'no-store' })
        .then(() => {
          setIsOnline(prev => {
            if (!prev) handleOnline();
            return true;
          });
        })
        .catch(() => {
          setIsOnline(false);
        });
    }, 5000);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);
  // SSE — real-time push from server, no page refresh needed
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource('/api/notifikasi/stream');

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'init') {
            setUnread(msg.unreadCount);
          } else if (msg.type === 'new') {
            // Prepend new notifications to list
            setNotifs(prev => [...(msg.notifications as Notif[]).reverse(), ...prev]);
            setUnread(msg.unreadCount);
            // Shake bell briefly for UX
            setBellShake(true);
            setTimeout(() => setBellShake(false), 600);
          }
        } catch { /* ignore parse error */ }
      };

      es.onerror = () => {
        es?.close();
        // Reconnect after 10s
        reconnectTimer = setTimeout(connect, 10000);
      };
    };

    connect();
    // Also do a full fetch on mount to populate the list
    fetchNotifs();

    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, [fetchNotifs]);


  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = async () => {
    setOpen(prev => !prev);
    if (!open) {
      setLoading(true);
      await fetchNotifs();
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    await fetch('/api/notifikasi', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) });
    setNotifs(prev => prev.map(n => ({ ...n, dibaca: 1 })));
    setUnread(0);
  };

  const markRead = async (id: number, href?: string) => {
    await fetch('/api/notifikasi', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setNotifs(prev => prev.map(n => n.nomor === id ? { ...n, dibaca: 1 } : n));
    setUnread(prev => Math.max(0, prev - 1));
    if (href) window.location.href = href;
    else setOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-4">
        <div className="lg:hidden w-9" />
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            {getPageTitle()}
          </h1>
          {/* Active Company and Branch Indicator */}
          {mounted && userSession && (
            <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold uppercase tracking-wider">
              <span className="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 shadow-sm">
                {userSession?.active_perusahaan_nama || 'No Company'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-800 shadow-sm">
                {userSession?.active_cabang_nama || 'No Branch'}
              </span>
              <Link
                href="/login/select"
                className="ml-1 p-1 rounded-md bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-all border border-slate-200 hover:border-indigo-200"
                title="Ganti Perusahaan / Cabang"
              >
                <RefreshCw className="h-2.5 w-2.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Ketik untuk mencari menu..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            onKeyDown={handleKeyDown}
            className="h-9 w-64 rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500 font-medium"
          />

          {/* Search Results Dropdown */}
          {showSearch && (filteredMenus.length > 0 || transactionResults.length > 0 || isSearching) && (
            <div className="absolute left-0 top-11 w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* ── MENU RESULTS ── */}
              {filteredMenus.length > 0 && (
                <>
                  <div className="p-2 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-indigo-600">Navigasi Menu</span>
                  </div>
                  <div className="py-1">
                    {filteredMenus.map((menu, idx) => (
                      <button
                        key={menu.href}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          router.push(menu.href);
                          setSearchQuery("");
                          setShowSearch(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2 flex items-center gap-3 transition-colors",
                          selectedIndex === idx
                            ? "bg-indigo-600 text-white"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <div className={cn(
                          "h-7 w-7 rounded flex items-center justify-center shrink-0",
                          selectedIndex === idx ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}>
                          <menu.icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate tracking-tight">{menu.title}</p>
                        </div>
                        <span className={cn(
                          "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                          selectedIndex === idx ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                          {menu.parent}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* ── TRANSACTION RESULTS ── */}
              {transactionResults.length > 0 && (
                <>
                  <div className="p-2 border-t border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-rose-600">Data Transaksi</span>
                  </div>
                  <div className="py-1 max-h-[250px] overflow-y-auto">
                    {transactionResults.map((tx, idx) => {
                      const absoluteIdx = filteredMenus.length + idx;
                      return (
                        <button
                          key={tx.type + tx.nomor}
                          onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                          onClick={() => {
                            router.push(tx.href);
                            setSearchQuery("");
                            setShowSearch(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors",
                            selectedIndex === absoluteIdx
                              ? "bg-indigo-600 text-white"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
                            selectedIndex === absoluteIdx ? "bg-white/20 border-white/30" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                          )}>
                            <FileText className={cn("h-4 w-4", selectedIndex === absoluteIdx ? "text-white" : "text-rose-500")} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold truncate tracking-tight">{tx.kode}</p>
                              <span className={cn("text-[9px] font-mono", selectedIndex === absoluteIdx ? "text-indigo-100" : "text-slate-400")}>
                                {new Date(tx.tanggal).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                            <p className={cn(
                              "text-[10px] font-bold uppercase",
                              selectedIndex === absoluteIdx ? "text-indigo-200" : "text-slate-400"
                            )}>
                              {tx.type}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {isSearching && (
                <div className="p-4 text-center">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                  <p className="text-xs text-slate-400 mt-2">Mencari data...</p>
                </div>
              )}

              {!isSearching && totalResults === 0 && searchQuery.length >= 2 && (
                <div className="p-8 text-center">
                  <Search className="h-8 w-8 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                  <p className="text-sm text-slate-400">Tidak ditemukan hasil untuk "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Network Status Badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
          isOnline 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800'
        }`} title={isOnline ? 'Sistem Online' : 'Sistem Offline - Data akan disimpan sementara'}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            isOnline 
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
              : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse'
          }`}></span>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleOpen}
            className={`relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${bellShake ? 'animate-bounce' : ''}`}
            title="Notifikasi"
          >
            <Bell className={`h-5 w-5 transition-transform ${bellShake ? 'text-indigo-500' : ''}`} />
            {unread > 0 && (
              <span className="absolute right-1 top-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold border-2 border-white dark:border-slate-950 leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-600" />
                  <span className="font-bold text-sm text-slate-800 dark:text-white">Notifikasi</span>
                  {unread > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">{unread} belum dibaca</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button onClick={markAllRead} title="Tandai semua dibaca" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors">
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <div className="py-8 text-center text-sm text-slate-400">Memuat notifikasi...</div>
                ) : notifs.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400">Tidak ada notifikasi</p>
                  </div>
                ) : notifs.map(n => {
                  const href = n.ref_kode && MODULE_HREF[n.modul]
                    ? `${MODULE_HREF[n.modul]}/${n.ref_kode}`
                    : MODULE_HREF[n.modul];
                  return (
                    <button
                      key={n.nomor}
                      onClick={() => markRead(n.nomor, href)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${n.dibaca ? 'opacity-60' : ''}`}
                    >
                      {/* Unread dot */}
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.dibaca ? 'bg-transparent' : 'bg-indigo-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-semibold truncate ${n.dibaca ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                            {n.judul}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">{timeAgo(n.dibuat_pada)}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.isi}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="inline-block px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold rounded">{n.modul}</span>
                          {n.ref_kode && <span className="text-[10px] font-mono text-slate-400">#{n.ref_kode}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <a href="/setting/notifikasi" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  ⚙ Setting notifikasi
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Offline Toast */}
      {offlineToast.show && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-300 ${
          offlineToast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800'
        }`}>
          {offlineToast.type === 'success' ? '✅' : '📶'}
          {offlineToast.msg}
          <button onClick={() => setOfflineToast(prev => ({...prev, show: false}))} className="ml-2 hover:opacity-75">✕</button>
        </div>
      )}
    </header>
  );
}
