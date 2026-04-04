import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

      // Real Profit (Margin) - Month to Date
      const profit = await executeQuery<any[]>(`
        SELECT SUM(d.subtotal - (d.jumlah * b.harga_beli)) as total
        FROM tdjualnota d
        JOIN thjualnota h ON d.nomorthjualnota = h.nomor
        JOIN mhbarang b ON d.kode_barang = b.kode
        WHERE h.status_aktif = 1 
        AND MONTH(h.tanggal) = MONTH(CURRENT_DATE()) 
        AND YEAR(h.tanggal) = YEAR(CURRENT_DATE())
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

      const totalOrders = parseInt(orders[0]?.total || '0');
      const totalProfit = parseFloat(profit[0]?.total || '0');
      const avgProfit = totalOrders > 0 ? (totalProfit / totalOrders) : 0;

      return NextResponse.json({
        success: true,
        data: {
          revenue: parseFloat(revenue[0]?.total || 0),
          orders: totalOrders,
          inventory: parseFloat(inventory[0]?.total || 0),
          overdue: parseFloat(overdue[0]?.total || 0),
          production: parseFloat(production[0]?.total || 0),
          profit: avgProfit
        }
      });
    }

    // 2. Drill-down: Branches (Revenue & Margin)
    if (view === 'revenue_branch' || view === 'margin_branch') {
      const isMargin = view === 'margin_branch';
      const selectVal = isMargin 
        ? `SUM(d.subtotal - (d.jumlah * b.harga_beli))` 
        : `SUM(h.total_idr)`;
      
      const query = `
        SELECT g.nama as label, ${selectVal} as value, g.nomor as id
        FROM thjualnota h
        LEFT JOIN mhgudang g ON h.gudang = g.nama
        ${isMargin ? 'JOIN tdjualnota d ON h.nomor = d.nomorthjualnota JOIN mhbarang b ON d.kode_barang = b.kode' : ''}
        WHERE h.status_aktif = 1
        AND MONTH(h.tanggal) = MONTH(CURRENT_DATE())
        GROUP BY g.nama, g.nomor
        ORDER BY value DESC
      `;
      const data = await executeQuery(query);
      return NextResponse.json({ success: true, data });
    }

    // 3. Drill-down: Daily (Revenue & Margin)
    if (view === 'revenue_daily' || view === 'margin_daily') {
      const isMargin = view === 'margin_daily';
      const selectVal = isMargin 
        ? `SUM(d.subtotal - (d.jumlah * b.harga_beli))` 
        : `SUM(h.total_idr)`;

      let query = `
        SELECT h.tanggal as label, ${selectVal} as value
        FROM thjualnota h
        ${isMargin ? 'JOIN tdjualnota d ON h.nomor = d.nomorthjualnota JOIN mhbarang b ON d.kode_barang = b.kode' : ''}
        WHERE h.status_aktif = 1
        AND MONTH(h.tanggal) = MONTH(CURRENT_DATE())
      `;
      const params = [];
      if (cabangId) {
        query += ` AND h.gudang = ?`; 
        params.push(cabangId);
      }
      query += ` GROUP BY h.tanggal ORDER BY h.tanggal ASC`;
      const data = await executeQuery(query, params);
      return NextResponse.json({ success: true, data });
    }

  // 4. Drill-down: Transactions (Revenue & Margin)
    if (view === 'revenue_transactions' || view === 'margin_transactions') {
      const isMargin = view === 'margin_transactions';
      const selectVal = isMargin 
        ? `(SELECT SUM(subtotal - (jumlah * (SELECT harga_beli FROM mhbarang WHERE kode = tdjualnota.kode_barang))) FROM tdjualnota WHERE nomorthjualnota = h.nomor)` 
        : `h.total_idr`;

      let query = `
        SELECT h.kode, h.customer, h.jenis, ${selectVal} as value, h.nomor as id
        FROM thjualnota h
        WHERE h.status_aktif = 1
        AND h.tanggal = ?
      `;
      const params = [date];
      if (cabangId) {
        query += ` AND h.gudang = ?`;
        params.push(cabangId);
      }
      const data = await executeQuery(query, params);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Invalid view" }, { status: 400 });

  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
