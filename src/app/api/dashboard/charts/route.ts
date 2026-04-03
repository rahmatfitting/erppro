import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Sales Trend (Last 30 Days)
    const salesTrendQuery = `
      SELECT tanggal as name, SUM(total_idr) as sales
      FROM thjualnota
      WHERE status_aktif = 1 
      AND tanggal >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY tanggal
      ORDER BY tanggal ASC
    `;
    const salesTrend = await executeQuery<any[]>(salesTrendQuery);

    // 2. Cashflow (In vs Out) - Last 7 days
    const inflowQuery = `
      SELECT tanggal as name, SUM(total_idr) as inflow
      FROM thuangmasuk
      WHERE status_aktif = 1
      AND tanggal >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY tanggal
    `;
    const outflowQuery = `
      SELECT tanggal as name, SUM(total_idr) as outflow
      FROM thuangkeluar
      WHERE status_aktif = 1
      AND tanggal >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY tanggal
    `;
    const inflows = await executeQuery<any[]>(inflowQuery);
    const outflows = await executeQuery<any[]>(outflowQuery);

    // Merge Cashflow
    const cashflow = inflows.map((inItem: any) => {
      const outItem = outflows.find((o: any) => o.name === inItem.name);
      return {
        name: inItem.name,
        inflow: parseFloat(inItem.inflow || 0),
        outflow: parseFloat(outItem ? outItem.outflow : 0)
      };
    });

    // 3. Top 5 Products
    const topProductsQuery = `
      SELECT nama_barang as name, SUM(jumlah) as value
      FROM tdjualnota
      WHERE status_aktif = 1
      GROUP BY nama_barang
      ORDER BY value DESC
      LIMIT 5
    `;
    const topProducts = await executeQuery<any[]>(topProductsQuery);

    // 4. Sales Per Branch (Gudang)
    const salesBranchQuery = `
      SELECT IFNULL(NULLIF(gudang, ''), 'PUSAT') as name, SUM(total_idr) as value
      FROM thjualnota
      WHERE status_aktif = 1
      GROUP BY gudang
    `;
    const salesBranch = await executeQuery<any[]>(salesBranchQuery);

    return NextResponse.json({
      success: true,
      data: {
        salesTrend,
        cashflow,
        topProducts,
        salesBranch
      }
    });

  } catch (error: any) {
    console.error("Dashboard Charts Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
