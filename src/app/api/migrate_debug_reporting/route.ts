import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    
    if (query) {
      const result = await executeQuery(query);
      return NextResponse.json({ success: true, result });
    }

    const stok = await executeQuery(`SELECT * FROM rhlaporanstok`);
    const gula_receipts = await executeQuery(`
      SELECT h.nomor, h.kode, h.tanggal, h.status_disetujui, d.nomormhbarang, d.jumlah
      FROM thbelipenerimaan h
      JOIN tdbelipenerimaan d ON h.nomor = d.nomorthbelipenerimaan
      WHERE d.nomormhbarang = 1
    `);
    
    return NextResponse.json({ 
      success: true, 
      stok, 
      gula_receipts
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
