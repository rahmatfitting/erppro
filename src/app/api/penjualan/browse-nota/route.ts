import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const nomormhcustomer = searchParams.get('nomormhcustomer') || '';
    
    const session = await getSession();
    const active_cabang = session?.active_cabang || 0;
    const active_perusahaan = session?.active_perusahaan || 0;

    let query = `
      (SELECT nomor, kode, tanggal, customer, 'Nota' as tipe, total 
       FROM thjualnota 
       WHERE status_aktif = 1 AND status_disetujui = 1 AND nomormhcabang = ? AND nomormhperusahaan = ?)
      UNION ALL
      (SELECT nomor, kode, tanggal, customer, 'POS' as tipe, total 
       FROM thpos 
       WHERE status_aktif = 1 AND nomormhcabang = ? AND nomormhperusahaan = ?)
    `;
    const params: any[] = [active_cabang, active_perusahaan, active_cabang, active_perusahaan];

    let finalQuery = `SELECT * FROM (${query}) AS combined WHERE 1=1`;
    if (keyword) {
      finalQuery += ` AND (kode LIKE ? OR customer LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (nomormhcustomer) {
      // Note: thpos might not have nomormhcustomer if it's 'Umum', but usually it does.
      finalQuery += ` AND customer IN (SELECT nama FROM mhcustomer WHERE nomor = ?)`;
      params.push(nomormhcustomer);
    }

    finalQuery += ` ORDER BY tanggal DESC, kode DESC LIMIT 50`;

    const data = await executeQuery(finalQuery, params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
