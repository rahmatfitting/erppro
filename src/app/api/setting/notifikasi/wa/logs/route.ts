import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const logs: any = await executeQuery(`
      SELECT * FROM mhnotifikasi_wa_log 
      ORDER BY tanggal DESC 
      LIMIT 20
    `);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
