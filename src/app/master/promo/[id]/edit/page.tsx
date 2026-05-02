"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Save, Search, Ticket, Check, X, XCircle,
  Trash2, Plus, AlertCircle, Loader2, Info, Tags, 
  Calendar, Clock, Store, Users, Package, ChevronRight,
  Layers, TrendingUp
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrowseBarangModal } from "@/components/BrowseBarangModal";
import { BrowseCabangModal } from "@/components/BrowseCabangModal";

interface SelectedItem {
  tipe_target: string;
  target_id: string;
  nama: string;
}

interface SelectedBranch {
  nomor: number;
  nama: string;
}

export default function PromoEdit({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    nama: "",
    keterangan: "",
    jenis_promo: "PERCENT",
    nilai_promo: 0,
    min_pembelian: 0,
    max_diskon: 0,
    tanggal_mulai: "",
    tanggal_selesai: "",
    jam_mulai: "00:00",
    jam_selesai: "23:59",
    hari_berlaku: [] as string[],
    status_aktif: 1,
    is_stackable: 0,
    prioritas: 0,
    kode_voucher: "",
    metode_aplikasi: "AUTO",
    target_pengguna: "ALL",
    limit_per_user: 0,
    limit_total: 0,
    kode: "" // display only
  });

  // Targeted Data State
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]); 
  const [selectedBranches, setSelectedBranches] = useState<SelectedBranch[]>([]); 
  const [selectedMemberLevels, setSelectedMemberLevels] = useState<string[]>([]);

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);

  const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const memberLevelsList = ["Silver", "Gold", "Platinum", "VIP"];

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
          const d = result.data;
          setFormData({
            nama: d.nama || "",
            keterangan: d.keterangan || "",
            jenis_promo: d.jenis_promo || "PERCENT",
            nilai_promo: Number(d.nilai_promo) || 0,
            min_pembelian: Number(d.min_pembelian) || 0,
            max_diskon: Number(d.max_diskon) || 0,
            tanggal_mulai: d.tanggal_mulai ? d.tanggal_mulai.split('T')[0] : "",
            tanggal_selesai: d.tanggal_selesai ? d.tanggal_selesai.split('T')[0] : "",
            jam_mulai: d.jam_mulai || "00:00",
            jam_selesai: d.jam_selesai || "23:59",
            hari_berlaku: d.hari_berlaku ? (Array.isArray(d.hari_berlaku) ? d.hari_berlaku : JSON.parse(d.hari_berlaku)) : [],
            status_aktif: d.status_aktif,
            is_stackable: d.is_stackable,
            prioritas: d.prioritas,
            kode_voucher: d.kode_voucher || "",
            metode_aplikasi: d.metode_aplikasi || "AUTO",
            target_pengguna: d.target_pengguna || "ALL",
            limit_per_user: d.limit_per_user || 0,
            limit_total: d.limit_total || 0,
            kode: d.kode || ""
          });

          if (d.items) {
             setSelectedItems(d.items.map((it: any) => ({
                tipe_target: it.tipe_target,
                target_id: it.target_id,
                nama: it.barang_nama || it.target_id
             })));
          }
          if (d.branches) {
             setSelectedBranches(d.branches);
          }
          if (d.member_levels) {
             setSelectedMemberLevels(d.member_levels);
          }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === "" ? 0 : parseFloat(value)) : value
    }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      hari_berlaku: prev.hari_berlaku.includes(day) 
        ? prev.hari_berlaku.filter(d => d !== day)
        : [...prev.hari_berlaku, day]
    }));
  };

  const toggleMemberLevel = (level: string) => {
    setSelectedMemberLevels(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const removeItem = (targetId: string) => {
    setSelectedItems(prev => prev.filter(item => item.target_id !== targetId));
  };

  const removeBranch = (nomor: number) => {
    setSelectedBranches(prev => prev.filter(b => b.nomor !== nomor));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...formData,
      items: selectedItems,
      branches: selectedBranches.map(b => b.nomor),
      member_levels: selectedMemberLevels
    };

    try {
      const res = await fetch(`/api/master/promo/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        router.push("/master/promo");
        router.refresh();
      } else {
        setError(result.error || "Gagal menyimpan perubahan");
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium animate-pulse">Memuat data promo...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
          <Ticket className="h-12 w-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Promo Tidak Ditemukan</h2>
        <p className="text-slate-500 max-w-md">Data promosi dengan ID <span className="font-mono font-bold text-slate-700 dark:text-slate-300">#{id}</span> tidak ditemukan atau telah dihapus.</p>
        <Link 
          href="/master/promo"
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Link href="/master/promo" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
               <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
               <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                  <span>M# {formData.kode}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>Ubah Promo</span>
               </div>
               <h2 className="text-2xl font-bold tracking-tight text-slate-900">Edit Konfigurasi Promo</h2>
            </div>
         </div>
      </div>

      {error && (
         <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-700">{error}</p>
         </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Left Column: Basic Info & Rules */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Section 1: General Info */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Info className="h-4 w-4 text-indigo-500" /> Informasi Dasar
                  </h3>
               </div>
               <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Promo</label>
                     <input 
                        required
                        type="text" 
                        name="nama"
                        value={formData.nama}
                        onChange={handleInputChange}
                        placeholder="Contoh: Promo Ramadhan 10%" 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Keterangan</label>
                     <textarea 
                        name="keterangan"
                        value={formData.keterangan}
                        onChange={handleInputChange}
                        placeholder="Deskripsi singkat mengenai promo ini..." 
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                     />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jenis Promo</label>
                        <select 
                           name="jenis_promo"
                           value={formData.jenis_promo}
                           onChange={handleInputChange}
                           className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium bg-white"
                        >
                           <option value="PERCENT">Diskon Persen (%)</option>
                           <option value="NOMINAL">Diskon Nominal (Rp)</option>
                           <option value="BUY_X_GET_Y">Buy X Get Y (Gratis)</option>
                           <option value="BUNDLE">Bundle Pricing</option>
                           <option value="SPECIAL_PRICE">Harga Khusus</option>
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nilai Promo</label>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                              {formData.jenis_promo === 'PERCENT' ? '%' : 'Rp'}
                           </span>
                           <input 
                              type="number" 
                              name="nilai_promo"
                              value={formData.nilai_promo === 0 ? '' : formData.nilai_promo}
                              onChange={handleInputChange}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold"
                           />
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Section 2: Rule / Syarat Promo */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Tags className="h-4 w-4 text-indigo-500" /> Syarat & Ketentuan
                  </h3>
               </div>
               <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Min. Pembelian (Rp)</label>
                        <input 
                           type="number" 
                           name="min_pembelian"
                           value={formData.min_pembelian === 0 ? '' : formData.min_pembelian}
                           onChange={handleInputChange}
                           className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Maks. Diskon (Rp)</label>
                        <input 
                           type="number" 
                           name="max_diskon"
                           value={formData.max_diskon === 0 ? '' : formData.max_diskon}
                           onChange={handleInputChange}
                           placeholder="0 = Tanpa Limit"
                           className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                        />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hari Berlaku</label>
                     <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map(day => (
                           <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={cn(
                                 "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                 formData.hari_berlaku.includes(day) 
                                 ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                                 : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                              )}
                           >
                              {day}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Targeted Products */}
                  <div className="space-y-3">
                     <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Berlaku Pada Produk Tertentu</label>
                        <button 
                           type="button" 
                           onClick={() => setShowProductModal(true)}
                           className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                        >
                           <Plus className="h-3 w-3" /> Tambah Produk
                        </button>
                     </div>
                     <div className="min-h-[60px] p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-wrap gap-2">
                        {selectedItems.length === 0 ? (
                           <p className="text-xs text-slate-400 italic">Semua produk (tanpa filter)</p>
                        ) : (
                           selectedItems.map(item => (
                              <div key={item.target_id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm animate-in zoom-in-95 duration-150">
                                 <Package className="h-3 w-3 text-indigo-500" />
                                 <span>{item.nama}</span>
                                 <button type="button" onClick={() => removeItem(item.target_id)} className="ml-1 text-slate-300 hover:text-red-500">
                                    <X className="h-3.5 w-3.5" />
                                 </button>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

                  {/* Targeted Branches */}
                  <div className="space-y-3 pt-2">
                     <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Berlaku Di Cabang</label>
                        <button 
                           type="button" 
                           onClick={() => setShowBranchModal(true)}
                           className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                        >
                           <Plus className="h-3 w-3" /> Tambah Cabang
                        </button>
                     </div>
                     <div className="min-h-[60px] p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-wrap gap-2">
                        {selectedBranches.length === 0 ? (
                           <p className="text-xs text-slate-400 italic">Berlaku di semua cabang (Global)</p>
                        ) : (
                           selectedBranches.map(b => (
                              <div key={b.nomor} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm animate-in zoom-in-95 duration-150">
                                 <Store className="h-3 w-3 text-indigo-500" />
                                 <span>{b.nama}</span>
                                 <button type="button" onClick={() => removeBranch(b.nomor)} className="ml-1 text-slate-300 hover:text-red-500">
                                    <X className="h-3.5 w-3.5" />
                                 </button>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Right Column: Scheduling & Settings */}
         <div className="space-y-6">
            
            {/* Status & Priority */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Status Promo</p>
                        <p className={cn("text-lg font-black", formData.status_aktif ? "text-emerald-600" : "text-slate-400")}>
                            {formData.status_aktif ? "AKTIF" : "NON-AKTIF"}
                        </p>
                    </div>
                    <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, status_aktif: prev.status_aktif ? 0 : 1 }))}
                        className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            formData.status_aktif ? "bg-emerald-500" : "bg-slate-200"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                            formData.status_aktif ? "right-1" : "left-1"
                        )}></div>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stackable</label>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, is_stackable: prev.is_stackable ? 0 : 1 }))}
                            className={cn("text-xs font-black p-2 rounded-xl border w-full transition-all", formData.is_stackable ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white text-slate-400 border-slate-200")}
                        >
                            {formData.is_stackable ? "BISA GABUNG" : "SINGLE USE"}
                        </button>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioritas</label>
                        <input 
                            type="number"
                            name="prioritas"
                            value={formData.prioritas}
                            onChange={handleInputChange}
                            className="w-full px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 font-black text-indigo-600 outline-none text-center"
                        />
                    </div>
                </div>
            </div>

            {/* Scheduling */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Calendar className="h-4 w-4 text-indigo-500" /> Penjadwalan
                  </h3>
               </div>
               <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tanggal Mulai</label>
                     <input 
                        type="date" 
                        name="tanggal_mulai"
                        value={formData.tanggal_mulai}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium bg-white"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tanggal Selesai</label>
                     <input 
                        type="date" 
                        name="tanggal_selesai"
                        value={formData.tanggal_selesai}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium bg-white"
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jam Mulai</label>
                        <input 
                           type="time" 
                           name="jam_mulai"
                           value={formData.jam_mulai}
                           onChange={handleInputChange}
                           className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium bg-white text-sm"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jam Selesai</label>
                        <input 
                           type="time" 
                           name="jam_selesai"
                           value={formData.jam_selesai}
                           onChange={handleInputChange}
                           className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium bg-white text-sm"
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* Target Audience */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Users className="h-4 w-4 text-indigo-500" /> Target Pengguna
                  </h3>
               </div>
               <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                     <select 
                        name="target_pengguna"
                        value={formData.target_pengguna}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium bg-white"
                     >
                        <option value="ALL">Semua Pelanggan</option>
                        <option value="MEMBER">Member Saja</option>
                        <option value="NEW_CUSTOMER">Pelanggan Baru</option>
                     </select>
                  </div>
                  
                  {formData.target_pengguna === 'MEMBER' && (
                     <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in zoom-in-95 duration-200">
                        {memberLevelsList.map(level => (
                           <button
                              key={level}
                              type="button"
                              onClick={() => toggleMemberLevel(level)}
                              className={cn(
                                 "px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all",
                                 selectedMemberLevels.includes(level)
                                 ? "bg-amber-100 border-amber-500 text-amber-700 shadow-sm"
                                 : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                              )}
                           >
                              {level}
                           </button>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* Application Method */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Search className="h-4 w-4 text-indigo-500" /> Metode & Voucher
                  </h3>
               </div>
               <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cara Aplikasi</label>
                     <select 
                        name="metode_aplikasi"
                        value={formData.metode_aplikasi}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium bg-white"
                     >
                        <option value="AUTO">Otomatis Ter-apply</option>
                        <option value="MANUAL">Pilih Manual di POS</option>
                        <option value="VOUCHER">Gunakan Kode Voucher</option>
                     </select>
                  </div>
                  
                  {formData.metode_aplikasi === 'VOUCHER' && (
                     <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kode Voucher</label>
                        <input 
                           type="text" 
                           name="kode_voucher"
                           value={formData.kode_voucher}
                           onChange={handleInputChange}
                           placeholder="Misal: MERDEKA79"
                           className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 transition-all font-black tracking-widest uppercase text-center text-lg text-indigo-600 bg-indigo-50/30"
                        />
                     </div>
                  )}
               </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
               <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:transform active:scale-95 text-white font-black text-lg transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
               >
                  {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                  SIMPAN PERUBAHAN
               </button>
            </div>
         </div>
      </form>

      {/* Modals */}
      <BrowseBarangModal 
         isOpen={showProductModal}
         onClose={() => setShowProductModal(false)}
         onSelect={(p) => {
            if (!selectedItems.find(it => it.target_id === p.nomor.toString())) {
               setSelectedItems([...selectedItems, { tipe_target: 'PRODUCT', target_id: p.nomor.toString(), nama: p.nama }]);
            }
            setShowProductModal(false);
         }}
      />

      <BrowseCabangModal 
         isOpen={showBranchModal}
         onClose={() => setShowBranchModal(false)}
         onSelect={(c) => {
            if (!selectedBranches.find(b => b.nomor === c.nomor)) {
               setSelectedBranches([...selectedBranches, { nomor: c.nomor, nama: c.nama }]);
            }
            setShowBranchModal(false);
         }}
      />
      
    </div>
  );
}
