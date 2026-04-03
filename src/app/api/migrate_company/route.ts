import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  const results: string[] = [];

  const tables = [
    {
      name: 'mhperusahaan',
      sql: `CREATE TABLE IF NOT EXISTS mhperusahaan (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(255) NOT NULL,
        alamat TEXT,
        telepon VARCHAR(50),
        email VARCHAR(100),
        npwp VARCHAR(50),
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'mhcabang',
      sql: `CREATE TABLE IF NOT EXISTS mhcabang (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhperusahaan INT NOT NULL,
        kode VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(255) NOT NULL,
        alamat TEXT,
        telepon VARCHAR(50),
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nomormhperusahaan) REFERENCES mhperusahaan(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    },
    {
      name: 'mhuser_akses',
      sql: `CREATE TABLE IF NOT EXISTS mhuser_akses (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhuser INT NOT NULL,
        nomormhcabang INT NOT NULL,
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_cabang (nomormhuser, nomormhcabang)
      ) ENGINE=InnoDB`
    }
  ];

  for (const table of tables) {
    try {
      await executeQuery(table.sql);
      // Verify if table actually exists now
      const check: any = await executeQuery(`SHOW TABLES LIKE ?`, [table.name]);
      if (check.length > 0) {
        results.push(`✓ Table '${table.name}' is READY`);
      } else {
        results.push(`✗ Table '${table.name}' was NOT found after creation attempt`);
      }
    } catch (err: any) {
      results.push(`✗ Failed '${table.name}': ${err.message}`);
    }
  }

  // Ensure columns exist even if table was created previously
  try {
     await executeQuery(`ALTER TABLE mhcabang ADD COLUMN IF NOT EXISTS alamat TEXT AFTER nama`);
     await executeQuery(`ALTER TABLE mhcabang ADD COLUMN IF NOT EXISTS telepon VARCHAR(50) AFTER alamat`);
     results.push(`✓ Ensured mhcabang columns`);
  } catch (err: any) {
     results.push(`✗ Failed mhcabang alter: ${err.message}`);
  }

  // Alter transaction tables
  const thTables = [
    'thbelipermintaan', 'thbeliorder', 'thbelipenerimaan', 'thbelinota', 'thbeliretur',
    'thjualorder', 'thjualpenerimaan', 'thjualnota', 'thjualretur',
    'thuangmasuk', 'thuangkeluar', 'thuangtitipan',
    'thstokpenyesuaian', 'thstokpengiriman', 'thpemakaianinternal', 'thubahbentuk'
  ];

  for (const table of thTables) {
    try {
      await executeQuery(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS nomormhperusahaan INT DEFAULT 0 AFTER nomor`);
      await executeQuery(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS nomormhcabang INT DEFAULT 0 AFTER nomormhperusahaan`);
      results.push(`✓ Altered '${table}'`);
    } catch (err: any) {
      results.push(`⚠ Alteration '${table}': ${err.message}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
