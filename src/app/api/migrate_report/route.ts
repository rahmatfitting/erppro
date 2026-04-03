import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  const results: string[] = [];
  
  // 1. Seed Role Access for Reports
  const reportMenus = [
    'Report Pembelian',
    'Report Penjualan',
    'Laporan Rekap Pembelian',
    'Laporan Detail Pembelian',
    'Monitoring Permintaan',
    'Outstanding Order Beli',
    'Laporan Rekap Penjualan',
    'Laporan Detail Penjualan',
    'Monitoring Order Jual',
    'Outstanding Surat Jalan'
  ];

  for (const menu of reportMenus) {
    try {
      // Add to Super Admin (grup_id = 1)
      await executeQuery(
        `INSERT IGNORE INTO mhusergruphakakses (nomormhusergrup, menu, akses) VALUES (1, ?, 1)`,
        [menu]
      );
      results.push(`✓ Added access for '${menu}' to Super Admin`);
    } catch (err: any) {
      results.push(`✗ Failed access '${menu}': ${err.message}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
