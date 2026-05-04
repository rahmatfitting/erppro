"use client";

import { useState, useEffect } from "react";
import { 
  Ticket, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Eye,
  FileText,
  CreditCard,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function BookingList() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/travel/booking");
      const data = await res.json();
      if (data.success) {
        setBookings(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900';
      case 'HOLD': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900';
      case 'EXPIRED': return 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700';
      case 'CANCELLED': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900';
      default: return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:border-slate-700';
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.customer.nama.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === "ALL" || b.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase italic">Daftar <span className="text-indigo-600">Booking & Reservasi</span></h1>
          <p className="text-sm text-slate-500">Kelola reservasi penumpang dan konfirmasi pembayaran manual.</p>
        </div>
        <button 
          onClick={fetchBookings}
          className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className={cn("h-5 w-5 text-slate-600", loading && "animate-spin")} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari kode booking atau nama pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
           {['ALL', 'HOLD', 'PAID', 'EXPIRED', 'CANCELLED'].map((s) => (
             <button 
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                )}
             >
               {s}
             </button>
           ))}
        </div>
      </div>

      {/* Booking Grid */}
      <div className="grid grid-cols-1 gap-4 pb-20">
        {loading ? (
           Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />)
        ) : filteredBookings.length === 0 ? (
           <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Ticket className="h-10 w-10 mx-auto text-slate-200 mb-2" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Belum ada data booking</p>
           </div>
        ) : filteredBookings.map((booking) => (
          <div key={booking.nomor} className="group bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-4 flex-1 w-full">
               <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                  <Ticket className="h-6 w-6" />
               </div>
               <div className="flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{booking.code}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{booking.customer.nama}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                    <span className="text-[10px] font-bold text-slate-400">{booking.customer.telepon}</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full md:w-auto">
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rute</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{booking.schedule.route.origin} → {booking.schedule.route.destination}</span>
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Berangkat</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{format(new Date(booking.schedule.departure), "HH:mm")}</span>
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                  <span className="text-xs font-black text-indigo-600">Rp {booking.payment?.amount.toLocaleString() || "0"}</span>
               </div>
               <div className="flex flex-col gap-1 items-end md:items-start">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                    getStatusStyle(booking.status)
                  )}>
                    {booking.status}
                  </span>
               </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
               <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                  <Eye className="h-4 w-4" /> Detail
               </button>
               {booking.status === 'HOLD' && (
                  <button 
                    onClick={() => window.location.href = '/travel/booking/payments'}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <CreditCard className="h-4 w-4" /> Bayar
                  </button>
               )}
               <button className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 transition-all">
                  <MoreVertical className="h-4 w-4" />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
