import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cabangs = searchParams.get('nomormhcabang'); // Comma separated IDs
    const comparison = searchParams.get('comparison') || 'branch'; // 'branch' or 'period'

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Parameter tanggal wajib diisi" }, { status: 400 });
    }

    let query = `
      SELECT 
        a.kode as account_kode,
        a.nama as account_nama,
        j.nomormhcabang,
        c.nama as cabang_nama,
        DATE_FORMAT(j.tanggal, '%Y-%m') as periode,
        SUM(j.jumlah_idr) as total
      FROM rhjurnal j
      JOIN mhaccount a ON j.nomormhaccount = a.nomor
      LEFT JOIN mhcabang c ON j.nomormhcabang = c.nomor
      WHERE j.tanggal BETWEEN ? AND ?
    `;

    const params: any[] = [startDate, endDate];

    if (cabangs) {
      const branchIds = cabangs.split(',');
      query += ` AND j.nomormhcabang IN (${branchIds.map(() => '?').join(',')})`;
      params.push(...branchIds);
    }

    query += ` GROUP BY a.kode, a.nama, j.nomormhcabang, c.nama, DATE_FORMAT(j.tanggal, '%Y-%m')`;
    query += ` ORDER BY a.kode ASC`;

    const rawData: any[] = await executeQuery(query, params);

    // Categories Mapping
    const categories = [
      { id: '1_income', name: 'PENDAPATAN', prefix: '4', multiplier: -1 },
      { id: '2_cogs', name: 'HARGA POKOK PENJUALAN', prefix: '5', multiplier: 1 },
      { id: '3_expense', name: 'BIAYA OPERASIONAL & UMUM', prefixes: ['6', '7', '9'], multiplier: 1 },
      { id: '4_other', name: 'PENDAPATAN/(BEBAN) LAINNYA', prefix: '8', multiplier: -1 }
    ];

    // Build the dynamic structure
    // We want a list of rows where each row has account info and values for each column (Branch or Period)
    
    const uniqueCols = new Set<string>();
    rawData.forEach(row => {
      uniqueCols.add(comparison === 'branch' ? row.cabang_nama : row.periode);
    });
    const sortedCols = Array.from(uniqueCols).sort();

    // Group items into categories
    const result: any[] = [];
    
    categories.forEach(cat => {
      const catRows = rawData.filter(row => {
          if (cat.prefix) return row.account_kode.startsWith(cat.prefix);
          if (cat.prefixes) return cat.prefixes.some(p => row.account_kode.startsWith(p));
          return false;
      });

      if (catRows.length > 0) {
        // Category Header
        result.push({ isHeader: true, name: cat.name, type: cat.id });

        // Group by Account
        const accountGroups: any = {};
        catRows.forEach(row => {
            if (!accountGroups[row.account_kode]) {
                accountGroups[row.account_kode] = {
                    kode: row.account_kode,
                    nama: row.account_nama,
                    values: {}
                };
            }
            const colKey = comparison === 'branch' ? row.cabang_nama : row.periode;
            accountGroups[row.account_kode].values[colKey] = (accountGroups[row.account_kode].values[colKey] || 0) + (row.total * cat.multiplier);
        });

        // Add account rows
        Object.values(accountGroups).forEach((acc: any) => {
            const row: any = { kode: acc.kode, nama: acc.nama, isData: true };
            sortedCols.forEach(col => {
                row[col] = acc.values[col] || 0;
            });
            result.push(row);
        });

        // Category Subtotal
        const subtotalRow: any = { isSubtotal: true, name: `TOTAL ${cat.name}` };
        sortedCols.forEach(col => {
            subtotalRow[col] = catRows.reduce((sum, r) => {
                const colKey = comparison === 'branch' ? r.cabang_nama : r.periode;
                return colKey === col ? sum + (r.total * cat.multiplier) : sum;
            }, 0);
        });
        result.push(subtotalRow);
      }
    });

    // Final Totals: Gross Profit, Net Profit
    // Gross Profit = Total Income - Total COGS
    // Net Profit = Gross Profit - Total Expenses + Other
    
    const grossProfitRow: any = { isTotal: true, name: 'LABA KOTOR', id: 'gross_profit' };
    const netProfitRow: any = { isTotal: true, name: 'LABA BERSIH (EBIT)', id: 'net_profit' };

    sortedCols.forEach(col => {
        const income = result.find(r => r.isSubtotal && r.name === 'TOTAL PENDAPATAN')?.[col] || 0;
        const cogs = result.find(r => r.isSubtotal && r.name === 'TOTAL HARGA POKOK PENJUALAN')?.[col] || 0;
        const expenses = result.find(r => r.isSubtotal && r.name === 'TOTAL BIAYA OPERASIONAL & UMUM')?.[col] || 0;
        const other = result.find(r => r.isSubtotal && r.name === 'TOTAL PENDAPATAN/(BEBAN) LAINNYA')?.[col] || 0;

        grossProfitRow[col] = income - cogs;
        netProfitRow[col] = (income - cogs) - expenses + other;
    });

    // Insert totals at strategic positions
    const hppIndex = result.findIndex(r => r.isSubtotal && r.name === 'TOTAL HARGA POKOK PENJUALAN');
    if (hppIndex !== -1) {
        result.splice(hppIndex + 1, 0, grossProfitRow);
    }
    result.push(netProfitRow);

    return NextResponse.json({ 
      success: true, 
      data: result,
      columns: sortedCols
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
