import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    // 1. Stats Summary
    const statsQuery = `
      SELECT 
        COUNT(*) as total_usage,
        SUM(total_diskon) as total_discount,
        COUNT(DISTINCT nomormhpromo) as distinct_promos
      FROM thpromousage
      WHERE (tanggal >= ? OR ? = '') AND (tanggal <= ? OR ? = '')
    `;
    const [statsRows]: any = await pool.query(statsQuery, [startDate, startDate, endDate, endDate]);
    const stats = statsRows[0];

    // 2. Usage by Promo
    const byPromoQuery = `
      SELECT 
        p.nama,
        p.kode,
        p.jenis_promo,
        COUNT(u.nomor) as usage_count,
        SUM(u.total_diskon) as total_discount
      FROM mhpromo p
      JOIN thpromousage u ON p.nomor = u.nomormhpromo
      WHERE (u.tanggal >= ? OR ? = '') AND (u.tanggal <= ? OR ? = '')
      GROUP BY p.nomor, p.nama, p.kode, p.jenis_promo
      ORDER BY usage_count DESC
    `;
    const [byPromo]: any = await pool.query(byPromoQuery, [startDate, startDate, endDate, endDate]);

    // 3. Usage over Time (Last 30 days if no date)
    const timeQuery = `
      SELECT 
        DATE(tanggal) as date,
        COUNT(*) as count,
        SUM(total_diskon) as discount
      FROM thpromousage
      WHERE (tanggal >= ? OR ? = '') AND (tanggal <= ? OR ? = '')
      GROUP BY DATE(tanggal)
      ORDER BY date ASC
    `;
    const [overTime]: any = await pool.query(timeQuery, [startDate, startDate, endDate, endDate]);

    return NextResponse.json({ 
      success: true, 
      data: {
        stats,
        byPromo,
        overTime
      } 
    });
  } catch (error: any) {
    console.error("GET Promo Report Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
