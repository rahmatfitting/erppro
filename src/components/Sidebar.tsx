"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Truck,
  Receipt,
  PackageOpen,
  Settings,
  ChevronDown,
  Database,
  Layers,
  Tags,
  Archive,
  Building2,
  Store,
  Users,
  LogOut,
  Wallet,
  BookOpen,
  FileX,
  CreditCard,
  Banknote,
  X,
  Menu,
  Bell,
  ArrowDownCircle,
  ArrowUpCircle,
  MapPin,
  ShieldCheck,
  Cpu,
  Activity,
  ClipboardList,
  SearchCheck,
  Zap,
  Wrench,
  PackagePlus,
  PackageMinus,
  BarChart3,
  BarChart2,
  Calendar,
  Coins,
  TrendingUp,
  Crown,
  Waves,
  GitMerge,
  Clock,
  Globe,
  Crosshair,
  Ticket,
  Target,
  Bot,
  Camera,
  HardHat,
  Briefcase,
  PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MenuSection = {
  title: string;
  items: MenuItem[];
};

export type MenuItem = {
  title: string;
  href?: string;
  icon: any;
  subItems?: { title: string; href: string; icon: any }[];
};

/**
 * Returns a flat list of all menu titles for permissions matching
 */
export function getAllMenuTitles(): string[] {
  const titles: string[] = [];
  menuData.forEach(section => {
    section.items.forEach(item => {
      if (item.subItems) {
        item.subItems.forEach(sub => titles.push(sub.title));
      } else {
        titles.push(item.title);
      }
    });
  });
  return Array.from(new Set(titles)); // Unique titles
}

/**
 * Returns categorized menu titles for the permissions matrix UI
 */
export function getGroupedMenuTitles(): { section: string; menus: string[] }[] {
  return menuData.map(section => {
    const menus: string[] = [];
    section.items.forEach(item => {
      if (item.subItems) {
        item.subItems.forEach(sub => menus.push(sub.title));
      } else {
        menus.push(item.title);
      }
    });
    return { section: section.title, menus };
  }).filter(s => s.menus.length > 0);
}

export const menuData: MenuSection[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Dashboard V2",
        href: "/v2",
        icon: Activity,
      },
      {
        title: "Monitoring Emas",
        href: "/gold-prices",
        icon: BarChart3,
      },
      {
        title: "Monitoring Buyback",
        href: "/gold-buyback",
        icon: Wallet,
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        title: "Koneksi",
        icon: Database,
        subItems: [
          { title: "Master Barang", href: "/master/barang", icon: Tags },
          { title: "Kategori Barang", href: "/master/kategori", icon: Layers },
          { title: "Master Satuan", href: "/master/satuan", icon: Archive },
          { title: "Master Supplier", href: "/master/supplier", icon: Building2 },
          { title: "Master Customer", href: "/master/customer", icon: Users },
          { title: "Master Gudang", href: "/master/gudang", icon: PackageOpen },
          { title: "Master Sales", href: "/master/sales", icon: ShoppingCart },
          { title: "Master Perusahaan", href: "/master/perusahaan", icon: Building2 },
          { title: "Master Cabang", href: "/master/cabang", icon: MapPin },
          { title: "Master Promo", href: "/master/promo", icon: Ticket },
        ],
      },
      {
        title: "Finansial",
        icon: Wallet,
        subItems: [
          { title: "Valuta", href: "/master/valuta", icon: Wallet },
          { title: "Master Account", href: "/master/account", icon: BookOpen },
          { title: "Jenis Penyesuaian", href: "/master/penyesuaian", icon: Wallet },
        ]
      }
    ],
  },
  {
    title: "Transaksi",
    items: [
      {
        title: "Pembelian",
        icon: ShoppingCart,
        subItems: [
          { title: "Permintaan Pembelian", href: "/pembelian/permintaan", icon: FileText },
          { title: "Order Pembelian", href: "/pembelian/order", icon: Receipt },
          { title: "Penerimaan Barang", href: "/pembelian/penerimaan", icon: Truck },
          { title: "Nota Pembelian", href: "/pembelian/nota", icon: FileText },
          { title: "Nota Beli Langsung", href: "/pembelian/nota-beli-langsung", icon: FileText },
          { title: "Retur Beli", href: "/pembelian/retur", icon: FileX },
          { title: "Nota Kredit Supplier", href: "/pembelian/nks", icon: CreditCard },
          { title: "Nota Debet Supplier", href: "/pembelian/nds", icon: FileText },
          { title: "Uang Muka Supplier", href: "/pembelian/ums", icon: Banknote },
        ],
      },
      {
        title: "Penjualan",
        icon: Receipt,
        subItems: [
          { title: "Penawaran (Quotation)", href: "/penawaran", icon: FileText },
          { title: "Order Penjualan", href: "/penjualan/order", icon: FileText },
          { title: "Delivery Order", href: "/penjualan/delivery", icon: Truck },
          { title: "Surat Jalan", href: "/penjualan/surat-jalan", icon: Truck },
          { title: "Nota Penjualan", href: "/penjualan/nota", icon: Receipt },
          { title: "Nota Jual Emas", href: "/penjualan/nota-emas", icon: Coins },
          { title: "Retur Jual", href: "/penjualan/retur", icon: FileX },
          { title: "Nota Kredit Customer", href: "/penjualan/nkc", icon: CreditCard },
          { title: "Nota Debet Customer", href: "/penjualan/ndc", icon: FileText },
          { title: "Uang Muka Customer", href: "/penjualan/umc", icon: Banknote },
          { title: "POS Kasir", href: "/penjualan/pos/create", icon: Store },
          { title: "Riwayat POS", href: "/penjualan/pos", icon: FileText },
          { title: "Settlement POS", href: "/penjualan/pos/settlement", icon: SearchCheck },
          { title: "Riwayat Settlement", href: "/penjualan/pos/settlement/history", icon: Calendar },
        ],
      },
      {
        title: "Keuangan",
        icon: Wallet,
        subItems: [
          { title: "Uang Masuk Utama", href: "/keuangan/uang-masuk-utama", icon: ArrowDownCircle },
          { title: "Uang Masuk Lain", href: "/keuangan/uang-masuk-lain", icon: ArrowDownCircle },
          { title: "Uang Keluar Utama", href: "/keuangan/uang-keluar-utama", icon: ArrowUpCircle },
          { title: "Uang Keluar Lain", href: "/keuangan/uang-keluar-lain", icon: ArrowUpCircle },
        ],
      },
      {
        title: "Produksi (PPIC)",
        icon: Cpu,
        subItems: [
          { title: "BOM", href: "/ppic/bom", icon: Cpu },
          { title: "Production Plan", href: "/ppic/prodplan", icon: Activity },
          { title: "Work Order", href: "/ppic/workorder", icon: ClipboardList },
          { title: "Material Check", href: "/ppic/matcheck", icon: SearchCheck },
        ],
      },
      {
        title: "Produksi (Aktivitas)",
        icon: Wrench,
        subItems: [
          { title: "Bon Bahan", href: "/ppic/bonbahan", icon: PackageMinus },
          { title: "Hasil Produksi", href: "/ppic/hasilproduksi", icon: PackagePlus },
          { title: "Pengembalian Bahan", href: "/ppic/kembalibahan", icon: Wrench },
        ],
      },
      {
        title: "Stok",
        icon: Archive,
        subItems: [
          { title: "Stok Opname", href: "/stok/opname", icon: FileText },
          { title: "Transfer Antar Gudang", href: "/stok/pengiriman", icon: Truck },
          { title: "Pemakaian Internal", href: "/stok/pemakaian-internal", icon: PackageOpen },
          { title: "Transformasi Barang", href: "/stok/ubah-bentuk", icon: Tags },
        ],
      },
    ],
  },
  {
    title: "Laporan",
    items: [
      {
        title: "Stok",
        href: "/report/stok",
        icon: Archive,
      },
      {
        title: "Pembelian",
        href: "/report/pembelian",
        icon: BarChart3,
      },
      {
        title: "Penjualan",
        href: "/report/penjualan",
        icon: BarChart3,
      },
      {
        title: "Hutang",
        href: "/report/hutang",
        icon: CreditCard,
      },
      {
        title: "Piutang",
        href: "/report/piutang",
        icon: Receipt,
      },
      {
        title: "Laba Rugi",
        href: "/report/laba-rugi",
        icon: BarChart3,
      },
      {
        title: "Kas Bank",
        href: "/keuangan/laporan-kas-bank",
        icon: Banknote,
      },
      {
        title: "Laporan Promo",
        href: "/report/promo",
        icon: Ticket,
      },
    ],
  },
  {
    title: "Proyek & Lapangan",
    items: [
      {
        title: "Manajemen Proyek",
        icon: Briefcase,
        subItems: [
          { title: "Daftar Proyek", href: "/proyek", icon: Briefcase },
          { title: "RAB (Anggaran)", href: "/rab", icon: ClipboardList },
          { title: "Timeline", href: "/proyek/timeline", icon: Calendar },
          { title: "Progress Report", href: "/proyek/progress", icon: Camera },
          { title: "Dokumentasi Lapangan", href: "/proyek/dokumentasi", icon: Camera },
          { title: "Subkontraktor", href: "/master/subkontraktor", icon: HardHat },
        ]
      }
    ]
  },
  {
    title: "Travel Management",
    items: [
      {
        title: "Travel Dashboard",
        href: "/travel/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Fleet & Driver",
        icon: Truck,
        subItems: [
          { title: "Armada Kendaraan", href: "/travel/fleet/vehicles", icon: Truck },
          { title: "Manajemen Driver", href: "/travel/fleet/drivers", icon: Users },
          { title: "Monitoring Servis", href: "/travel/fleet/maintenance", icon: Wrench },
        ],
      },
      {
        title: "Rute & Jadwal",
        icon: MapPin,
        subItems: [
          { title: "Master Rute", href: "/travel/schedule/routes", icon: Globe },
          { title: "Jadwal Keberangkatan", href: "/travel/schedule/timetables", icon: Clock },
        ],
      },
      {
        title: "Booking System",
        icon: Ticket,
        subItems: [
          { title: "Reservasi Baru", href: "/travel/booking/new", icon: PlusCircle },
          { title: "Daftar Booking", href: "/travel/booking/list", icon: ClipboardList },
          { title: "Manifest Penumpang", href: "/travel/booking/manifest", icon: Users },
          { title: "Daftar Pembayaran", href: "/travel/booking/payments", icon: CreditCard },
        ],
      },
      {
        title: "Laporan Finansial",
        href: "/travel/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Market Intelligence",
    items: [
      {
        title: "Master Flow AI",
        href: "/crypto/market-scan",
        icon: Crosshair,
      },
      {
        title: "Whale Flow Screener",
        href: "/crypto/whale",
        icon: Waves,
      },
      {
        title: "Volume Spike AI",
        href: "/crypto/volume",
        icon: BarChart2,
      },
      {
        title: "Inflow / Outflow AI",
        href: "/crypto/flow",
        icon: Activity,
      },
      {
        title: "Crypto FVG Screener",
        href: "/crypto/fvg",
        icon: TrendingUp,
      },
      {
        title: "Crypto SMC Screener",
        href: "/crypto/smc",
        icon: Zap,
      },
      {
        title: "Visual Market Screener",
        href: "/crypto/visual-screener",
        icon: Layers,
      },
      {
        title: "RSI Heatmap",
        href: "/crypto/rsi",
        icon: BarChart3,
      },
      {
        title: "Reversal Sniper",
        href: "/crypto/reversal",
        icon: Crosshair,
      },
      {
        title: "Hedge Fund Screener",
        href: "/crypto/hedge",
        icon: Crown,
      },
      {
        title: "Liquidity Sweep",
        href: "/crypto/sweep",
        icon: Waves,
      },
      {
        title: "Hammer Reversal",
        href: "/crypto/hammer",
        icon: Crosshair,
      },
      {
        title: "Top Trader Flow",
        href: "/crypto/trader",
        icon: Users,
      },
      {
        title: "Divergence Screener",
        href: "/crypto/divergence",
        icon: GitMerge,
      },
      {
        title: "ICT Kill Zone",
        href: "/crypto/ict",
        icon: Clock,
      },
      {
        title: "Break Trendline MTF",
        href: "/crypto/trendline",
        icon: TrendingUp,
      },
      {
        title: "Funding Fee Farming",
        href: "/crypto/funding-farming",
        icon: Coins,
      },
      // {
      //   title: "ETHUSDT 5M Scalper",
      //   href: "/crypto/ethusdt5m",
      //   icon: Crosshair,
      // },
      {
        title: "Crypto SMC 5M Multi-Pair",
        href: "/crypto/scalp5m",
        icon: Zap,
      },
      {
        title: "EMA MTF Screener",
        href: "/ema-screener",
        icon: Activity,
      },
      {
        title: "Auto FVG Trading Bot",
        href: "/crypto/bot",
        icon: Bot,
      },
    ],
  },
  {
    title: "Forex Intelligence",
    items: [
      {
        title: "Forex Probability",
        href: "/forex/screener",
        icon: TrendingUp,
      },
      {
        title: "XAUUSD AI Screener",
        href: "/forex/xauusd",
        icon: Target,
      },
      {
        title: "XAUUSD 5M Scalper",
        href: "/forex/xauusd5m",
        icon: Crosshair,
      },
      {
        title: "XAGUSD AI Screener",
        href: "/forex/xagusd",
        icon: Zap,
      },
      {
        title: "EURUSD AI Screener",
        href: "/forex/eurusd",
        icon: Globe,
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        title: "Manajemen Akses",
        icon: Settings,
        subItems: [
          { title: "Master User", href: "/master/user", icon: Users },
          { title: "User Akses Cabang", href: "/setting/user-akses", icon: ShieldCheck },
          { title: "Akses Gudang User", href: "/setting/user-akses/gudang", icon: Store },
          { title: "Akses Account User", href: "/setting/user-akses/account", icon: Wallet },
          { title: "Master Role", href: "/master/role", icon: Settings },
        ]
      },
      {
        title: "Setting",
        icon: Bell,
        subItems: [
          { title: "Setting Notifikasi", href: "/setting/notifikasi", icon: Bell },
        ]
      }
    ]
  }
];

// Sidebar inner content (shared between desktop & mobile drawer)
function SidebarContent({ user, onClose }: { user?: any; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  // Background Auto-Sync Gold Prices
  useEffect(() => {
    // Jalankan sync pertama kali setelah 5 detik apps diload
    const initialSync = setTimeout(() => {
      fetch('/api/gold-prices/sync').catch(() => { });
      fetch('/api/buyback-prices/sync').catch(() => { });
    }, 5000);

    // Kemudian sinkronisasikan setiap 1 jam (3600000 ms)
    const interval = setInterval(() => {
      fetch('/api/gold-prices/sync').catch(() => { });
      fetch('/api/buyback-prices/sync').catch(() => { });
    }, 3600000);

    return () => {
      clearTimeout(initialSync);
      clearInterval(interval);
    };
  }, []);

  // Inisialisasi: buka hanya menu yang mengandung halaman aktif
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of menuData) {
      for (const item of section.items) {
        if (item.subItems) {
          const isActive = item.subItems.some(
            sub => pathname === sub.href || pathname?.startsWith(sub.href + '/')
          );
          initial[item.title] = isActive;
        }
      }
    }
    return initial;
  });

  // Update openMenus when pathname changes (navigasi antar halaman)
  useEffect(() => {
    setOpenMenus(prev => {
      const next: Record<string, boolean> = {};
      for (const section of menuData) {
        for (const item of section.items) {
          if (item.subItems) {
            const isActive = item.subItems.some(
              sub => pathname === sub.href || pathname?.startsWith(sub.href + '/')
            );
            // Buka jika aktif; tutup jika tidak aktif (kecuali user sudah buka manual)
            next[item.title] = isActive ? true : (prev[item.title] && !isActive ? false : false);
          }
        }
      }
      return next;
    });
  }, [pathname]);

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    try {
      if (!confirm("Anda yakin ingin keluar?")) return;
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
    }
  };

  // Filter menu berdasarkan hak_akses
  const filteredMenuData = useMemo(() => {
    if (!user) return menuData;
    if (user.grup_nama === "Super Admin") return menuData;
    if (!user.hak_akses || !Array.isArray(user.hak_akses)) return [];

    return menuData.map(section => {
      const filteredItems = section.items.map(item => {
        if (item.subItems) {
          const filteredSubItems = item.subItems.filter(sub => {
            const alwaysShow = ["Daftar Proyek", "Timeline", "Progress Report", "Dokumentasi Lapangan", "Subkontraktor"].includes(sub.title);
            return alwaysShow || user.hak_akses.includes(sub.title);
          });
          return { ...item, subItems: filteredSubItems };
        } else {
          const alwaysShow = ["Daftar Proyek", "Timeline", "Progress Report", "Dokumentasi Lapangan", "Subkontraktor"].includes(item.title);
          if (user.hak_akses.includes(item.title) || item.title === "Dashboard" || alwaysShow) return item;
          return null;
        }
      }).filter(Boolean) as MenuItem[];

      const finalItems = filteredItems.filter(item => {
        if (item.subItems && item.subItems.length === 0) return false;
        return true;
      });

      return { ...section, items: finalItems };
    }).filter(section => section.items.length > 0);
  }, [user]);

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-white">
          {/* <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <Building2 className="h-5 w-5 text-white" />
          </div> */}
          <span>ERP Pro</span>
        </div>
        {/* Close button — only visible on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        <nav className="space-y-6">
          {filteredMenuData.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const isExpanded = openMenus[item.title];
                  const hasSubItems = item.subItems && item.subItems.length > 0;

                  return (
                    <div key={item.title}>
                      {hasSubItems ? (
                        <button
                          onClick={() => toggleMenu(item.title)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors",
                            "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/50 dark:hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            {item.title}
                          </div>
                          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                        </button>
                      ) : (
                        item.href && (
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/50 dark:hover:text-white"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.title}
                          </Link>
                        )
                      )}

                      {/* Sub Items */}
                      {hasSubItems && isExpanded && (
                        <div className="mt-1 flex flex-col space-y-1 pl-4">
                          <div className="border-l border-slate-200 pl-2 dark:border-slate-800 space-y-1 py-1">
                            {item.subItems?.map((subItem, _, arr) => {
                              const exactMatchExists = arr.some(sub => pathname === sub.href);
                              const isSubItemActive = exactMatchExists
                                ? pathname === subItem.href
                                : (pathname === subItem.href || pathname?.startsWith(subItem.href + '/'));
                              return (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  onClick={onClose}
                                  className={cn(
                                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-200 group relative",
                                    isSubItemActive
                                      ? "text-indigo-600 font-bold dark:text-indigo-400 bg-slate-50 dark:bg-slate-900/50"
                                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-50 dark:hover:bg-slate-900/50"
                                  )}
                                >
                                  {isSubItemActive && <span className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-950"></span>}
                                  <subItem.icon className={cn(
                                    "h-4 w-4 transition-colors",
                                    isSubItemActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-500"
                                  )} />
                                  {subItem.title}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer User */}
      {user && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all hover:shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm text-sm uppercase">
                {user.nama ? user.nama.substring(0, 2) : 'OU'}
              </div>
              <div className="flex flex-col truncate pr-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate" title={user.nama}>{user.nama || 'System User'}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate" title={user.grup_nama}>{user.grup_nama || 'No Role'}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 shrink-0 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
              title="Logout / Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Sidebar export — handles both desktop & mobile
export function Sidebar({ user }: { user?: any }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ── DESKTOP sidebar (hidden on mobile) ── */}
      <div className="hidden lg:flex h-full">
        <SidebarContent user={user} />
      </div>

      {/* ── MOBILE: burger button (shown inside header area on small screens) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-4 z-50 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── MOBILE: overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE: drawer ── */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent user={user} onClose={() => setMobileOpen(false)} />
      </div>
    </>
  );
}
