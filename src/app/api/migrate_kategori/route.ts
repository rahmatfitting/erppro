import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  const results: string[] = [];
  
  const tables = [
    {
      name: 'mhkategori',
      sql: `CREATE TABLE IF NOT EXISTS mhkategori (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(100) NOT NULL,
        keterangan TEXT,
        nomormhperusahaan INT DEFAULT 0,
        nomormhcabang INT DEFAULT 0,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    }
  ];

  for (const table of tables) {
    try {
      await executeQuery(table.sql);
      results.push(`✓ Table '${table.name}' is READY`);
    } catch (err: any) {
      results.push(`✗ Failed '${table.name}': ${err.message}`);
    }
  }

  // Update mhbarang to include nomormhkategori
  try {
    await executeQuery(`ALTER TABLE mhbarang ADD COLUMN IF NOT EXISTS nomormhkategori INT DEFAULT 0 AFTER kategori`);
    results.push(`✓ Column 'nomormhkategori' added to 'mhbarang'`);
  } catch (err: any) {
    results.push(`⚠ Alteration 'mhbarang': ${err.message}`);
  }

  return NextResponse.json({ success: true, results });
}
