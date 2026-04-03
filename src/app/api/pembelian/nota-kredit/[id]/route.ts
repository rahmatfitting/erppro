import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const [rows]: any = await pool.query(`SELECT * FROM thbelinota WHERE nomor = ? AND status_aktif = 1`, [id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    }
    const h = rows[0];
    const data = {
      ...h,
      subtotal: Number(h.subtotal || 0),
      ppn_nominal: Number(h.ppn_nominal || 0),
      total: Number(h.total || 0),
      total_idr: Number(h.total_idr || 0),
      kurs: Number(h.kurs || 1)
    };
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      await executeQuery(`UPDATE thbelinota SET status_disetujui = 1, disetujui_oleh = 'Admin', disetujui_pada = NOW() WHERE nomor = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }
    if (action === 'disapprove') {
      await executeQuery(`UPDATE thbelinota SET status_disetujui = 0, dibatalkan_oleh = 'Admin', dibatalkan_pada = NOW() WHERE nomor = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Dibatalkan' });
    }

    return NextResponse.json({ success: true, message: 'Berhasil' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
