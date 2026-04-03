import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const data: any = await executeQuery(
      `SELECT * FROM mhaccount WHERE kode = ? AND status_aktif = 1`,
      [id]
    );
    if (data.length === 0) {
      return NextResponse.json({ success: false, error: 'Account tidak ditemukan' }, { status: 404 });
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
    const { kode_inisial, nama, kas, bank, giro, detail, is_foh, is_browse_ums, keterangan, catatan } = body;
    const result: any = await executeQuery(
      `UPDATE mhaccount SET kode_inisial=?, nama=?, kas=?, bank=?, giro=?, detail=?, is_foh=?, is_browse_ums=?, keterangan=?, catatan=?, diubah_pada=NOW()
       WHERE kode = ?`,
      [kode_inisial || '', nama, kas ? 1 : 0, bank ? 1 : 0, giro ? 1 : 0, detail ? 1 : 0, is_foh ? 1 : 0, is_browse_ums ? 1 : 0, keterangan || '', catatan || '', id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Account tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Account berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
