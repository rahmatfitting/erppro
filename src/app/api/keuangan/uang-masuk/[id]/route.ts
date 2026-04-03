import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const headerData: any = await executeQuery(`SELECT * FROM thuangmasuk WHERE nomor = ?`, [id]);
    if (headerData.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    const header = headerData[0];
    const items: any = await executeQuery(`SELECT * FROM tduangmasuk WHERE nomorthuangmasuk = ? AND status_aktif = 1 ORDER BY nomor`, [header.nomor]);
    const selisih: any = await executeQuery(`SELECT * FROM tduangmasukselisih WHERE nomorthuangmasuk = ? AND status_aktif = 1 ORDER BY nomor`, [header.nomor]);
    return NextResponse.json({ success: true, data: { ...header, items, selisih } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const { action } = await request.json();
    if (action === 'approve') {
      await executeQuery(`UPDATE thuangmasuk SET status_disetujui = 1, disetujui_oleh = 'Admin', disetujui_pada = NOW() WHERE kode = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }
    if (action === 'disapprove') {
      await executeQuery(`UPDATE thuangmasuk SET status_disetujui = 0 WHERE kode = ?`, [id]);
      return NextResponse.json({ success: true, message: 'Dibatalkan' });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
