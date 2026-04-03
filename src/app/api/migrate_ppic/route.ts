import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  const results: string[] = [];

  const tables = [
    {
      name: 'mhbom',
      sql: `CREATE TABLE IF NOT EXISTS mhbom (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhperusahaan INT NOT NULL,
        nomormhcabang INT NOT NULL,
        kode VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(255) NOT NULL,
        item_id INT NOT NULL,
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'mdbom',
      sql: `CREATE TABLE IF NOT EXISTS mdbom (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhbom INT NOT NULL,
        item_id INT NOT NULL,
        jumlah DECIMAL(18,4) NOT NULL,
        satuan_id INT NOT NULL,
        FOREIGN KEY (nomormhbom) REFERENCES mhbom(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    },
    {
      name: 'thprodplan',
      sql: `CREATE TABLE IF NOT EXISTS thprodplan (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhperusahaan INT NOT NULL,
        nomormhcabang INT NOT NULL,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        item_id INT NOT NULL,
        qty DECIMAL(18,4) NOT NULL,
        status ENUM('Backlog', 'Ongoing', 'Finished') DEFAULT 'Backlog',
        keterangan TEXT,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'thworkorder',
      sql: `CREATE TABLE IF NOT EXISTS thworkorder (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhperusahaan INT NOT NULL,
        nomormhcabang INT NOT NULL,
        nomorthprodplan INT,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        item_id INT NOT NULL,
        qty DECIMAL(18,4) NOT NULL,
        status ENUM('Draft', 'Released', 'Completed', 'Cancelled') DEFAULT 'Draft',
        keterangan TEXT,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'thmatcheck',
      sql: `CREATE TABLE IF NOT EXISTS thmatcheck (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhperusahaan INT NOT NULL,
        nomormhcabang INT NOT NULL,
        nomorthprodplan INT NOT NULL,
        item_id INT NOT NULL,
        qty_needed DECIMAL(18,4) NOT NULL,
        qty_available DECIMAL(18,4) NOT NULL,
        qty_deficit DECIMAL(18,4) NOT NULL,
        status_order ENUM('Pending', 'Generated PR', 'Generated PO') DEFAULT 'Pending',
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'thbonbahan',
      sql: `CREATE TABLE IF NOT EXISTS thbonbahan (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhperusahaan INT NOT NULL,
        nomormhcabang INT NOT NULL,
        nomormhgudang INT,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        nomorthworkorder INT,
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdbonbahan',
      sql: `CREATE TABLE IF NOT EXISTS tdbonbahan (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomorthbonbahan INT NOT NULL,
        item_id INT NOT NULL,
        qty DECIMAL(18,4) NOT NULL,
        satuan_id INT,
        keterangan TEXT,
        FOREIGN KEY (nomorthbonbahan) REFERENCES thbonbahan(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    },
    {
      name: 'thhasilproduksi',
      sql: `CREATE TABLE IF NOT EXISTS thhasilproduksi (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhperusahaan INT NOT NULL,
        nomormhcabang INT NOT NULL,
        nomormhgudang INT,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        nomorthworkorder INT,
        item_id INT,
        qty_fg DECIMAL(18,4) NOT NULL DEFAULT 0,
        qty_afalan DECIMAL(18,4) NOT NULL DEFAULT 0,
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdhasilproduksi',
      sql: `CREATE TABLE IF NOT EXISTS tdhasilproduksi (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomorthhasilproduksi INT NOT NULL,
        item_id INT NOT NULL,
        qty DECIMAL(18,4) NOT NULL,
        jenis ENUM('FG', 'Afalan') DEFAULT 'FG',
        FOREIGN KEY (nomorthhasilproduksi) REFERENCES thhasilproduksi(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    },
    {
      name: 'thkembalibahan',
      sql: `CREATE TABLE IF NOT EXISTS thkembalibahan (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhperusahaan INT NOT NULL,
        nomormhcabang INT NOT NULL,
        nomormhgudang INT,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        nomorthworkorder INT,
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdkembalibahan',
      sql: `CREATE TABLE IF NOT EXISTS tdkembalibahan (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomorthkembalibahan INT NOT NULL,
        item_id INT NOT NULL,
        qty DECIMAL(18,4) NOT NULL,
        satuan_id INT,
        FOREIGN KEY (nomorthkembalibahan) REFERENCES thkembalibahan(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    }
  ];

  for (const table of tables) {
    try {
      await executeQuery(table.sql);
      results.push(`✓ Table '${table.name}' READY`);
    } catch (err: any) {
      results.push(`✗ Failed '${table.name}': ${err.message}`);
    }
  }

  // Seeding Role Access (Super Admin)
  const menus = [
    'BOM', 'Production Plan', 'Work Order', 'Material Check',
    'Bon Bahan', 'Hasil Produksi', 'Pengembalian Bahan'
  ];

  try {
     // Get Super Admin Group ID
     const groups: any = await executeQuery(`SELECT nomor FROM mhusergrup WHERE nama = 'Super Admin'`);
     if (groups.length > 0) {
        const groupId = groups[0].nomor;
        for (const menu of menus) {
           await executeQuery(`
              INSERT INTO mhusergruphakakses (grup_id, menu, akses_view, akses_add, akses_edit, akses_delete, akses_print)
              VALUES (?, ?, 1, 1, 1, 1, 1)
              ON DUPLICATE KEY UPDATE akses_view = 1, akses_add = 1, akses_edit = 1, akses_delete = 1, akses_print = 1
           `, [groupId, menu]);
        }
        results.push(`✓ Seeded Hak Akses for Super Admin`);
     }
  } catch (err: any) {
     results.push(`✗ Failed Seeding: ${err.message}`);
  }

  return NextResponse.json({ success: true, results });
}
