import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'summary';
    const cabangId = searchParams.get('cabangId');
    const date = searchParams.get('date');

    // 1. Summary View
    if (view === 'summary') {
      // Revenue Month to Date
      const revenue = await executeQuery<any[]>(`
        SELECT SUM(total_idr) as total 
        FROM thjualnota 
        WHERE status_aktif = 1 
        AND MONTH(tanggal) = MONTH(CURRENT_DATE()) 
        AND YEAR(tanggal) = YEAR(CURRENT_DATE())
      `);

      // Order Count Month to Date
      const orders = await executeQuery<any[]>(`
        SELECT COUNT(*) as total 
        FROM thjualnota 
        WHERE status_aktif = 1 
        AND MONTH(tanggal) = MONTH(CURRENT_DATE())
      `);

      // Inventory Value
      const inventory = await executeQuery<any[]>(`
        SELECT SUM(harga_beli * 10) as total 
        FROM mhbarang 
        WHERE status_aktif = 1
      `); 

      // Overdue Receivables
      const overdue = await executeQuery<any[]>(`
        SELECT SUM(total_idr) as total 
        FROM thjualnota 
        WHERE status_aktif = 1 
        AND status_disetujui = 1
        AND tanggal < CURRENT_DATE()
      `); 

      // Production Output
      const production = await executeQuery<any[]>(`
        SELECT SUM(qty_fg) as total 
        FROM thhasilproduksi 
        WHERE status_aktif = 1 
        AND MONTH(tanggal) = MONTH(CURRENT_DATE())
      `);

      const revTotal = parseFloat(revenue[0]?.total || 0);

      return NextResponse.json({
        success: true,
        data: {
          revenue: revTotal,
          orders: orders[0]?.total || 0,
          inventory: parseFloat(inventory[0]?.total || 0),
          overdue: parseFloat(overdue[0]?.total || 0),
          production: parseFloat(production[0]?.total || 0),
          profit: revTotal * 0.15 // Placeholder margin 15%
        }
      });
    }

    // 2. Drill-down: Branches
    if (view === 'revenue_branch') {
      const query = `
        SELECT g.nama as label, SUM(h.total_idr) as value, g.nomor as id
        FROM thjualnota h
        LEFT JOIN mhgudang g ON h.gudang = g.nama -- Assuming 'gudang' is name or ID
        WHERE h.status_aktif = 1
        AND MONTH(h.tanggal) = MONTH(CURRENT_DATE())
        GROUP BY g.nama, g.nomor
        ORDER BY value DESC
      `;
      const data = await executeQuery(query);
      return NextResponse.json({ success: true, data });
    }

    // 3. Drill-down: Daily (within a branch or overall)
    if (view === 'revenue_daily') {
      let query = `
        SELECT tanggal as label, SUM(total_idr) as value
        FROM thjualnota
        WHERE status_aktif = 1
        AND MONTH(tanggal) = MONTH(CURRENT_DATE())
      `;
      const params = [];
      if (cabangId) {
        query += ` AND gudang = ?`; // Placeholder for branch filtering
        params.push(cabangId);
      }
      query += ` GROUP BY tanggal ORDER BY tanggal ASC`;
      const data = await executeQuery(query, params);
      return NextResponse.json({ success: true, data });
    }

    // 4. Drill-down: Transactions (on a specific day)
    if (view === 'revenue_transactions') {
      let query = `
        SELECT kode, customer, total_idr as value, nomor
        FROM thjualnota
        WHERE status_aktif = 1
        AND tanggal = ?
      `;
      const data = await executeQuery(query, [date]);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Invalid view" }, { status: 400 });

  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
