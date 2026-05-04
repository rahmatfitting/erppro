"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  MapPin, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ArrowRight,
  User,
  Phone,
  Ticket,
  CreditCard,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import SeatMap from "@/components/travel/SeatMap";
import { format } from "date-fns";
import BrowseTravelRouteModal from "@/components/travel/BrowseTravelRouteModal";
import { useRouter } from "next/navigation";

export default function NewBooking() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Selection state
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [isRouteBrowseOpen, setIsRouteBrowseOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  
  // Passenger details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const searchSchedules = async () => {
    if (!selectedRoute) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/travel/schedule/timetable?date=${date}&origin=${selectedRoute.origin}&destination=${selectedRoute.destination}`);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data);
        setStep(2);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Seat Sync
  const [liveOccupiedSeats, setLiveOccupiedSeats] = useState<number[]>([]);
  useEffect(() => {
    if (!selectedSchedule) return;
    
    // Initial occupied seats
    const fetchOccupied = async () => {
      const res = await fetch(`/api/travel/booking/manifest?scheduleId=${selectedSchedule.nomor}`);
      const data = await res.json();
      if (data.success) {
        setLiveOccupiedSeats(data.data.map((m: any) => m.seatNumber));
      }
    };
    fetchOccupied();
    
    // SSE for real-time updates
    const es = new EventSource(`/api/travel/booking/stream?scheduleId=${selectedSchedule.nomor}`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'seat_update') {
          setLiveOccupiedSeats(data.occupiedSeats);
        }
      } catch (err) {}
    };
    
    return () => es.close();
  }, [selectedSchedule]);

  const handleSeatToggle = (num: number) => {
    setSelectedSeats(prev => 
      prev.includes(num) ? prev.filter(s => s !== num) : [...prev, num]
    );
  };

  const handleBooking = async () => {
    if (!customerName || !customerPhone) {
      alert("Mohon lengkapi data penumpang");
      return;
    }

    setBookingLoading(true);
    try {
      const res = await fetch("/api/travel/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: selectedSchedule.nomor,
          seats: selectedSeats,
          customerName,
          customerPhone
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setStep(4); // Success step
      } else {
        alert(data.error || "Booking gagal");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500",
              step >= i ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 text-slate-400'
            )}>
              {i}
            </div>
            {i < 3 && <div className={cn(
              "w-12 h-1 rounded-full transition-all duration-500",
              step > i ? 'bg-indigo-600' : 'bg-slate-100'
            )}></div>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cari <span className="text-indigo-600">Jadwal</span></h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">Pilih rute dan tanggal keberangkatan armada.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pilih Rute</label>
              <button 
                onClick={() => setIsRouteBrowseOpen(true)}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-4 px-6 text-left focus:ring-2 focus:ring-indigo-500/20 outline-none flex justify-between items-center group transition-all"
              >
                <div className="flex items-center gap-4">
                  <MapPin className="h-5 w-5 text-indigo-500" />
                  <span className={cn("font-bold", selectedRoute ? "text-slate-900 dark:text-white" : "text-slate-400")}>
                    {selectedRoute ? `${selectedRoute.origin} → ${selectedRoute.destination}` : "Cari asal & tujuan..."}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tanggal</label>
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                <input 
                  type="date" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button 
            disabled={!selectedRoute || loading}
            onClick={searchSchedules}
            className="w-full mt-10 bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Cari Keberangkatan <ArrowRight className="h-5 w-5" /></>}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
           {/* Schedule List */}
           <div className="lg:col-span-1 space-y-4">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Pilih Jam</h2>
                <button onClick={() => setStep(1)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Ubah Rute</button>
              </div>
              <div className="space-y-3">
                {schedules.length === 0 && (
                  <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Jadwal tidak tersedia</p>
                  </div>
                )}
                {schedules.map(s => (
                  <button 
                    key={s.nomor}
                    onClick={() => setSelectedSchedule(s)}
                    className={cn(
                      "w-full p-6 rounded-3xl border-2 text-left transition-all group",
                      selectedSchedule?.nomor === s.nomor 
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-500/30" 
                        : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white hover:border-indigo-100"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-2xl font-black">{format(new Date(s.departure), "HH:mm")}</span>
                      <span className={cn(
                        "text-xs font-bold px-3 py-1 rounded-lg transition-colors",
                        selectedSchedule?.nomor === s.nomor ? "bg-white/20" : "bg-slate-50 dark:bg-slate-800 text-indigo-600"
                      )}>
                        Rp {s.price.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">{s.vehicle.name}</p>
                    <p className="text-[10px] opacity-60 mt-1 uppercase tracking-widest">
                       {s.vehicle.capacity - (s._count?.bookings || 0)} Kursi Tersedia
                    </p>
                  </button>
                ))}
              </div>
           </div>

           {/* Seat Map */}
           <div className="lg:col-span-2">
              {selectedSchedule ? (
                <div className="space-y-6">
                   <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-2">Pilih Kursi</h2>
                   <SeatMap 
                      layout={selectedSchedule.vehicle.layout || { rows: 4, cols: 3, seats: [] }}
                      occupiedSeats={liveOccupiedSeats}
                      selectedSeats={selectedSeats}
                      onSeatToggle={handleSeatToggle}
                   />
                   
                   {selectedSeats.length > 0 && (
                     <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center animate-in fade-in zoom-in duration-300">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Terpilih</p>
                           <p className="text-xl font-black text-slate-900 dark:text-white">{selectedSeats.length} Kursi: <span className="text-indigo-600">{selectedSeats.join(", ")}</span></p>
                        </div>
                        <button 
                          onClick={() => setStep(3)}
                          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                        >
                          Lanjut Detail
                        </button>
                     </div>
                   )}
                </div>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 transition-all">
                   <Ticket className="h-12 w-12 text-slate-200 mb-4 animate-bounce" />
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-center max-w-xs">Pilih jam keberangkatan untuk melihat kursi</p>
                </div>
              )}
           </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Detail <span className="text-indigo-600">Penumpang</span></h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nama Lengkap</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Masukkan nama..."
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nomor WhatsApp</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Contoh: 08123456789"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 rounded-[2rem] bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50">
                     <p className="text-sm font-black text-amber-700 dark:text-amber-400 flex items-center gap-2 uppercase tracking-wide">
                        <CreditCard className="h-5 w-5" /> Pembayaran Transfer Manual
                     </p>
                     <p className="text-xs text-amber-600/70 mt-2 leading-relaxed">
                       Setelah melakukan pemesanan, status booking akan menjadi <b className="text-amber-700">HOLD</b> selama 15 menit. Mohon selesaikan pembayaran dan konfirmasi agar kursi tidak dilepas secara otomatis oleh sistem.
                     </p>
                  </div>
                </div>
              </div>
           </div>

           <div className="lg:col-span-1">
              <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 sticky top-8 shadow-2xl shadow-slate-900/40 border border-white/5">
                 <h3 className="font-black uppercase tracking-widest text-slate-500 text-xs mb-8">Ringkasan Pesanan</h3>
                 
                 <div className="space-y-8">
                    <div className="flex justify-between items-start pb-8 border-b border-white/10">
                       <div>
                          <p className="text-2xl font-black tracking-tight">{selectedSchedule?.route.origin} → {selectedSchedule?.route.destination}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                             <CalendarIcon className="h-3 w-3" /> {format(new Date(selectedSchedule?.departure || new Date()), "dd MMM yyyy, HH:mm")}
                          </p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-bold">Harga Per Kursi</span>
                          <span className="font-black">Rp {selectedSchedule?.price.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-bold">Jumlah Kursi</span>
                          <span className="font-black text-indigo-400">{selectedSeats.length}x</span>
                       </div>
                       <div className="flex justify-between items-center pt-8 border-t border-white/10">
                          <span className="text-xl font-black uppercase tracking-widest text-slate-400">Total</span>
                          <div className="text-right">
                            <span className="text-3xl font-black text-indigo-400 block leading-none">Rp {(selectedSchedule?.price * selectedSeats.length).toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">Sudah termasuk pajak</span>
                          </div>
                       </div>
                    </div>

                    <button 
                      disabled={bookingLoading}
                      onClick={handleBooking}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/30 mt-4 flex items-center justify-center gap-3 group"
                    >
                       {bookingLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Konfirmasi & Booking <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                    <button onClick={() => setStep(2)} className="w-full text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors">Kembali Pilih Kursi</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {step === 4 && (
        <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in zoom-in fade-in duration-700">
           <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="h-12 w-12" />
           </div>
           <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Booking <span className="text-indigo-600">Berhasil!</span></h1>
              <p className="text-slate-500 mt-4 font-medium max-w-md mx-auto">Pesanan Anda telah berhasil dibuat dengan status <b className="text-amber-600">HOLD</b>. Mohon segera selesaikan pembayaran.</p>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => router.push("/travel/booking/list")}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
              >
                Lihat Daftar Pesanan
              </button>
              <button 
                onClick={() => {
                  setStep(1);
                  setSelectedSeats([]);
                  setSelectedSchedule(null);
                  setCustomerName("");
                  setCustomerPhone("");
                }}
                className="bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30"
              >
                Booking Lagi
              </button>
           </div>
        </div>
      )}

      <BrowseTravelRouteModal 
        isOpen={isRouteBrowseOpen}
        onClose={() => setIsRouteBrowseOpen(false)}
        onSelect={(r) => {
          setSelectedRoute(r);
          setIsRouteBrowseOpen(false);
          setSelectedSchedule(null);
          setSelectedSeats([]);
        }}
      />
    </div>
  );
}
