import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const [rows]: any = await pool.query(`SELECT * FROM thuangtitipan WHERE nomor = ? AND jenis = 'UMS' AND status_aktif = 1`, [id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Uang Muka Supplier tidak ditemukan' }, { status: 404 });
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
      await executeQuery(`UPDATE thuangtitipan SET status_disetujui = 1, disetujui_oleh = 0, disetujui_pada = NOW() WHERE nomor = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }
    if (action === 'disapprove') {
      await executeQuery(`UPDATE thuangtitipan SET status_disetujui = 0, dibatalkan_oleh = 0, dibatalkan_pada = NOW() WHERE nomor = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Dibatalkan' });
    }

    return NextResponse.json({ success: true, message: 'Berhasil' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
