"use client";

import { 
  Truck, 
  Users, 
  Ticket, 
  TrendingUp, 
  AlertCircle, 
  ChevronRight,
  Calendar,
  Clock
} from "lucide-react";
import Link from "next/link";

export default function TravelDashboard() {
  // Mock data for initial view
  const stats = [
    { title: "Active Schedules", value: "12", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Today's Bookings", value: "48", icon: Ticket, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Total Revenue", value: "Rp 12.5M", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Active Fleet", value: "8/10", icon: Truck, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const upcomingSchedules = [
    { id: 1, route: "Surabaya → Malang", time: "08:00", driver: "Ahmad", vehicle: "Avanza (L 1234 AB)", seats: "5/7" },
    { id: 2, route: "Malang → Surabaya", time: "09:30", driver: "Budi", vehicle: "Hiace (W 5678 CD)", seats: "12/14" },
    { id: 3, route: "Surabaya → Kediri", time: "11:00", driver: "Setyo", vehicle: "Innova (L 9999 EF)", seats: "2/7" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Travel Intelligence Dashboard</h1>
        <p className="text-sm text-slate-500">Monitor your fleet, bookings, and operational performance in real-time.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Operational Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-white shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-50 p-6 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-500" />
                Upcoming Departures (Today)
              </h2>
              <Link href="/travel/schedule/timetables" className="text-xs font-bold text-indigo-600 hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {upcomingSchedules.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors dark:hover:bg-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30">
                      <span className="text-xs font-bold leading-none">{item.time}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{item.route}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
                        {item.driver} • {item.vehicle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.seats} Seats</p>
                      <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${(parseInt(item.seats.split('/')[0]) / parseInt(item.seats.split('/')[1])) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Link href="/travel/booking/new" className="group p-6 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex flex-col gap-4">
                <Ticket className="h-8 w-8 text-indigo-200 group-hover:scale-110 transition-transform" />
                <div>
                   <h3 className="font-bold text-lg">Create New Booking</h3>
                   <p className="text-indigo-100 text-xs">Directly reserve seats for customers.</p>
                </div>
             </Link>
             <Link href="/travel/fleet/maintenance" className="group p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-all flex flex-col gap-4">
                <Truck className="h-8 w-8 text-amber-500 group-hover:scale-110 transition-transform" />
                <div>
                   <h3 className="font-bold text-lg text-slate-900 dark:text-white">Fleet Maintenance</h3>
                   <p className="text-slate-500 text-xs">2 vehicles require attention today.</p>
                </div>
             </Link>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              Critical Alerts
            </h2>
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Overdue Service: Mobil L 1234 AB</p>
                <p className="text-[10px] text-rose-600/70 mt-1 font-medium">Exceeded service limit by 120km.</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Low Booking Rate: Kediri Route</p>
                <p className="text-[10px] text-amber-600/70 mt-1 font-medium">Only 15% seats filled for tomorrow.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full"></div>
            <h2 className="font-bold text-sm mb-4">Operational Tips</h2>
            <p className="text-xs text-slate-400 leading-relaxed italic">
              "Consider dynamic pricing for weekend schedules on the Malang route to maximize revenue during peak demand."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
