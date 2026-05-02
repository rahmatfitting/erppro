"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Edit, Trash2, Calendar, Clock, Ticket, 
  CheckCircle2, XCircle, Store, Users, Package, Tags, 
  ChevronRight, Info, AlertCircle, Loader2, Layers, TrendingUp 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PromoDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [promo, setPromo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/master/promo/${id}`);
        
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const result = await res.json();
        if (result.success) {
          setPromo(result.data);
        } else {
          setError(result.error || "Gagal mengambil data promo");
        }
      } catch (err) {
        setError("Terjadi kesalahan sistem saat mengambil data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!loading && notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
          <Ticket className="h-12 w-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Promo Tidak Ditemukan</h2>
        <p className="text-slate-500 max-w-md">Data promosi dengan ID <span className="font-mono font-bold text-slate-700 dark:text-slate-300">#{id}</span> tidak ditemukan atau telah dihapus dari sistem.</p>
        <Link 
          href="/master/promo"
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium animate-pulse">Memuat data promo...</p>
      </div>
    );
  }

  if (error || !promo) {
    return (
      <div className="p-6 max-w-xl mx-auto bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center text-center space-y-4 mt-12">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-bold text-red-800">Error Terjadi</h3>
        <p className="text-red-600">{error || "Data tidak valid"}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition-all">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 px-4 sm:px-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <Link href="/master/promo" className="hover:text-indigo-600 transition-colors">Master</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/master/promo" className="hover:text-indigo-600 transition-colors">Promosi</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 dark:text-white font-bold">Detail</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2">
             <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {promo.nama}
             </h1>
             <span className={cn(
                "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                promo.status_aktif ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
             )}>
                {promo.status_aktif ? "AKTIF" : "NON-AKTIF"}
             </span>
          </div>
          <p className="text-slate-500 font-medium">{promo.keterangan || "Tidak ada deskripsi."}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/master/promo/${id}/edit`}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Edit className="h-4 w-4" />
            Edit Promo
          </Link>
          <Link
            href="/master/promo"
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Rules & Configuration */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/50">
              <Info className="h-5 w-5 text-indigo-500" />
              <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">Informasi Dasar & Aturan</h3>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Jenis Promo</p>
                <div className="flex items-center gap-3 mt-1">
                   <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Tags className="h-5 w-5 text-indigo-600" />
                   </div>
                   <p className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                      {promo.jenis_promo === 'PERCENT' ? 'Diskon Persentase %' : 
                       promo.jenis_promo === 'NOMINAL' ? 'Potongan Harga (Rp)' : 
                       promo.jenis_promo === 'BUY_X_GET_Y' ? 'Beli X Gratis Y' :
                       promo.jenis_promo === 'BUNDLE' ? 'Paket Bundle (Hemat)' :
                       promo.jenis_promo === 'SPECIAL_PRICE' ? 'Harga Khusus' : promo.jenis_promo}
                   </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nilai Promo</p>
                <p className="text-3xl font-black text-indigo-600">
                  {promo.jenis_promo === 'PERCENT' ? `${promo.nilai_promo}%` : 
                   promo.jenis_promo === 'BUY_X_GET_Y' ? `${promo.nilai_promo} Gratis` :
                   formatCurrency(promo.nilai_promo)}
                </p>
              </div>

              <div className="space-y-1 col-span-full">
                 <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Minimum Pembelian</p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{formatCurrency(promo.min_pembelian)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Maksimum Diskon</p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  {promo.max_diskon > 0 ? formatCurrency(promo.max_diskon) : "Tidak Terbatas"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Metode Aplikasi</p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  {promo.metode_aplikasi === 'AUTO' ? 'Otomatis di Kasir' : 'Input Kode Voucher'}
                </p>
              </div>

              {promo.metode_aplikasi === 'VOUCHER' && (
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Kode Voucher</p>
                  <code className="text-lg font-black bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-lg text-indigo-600 border border-indigo-100 dark:border-indigo-900/30 block w-fit mt-1">
                    {promo.kode_voucher}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Targets Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Targeted Products */}
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
                  <Package className="h-5 w-5 text-indigo-500" />
                  Target Produk
                </h4>
                <div className="space-y-2">
                   {promo.items && promo.items.length > 0 ? (
                      promo.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                           <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                              {it.barang_nama || `Produk ID #${it.target_id}`}
                           </span>
                           <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full uppercase">Barang</span>
                        </div>
                      ))
                   ) : (
                      <p className="text-sm text-slate-400 italic py-4 text-center">Berlaku untuk semua produk</p>
                   )}
                </div>
             </div>

             {/* Targeted Branches */}
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
                  <Store className="h-5 w-5 text-indigo-500" />
                  Cabang Berlaku
                </h4>
                <div className="space-y-2">
                   {promo.branches && promo.branches.length > 0 ? (
                      promo.branches.map((b: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                           <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                           <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Cabang {b}</span>
                        </div>
                      ))
                   ) : (
                      <p className="text-sm text-slate-400 italic py-4 text-center">Berlaku di semua cabang</p>
                   )}
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Schedule & Metadata */}
        <div className="space-y-6">
          {/* Validity Periods */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6 text-sm uppercase tracking-wider">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Periode & Jadwal
            </h4>
            
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mulai</p>
                     <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(promo.tanggal_mulai)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Berakhir</p>
                     <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(promo.tanggal_selesai)}</p>
                  </div>
               </div>

               <div className="flex items-center gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm text-indigo-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Jam Aktif Operasional</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {promo.jam_mulai?.substring(0, 5) || "00:00"} — {promo.jam_selesai?.substring(0, 5) || "23:59"}
                    </p>
                  </div>
               </div>

               <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hari Kerja Berlaku</p>
                  <div className="flex flex-wrap gap-2">
                     {(promo.hari_berlaku ? (Array.isArray(promo.hari_berlaku) ? promo.hari_berlaku : JSON.parse(promo.hari_berlaku)) : []).map((day: string) => (
                        <span key={day} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-400 shadow-sm uppercase tracking-wide">
                          {day}
                        </span>
                     ))}
                  </div>
               </div>
            </div>
          </div>

          {/* Member Constraints */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
              <Users className="h-5 w-5 text-indigo-500" />
              Kelompok Pelanggan
            </h4>
            <div className="space-y-4">
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Segmentasi Target</p>
                 <span className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wide border border-indigo-100 dark:border-indigo-900/30 inline-block">
                   {promo.target_pengguna === 'ALL' ? 'Semua Pelanggan' : 
                    promo.target_pengguna === 'MEMBER' ? 'Hanya Pemegang Member' : 'Member Level Khusus'}
                 </span>
               </div>

               {promo.target_pengguna === 'LEVEL' && promo.member_levels && (
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Daftar Level</p>
                   <div className="flex flex-wrap gap-2">
                     {promo.member_levels.map((lvl: string) => (
                       <span key={lvl} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase border border-amber-200">
                         {lvl}
                       </span>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          </div>

          {/* Other settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Layers className="h-4 w-4 text-slate-500" />
                   </div>
                   <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Dapat Digabung (Stackable)</span>
                </div>
                {promo.is_stackable ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-slate-300" />}
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-slate-500" />
                   </div>
                   <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Urutan Prioritas</span>
                </div>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-black text-slate-900 dark:text-white">
                   Level {promo.prioritas}
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
