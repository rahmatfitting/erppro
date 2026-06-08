"use client";

import React, { useState, useEffect } from "react";
import { 
  CloudSun, 
  Quote, 
  Sparkles, 
  Wind, 
  Droplets,
  MapPin,
  Clock,
  Cloud,
  CloudRain,
  Sun,
  X
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MOTIVATIONS = [
  { text: "Satu-satunya cara untuk melakukan pekerjaan hebat adalah dengan mencintai apa yang Anda lakukan.", author: "Steve Jobs" },
  { text: "Imajinasi lebih penting daripada pengetahuan. Pengetahuan terbatas, sedangkan imajinasi seluas alam semesta.", author: "Albert Einstein" },
  { text: "Sukses bukanlah kunci kebahagiaan. Kebahagiaanlah kunci kesuksesan. Jika Anda mencintai apa yang Anda lakukan, Anda akan sukses.", author: "Albert Schweitzer" },
  { text: "Masa depan adalah milik mereka yang percaya pada keindahan mimpi-mimpinya.", author: "Eleanor Roosevelt" },
  { text: "Pendidikan adalah senjata paling ampuh yang dapat Anda gunakan untuk mengubah dunia.", author: "Nelson Mandela" },
  { text: "Bukan spesies yang paling kuat yang bertahan hidup, bukan juga yang paling cerdas, melainkan yang paling responsif terhadap perubahan.", author: "Charles Darwin" },
  { text: "Banyak kegagalan hidup adalah orang-orang yang tidak menyadari seberapa dekat mereka dengan kesuksesan saat mereka menyerah.", author: "Thomas A. Edison" },
  { text: "Kegagalan adalah bumbu yang memberikan kesuksesan rasanya.", author: "Truman Capote" }
];

const getWeatherInfo = (code: number) => {
  if (code === 0) return { label: 'Cerah', Icon: Sun };
  if (code === 1 || code === 2) return { label: 'Cerah Berawan', Icon: CloudSun };
  if (code === 3) return { label: 'Mendung', Icon: Cloud };
  if (code >= 45 && code <= 48) return { label: 'Berkabut', Icon: Cloud };
  if (code >= 51 && code <= 67) return { label: 'Hujan Gerimis', Icon: CloudRain };
  if (code >= 71 && code <= 77) return { label: 'Salju', Icon: Cloud };
  if (code >= 80 && code <= 82) return { label: 'Hujan Deras', Icon: CloudRain };
  if (code >= 95) return { label: 'Badai Petir', Icon: CloudRain };
  return { label: 'Berawan', Icon: CloudSun };
};

type CalendarEvent = {
  id: string;
  dateStr: string; // Format: YYYY-MM-DD
  title: string;
};

export default function HomePage() {
  const [realTime, setRealTime] = useState<Date | null>(null);
  const [quote, setQuote] = useState(MOTIVATIONS[0]);
  const [isClient, setIsClient] = useState(false);
  const [weather, setWeather] = useState<{temp: number, hum: number, wind: number, code: number} | null>(null);
  
  // Calendar States
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");

  useEffect(() => {
    setIsClient(true);
    setRealTime(new Date());
    setQuote(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);
    
    // Load events
    const savedEvents = localStorage.getItem("dashboard_calendar_events");
    if (savedEvents) {
      try { setEvents(JSON.parse(savedEvents)); } catch(e){}
    }

    const timer = setInterval(() => setRealTime(new Date()), 60000);

    const fetchWeather = async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FBangkok");
        const data = await res.json();
        if (data?.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            hum: data.current.relative_humidity_2m,
            wind: data.current.wind_speed_10m,
            code: data.current.weather_code
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchWeather();

    return () => clearInterval(timer);
  }, []);

  const openAddEventModal = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setNewEventTitle("");
    setShowModal(true);
  };

  const saveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !selectedDateStr) return;
    
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      dateStr: selectedDateStr,
      title: newEventTitle.trim()
    };
    
    const updated = [...events, newEvent];
    setEvents(updated);
    localStorage.setItem("dashboard_calendar_events", JSON.stringify(updated));
    setShowModal(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm("Hapus catatan ini?")) {
      const updated = events.filter(ev => ev.id !== eventId);
      setEvents(updated);
      localStorage.setItem("dashboard_calendar_events", JSON.stringify(updated));
    }
  };

  if (!isClient || !realTime) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const formattedDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(realTime);
  const formattedTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(realTime);
  const greeting = realTime.getHours() < 12 ? 'Selamat Pagi' : realTime.getHours() < 15 ? 'Selamat Siang' : realTime.getHours() < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const weatherInfo = weather ? getWeatherInfo(weather.code) : { label: 'Memuat...', Icon: CloudSun };
  const WeatherIcon = weatherInfo.Icon;

  // Format events for FullCalendar
  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    date: e.dateStr,
    backgroundColor: '#4f46e5', // indigo-600
    borderColor: '#4f46e5'
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 p-2 md:p-6 pb-20">
      
      {/* Header Greeting Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-white opacity-5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-indigo-500 opacity-20 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4 text-xs font-semibold tracking-widest uppercase">
              <Sparkles className="w-3 h-3 text-indigo-300" />
              <span>Dashboard Personal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">Admin!</span>
            </h1>
            <p className="text-indigo-200 text-lg max-w-xl leading-relaxed">
              Selamat datang kembali. Mari jadikan hari ini produktif dan penuh dengan pencapaian yang luar biasa.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-inner">
            <div className="bg-indigo-500/30 p-3 rounded-xl">
              <Clock className="h-8 w-8 text-indigo-100" />
            </div>
            <div>
              <div className="text-3xl font-black tabular-nums tracking-tighter">{formattedTime}</div>
              <div className="text-indigo-200 text-sm font-medium">{formattedDate}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Quote Card */}
        <div className="md:col-span-8 group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 transition-transform duration-500 group-hover:scale-110">
            <Quote className="h-32 w-32" />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest w-fit mb-6">
              <Sparkles className="w-3 h-3" /> Motivasi Hari Ini
            </div>
            <blockquote className="space-y-6">
              <p className="text-2xl md:text-3xl font-bold leading-snug text-slate-800 dark:text-slate-100 italic">"{quote.text}"</p>
              <footer className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900 dark:to-violet-900 flex items-center justify-center">
                  <span className="text-indigo-600 dark:text-indigo-300 font-black text-lg">{quote.author.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{quote.author}</div>
                  <div className="text-xs text-slate-500 font-medium">Daily Inspiration</div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>

        {/* Weather Card */}
        <div className="md:col-span-4 relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="absolute top-4 right-4 opacity-5 dark:opacity-10 text-slate-800 dark:text-slate-100">
            <WeatherIcon className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                <MapPin className="w-3 h-3 text-indigo-500" /> Jakarta, ID
              </div>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-end gap-4">
                <WeatherIcon className="w-16 h-16 text-indigo-500 drop-shadow-sm" />
                <div>
                  <div className="text-6xl font-black tracking-tighter text-slate-900 dark:text-white">{weather ? `${weather.temp}°` : '--°'}</div>
                  <div className="text-slate-500 dark:text-slate-400 font-medium text-lg">{weatherInfo.label}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 text-slate-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg"><Droplets className="w-4 h-4 text-indigo-500" /></div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kelembapan</div>
                    <div className="font-black text-sm">{weather ? `${weather.hum}%` : '--'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg"><Wind className="w-4 h-4 text-indigo-500" /></div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Angin</div>
                    <div className="font-black text-sm">{weather ? `${weather.wind} km/h` : '--'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FullCalendar Integration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-4 md:p-6 lg:p-8">
        <style dangerouslySetInnerHTML={{__html: `
          .fc-theme-standard .fc-scrollgrid { border-color: #e2e8f0; border-radius: 0.5rem; overflow: hidden; }
          .fc-theme-standard th { padding: 8px 0; background: #f8fafc; font-size: 13px; text-transform: uppercase; color: #64748b; }
          .fc-daygrid-day-number { font-weight: 700; color: #334155; }
          .fc-day-today { background-color: #eef2ff !important; }
          .fc-daygrid-event { cursor: pointer; border-radius: 4px; padding: 2px 4px; font-weight: 600; font-size: 11px; }
          .fc-header-toolbar { margin-bottom: 1.5em !important; }
          .fc-toolbar-title { font-weight: 800 !important; color: #1e293b; }
          .fc-button-primary { background-color: #4f46e5 !important; border-color: #4f46e5 !important; }
          .fc-button-primary:hover { background-color: #4338ca !important; border-color: #4338ca !important; }
        `}} />
        
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={fcEvents}
          dateClick={(info) => openAddEventModal(info.dateStr)}
          eventClick={(info) => handleDeleteEvent(info.event.id)}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
          }}
          height="auto"
          dayMaxEvents={true}
        />
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tambah Catatan / Event</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveEvent} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Tanggal
                </label>
                <input 
                  type="text" 
                  readOnly 
                  value={selectedDateStr || ""} 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-2.5 text-slate-700 dark:text-slate-300 font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Catatan
                </label>
                <textarea 
                  rows={4}
                  autoFocus
                  required
                  placeholder="Misal: Meeting dengan klien atau mencatat ide..."
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none leading-relaxed"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
