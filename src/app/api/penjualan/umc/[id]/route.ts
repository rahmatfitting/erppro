import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { addLogHistory } from '@/lib/history';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const data: any = await executeQuery(`SELECT * FROM thuangtitipan WHERE kode = ? AND jenis = 'UMC' AND status_aktif = 1`, [id]);
    if (data.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const { action, user } = await request.json();
    if (action === 'approve') {
      await executeQuery(`UPDATE thuangtitipan SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE kode = ?`, [user || 'Admin', id]);
      const rows: any = await executeQuery(`SELECT nomor FROM thuangtitipan WHERE kode = ?`, [id]);
      if (rows[0]) {
        await addLogHistory("Uang Muka Customer", rows[0].nomor, "APPROVE", user || "Admin", `Menyetujui Uang Muka Customer ${id}`);
      }
      return NextResponse.json({ success: true, message: 'Disetujui' });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
