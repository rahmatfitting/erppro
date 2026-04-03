import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  const results: string[] = [];

  const tables = [
    {
      name: 'mhsatuan',
      sql: `CREATE TABLE IF NOT EXISTS mhsatuan (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(100) NOT NULL,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'mhkategori',
      sql: `CREATE TABLE IF NOT EXISTS mhkategori (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(100) NOT NULL,
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'mhbarang',
      sql: `CREATE TABLE IF NOT EXISTS mhbarang (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(255) NOT NULL,
        gambar TEXT,
        nomormhsatuan INT,
        satuan VARCHAR(50),
        kategori VARCHAR(100),
        nomormhkategori INT DEFAULT 0,
        harga_beli DECIMAL(30,2) DEFAULT 0,
        harga_jual DECIMAL(30,2) DEFAULT 0,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        diubah_oleh VARCHAR(50),
        diubah_pada DATETIME
      ) ENGINE=InnoDB`
    },
    {
      name: 'gold_prices',
      sql: `CREATE TABLE IF NOT EXISTS gold_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fetch_date DATE NOT NULL,
        price_1g DECIMAL(20,2) NOT NULL,
        prev_price DECIMAL(20,2),
        diff DECIMAL(20,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'gold_prices_history',
      sql: `CREATE TABLE IF NOT EXISTS gold_prices_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fetch_date DATE NOT NULL,
        price_1g DECIMAL(20,2) NOT NULL,
        prev_price DECIMAL(20,2),
        diff DECIMAL(20,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'buyback_prices',
      sql: `CREATE TABLE IF NOT EXISTS buyback_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fetch_date DATE NOT NULL,
        price_1g DECIMAL(20,2) NOT NULL,
        prev_price DECIMAL(20,2),
        diff DECIMAL(20,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'buyback_prices_history',
      sql: `CREATE TABLE IF NOT EXISTS buyback_prices_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fetch_date DATE NOT NULL,
        price_1g DECIMAL(20,2) NOT NULL,
        prev_price DECIMAL(20,2),
        diff DECIMAL(20,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'push_subscriptions',
      sql: `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        endpoint TEXT NOT NULL,
        keys_p256dh TEXT NOT NULL,
        keys_auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'thjualnota',
      sql: `CREATE TABLE IF NOT EXISTS thjualnota (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        gudang VARCHAR(255),
        customer VARCHAR(255),
        sales VARCHAR(255),
        kode_order_jual VARCHAR(100),
        kode_delivery_order VARCHAR(100),
        kode_surat_jalan VARCHAR(100),
        valuta VARCHAR(20) DEFAULT 'IDR',
        kurs DECIMAL(30,2) DEFAULT 1,
        keterangan TEXT,
        subtotal DECIMAL(30,2) DEFAULT 0,
        diskon_nominal DECIMAL(30,2) DEFAULT 0,
        dpp DECIMAL(30,2) DEFAULT 0,
        ppn_nominal DECIMAL(30,2) DEFAULT 0,
        total DECIMAL(30,2) DEFAULT 0,
        total_idr DECIMAL(30,2) DEFAULT 0,
        status_disetujui TINYINT(1) DEFAULT 0,
        disetujui_oleh VARCHAR(100),
        disetujui_pada DATETIME,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(100),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        dibatalkan_oleh VARCHAR(100),
        dibatalkan_pada DATETIME
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdjualnota',
      sql: `CREATE TABLE IF NOT EXISTS tdjualnota (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomorthjualnota INT NOT NULL,
        kode_surat_jalan VARCHAR(100),
        kode_barang VARCHAR(50),
        nama_barang VARCHAR(255),
        satuan VARCHAR(50),
        jumlah DECIMAL(20,4) DEFAULT 0,
        harga DECIMAL(30,2) DEFAULT 0,
        diskon_prosentase DECIMAL(10,2) DEFAULT 0,
        diskon_nominal DECIMAL(30,2) DEFAULT 0,
        netto DECIMAL(30,2) DEFAULT 0,
        subtotal DECIMAL(30,2) DEFAULT 0,
        keterangan TEXT,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(100),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'thhasilproduksi',
      sql: `CREATE TABLE IF NOT EXISTS thhasilproduksi (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        keterangan TEXT,
        qty_fg DECIMAL(20,4) DEFAULT 0,
        status_aktif TINYINT(1) DEFAULT 1,
        dibuat_oleh VARCHAR(100),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    },
    {
      name: 'thuangmasuk',
      sql: `CREATE TABLE IF NOT EXISTS thuangmasuk (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        kode VARCHAR(100) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        keterangan TEXT,
        total DECIMAL(30,2) DEFAULT 0,
        total_idr DECIMAL(30,2) DEFAULT 0,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_pada DATETIME DEFAULT NOW(),
        PRIMARY KEY (nomor)
      ) ENGINE=InnoDB`
    },
    {
      name: 'thuangkeluar',
      sql: `CREATE TABLE IF NOT EXISTS thuangkeluar (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        kode VARCHAR(100) NOT NULL UNIQUE,
        tanggal DATE NOT NULL,
        keterangan TEXT,
        total DECIMAL(30,2) DEFAULT 0,
        total_idr DECIMAL(30,2) DEFAULT 0,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_pada DATETIME DEFAULT NOW(),
        PRIMARY KEY (nomor)
      ) ENGINE=InnoDB`
    }
  ];

  for (const table of tables) {
    try {
      await executeQuery(table.sql);
      results.push(`✓ Table '${table.name}' created or already exists`);
    } catch (err: any) {
      results.push(`✗ Failed '${table.name}': ${err.message}`);
    }
  }

  // Trigger initial sync for gold and buyback prices
  try {
    const goldSync = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/gold-prices/sync`);
    const buybackSync = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/buyback-prices/sync`);
    results.push(`✓ Initial sync triggered`);
  } catch (err: any) {
    results.push(`⚠ Sync trigger failed: ${err.message} (You may need to run /api/gold-prices/sync manually)`);
  }

  return NextResponse.json({ success: true, results });
}
