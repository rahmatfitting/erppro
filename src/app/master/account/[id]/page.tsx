"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, Save, BookOpen, CheckCircle, XCircle } from "lucide-react";

export default function AccountDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/master/account/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) { setData(d.data); setForm(d.data); }
        else setError(d.error);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/master/account/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) { setData(form); setEditing(false); }
      else setError(d.error);
    } catch { setError("Gagal menyimpan"); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16 text-slate-400">Memuat...</div>;
  if (!data) return <div className="p-6 text-red-600">{error || "Data tidak ditemukan"}</div>;

  const val = editing ? form : data;
  const badge = (v: number, label: string) => (
    <div className="flex items-center gap-2">
      {v ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}
      <span className={`text-sm font-medium ${v ? 'text-green-700 dark:text-green-400' : 'text-slate-500'}`}>{label}</span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/master/account" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{data.nama}</h1>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            <Edit2 className="h-4 w-4" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setForm(data); }} className="px-3 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Batal
            </button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "..." : "Simpan"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Kode</p>
            <p className="font-mono font-semibold text-indigo-600">{data.kode}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Kode Inisial</p>
            {editing ? (
              <input value={form.kode_inisial || ''} onChange={e => setForm({ ...form, kode_inisial: e.target.value })}
                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-md dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            ) : <p className="text-slate-800 dark:text-white">{data.kode_inisial || '-'}</p>}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Nama Account</p>
          {editing ? (
            <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })}
              className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-md dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" required />
          ) : <p className="text-slate-800 dark:text-white font-medium">{data.nama}</p>}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="text-xs font-medium text-slate-500 uppercase mb-3">Tipe Account</p>
          {editing ? (
            <div className="grid grid-cols-2 gap-2">
              {(['kas', 'bank', 'giro', 'detail', 'is_foh'] as const).map(key => (
                <label key={key} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={!!form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 accent-indigo-600 rounded" />
                  <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-indigo-700 font-medium">
                <input type="checkbox" checked={!!form.is_browse_ums} onChange={e => setForm({ ...form, is_browse_ums: e.target.checked })} className="h-4 w-4 accent-indigo-600 rounded" />
                <span className="text-sm">Is Browse UMS</span>
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {badge(data.kas, 'Kas')}
              {badge(data.bank, 'Bank')}
              {badge(data.giro, 'Giro')}
              {badge(data.detail, 'Detail')}
              {badge(data.is_foh, 'Is FOH')}
              {badge(data.is_browse_ums, 'Is Browse UMS')}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Keterangan</p>
          {editing ? (
            <textarea value={form.keterangan || ''} onChange={e => setForm({ ...form, keterangan: e.target.value })} rows={2}
              className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-md dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
          ) : <p className="text-slate-700 dark:text-slate-300 text-sm">{data.keterangan || '-'}</p>}
        </div>
      </div>
    </div>
  );
}
