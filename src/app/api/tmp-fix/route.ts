import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const r1: any = await executeQuery("UPDATE thbelinota SET jenis = 'FBL' WHERE jenis LIKE 'FB_LANGSUN%'");
    const r2: any = await executeQuery("UPDATE rhlaporanhutang SET jenis = 'FBL' WHERE jenis LIKE 'FB_LANGSUN%'");
    const r3: any = await executeQuery("UPDATE rhlaporanstok SET jenis = 'FBL' WHERE jenis LIKE 'FB_LANGSUN%'");

    return NextResponse.json({
      success: true,
      message: "Database fix complete",
      details: {
        thbelinota: r1.affectedRows,
        rhlaporanhutang: r2.affectedRows,
        rhlaporanstok: r3.affectedRows
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
