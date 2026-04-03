import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// Migration 3: Keuangan module tables
export async function GET() {
  const results: string[] = [];

  const tables = [
    {
      name: 'thuangmasuk',
      sql: `CREATE TABLE IF NOT EXISTS thuangmasuk (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        kode VARCHAR(100) NOT NULL,
        jenis TINYINT(4) DEFAULT 1 COMMENT '1=utama, 0=lain',
        tanggal DATE NOT NULL,
        metode VARCHAR(20) DEFAULT 'kas' COMMENT 'kas/bank',
        nomormhaccount INT(11) DEFAULT 0,
        account_kode VARCHAR(100),
        account_nama VARCHAR(200),
        keterangan TEXT,
        valuta VARCHAR(20) DEFAULT 'IDR',
        kurs DECIMAL(30,2) DEFAULT 1,
        total DECIMAL(30,2) DEFAULT 0,
        total_idr DECIMAL(30,2) DEFAULT 0,
        status_aktif TINYINT(4) DEFAULT 1,
        status_disetujui TINYINT(4) DEFAULT 0,
        disetujui_oleh VARCHAR(100),
        disetujui_pada DATETIME,
        dibuat_oleh VARCHAR(100) DEFAULT 'Admin',
        dibuat_pada DATETIME DEFAULT NOW(),
        dibatalkan_oleh VARCHAR(100),
        dibatalkan_pada DATETIME,
        PRIMARY KEY (nomor),
        UNIQUE KEY uq_thuangmasuk_kode (kode)
      ) ENGINE=InnoDB`
    },
    {
      name: 'tduangmasuk',
      sql: `CREATE TABLE IF NOT EXISTS tduangmasuk (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        nomorthuangmasuk INT(11) NOT NULL DEFAULT 0,
        jenis_detail VARCHAR(20) DEFAULT 'transaksi' COMMENT 'transaksi/selisih',
        -- Untuk uang masuk utama (jenis=1): ref transaksi
        ref_jenis VARCHAR(20) COMMENT 'nota_jual/ndc/umc/ums',
        ref_kode VARCHAR(100),
        ref_nomor INT(11) DEFAULT 0,
        customer_supplier VARCHAR(200),
        nomormhaccount_piutang INT(11) DEFAULT 0,
        account_piutang VARCHAR(200) DEFAULT 'Piutang Usaha',
        nominal_transaksi DECIMAL(30,2) DEFAULT 0,
        nominal_transaksi_idr DECIMAL(30,2) DEFAULT 0,
        total_bayar DECIMAL(30,2) DEFAULT 0,
        total_bayar_idr DECIMAL(30,2) DEFAULT 0,
        -- Untuk uang masuk lain (jenis=0): browse account
        nomormhaccount INT(11) DEFAULT 0,
        account_kode VARCHAR(100),
        account_nama VARCHAR(200),
        nominal DECIMAL(30,2) DEFAULT 0,
        keterangan TEXT,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_oleh VARCHAR(100) DEFAULT 'Admin',
        dibuat_pada DATETIME DEFAULT NOW(),
        PRIMARY KEY (nomor)
      ) ENGINE=InnoDB`
    },
    {
      name: 'tduangmasukselisih',
      sql: `CREATE TABLE IF NOT EXISTS tduangmasukselisih (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        nomorthuangmasuk INT(11) NOT NULL DEFAULT 0,
        nomormhaccount INT(11) DEFAULT 0,
        account_kode VARCHAR(100),
        account_nama VARCHAR(200),
        nominal DECIMAL(30,2) DEFAULT 0,
        keterangan TEXT,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_oleh VARCHAR(100) DEFAULT 'Admin',
        dibuat_pada DATETIME DEFAULT NOW(),
        PRIMARY KEY (nomor)
      ) ENGINE=InnoDB`
    },
    {
      name: 'thuangkeluar',
      sql: `CREATE TABLE IF NOT EXISTS thuangkeluar (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        kode VARCHAR(100) NOT NULL,
        jenis TINYINT(4) DEFAULT 1 COMMENT '1=utama, 0=lain',
        tanggal DATE NOT NULL,
        metode VARCHAR(20) DEFAULT 'kas' COMMENT 'kas/bank',
        nomormhaccount INT(11) DEFAULT 0,
        account_kode VARCHAR(100),
        account_nama VARCHAR(200),
        keterangan TEXT,
        valuta VARCHAR(20) DEFAULT 'IDR',
        kurs DECIMAL(30,2) DEFAULT 1,
        total DECIMAL(30,2) DEFAULT 0,
        total_idr DECIMAL(30,2) DEFAULT 0,
        status_aktif TINYINT(4) DEFAULT 1,
        status_disetujui TINYINT(4) DEFAULT 0,
        disetujui_oleh VARCHAR(100),
        disetujui_pada DATETIME,
        dibuat_oleh VARCHAR(100) DEFAULT 'Admin',
        dibuat_pada DATETIME DEFAULT NOW(),
        dibatalkan_oleh VARCHAR(100),
        dibatalkan_pada DATETIME,
        PRIMARY KEY (nomor),
        UNIQUE KEY uq_thuangkeluar_kode (kode)
      ) ENGINE=InnoDB`
    },
    {
      name: 'tduangkeluar',
      sql: `CREATE TABLE IF NOT EXISTS tduangkeluar (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        nomorthuangkeluar INT(11) NOT NULL DEFAULT 0,
        jenis_detail VARCHAR(20) DEFAULT 'transaksi',
        -- Untuk uang keluar utama (jenis=1): ref transaksi
        ref_jenis VARCHAR(20) COMMENT 'nota_beli/nks/ums/umc',
        ref_kode VARCHAR(100),
        ref_nomor INT(11) DEFAULT 0,
        customer_supplier VARCHAR(200),
        nomormhaccount_hutang INT(11) DEFAULT 0,
        account_hutang VARCHAR(200) DEFAULT 'Hutang Usaha',
        nominal_transaksi DECIMAL(30,2) DEFAULT 0,
        nominal_transaksi_idr DECIMAL(30,2) DEFAULT 0,
        total_bayar DECIMAL(30,2) DEFAULT 0,
        total_bayar_idr DECIMAL(30,2) DEFAULT 0,
        -- Untuk uang keluar lain (jenis=0): browse account
        nomormhaccount INT(11) DEFAULT 0,
        account_kode VARCHAR(100),
        account_nama VARCHAR(200),
        nominal DECIMAL(30,2) DEFAULT 0,
        keterangan TEXT,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_oleh VARCHAR(100) DEFAULT 'Admin',
        dibuat_pada DATETIME DEFAULT NOW(),
        PRIMARY KEY (nomor)
      ) ENGINE=InnoDB`
    },
    {
      name: 'tduangkeluarselisih',
      sql: `CREATE TABLE IF NOT EXISTS tduangkeluarselisih (
        nomor INT(11) NOT NULL AUTO_INCREMENT,
        nomorthuangkeluar INT(11) NOT NULL DEFAULT 0,
        nomormhaccount INT(11) DEFAULT 0,
        account_kode VARCHAR(100),
        account_nama VARCHAR(200),
        nominal DECIMAL(30,2) DEFAULT 0,
        keterangan TEXT,
        status_aktif TINYINT(4) DEFAULT 1,
        dibuat_oleh VARCHAR(100) DEFAULT 'Admin',
        dibuat_pada DATETIME DEFAULT NOW(),
        PRIMARY KEY (nomor)
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

  return NextResponse.json({ success: true, results });
}
