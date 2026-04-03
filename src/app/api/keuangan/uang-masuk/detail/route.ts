import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const header: any = await executeQuery(`SELECT * FROM thuangmasuk WHERE nomor = ?`, [id]);
    if (header.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });

    const items = await executeQuery(`SELECT * FROM tduangmasuk WHERE nomorthuangmasuk = ?`, [id]);
    const selisih = await executeQuery(`SELECT * FROM tduangmasukselisih WHERE nomorthuangmasuk = ?`, [id]);

    return NextResponse.json({ success: true, header: header[0], items, selisih });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
