import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  const results: string[] = [];
  
  const alterations = [
    { name: 'tdbelipermintaan: add status_aktif', sql: `ALTER TABLE tdbelipermintaan ADD COLUMN IF NOT EXISTS status_aktif TINYINT(4) DEFAULT 1` },
    { name: 'tdbeliorder: add status_aktif', sql: `ALTER TABLE tdbeliorder ADD COLUMN IF NOT EXISTS status_aktif TINYINT(4) DEFAULT 1` },
    { name: 'tdbelipenerimaan: add kode_po', sql: `ALTER TABLE tdbelipenerimaan ADD COLUMN IF NOT EXISTS kode_po VARCHAR(100) AFTER nomorthbelipenerimaan` },
    { name: 'tdbelipenerimaan: add status_aktif', sql: `ALTER TABLE tdbelipenerimaan ADD COLUMN IF NOT EXISTS status_aktif TINYINT(4) DEFAULT 1` },
    { name: 'tdbelinota: add kode_pb', sql: `ALTER TABLE tdbelinota ADD COLUMN IF NOT EXISTS kode_pb VARCHAR(100) AFTER nomorthbelinota` },
    { name: 'tdbelinota: add status_aktif', sql: `ALTER TABLE tdbelinota ADD COLUMN IF NOT EXISTS status_aktif TINYINT(4) DEFAULT 1` },
    
    { name: 'tdjualorder: add status_aktif', sql: `ALTER TABLE tdjualorder ADD COLUMN IF NOT EXISTS status_aktif TINYINT(4) DEFAULT 1` },
    { name: 'tddeliveryorder: add status_aktif', sql: `ALTER TABLE tddeliveryorder ADD COLUMN IF NOT EXISTS status_aktif TINYINT(4) DEFAULT 1` },
    { name: 'tdsuratjalan: add status_aktif', sql: `ALTER TABLE tdsuratjalan ADD COLUMN IF NOT EXISTS status_aktif TINYINT(4) DEFAULT 1` },
    { name: 'tdjualnota: add kode_surat_jalan', sql: `ALTER TABLE tdjualnota ADD COLUMN IF NOT EXISTS kode_surat_jalan VARCHAR(100) AFTER nomorthjualnota` },
    { name: 'tdjualnota: add status_aktif', sql: `ALTER TABLE tdjualnota ADD COLUMN IF NOT EXISTS status_aktif TINYINT(4) DEFAULT 1` },
  ];

  for (const alt of alterations) {
    try {
      await executeQuery(alt.sql);
      results.push(`✓ Applied: ${alt.name}`);
    } catch (err: any) {
      results.push(`⚠ Error: ${alt.name}: ${err.message}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
