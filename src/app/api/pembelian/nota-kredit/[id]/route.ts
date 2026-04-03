import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const data: any = await executeQuery(`SELECT * FROM thbelinota WHERE nomor = ? AND status_aktif = 1`, [id]);
    if (data.length === 0) {
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: data[0] });
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
