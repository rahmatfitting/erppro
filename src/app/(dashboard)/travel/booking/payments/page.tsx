"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  MoreVertical,
  Banknote,
  User,
  MapPin,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function TravelPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, SUCCESS

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/travel/booking/payments");
      const data = await res.json();
      if (data.success) setPayments(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleConfirm = async (bookingId: number) => {
    if (!confirm("Konfirmasi pembayaran ini? Status booking akan berubah menjadi PAID.")) return;
    
    try {
      const res = await fetch("/api/travel/booking/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const data = await res.json();
      if (data.success) {
        fetchPayments();
      } else {
        alert(data.error || "Gagal konfirmasi");
      }
    } catch (err) {
      alert("Terjadi kesalahan");
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.booking.code.toLowerCase().includes(search.toLowerCase()) ||
      p.booking.customer.nama.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = 
      filter === "ALL" || 
      (filter === "PENDING" && p.status === "PENDING") ||
      (filter === "SUCCESS" && p.status === "SUCCESS");

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Daftar <span className="text-indigo-600">Pembayaran</span></h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Verifikasi dan konfirmasi pembayaran reservasi travel.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchPayments}
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={cn("h-5 w-5 text-slate-600", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari Kode Booking atau Nama Pelanggan..."
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-sm shadow-sm transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          {["ALL", "PENDING", "SUCCESS"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all shadow-sm",
                filter === f 
                  ? "bg-indigo-600 border-indigo-500 text-white" 
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
              )}
            >
              {f === "ALL" ? "Semua" : f === "PENDING" ? "Menunggu" : "Berhasil"}
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Transaksi</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pelanggan</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Jadwal</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayments.map((p) => (
                <tr key={p.nomor} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{p.booking.code}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{format(new Date(p.createdAt), "dd/MM/yyyy HH:mm")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">{p.booking.customer.nama}</p>
                        <p className="text-xs text-slate-400">{p.booking.customer.telepon}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-rose-500" />
                        <span className="text-sm font-bold">{p.booking.schedule.route.origin} → {p.booking.schedule.route.destination}</span>
                     </div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase ml-6 mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {format(new Date(p.booking.schedule.departure), "dd MMM, HH:mm")}
                     </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-indigo-600">Rp {p.amount.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.method}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                      p.status === "SUCCESS" 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800" 
                        : "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-800"
                    )}>
                      {p.status === "SUCCESS" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {p.status === "SUCCESS" ? "BERHASIL" : "PENDING"}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {p.status === "PENDING" ? (
                      <button 
                        onClick={() => handleConfirm(p.bookingId)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                      >
                        Konfirmasi
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-2 text-emerald-600 font-bold text-[10px] uppercase">
                        <CheckCircle2 className="h-4 w-4" /> Terverifikasi
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto space-y-3">
                      <Banknote className="h-12 w-12 text-slate-200 mx-auto" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Tidak ada data pembayaran ditemukan</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
