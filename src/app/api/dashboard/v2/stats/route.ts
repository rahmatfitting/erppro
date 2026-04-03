import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Helper to get stats for a date range
    const getStats = async (start: string, end: string) => {
      const fullEnd = `${end} 23:59:59`;
      // 1. Omzet & Transactions
      const [mainStats]: any = await pool.query(`
        SELECT SUM(revenue) as revenue, SUM(transactions) as transactions
        FROM (
          SELECT SUM(total_idr) as revenue, COUNT(*) as transactions
          FROM thjualnota
          WHERE status_aktif = 1 AND status_disetujui = 1 AND tanggal BETWEEN ? AND ?
          UNION ALL
          SELECT SUM(total) as revenue, COUNT(*) as transactions
          FROM thpos
          WHERE status_aktif = 1 AND tanggal BETWEEN ? AND ?
        ) as combined
      `, [start, fullEnd, start, fullEnd]);

      // 2. Units Sold
      const [unitsSold]: any = await pool.query(`
        SELECT SUM(total) as total
        FROM (
          SELECT SUM(d.jumlah) as total
          FROM tdjualnota d
          JOIN thjualnota h ON d.nomorthjualnota = h.nomor
          WHERE h.status_aktif = 1 AND h.status_disetujui = 1 AND h.tanggal BETWEEN ? AND ?
          UNION ALL
          SELECT SUM(d.jumlah) as total
          FROM tdpos d
          JOIN thpos h ON d.nomorthpos = h.nomor
          WHERE h.status_aktif = 1 AND h.tanggal BETWEEN ? AND ?
        ) as combined
      `, [start, fullEnd, start, fullEnd]);

      // 3. Profit (calculated directly)
      const [profitStats]: any = await pool.query(`
        SELECT SUM(profit) as total_profit
        FROM (
          SELECT SUM(d.jumlah * d.netto) - SUM(d.jumlah * b.harga_beli) as profit
          FROM tdjualnota d
          JOIN thjualnota h ON d.nomorthjualnota = h.nomor
          JOIN mhbarang b ON d.nomormhbarang = b.nomor
          WHERE h.status_aktif = 1 AND h.status_disetujui = 1 AND h.tanggal BETWEEN ? AND ?
          UNION ALL
          SELECT SUM(d.jumlah * d.netto) - SUM(d.jumlah * b.harga_beli) as profit
          FROM tdpos d
          JOIN thpos h ON d.nomorthpos = h.nomor
          JOIN mhbarang b ON d.nomormhbarang = b.nomor
          WHERE h.status_aktif = 1 AND h.tanggal BETWEEN ? AND ?
        ) as combined
      `, [start, fullEnd, start, fullEnd]);

      // 4. Branch Breakdown
      const [branchStats]: any = await pool.query(`
        SELECT branch_name, SUM(revenue) as revenue, SUM(transactions) as transactions
        FROM (
          SELECT c.nama as branch_name, SUM(h.total_idr) as revenue, COUNT(*) as transactions
          FROM thjualnota h
          JOIN mhcabang c ON h.nomormhcabang = c.nomor
          WHERE h.status_aktif = 1 AND h.status_disetujui = 1 AND h.tanggal BETWEEN ? AND ?
          GROUP BY c.nomor, c.nama

          UNION ALL

          SELECT c.nama as branch_name, SUM(h.total) as revenue, COUNT(*) as transactions
          FROM thpos h
          JOIN mhcabang c ON h.nomormhcabang = c.nomor
          WHERE h.status_aktif = 1 AND h.tanggal BETWEEN ? AND ?
          GROUP BY c.nomor, c.nama
        ) as combined
        GROUP BY branch_name
        ORDER BY revenue DESC
      `, [start, fullEnd, start, fullEnd]);

      const revenue = Number(mainStats[0]?.revenue || 0);
      const transactions = Number(mainStats[0]?.transactions || 0);
      const units = Number(unitsSold[0]?.total || 0);
      const profit = Number(profitStats[0]?.total_profit || 0);
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const aov = transactions > 0 ? revenue / transactions : 0;

      return { revenue, transactions, units, profit, margin, aov, branches: branchStats };
    };

    const getGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    // Current Dates
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Yesterday
    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    // This Week
    const d = new Date();
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff)).toISOString().split('T')[0];

    // Last Week
    const startOfLastWeekDate = new Date(startOfWeek);
    startOfLastWeekDate.setDate(startOfLastWeekDate.getDate() - 7);
    const startOfLastWeek = startOfLastWeekDate.toISOString().split('T')[0];
    const endOfLastWeekDate = new Date(startOfWeek);
    endOfLastWeekDate.setDate(endOfLastWeekDate.getDate() - 1);
    const endOfLastWeek = endOfLastWeekDate.toISOString().split('T')[0];

    // This Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Last Month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [
        todayStats, yesterdayStats, 
        weekStats, lastWeekStats, 
        monthStats, lastMonthStats
    ] = await Promise.all([
      getStats(today, today),
      getStats(yesterday, yesterday),
      getStats(startOfWeek, today),
      getStats(startOfLastWeek, endOfLastWeek),
      getStats(startOfMonth, today),
      getStats(startOfLastMonth, endOfLastMonth)
    ]);

    // Calculate Trend for Month
    const monthTrend = {
        revenue: getGrowth(monthStats.revenue, lastMonthStats.revenue),
        transactions: getGrowth(monthStats.transactions, lastMonthStats.transactions),
        profit: getGrowth(monthStats.profit, lastMonthStats.profit),
        aov: getGrowth(monthStats.aov, lastMonthStats.aov)
    };

    let customStats = null;
    if (startDate && endDate) {
      customStats = await getStats(startDate, endDate);
    }

    return NextResponse.json({
      success: true,
      data: {
        today: todayStats,
        week: weekStats,
        month: monthStats,
        custom: customStats,
        trends: monthTrend
      }
    });

  } catch (error: any) {
    console.error("Dashboard V2 Stats Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
