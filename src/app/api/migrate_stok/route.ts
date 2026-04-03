import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  const results: string[] = [];

  const queries = [
    // 1. MH Penyesuaian
    {
      name: 'mhpenyesuaian',
      sql: `CREATE TABLE IF NOT EXISTS mhpenyesuaian (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        nomormhaccount INT,
        account_nama VARCHAR(255),
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        diedit_oleh VARCHAR(50),
        diedit_pada DATETIME,
        UNIQUE KEY uq_mhpenyesuaian_nama (nama)
      ) ENGINE=InnoDB`
    },
    // 2. Stok Opname (thstokpenyesuaian)
    {
      name: 'thstokpenyesuaian',
      sql: `CREATE TABLE IF NOT EXISTS thstokpenyesuaian (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        nomormhgudang INT,
        gudang_nama VARCHAR(255),
        nomormhpenyesuaian INT,
        penyesuaian_nama VARCHAR(100),
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        diedit_oleh VARCHAR(50),
        diedit_pada DATETIME,
        status_disetujui TINYINT(1) DEFAULT 0,
        disetujui_oleh VARCHAR(50),
        disetujui_pada DATETIME,
        dibatalkan_oleh VARCHAR(50),
        dibatalkan_pada DATETIME
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdstokpenyesuaian',
      sql: `CREATE TABLE IF NOT EXISTS tdstokpenyesuaian (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomorthstokpenyesuaian INT NOT NULL,
        nomormhbarang INT,
        kode_barang VARCHAR(50),
        nama_barang VARCHAR(255),
        nomormhsatuan INT,
        satuan VARCHAR(50),
        tercatat DECIMAL(15,2) DEFAULT 0,
        aktual DECIMAL(15,2) DEFAULT 0,
        perubahan DECIMAL(15,2) DEFAULT 0,
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        FOREIGN KEY (nomorthstokpenyesuaian) REFERENCES thstokpenyesuaian(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    },
    // 3. Transfer Antar Gudang (thstokpengiriman)
    {
      name: 'thstokpengiriman',
      sql: `CREATE TABLE IF NOT EXISTS thstokpengiriman (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        nomormhgudang_asal INT,
        gudang_asal_nama VARCHAR(255),
        nomormhgudang_tujuan INT,
        gudang_tujuan_nama VARCHAR(255),
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        diedit_oleh VARCHAR(50),
        diedit_pada DATETIME,
        status_disetujui TINYINT(1) DEFAULT 0,
        disetujui_oleh VARCHAR(50),
        disetujui_pada DATETIME,
        dibatalkan_oleh VARCHAR(50),
        dibatalkan_pada DATETIME
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdstokpengiriman',
      sql: `CREATE TABLE IF NOT EXISTS tdstokpengiriman (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomorthstokpengiriman INT NOT NULL,
        nomormhbarang INT,
        kode_barang VARCHAR(50),
        nama_barang VARCHAR(255),
        nomormhsatuan INT,
        satuan VARCHAR(50),
        jumlah DECIMAL(15,2) DEFAULT 0,
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        FOREIGN KEY (nomorthstokpengiriman) REFERENCES thstokpengiriman(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    },
    // 4. Pemakaian Internal (thpemakaianinternal)
    {
      name: 'thpemakaianinternal',
      sql: `CREATE TABLE IF NOT EXISTS thpemakaianinternal (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        nomormhgudang INT,
        gudang_nama VARCHAR(255),
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        diedit_oleh VARCHAR(50),
        diedit_pada DATETIME,
        status_disetujui TINYINT(1) DEFAULT 0,
        disetujui_oleh VARCHAR(50),
        disetujui_pada DATETIME,
        dibatalkan_oleh VARCHAR(50),
        dibatalkan_pada DATETIME
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdpemakaianinternal',
      sql: `CREATE TABLE IF NOT EXISTS tdpemakaianinternal (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomorthpemakaianinternal INT NOT NULL,
        nomormhbarang INT,
        kode_barang VARCHAR(50),
        nama_barang VARCHAR(255),
        nomormhaccount INT,
        account_nama VARCHAR(255),
        jumlah DECIMAL(15,2) DEFAULT 0,
        nomormhsatuan INT,
        satuan VARCHAR(50),
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        FOREIGN KEY (nomorthpemakaianinternal) REFERENCES thpemakaianinternal(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    },
    // 5. Transformasi Barang (thubahbentuk)
    {
      name: 'thubahbentuk',
      sql: `CREATE TABLE IF NOT EXISTS thubahbentuk (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        nomormhgudang INT,
        gudang_nama VARCHAR(255),
        nomormhbarang_tujuan INT,
        kode_barang_tujuan VARCHAR(50),
        nama_barang_tujuan VARCHAR(255),
        jumlah_tujuan DECIMAL(15,2) DEFAULT 1,
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        diedit_oleh VARCHAR(50),
        diedit_pada DATETIME,
        status_disetujui TINYINT(1) DEFAULT 0,
        disetujui_oleh VARCHAR(50),
        disetujui_pada DATETIME,
        dibatalkan_oleh VARCHAR(50),
        dibatalkan_pada DATETIME
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdubahbentuk',
      sql: `CREATE TABLE IF NOT EXISTS tdubahbentuk (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomorthubahbentuk INT NOT NULL,
        nomormhbarang_asal INT,
        kode_barang_asal VARCHAR(50),
        nama_barang_asal VARCHAR(255),
        jumlah DECIMAL(15,2) DEFAULT 0,
        nomormhsatuan INT,
        satuan VARCHAR(50),
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        FOREIGN KEY (nomorthubahbentuk) REFERENCES thubahbentuk(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    },
    // 6. Log History
    {
      name: 'tloghistory',
      sql: `CREATE TABLE IF NOT EXISTS tloghistory (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        menu VARCHAR(100) NOT NULL,
        nomor_transaksi INT NOT NULL,
        aksi VARCHAR(50) NOT NULL,
        user VARCHAR(100),
        waktu DATETIME DEFAULT CURRENT_TIMESTAMP,
        keterangan TEXT
      ) ENGINE=InnoDB`
    }
  ];

  for (const query of queries) {
    try {
      await executeQuery(query.sql);
      results.push(`✓ ${query.name} success`);
    } catch (err: any) {
      results.push(`✗ ${query.name} error: ${err.message}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
