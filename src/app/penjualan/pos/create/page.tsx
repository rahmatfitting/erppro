"use client";

import { useState, useEffect, useMemo } from "react";
import { Save, ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, User, AlertCircle, RefreshCw, Loader2, Store, Tags, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrowseCustomerModal } from "@/components/BrowseCustomerModal";
import { BrowseGudangModal } from "@/components/BrowseGudangModal";

export default function POSCreate() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Master Data
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Transaction State
  const [selectedCustomer, setSelectedCustomer] = useState<any>({ nomor: 0, nama: "Pelanggan Umum" });
  const [defaultCustomer, setDefaultCustomer] = useState<any>({ nomor: 0, nama: "Pelanggan Umum" });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  const [selectedGudang, setSelectedGudang] = useState<any>(null);
  const [showGudangModal, setShowGudangModal] = useState(false);
  
  const [selectedPerusahaan, setSelectedPerusahaan] = useState<any>(null);

  const [selectedCabang, setSelectedCabang] = useState<any>(null);

  const [cart, setCart] = useState<any[]>([]);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  // Payment State
  const [diskonGlobalNominal, setDiskonGlobalNominal] = useState(0);
  const [appliedPromos, setAppliedPromos] = useState<any[]>([]);
  const [totalPromoDiscount, setTotalPromoDiscount] = useState(0);
  const [voucherCode, setVoucherCode] = useState("");
  const [splitPayments, setSplitPayments] = useState<{method: string, amount: number}[]>([{ method: "Cash", amount: 0 }]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const initPOS = async () => {
      setFetching(true);
      try {
        // Fetch Products
        const prodRes = await fetch('/api/master/barang');
        const prodJson = await prodRes.json();
        if (prodJson.success) {
          setProducts(prodJson.data.filter((b: any) => b.status_aktif === 1));
        }

        // Fetch Session
        const sessionRes = await fetch('/api/auth/session');
        const sessionJson = await sessionRes.json();
        if (sessionJson.success && sessionJson.data) {
          const session = sessionJson.data;
          if (session.active_perusahaan) {
            setSelectedPerusahaan({ nomor: session.active_perusahaan, nama: session.perusahaan_nama });
          }
          if (session.active_cabang) {
            setSelectedCabang({ nomor: session.active_cabang, nama: session.cabang_nama });
          }
        }

        // Fetch Default Customer (UMUM)
        const custRes = await fetch('/api/master/customer?keyword=UMUM&limit=1');
        const custJson = await custRes.json();
        if (custJson.success && custJson.data && custJson.data.length > 0) {
          const umum = custJson.data.find((c: any) => c.kode === 'UMUM' || c.nama.toUpperCase().includes('UMUM'));
          if (umum) {
            setSelectedCustomer(umum);
            setDefaultCustomer(umum);
          }
        } else {
          console.warn("Default customer UMUM not found!");
          setError("Data Customer Umum (UMUM) tidak ditemukan. Silahkan hubungi admin.");
        }

        // Fetch Default Gudang (Utama or first available)
        const gudRes = await fetch('/api/master/gudang?limit=1');
        const gudJson = await gudRes.json();
        if (gudJson.success && gudJson.data && gudJson.data.length > 0) {
          setSelectedGudang(gudJson.data[0]);
        }
      } catch (err) {
        console.error("Failed to initialize POS", err);
        setError("Gagal menginisialisasi POS. Silahkan muat ulang halaman.");
      } finally {
        setFetching(false);
      }
    };

    initPOS();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowerQ = searchQuery.toLowerCase();
    return products.filter(p => p.nama.toLowerCase().includes(lowerQ) || p.kode.toLowerCase().includes(lowerQ));
  }, [products, searchQuery]);

  // Cart Operations
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.kode_barang === product.kode);
      if (existing) {
        return prev.map(item => 
          item.kode_barang === product.kode 
          ? { ...item, jumlah: item.jumlah + 1, subtotal: (item.jumlah + 1) * item.netto }
          : item
        );
      }
      return [...prev, {
        nomormhbarang: product.nomor,
        kode_barang: product.kode,
        nama_barang: product.nama,
        nomormhsatuan: product.nomormhsatuan || 0,
        satuan: product.satuan || product.satuan_nama || '',
        harga: Number(product.harga_jual) || 0,
        jumlah: 1,
        diskon_prosentase: 0,
        diskon_nominal: 0,
        netto: Number(product.harga_jual) || 0,
        subtotal: Number(product.harga_jual) || 0
      }];
    });
  };

  const updateCartItem = (kode: string, field: string, value: number) => {
    setCart(prev => prev.map(item => {
      if (item.kode_barang !== kode) return item;
      
      const updated = { ...item, [field]: value };
      
      // Recalculate Logic
      let discNom = updated.diskon_nominal || 0;
      if (field === 'diskon_prosentase') {
         discNom = updated.harga * ((value || 0) / 100);
         updated.diskon_nominal = discNom;
      }
      
      updated.netto = updated.harga - discNom;
      updated.subtotal = updated.jumlah * updated.netto;
      return updated;
    }));
  };

  const incrementQty = (kode: string) => {
     setCart(prev => prev.map(item => item.kode_barang === kode ? { ...item, jumlah: item.jumlah + 1, subtotal: (item.jumlah + 1) * item.netto } : item));
  };
  
  const decrementQty = (kode: string) => {
     setCart(prev => prev.map(item => item.kode_barang === kode && item.jumlah > 1 ? { ...item, jumlah: item.jumlah - 1, subtotal: (item.jumlah - 1) * item.netto } : item));
  };

  const removeFromCart = (kode: string) => {
    setCart(prev => prev.filter(item => item.kode_barang !== kode));
  };

  const clearCart = () => {
      if (confirm("Kosongkan keranjang belanja?")) {
         setCart([]);
         setDiskonGlobalNominal(0);
         setAppliedPromos([]);
         setTotalPromoDiscount(0);
         setVoucherCode("");
         setSplitPayments([{ method: "Cash", amount: 0 }]);
         setSelectedCustomer(defaultCustomer);
      }
  };

  // Promo Calculation Logic
  useEffect(() => {
    const handlePromo = async () => {
       if (cart.length === 0) {
          setAppliedPromos([]);
          setTotalPromoDiscount(0);
          return;
       }

       try {
          const res = await fetch("/api/penjualan/promo/apply", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
                cart,
                context: {
                   branchId: selectedCabang?.nomor,
                   memberLevel: selectedCustomer?.level || "Silver",
                   customerNomor: selectedCustomer?.nomor,
                   voucherCode: voucherCode
                }
             })
          });
          const result = await res.json();
          if (result.success) {
             setAppliedPromos(result.data.impacts);
             setTotalPromoDiscount(result.data.totalDiscount);
          }
       } catch (err) {
          console.error("Promo calculation error", err);
       }
    };

    const timer = setTimeout(handlePromo, 500); // Debounce
    return () => clearTimeout(timer);
  }, [cart, selectedCustomer, selectedCabang, voucherCode]);

  // Calculations
  const subtotalItems = cart.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const dpp = subtotalItems - diskonGlobalNominal - totalPromoDiscount;
  const ppnNominal = 0; // Assuming POS prices are PPN Inclusive for retail, or set logic here if needed.
  const grandTotal = dpp + ppnNominal;
  const jumlahBayar = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const kembalian = jumlahBayar - grandTotal;

  // Set quick pay amount
  const handleQuickPay = (amount: number) => {
     setSplitPayments([{ method: "Cash", amount }]);
  };
  const setExactPay = () => setSplitPayments([{ method: "Cash", amount: grandTotal }]);

  const addSplitPayment = () => {
    setSplitPayments([...splitPayments, { method: "Transfer", amount: 0 }]);
  };

  const updateSplitPayment = (index: number, field: string, value: any) => {
    const updated = [...splitPayments];
    updated[index] = { ...updated[index], [field]: value };
    setSplitPayments(updated);
  };

  const removeSplitPayment = (index: number) => {
    if (splitPayments.length <= 1) return;
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Keranjang kosong!");
    if (jumlahBayar < grandTotal) return alert(`Jumlah Bayar kurang dari Tagihan (Kurang Rp ${grandTotal - jumlahBayar})`);
    if (!selectedCustomer.nomor) return alert("Customer belum dipilih atau data customer UMUM tidak ditemukan!");
    
    setLoading(true);
    setError(null);

    const pembayaranString = splitPayments.filter(p => p.amount > 0).map(p => `${p.method}: ${p.amount}`).join(', ') || 'Cash';

    const payload = {
      tanggal: new Date().toISOString(), // current time
      nomormhcustomer: selectedCustomer.nomor,
      customer: selectedCustomer.nama,
      nomormhgudang: selectedGudang?.nomor || 0,
      nomormhcabang: selectedCabang?.nomor || 0,
      nomormhperusahaan: selectedPerusahaan?.nomor || 0,
      subtotal: subtotalItems,
      diskonNominal: diskonGlobalNominal,
      dpp,
      ppnNominal,
      grandTotal,
      pembayaran: pembayaranString,
      jumlahBayar,
      kembalian,
      items: cart,
      user: "Admin"
    };

    try {
      const res = await fetch("/api/penjualan/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
         setShowPaymentModal(false);
         setReceiptData({
            kode: data.data.kode,
            tanggal: payload.tanggal,
            customer: payload.customer,
            items: payload.items,
            subtotal: payload.subtotal,
            diskonNominal: payload.diskonNominal,
            grandTotal: payload.grandTotal,
            splitPayments: splitPayments.filter(p => p.amount > 0),
            jumlahBayar: payload.jumlahBayar,
            kembalian: payload.kembalian,
            user: payload.user
         });
         setTimeout(() => {
            window.print();
         }, 500);
      } else {
         setError(data.error || "Gagal menyimpan transaksi");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
     return <div className="flex items-center justify-center p-24"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div>;
  }

  return (
    <>
      <div className={cn(
        "flex flex-col h-[calc(100vh-8rem)] -mt-4 -mb-4 -mx-4 overflow-hidden",
        receiptData ? "hidden" : "print:hidden"
      )}>
      
      {/* Top Header inside the POS workspace */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10">
         <div className="flex items-center gap-4">
            <Link href="/penjualan/pos" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Store className="h-5 w-5 text-indigo-600" /> POS Kasir
            </h1>
         </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
               <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{selectedPerusahaan?.nama}</div>
               <div className="text-xs font-medium text-slate-500">{selectedCabang?.nama}</div>
            </div>
            <div className="flex items-center gap-2">
                 <button 
                  onClick={() => setShowCustomerModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors"
                 >
                   <User className="h-4 w-4" />
                   <span className="text-sm font-bold truncate max-w-[120px]">{selectedCustomer.nama}</span>
                 </button>

                 <button 
                  onClick={() => setShowGudangModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-100 transition-colors"
                 >
                   <Store className="h-4 w-4" />
                   <span className="text-sm font-bold truncate max-w-[120px]">{selectedGudang?.nama || "Pilih Gudang"}</span>
                 </button>
            </div>
            <div className="text-right">
               <div className="text-xs text-slate-500 font-medium">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'})}</div>
            </div>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-slate-50">
        
        {/* Left Side - Product Catalog (2/3 width on lg) */}
        <div className="flex-1 flex flex-col hidden md:flex min-w-[50%] lg:w-2/3 border-r border-slate-200">
           
           {/* Search & Categories Bar */}
           <div className="p-4 bg-white border-b border-slate-100 shrink-0">
             <div className="relative max-w-lg">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Cari barang berdasarkan nama atau kode..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
               />
             </div>
           </div>

           {/* Products Grid */}
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {filteredProducts.map((p) => (
                    <button 
                      key={p.kode} 
                      onClick={() => addToCart(p)}
                      className="flex flex-col text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                       <div className="h-24 w-full bg-slate-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-50 transition-colors overflow-hidden">
                          {(() => {
                             try {
                                const imgs = typeof p.gambar === 'string' ? JSON.parse(p.gambar) : p.gambar;
                                if (imgs && imgs.length > 0) {
                                   return <img src={imgs[0]} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />;
                                }
                             } catch (e) {}
                             return (
                                <span className="text-2xl font-bold text-slate-200 group-hover:text-indigo-200 select-none">
                                   {p.nama.substring(0,2).toUpperCase()}
                                </span>
                             );
                          })()}
                       </div>
                       <h3 className="font-semibold text-slate-800 line-clamp-2 text-sm max-w-full" title={p.nama}>{p.nama}</h3>
                       <div className="text-xs text-slate-500 mt-1">{p.kode} • {p.satuan}</div>
                       <div className="mt-auto pt-3">
                          <span className="font-bold text-indigo-600 text-sm">
                             Rp {new Intl.NumberFormat('id-ID').format(Number(p.harga_jual) || 0)}
                          </span>
                       </div>
                    </button>
                 ))}
                 
                 {filteredProducts.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
                       <Search className="h-10 w-10 mb-3 opacity-20" />
                       <p>Tidak ada barang yang cocok dengan pencarian.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Right Side - Cart & Checkout (1/3 width on lg) */}
        <div className="w-full md:w-[45%] lg:w-1/3 min-w-[340px] flex flex-col bg-white shadow-xl z-20">
           
           {/* Cart Title */}
           <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Keranjang
             </h2>
             <button onClick={clearCart} className="text-sm font-medium text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors">
               <RefreshCw className="h-3.5 w-3.5" /> Kosongkan
             </button>
           </div>

           {/* Error Alert */}
           {error && (
             <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
               <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
               <p className="text-xs font-medium text-red-700">{error}</p>
             </div>
           )}

           {/* Cart Items List */}
           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <ShoppingCart className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-slate-500 font-medium">Keranjang masih kosong</p>
                    <p className="text-sm">Klik barang untuk menambahkan.</p>
                 </div>
              ) : (
                cart.map((item) => (
                   <div key={item.kode_barang} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group relative">
                      <div className="flex justify-between items-start pr-6">
                         <div className="font-semibold text-slate-800 text-sm leading-tight pr-2">
                            {item.nama_barang}
                         </div>
                         <div className="font-bold text-indigo-700 text-sm shrink-0">
                            Rp {new Intl.NumberFormat('id-ID').format(item.subtotal)}
                         </div>
                      </div>
                      
                      <div className="text-xs text-slate-500 mt-1 mb-2">Rp {new Intl.NumberFormat('id-ID').format(item.harga)} / {item.satuan}</div>
                      
                      <div className="flex items-center justify-between mt-2">
                         <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                            <button onClick={() => decrementQty(item.kode_barang)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition-colors">
                               <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input 
                              type="number" 
                              value={item.jumlah === 0 ? '' : item.jumlah}
                              min="1"
                              onChange={(e) => updateCartItem(item.kode_barang, 'jumlah', e.target.value === '' ? 1 : parseFloat(e.target.value))}
                              className="w-10 text-center text-sm font-bold border-none outline-none bg-transparent p-0"
                            />
                            <button onClick={() => incrementQty(item.kode_barang)} className="h-7 w-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors">
                               <Plus className="h-3.5 w-3.5" />
                            </button>
                         </div>
                         
                         {/* Optional Discount Input per item */}
                         <div className="flex items-center text-xs text-slate-500">
                           Disc: <input type="number" value={item.diskon_prosentase === 0 ? '' : item.diskon_prosentase} onChange={e => updateCartItem(item.kode_barang, 'diskon_prosentase', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-10 ml-1 px-1 py-1 border border-slate-200 rounded text-center outline-none bg-white focus:border-indigo-400" />%
                         </div>
                      </div>

                      <button onClick={() => removeFromCart(item.kode_barang)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                         <Trash2 className="h-4 w-4" />
                      </button>
                   </div>
                ))
              )}
           </div>

           {/* Summary Footer (Sticky Bottom) */}
           <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
              {/* Promo Info */}
              {appliedPromos.length > 0 && (
                 <div className="mb-3 space-y-1">
                    {appliedPromos.map(p => (
                       <div key={p.promoId} className="flex justify-between items-center text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100">
                          <span className="font-bold flex items-center gap-1"><Tags className="h-3 w-3" /> {p.promoNama}</span>
                          <span className="font-black">-Rp {new Intl.NumberFormat('id-ID').format(p.totalDiscount)}</span>
                       </div>
                    ))}
                 </div>
              )}
              
              <div className="flex justify-between items-center mb-4">
                 <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Tagihan</span>
                    <span className="text-xl font-black text-slate-800">Rp {new Intl.NumberFormat('id-ID').format(grandTotal)}</span>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Hemat</span>
                    <span className="text-sm font-bold text-emerald-600">Rp {new Intl.NumberFormat('id-ID').format(totalPromoDiscount + diskonGlobalNominal)}</span>
                 </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={cart.length === 0}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:transform active:scale-95 text-white font-bold text-lg transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                BAYAR (Rp {new Intl.NumberFormat('id-ID').format(grandTotal)})
              </button>
           </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <Banknote className="h-6 w-6 text-indigo-600" />
                 Pembayaran
               </h2>
               <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
               </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
              
              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-xs font-medium text-red-700">{error}</p>
                </div>
              )}

              {/* Summary Stats */}
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Subtotal Item</span>
                    <span className="font-semibold text-slate-800">Rp {new Intl.NumberFormat('id-ID').format(subtotalItems)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium pt-1">Diskon Promo (-)</span>
                    <span className="font-bold text-emerald-600">Rp {new Intl.NumberFormat('id-ID').format(totalPromoDiscount)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium pt-1">Diskon Manual (-)</span>
                    <div className="flex items-center">
                       Rp <input type="number" min="0" value={diskonGlobalNominal === 0 ? '' : diskonGlobalNominal} onChange={(e) => setDiskonGlobalNominal(e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-24 ml-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-right text-sm font-semibold transition-all"/>
                    </div>
                 </div>
                  
                 {/* Voucher Input */}
                 <div className="pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Punya Kode Voucher?</label>
                    <div className="flex gap-2">
                       <input 
                          type="text" 
                          placeholder="Masukkan kode..." 
                          value={voucherCode}
                          onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 text-sm font-bold tracking-widest uppercase"
                       />
                    </div>
                 </div>
              </div>

              {/* Total Display */}
              <div className="bg-indigo-600 rounded-2xl p-5 text-white flex justify-between items-center shadow-lg shadow-indigo-600/20">
                 <div className="font-medium text-indigo-100 tracking-wide">TOTAL TAGIHAN</div>
                 <div className="text-3xl font-bold tracking-tight">Rp {new Intl.NumberFormat('id-ID').format(grandTotal)}</div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Metode & Nominal</label>
                    <button onClick={addSplitPayment} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                       <Plus className="h-3 w-3" /> Tambah Pembayaran
                    </button>
                 </div>
                 
                 <div className="space-y-3">
                    {splitPayments.map((payment, index) => (
                       <div key={index} className="flex gap-2 items-center">
                          <select 
                             value={payment.method} 
                             onChange={e => updateSplitPayment(index, 'method', e.target.value)}
                             className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-4 font-bold text-sm text-slate-700 outline-none focus:bg-white focus:border-indigo-500 w-1/3"
                          >
                             <option value="Cash">Cash</option>
                             <option value="Transfer">Transfer</option>
                             <option value="QRIS">QRIS</option>
                          </select>
                          <div className="relative flex-1">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-lg">Rp</span>
                             <input 
                               type="number" 
                               value={payment.amount === 0 ? '' : payment.amount}
                               onChange={(e) => updateSplitPayment(index, 'amount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                               placeholder="0"
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-4 font-bold text-xl text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300 placeholder:font-normal"
                             />
                          </div>
                          {splitPayments.length > 1 && (
                             <button onClick={() => removeSplitPayment(index)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                                <Trash2 className="h-5 w-5" />
                             </button>
                          )}
                       </div>
                    ))}
                 </div>
                 
                 {/* Quick amount suggestions */}
                 <div className="flex gap-2 mt-2 overflow-x-auto custom-scrollbar pb-2">
                    <button onClick={setExactPay} className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-bold whitespace-nowrap hover:bg-emerald-100 transition-colors">Uang Pas</button>
                    {[50000, 100000, 150000, 200000].map(amt => (
                       <button key={amt} onClick={() => handleQuickPay(amt)} className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-bold whitespace-nowrap hover:bg-slate-100 transition-colors">
                          {new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(amt)}
                       </button>
                    ))}
                 </div>

                 {/* Change / Kembalian indicator */}
                 <div className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Kembalian</span>
                    <span className={cn(
                       "font-black text-2xl", 
                       kembalian < 0 ? "text-red-500" : "text-emerald-500"
                    )}>
                       Rp {new Intl.NumberFormat('id-ID').format(kembalian < 0 ? 0 : kembalian)}
                    </span>
                 </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleCheckout}
                disabled={loading || jumlahBayar < grandTotal}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:transform active:scale-95 text-white font-bold text-lg transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                {loading ? "MEMPROSES..." : "SELESAIKAN PEMBAYARAN"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Global CSS for POS Specific Scrollbar to hide or make it sleek */}
      <style dangerouslySetInnerHTML={{__html:`
         .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
         @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
            @page { margin: 0; }
         }
      `}}/>
      </div>

      {/* Printable Receipt Overlay Screen */}
      {receiptData && (
        <div className="fixed inset-0 z-[100] bg-slate-200 flex flex-col items-center py-8 overflow-y-auto print:bg-white print:py-0 print:block print:inset-auto print:relative print:z-auto">
           {/* Screen Only Button */}
           <div className="mb-6 flex gap-4 print:hidden shrink-0 mt-4">
              <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                 Cetak Ulang (Print)
              </button>
              <button 
                 onClick={() => {
                    setCart([]);
                    setDiskonGlobalNominal(0);
                    setSplitPayments([{ method: "Cash", amount: 0 }]);
                    setSelectedCustomer(defaultCustomer);
                    setReceiptData(null);
                 }} 
                 className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 shadow-xl active:scale-95 transition-all"
              >
                 Selesai & Transaksi Baru
              </button>
           </div>
           
           {/* Printable Receipt Area */}
           <div className="print-area bg-white p-6 shadow-2xl print:shadow-none w-full max-w-[80mm] text-black font-mono text-xs leading-tight mx-auto border border-slate-300 print:border-none">
              <div className="text-center mb-5">
                 <h2 className="text-xl font-bold mb-1 tracking-tight">PT. ERP PRO</h2>
                 <p className="font-medium">CABANG SURABAYA BARAT</p>
                 <p>Jl. Contoh Alamat No. 123</p>
                 <p>Telp: 08123456789</p>
              </div>
              <div className="border-b border-dashed border-slate-400 pb-3 mb-3 space-y-1">
                 <div className="flex justify-between"><span>Nota:</span> <span>{receiptData.kode}</span></div>
                 <div className="flex justify-between"><span>Tgl:</span> <span>{new Date(receiptData.tanggal).toLocaleString('id-ID')}</span></div>
                 <div className="flex justify-between"><span>Kasir:</span> <span>{receiptData.user}</span></div>
                 <div className="flex justify-between"><span>Cust:</span> <span>{receiptData.customer}</span></div>
              </div>
              
              <div className="border-b border-dashed border-slate-400 pb-3 mb-3">
                 <table className="w-full text-left table-fixed">
                 <tbody>
                    {receiptData.items.map((item: any, i: number) => (
                       <tr key={i} className="align-top">
                          <td className="py-1.5">
                             <div className="font-bold text-[13px]">{item.nama_barang}</div>
                             <div className="flex justify-between mt-0.5 ml-2">
                                <span>{item.jumlah} {item.satuan} x {new Intl.NumberFormat('id-ID').format(item.harga)}</span>
                                <span>{new Intl.NumberFormat('id-ID').format(item.jumlah * item.harga)}</span>
                             </div>
                             {item.diskon_nominal > 0 && (
                                <div className="flex justify-between ml-2 font-medium">
                                   <span>Disc</span>
                                   <span>-{new Intl.NumberFormat('id-ID').format(item.diskon_nominal * item.jumlah)}</span>
                                </div>
                             )}
                          </td>
                       </tr>
                    ))}
                 </tbody>
                 </table>
              </div>

              <div className="border-b border-dashed border-slate-400 pb-3 mb-3 space-y-1.5">
                 <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{new Intl.NumberFormat('id-ID').format(receiptData.subtotal)}</span>
                 </div>
                 {receiptData.diskonNominal > 0 && (
                    <div className="flex justify-between">
                       <span>Diskon Manual</span>
                       <span>-{new Intl.NumberFormat('id-ID').format(receiptData.diskonNominal)}</span>
                    </div>
                 )}
                 {totalPromoDiscount > 0 && (
                    <div className="flex justify-between">
                       <span>Hemat Promo</span>
                       <span>-{new Intl.NumberFormat('id-ID').format(totalPromoDiscount)}</span>
                    </div>
                 )}
                 <div className="flex justify-between font-bold text-sm mt-2 border-t border-slate-400 pt-2">
                    <span>TOTAL</span>
                    <span>{new Intl.NumberFormat('id-ID').format(receiptData.grandTotal)}</span>
                 </div>
              </div>

              <div className="border-b border-dashed border-slate-400 pb-3 mb-3 space-y-1.5">
                 {receiptData.splitPayments.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between">
                       <span>Bayar ({p.method})</span>
                       <span>{new Intl.NumberFormat('id-ID').format(p.amount)}</span>
                    </div>
                 ))}
                 <div className="flex justify-between mt-2 border-t border-slate-400 pt-2 font-bold">
                    <span>KEMBALIAN</span>
                    <span>{new Intl.NumberFormat('id-ID').format(receiptData.kembalian)}</span>
                 </div>
              </div>

              <div className="text-center mt-5 text-[11px] font-medium opacity-80">
                 <p>Terima kasih atas kunjungan Anda!</p>
                 <p className="mt-1">Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.</p>
              </div>
           </div>
        </div>
      )}
      {/* Customer Modal */}
      <BrowseCustomerModal 
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={(c) => { setSelectedCustomer(c); setShowCustomerModal(false); }}
      />

      <BrowseGudangModal
        isOpen={showGudangModal}
        onClose={() => setShowGudangModal(false)}
        onSelect={(g) => { setSelectedGudang(g); setShowGudangModal(false); }}
      />
    </>
  );
}
