import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// One-time migration endpoint to create new tables
// Call: GET /api/migrate
export async function GET() {
  const results: string[] = [];
  
  const tables = [
    {
      name: 'mhaccount',
      sql: `CREATE TABLE IF NOT EXISTS mhaccount (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        nomormhcabang INT(11) DEFAULT 0,
        kode VARCHAR(100) NOT NULL,
        kode_inisial VARCHAR(100),
        nama VARCHAR(200) NOT NULL,
        kas TINYINT(4) DEFAULT 0,
        bank TINYINT(4) DEFAULT 0,
        giro TINYINT(4) DEFAULT 0,
        detail TINYINT(4) DEFAULT 0,
        is_foh TINYINT(4) DEFAULT 0,
        is_browse_ums TINYINT(4) DEFAULT 0,
        keterangan TEXT,
        catatan TEXT,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_oleh INT(11) DEFAULT 0,
        dibuat_pada DATETIME DEFAULT NOW(),
        diubah_oleh INT(11) DEFAULT 0,
        diubah_pada DATETIME DEFAULT NOW(),
        dihapus_oleh INT(11) DEFAULT 0,
        dihapus_pada DATETIME,
        status_disetujui TINYINT(4) DEFAULT 0,
        disetujui_oleh INT(11) DEFAULT 0,
        disetujui_pada DATETIME,
        dibatalkan_oleh INT(11) DEFAULT 0,
        dibatalkan_pada DATETIME,
        status_print TINYINT(4) DEFAULT 0,
        diprint_oleh INT(11) DEFAULT 0,
        diprint_pada DATETIME,
        status_tt VARCHAR(200),
        ditt_oleh VARCHAR(100),
        ditt_pada DATETIME,
        PRIMARY KEY (nomor),
        UNIQUE KEY uq_mhaccount_kode (kode)
      ) ENGINE=InnoDB`
    },
    {
      name: 'thbeliretur',
      sql: `CREATE TABLE IF NOT EXISTS thbeliretur (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        kode VARCHAR(100) NOT NULL,
        tanggal DATE NOT NULL,
        keterangan TEXT,
        nomormhsupplier INT(11) DEFAULT 0,
        supplier VARCHAR(200),
        valuta VARCHAR(20) DEFAULT 'IDR',
        nomormhvaluta INT(11) DEFAULT 0,
        kurs DECIMAL(30,2) DEFAULT 1.00,
        subtotal DECIMAL(30,2) DEFAULT 0,
        diskon_prosentase DECIMAL(10,2) DEFAULT 0,
        diskon_nominal DECIMAL(30,2) DEFAULT 0,
        dpp DECIMAL(30,2) DEFAULT 0,
        ppn_prosentase DECIMAL(10,2) DEFAULT 0,
        ppn_nominal DECIMAL(30,2) DEFAULT 0,
        pph DECIMAL(10,2) DEFAULT 0,
        pphnominal DECIMAL(30,2) DEFAULT 0,
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
        UNIQUE KEY uq_thbeliretur_kode (kode)
      ) ENGINE=InnoDB`
    },
    {
      name: 'tdbeliretur',
      sql: `CREATE TABLE IF NOT EXISTS tdbeliretur (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        nomorthbeliretur INT(11) NOT NULL DEFAULT 0,
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
      name: 'thbelinota',
      sql: `CREATE TABLE IF NOT EXISTS thbelinota (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        kode VARCHAR(100) NOT NULL,
        jenis VARCHAR(10) DEFAULT 'FB',
        tanggal DATE NOT NULL,
        keterangan TEXT,
        nomormhsupplier INT(11) DEFAULT 0,
        supplier VARCHAR(200),
        nomor_faktur_supplier VARCHAR(100),
        jatuh_tempo DATE,
        nomormhaccount INT(11) DEFAULT 0,
        account_tujuan VARCHAR(200),
        kode_nota_beli VARCHAR(100),
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
        UNIQUE KEY uq_thbelinota_kode (kode)
      ) ENGINE=InnoDB`
    },
    {
      name: 'thuangtitipan',
      sql: `CREATE TABLE IF NOT EXISTS thuangtitipan (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        nomormhcabang INT(11) DEFAULT 0,
        nomormhperusahaan INT(11) DEFAULT 0,
        nomormhrelasi INT(11) DEFAULT 0,
        nomormhaccount INT(11) DEFAULT 0,
        nomormhvaluta INT(11) DEFAULT 0,
        kode VARCHAR(100) NOT NULL,
        nomor_ums VARCHAR(100),
        nomor_umc VARCHAR(100),
        tanggal DATE NOT NULL DEFAULT '2000-01-01',
        jenis VARCHAR(100) NOT NULL,
        saldo_awal TINYINT(4) DEFAULT 0,
        ppn TINYINT(4) DEFAULT 1,
        kurs DECIMAL(30,2) DEFAULT 0.00,
        subtotal DECIMAL(30,2) DEFAULT 0.00,
        nominal DECIMAL(30,2) DEFAULT 0.00,
        ppn_prosentase DECIMAL(30,2) DEFAULT 0.00,
        ppn_nominal DECIMAL(30,2) DEFAULT 0.00,
        total DECIMAL(30,2) DEFAULT 0.00,
        total_idr DECIMAL(30,2) DEFAULT 0.00,
        total_terbayar DECIMAL(30,2) DEFAULT 0.00,
        total_terpakai DECIMAL(30,2) DEFAULT 0.00,
        keterangan TEXT,
        catatan TEXT,
        alasan_validasi TEXT,
        alasan_unvalidasi TEXT,
        validasi_oleh INT(11) DEFAULT 0,
        validasi_pada DATETIME DEFAULT '2000-01-01 00:00:00',
        unvalidasi_oleh INT(11) DEFAULT 0,
        unvalidasi_pada DATETIME DEFAULT '2000-01-01 00:00:00',
        status_selesai TINYINT(4) DEFAULT 0,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_oleh INT(11) DEFAULT 0,
        dibuat_pada DATETIME DEFAULT '2000-01-01 00:00:00',
        diubah_oleh INT(11) DEFAULT 0,
        diubah_pada DATETIME DEFAULT '2000-01-01 00:00:00',
        dihapus_oleh INT(11) DEFAULT 0,
        dihapus_pada DATETIME DEFAULT '2000-01-01 00:00:00',
        status_disetujui TINYINT(4) DEFAULT 0,
        disetujui_oleh INT(11) DEFAULT 0,
        disetujui_pada DATETIME DEFAULT '2000-01-01 00:00:00',
        dibatalkan_oleh INT(11) DEFAULT 0,
        dibatalkan_pada DATETIME DEFAULT '2000-01-01 00:00:00',
        status_print TINYINT(4) DEFAULT 0,
        diprint_oleh INT(11) DEFAULT 0,
        diprint_pada DATETIME DEFAULT '2000-01-01 00:00:00',
        status_tt VARCHAR(200),
        ditt_oleh VARCHAR(100),
        ditt_pada DATETIME,
        nomorthbeliorder INT(11) DEFAULT 0,
        is_ikan INT(4) DEFAULT 0,
        nomorthjualorder INT(11) DEFAULT 0,
        PRIMARY KEY (nomor),
        UNIQUE KEY uq_thuangtitipan_kode (kode)
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

  // Alter existing tables to add new columns if missing
  const alterations = [
    { name: 'thbelinota: add jenis', sql: `ALTER TABLE thbelinota ADD COLUMN IF NOT EXISTS jenis VARCHAR(10) DEFAULT 'FB'` },
    { name: 'thbelinota: add account_tujuan', sql: `ALTER TABLE thbelinota ADD COLUMN IF NOT EXISTS account_tujuan VARCHAR(200)` },
    { name: 'thbelinota: add nomormhaccount', sql: `ALTER TABLE thbelinota ADD COLUMN IF NOT EXISTS nomormhaccount INT(11) DEFAULT 0` },
    { name: 'thbelinota: add kode_nota_beli', sql: `ALTER TABLE thbelinota ADD COLUMN IF NOT EXISTS kode_nota_beli VARCHAR(100)` },
    { name: 'thbelinota: add total_idr', sql: `ALTER TABLE thbelinota ADD COLUMN IF NOT EXISTS total_idr DECIMAL(30,2) DEFAULT 0` },
    { name: 'thbelinota: add status_disetujui', sql: `ALTER TABLE thbelinota ADD COLUMN IF NOT EXISTS status_disetujui TINYINT(4) DEFAULT 0` },
    { name: 'thbelinota: add disetujui_oleh', sql: `ALTER TABLE thbelinota ADD COLUMN IF NOT EXISTS disetujui_oleh VARCHAR(100) DEFAULT NULL` },
    { name: 'thbelinota: add disetujui_pada', sql: `ALTER TABLE thbelinota ADD COLUMN IF NOT EXISTS disetujui_pada DATETIME DEFAULT NULL` },
    { name: 'mhaccount: add is_browse_ums', sql: `ALTER TABLE mhaccount ADD COLUMN IF NOT EXISTS is_browse_ums TINYINT(4) DEFAULT 0` },
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
