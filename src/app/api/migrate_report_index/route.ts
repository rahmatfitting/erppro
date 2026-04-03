import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  const results: string[] = [];
  
  const tables = [
    'thbelipermintaan', 'thbeliorder', 'thbelipenerimaan', 'thbelinota',
    'thjualorder', 'thdeliveryorder', 'thsuratjalan', 'thjualnota'
  ];

  for (const table of tables) {
    try {
      const indexName = `idx_${table}_report_filter`;
      // Check if index exists (MySQL version safe)
      const checkIdx: any = await executeQuery(`
        SELECT COUNT(1) as has_idx FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
      `, [table, indexName]);

      if (checkIdx[0].has_idx === 0) {
        await executeQuery(`
          CREATE INDEX ${indexName} ON ${table} (nomormhperusahaan, nomormhcabang, tanggal)
        `);
        results.push(`✓ Index created on '${table}'`);
      } else {
        results.push(`- Index already exists on '${table}'`);
      }
    } catch (err: any) {
      results.push(`⚠ Error indexing '${table}': ${err.message}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
