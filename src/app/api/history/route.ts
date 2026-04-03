import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const menu = searchParams.get('menu');
    const nomor_transaksi = searchParams.get('nomor_transaksi');

    if (!menu || !nomor_transaksi) {
      return NextResponse.json({ success: false, error: 'Menu dan Nomor Transaksi wajib diisi' }, { status: 400 });
    }

    const data = await executeQuery(
      `SELECT * FROM tloghistory 
       WHERE menu = ? AND nomor_transaksi = ? 
       ORDER BY waktu DESC`,
      [menu, nomor_transaksi]
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
