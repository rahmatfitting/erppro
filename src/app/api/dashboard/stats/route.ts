import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session: any = await getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { active_perusahaan, active_cabang } = session;

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'summary';
    const cabangId = searchParams.get('cabangId') || active_cabang;
    const date = searchParams.get('date');

    // 1. Summary View
    if (view === 'summary') {
      // Revenue Month to Date (Filtered by Branch)
      const revenue = await executeQuery<any[]>(`
        SELECT SUM(total_idr) as total 
        FROM thjualnota 
        WHERE status_aktif = 1 
        AND nomormhperusahaan = ? AND nomormhcabang = ?
        AND MONTH(tanggal) = MONTH(CURRENT_DATE()) 
        AND YEAR(tanggal) = YEAR(CURRENT_DATE())
      `, [active_perusahaan, active_cabang]);

      // Real Profit (Margin) - Month to Date (Filtered by Branch)
      const profit = await executeQuery<any[]>(`
        SELECT SUM(d.subtotal - (d.jumlah * IFNULL(b.harga_beli, 0))) as total
        FROM tdjualnota d
        JOIN thjualnota h ON d.nomorthjualnota = h.nomor
        LEFT JOIN mhbarang b ON d.kode_barang = b.kode
        WHERE h.status_aktif = 1 
        AND h.nomormhperusahaan = ? AND h.nomormhcabang = ?
        AND MONTH(h.tanggal) = MONTH(CURRENT_DATE()) 
        AND YEAR(h.tanggal) = YEAR(CURRENT_DATE())
      `, [active_perusahaan, active_cabang]);

      // Order Count Month to Date (Filtered by Branch)
      const orders = await executeQuery<any[]>(`
        SELECT COUNT(*) as total 
        FROM thjualnota 
        WHERE status_aktif = 1 
        AND nomormhperusahaan = ? AND nomormhcabang = ?
        AND MONTH(tanggal) = MONTH(CURRENT_DATE())
      `, [active_perusahaan, active_cabang]);

      // Inventory Value
      const inventory = await executeQuery<any[]>(`
        SELECT SUM(harga_beli * 10) as total 
        FROM mhbarang 
        WHERE status_aktif = 1
      `); 

      // Overdue Receivables (Filtered by Branch)
      const overdue = await executeQuery<any[]>(`
        SELECT SUM(total_idr) as total 
        FROM thjualnota 
        WHERE status_aktif = 1 
        AND status_disetujui = 1
        AND nomormhperusahaan = ? AND nomormhcabang = ?
        AND tanggal < CURRENT_DATE()
      `, [active_perusahaan, active_cabang]); 

      // Production Output (Filtered by Branch)
      const production = await executeQuery<any[]>(`
        SELECT SUM(qty_fg) as total 
        FROM thhasilproduksi 
        WHERE status_aktif = 1 
        AND nomormhperusahaan = ? AND nomormhcabang = ?
        AND MONTH(tanggal) = MONTH(CURRENT_DATE())
      `, [active_perusahaan, active_cabang]);

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
        ? `SUM(d.subtotal - (d.jumlah * IFNULL(b.harga_beli, 0)))` 
        : `SUM(h.total_idr)`;
      
      const query = `
        SELECT g.nama as label, ${selectVal} as value, g.nomor as id
        FROM thjualnota h
        LEFT JOIN mhgudang g ON h.gudang = g.nama
        ${isMargin ? 'JOIN tdjualnota d ON h.nomor = d.nomorthjualnota LEFT JOIN mhbarang b ON d.kode_barang = b.kode' : ''}
        WHERE h.status_aktif = 1
        AND h.nomormhperusahaan = ?
        AND MONTH(h.tanggal) = MONTH(CURRENT_DATE())
        GROUP BY g.nama, g.nomor
        ORDER BY value DESC
      `;
      const data = await executeQuery(query, [active_perusahaan]);
      return NextResponse.json({ success: true, data });
    }

    // 3. Drill-down: Daily (Revenue & Margin)
    if (view === 'revenue_daily' || view === 'margin_daily') {
      const isMargin = view === 'margin_daily';
      const selectVal = isMargin 
        ? `SUM(d.subtotal - (d.jumlah * IFNULL(b.harga_beli, 0)))` 
        : `SUM(h.total_idr)`;

      let query = `
        SELECT h.tanggal as label, ${selectVal} as value
        FROM thjualnota h
        ${isMargin ? 'JOIN tdjualnota d ON h.nomor = d.nomorthjualnota LEFT JOIN mhbarang b ON d.kode_barang = b.kode' : ''}
        WHERE h.status_aktif = 1
        AND h.nomormhperusahaan = ?
        AND MONTH(h.tanggal) = MONTH(CURRENT_DATE())
      `;
      const params: any[] = [active_perusahaan];
      if (cabangId) {
        query += ` AND h.nomormhcabang = ?`; 
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
        ? `(SELECT SUM(subtotal - (jumlah * (SELECT IFNULL(harga_beli, 0) FROM mhbarang WHERE kode = tdjualnota.kode_barang))) FROM tdjualnota WHERE nomorthjualnota = h.nomor)` 
        : `h.total_idr`;

      let query = `
        SELECT h.kode, h.customer, h.jenis, ${selectVal} as value, h.nomor as id
        FROM thjualnota h
        WHERE h.status_aktif = 1
        AND h.nomormhperusahaan = ?
        AND h.tanggal = ?
      `;
      const params = [active_perusahaan, date];
      if (cabangId) {
        query += ` AND h.nomormhcabang = ?`;
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
