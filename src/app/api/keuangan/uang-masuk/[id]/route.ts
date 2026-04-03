import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const [headerRows]: any = await pool.query(`SELECT * FROM thuangmasuk WHERE nomor = ?`, [id]);
    if (headerRows.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    const header = headerRows[0];
    
    const [itemsRows]: any = await pool.query(`SELECT * FROM tduangmasuk WHERE nomorthuangmasuk = ? AND status_aktif = 1 ORDER BY nomor`, [header.nomor]);
    const [selisihRows]: any = await pool.query(`SELECT * FROM tduangmasukselisih WHERE nomorthuangmasuk = ? AND status_aktif = 1 ORDER BY nomor`, [header.nomor]);

    return NextResponse.json({ 
      success: true, 
      data: { 
        ...header,
        total: Number(header.total || 0),
        total_idr: Number(header.total_idr || 0),
        kurs: Number(header.kurs || 1),
        items: itemsRows.map((d: any) => ({
          ...d,
          nominal: Number(d.nominal || 0),
          nominal_transaksi: Number(d.nominal_transaksi || 0),
          nominal_transaksi_idr: Number(d.nominal_transaksi_idr || 0),
          total_terbayar: Number(d.total_terbayar || 0),
          total_terbayar_idr: Number(d.total_terbayar_idr || 0)
        })),
        selisih: selisihRows.map((s: any) => ({
          ...s,
          nominal: Number(s.nominal || 0)
        }))
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    const { action, user } = await request.json();

    const [headerRows]: any = await pool.query(`SELECT nomor, kode, jenis FROM thuangmasuk WHERE kode = ? OR nomor = ?`, [id, id]);
    if (headerRows.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    const { nomor, kode, jenis } = headerRows[0];
    const menuTitle = jenis == 1 ? "Uang Masuk Utama" : "Uang Masuk Lain";

    if (action === 'approve') {
      await pool.query(`UPDATE thuangmasuk SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`, [user || 'Admin', nomor]);
      await addLogHistory(menuTitle, nomor, "APPROVE", user || "Admin", `Menyetujui ${menuTitle} ${kode}`);
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }

    if (action === 'disapprove') {
      await pool.query(`UPDATE thuangmasuk SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`, [nomor]);
      await addLogHistory(menuTitle, nomor, "DISAPPROVE", user || "Admin", `Membatalkan Persetujuan ${menuTitle} ${kode}`);
      return NextResponse.json({ success: true, message: 'Batal Setuju' });
    }

    if (action === 'delete') {
      await pool.query(`UPDATE thuangmasuk SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`, [user || 'Admin', nomor]);
      await addLogHistory(menuTitle, nomor, "DELETE", user || "Admin", `Membatalkan/Menghapus ${menuTitle} ${kode}`);
      return NextResponse.json({ success: true, message: 'Dibatalkan' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
