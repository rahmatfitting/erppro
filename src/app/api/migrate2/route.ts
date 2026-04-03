import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// Migration 2: Penjualan sub-modules + Notification tables
export async function GET() {
  const results: string[] = [];

  const tables = [
    {
      name: 'thjualretur',
      sql: `CREATE TABLE IF NOT EXISTS thjualretur (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        kode VARCHAR(100) NOT NULL,
        jenis VARCHAR(10) DEFAULT 'RJ',
        tanggal DATE NOT NULL,
        keterangan TEXT,
        nomormhcustomer INT(11) DEFAULT 0,
        customer VARCHAR(200),
        nomormhaccount INT(11) DEFAULT 0,
        account_tujuan VARCHAR(200),
        kode_nota_jual VARCHAR(100),
        valuta VARCHAR(20) DEFAULT 'IDR',
        nomormhvaluta INT(11) DEFAULT 0,
        kurs DECIMAL(30,2) DEFAULT 1.00,
        subtotal DECIMAL(30,2) DEFAULT 0,
        diskon_prosentase DECIMAL(10,2) DEFAULT 0,
        diskon_nominal DECIMAL(30,2) DEFAULT 0,
        dpp DECIMAL(30,2) DEFAULT 0,
        ppn_prosentase DECIMAL(10,2) DEFAULT 0,
        ppn_nominal DECIMAL(30,2) DEFAULT 0,
        total DECIMAL(30,2) DEFAULT 0,
        total_idr DECIMAL(30,2) DEFAULT 0,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_oleh VARCHAR(100) DEFAULT 'Admin',
        dibuat_pada DATETIME DEFAULT NOW(),
        dibatalkan_oleh VARCHAR(100),
        dibatalkan_pada DATETIME,
        status_disetujui TINYINT(4) DEFAULT 0,
        disetujui_oleh VARCHAR(100),
        disetujui_pada DATETIME,
        PRIMARY KEY (nomor),
        UNIQUE KEY uq_thjualretur_kode (kode)
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdjualretur',
      sql: `CREATE TABLE IF NOT EXISTS tdjualretur (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        nomorthjualretur INT(11) NOT NULL DEFAULT 0,
        nomormhbarang INT(11) DEFAULT 0,
        kode_barang VARCHAR(100),
        nama_barang VARCHAR(200),
        nomormhsatuan INT(11) DEFAULT 0,
        satuan VARCHAR(50),
        jumlah DECIMAL(20,4) DEFAULT 0,
        keterangan TEXT,
        harga DECIMAL(30,2) DEFAULT 0,
        diskon_prosentase DECIMAL(10,2) DEFAULT 0,
        diskon_nominal DECIMAL(30,2) DEFAULT 0,
        netto DECIMAL(30,2) DEFAULT 0,
        subtotal DECIMAL(30,2) DEFAULT 0,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_oleh VARCHAR(100) DEFAULT 'Admin',
        dibuat_pada DATETIME DEFAULT NOW(),
        dibatalkan_oleh VARCHAR(100),
        dibatalkan_pada DATETIME,
        PRIMARY KEY (nomor)
      ) ENGINE=InnoDB`
    },
    {
      name: 'mhnotifikasi_setting',
      sql: `CREATE TABLE IF NOT EXISTS mhnotifikasi_setting (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        modul VARCHAR(200) NOT NULL,
        nomor_user INT(11) NOT NULL DEFAULT 0,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_pada DATETIME DEFAULT NOW(),
        PRIMARY KEY (nomor),
        KEY idx_modul (modul),
        KEY idx_user (nomor_user)
      ) ENGINE=InnoDB`
    },
    {
      name: 'mhnotifikasi',
      sql: `CREATE TABLE IF NOT EXISTS mhnotifikasi (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        nomor_user INT(11) NOT NULL DEFAULT 0,
        modul VARCHAR(200),
        judul VARCHAR(500),
        isi TEXT,
        ref_kode VARCHAR(100),
        dibaca TINYINT(4) DEFAULT 0,
        dibaca_pada DATETIME,
        dibuat_pada DATETIME DEFAULT NOW(),
        PRIMARY KEY (nomor),
        KEY idx_user_dibaca (nomor_user, dibaca)
      ) ENGINE=InnoDB`
    }
  ];

  for (const table of tables) {
    try {
      await executeQuery(table.sql);
      results.push(`✓ Table '${table.name}' created/exists`);
    } catch (err: any) {
      results.push(`✗ Failed '${table.name}': ${err.message}`);
    }
  }

  // ALTER existing tables
  const alterations = [
    // thjualnota: add jenis, pph, pphnominal, account_tujuan, kode_nota_jual
    { name: 'thjualnota: add jenis', sql: `ALTER TABLE thjualnota ADD COLUMN IF NOT EXISTS jenis VARCHAR(10) DEFAULT 'NJ'` },
    { name: 'thjualnota: add pph', sql: `ALTER TABLE thjualnota ADD COLUMN IF NOT EXISTS pph DECIMAL(10,2) DEFAULT 0` },
    { name: 'thjualnota: add pphnominal', sql: `ALTER TABLE thjualnota ADD COLUMN IF NOT EXISTS pphnominal DECIMAL(30,2) DEFAULT 0` },
    { name: 'thjualnota: add account_tujuan', sql: `ALTER TABLE thjualnota ADD COLUMN IF NOT EXISTS account_tujuan VARCHAR(200)` },
    { name: 'thjualnota: add kode_nota_jual', sql: `ALTER TABLE thjualnota ADD COLUMN IF NOT EXISTS kode_nota_jual VARCHAR(100)` },
    { name: 'thjualnota: add total_idr', sql: `ALTER TABLE thjualnota ADD COLUMN IF NOT EXISTS total_idr DECIMAL(30,2) DEFAULT 0` },
    { name: 'thjualnota: add status_disetujui', sql: `ALTER TABLE thjualnota ADD COLUMN IF NOT EXISTS status_disetujui TINYINT(4) DEFAULT 0` },
    { name: 'thjualnota: add disetujui_oleh', sql: `ALTER TABLE thjualnota ADD COLUMN IF NOT EXISTS disetujui_oleh VARCHAR(100)` },
    { name: 'thjualnota: add disetujui_pada', sql: `ALTER TABLE thjualnota ADD COLUMN IF NOT EXISTS disetujui_pada DATETIME` },
    // thuangtitipan: add pph, pphnominal (UMC/UMS fields)
    { name: 'thuangtitipan: add pph', sql: `ALTER TABLE thuangtitipan ADD COLUMN IF NOT EXISTS pph DECIMAL(10,2) DEFAULT 0` },
    { name: 'thuangtitipan: add pphnominal', sql: `ALTER TABLE thuangtitipan ADD COLUMN IF NOT EXISTS pphnominal DECIMAL(30,2) DEFAULT 0` },
    { name: 'thuangtitipan: add nomorthjualorder', sql: `ALTER TABLE thuangtitipan ADD COLUMN IF NOT EXISTS nomorthjualorder INT(11) DEFAULT 0` },
  ];

  for (const alt of alterations) {
    try {
      await executeQuery(alt.sql);
      results.push(`✓ Alteration '${alt.name}' applied`);
    } catch (err: any) {
      results.push(`⚠ Alteration '${alt.name}': ${err.message}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
