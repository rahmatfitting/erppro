import mysql from 'mysql2/promise';

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  const queries = [
    // 1. MASTER DATA: Customer
    `CREATE TABLE IF NOT EXISTS mhcustomer (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      nama VARCHAR(100) NOT NULL,
      alamat TEXT,
      telepon VARCHAR(20),
      email VARCHAR(100),
      kontak_person VARCHAR(100),
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      diubah_oleh VARCHAR(50),
      diubah_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // 2. MASTER DATA: Sales
    `CREATE TABLE IF NOT EXISTS mhsales (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      nama VARCHAR(100) NOT NULL,
      telepon VARCHAR(20),
      email VARCHAR(100),
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      diubah_oleh VARCHAR(50),
      diubah_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // 3. MASTER DATA: Gudang
    `CREATE TABLE IF NOT EXISTS mhgudang (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      nama VARCHAR(100) NOT NULL,
      lokasi TEXT,
      penanggung_jawab VARCHAR(100),
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      diubah_oleh VARCHAR(50),
      diubah_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // 4. PENJUALAN: ORDER JUAL (Header)
    `CREATE TABLE IF NOT EXISTS thjualorder (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      tanggal DATE NOT NULL,
      keterangan TEXT,
      nomormhcustomer INT,
      customer VARCHAR(100),
      nomormhsales INT,
      sales VARCHAR(100),
      nomor_po_customer VARCHAR(50),
      subtotal DECIMAL(15, 2) DEFAULT 0,
      diskon_prosentase DECIMAL(5, 2) DEFAULT 0,
      diskon_nominal DECIMAL(15, 2) DEFAULT 0,
      dpp DECIMAL(15, 2) DEFAULT 0,
      ppn_prosentase DECIMAL(5, 2) DEFAULT 0,
      ppn_nominal DECIMAL(15, 2) DEFAULT 0,
      total DECIMAL(15, 2) DEFAULT 0,
      total_idr DECIMAL(15, 2) DEFAULT 0,
      valuta VARCHAR(10) DEFAULT 'IDR',
      nomormhvaluta INT,
      kurs DECIMAL(10, 2) DEFAULT 1,
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dibatalkan_oleh VARCHAR(50),
      dibatalkan_pada DATETIME,
      status_disetujui TINYINT(1) DEFAULT 0,
      disetujui_oleh VARCHAR(50),
      disetujui_pada DATETIME
    )`,

    // 5. PENJUALAN: ORDER JUAL (Detail)
    `CREATE TABLE IF NOT EXISTS tdjualorder (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      nomorthjualorder INT NOT NULL,
      nomormhbarang INT,
      kode_barang VARCHAR(50),
      nama_barang VARCHAR(100),
      nomormhsatuan INT,
      satuan VARCHAR(20),
      jumlah DECIMAL(10, 2) DEFAULT 0,
      keterangan TEXT,
      harga DECIMAL(15, 2) DEFAULT 0,
      diskon_prosentase DECIMAL(5, 2) DEFAULT 0,
      diskon_nominal DECIMAL(15, 2) DEFAULT 0,
      netto DECIMAL(15, 2) DEFAULT 0,
      subtotal DECIMAL(15, 2) DEFAULT 0,
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dibatalkan_oleh VARCHAR(50),
      dibatalkan_pada DATETIME
    )`,

    // 6. PENJUALAN: DELIVERY ORDER (Header)
    `CREATE TABLE IF NOT EXISTS thdeliveryorder (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      tanggal DATE NOT NULL,
      keterangan TEXT,
      gudang VARCHAR(100),
      nomormhcustomer INT,
      customer VARCHAR(100),
      nomormhsales INT,
      sales VARCHAR(100),
      kode_order_jual VARCHAR(50),
      nomorthjualorder INT,
      subtotal DECIMAL(15, 2) DEFAULT 0,
      diskon_prosentase DECIMAL(5, 2) DEFAULT 0,
      diskon_nominal DECIMAL(15, 2) DEFAULT 0,
      dpp DECIMAL(15, 2) DEFAULT 0,
      ppn_prosentase DECIMAL(5, 2) DEFAULT 0,
      ppn_nominal DECIMAL(15, 2) DEFAULT 0,
      total DECIMAL(15, 2) DEFAULT 0,
      total_idr DECIMAL(15, 2) DEFAULT 0,
      valuta VARCHAR(10) DEFAULT 'IDR',
      nomormhvaluta INT,
      kurs DECIMAL(10, 2) DEFAULT 1,
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dibatalkan_oleh VARCHAR(50),
      dibatalkan_pada DATETIME,
      status_disetujui TINYINT(1) DEFAULT 0,
      disetujui_oleh VARCHAR(50),
      disetujui_pada DATETIME
    )`,

    // 7. PENJUALAN: DELIVERY ORDER (Detail)
    `CREATE TABLE IF NOT EXISTS tddeliveryorder (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      nomorthdeliveryorder INT NOT NULL,
      nomortdjualorder INT,
      nomormhbarang INT,
      kode_barang VARCHAR(50),
      nama_barang VARCHAR(100),
      nomormhsatuan INT,
      satuan VARCHAR(20),
      jumlah DECIMAL(10, 2) DEFAULT 0,
      keterangan TEXT,
      harga DECIMAL(15, 2) DEFAULT 0,
      diskon_prosentase DECIMAL(5, 2) DEFAULT 0,
      diskon_nominal DECIMAL(15, 2) DEFAULT 0,
      netto DECIMAL(15, 2) DEFAULT 0,
      subtotal DECIMAL(15, 2) DEFAULT 0,
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dibatalkan_oleh VARCHAR(50),
      dibatalkan_pada DATETIME
    )`,

    // 8. PENJUALAN: SURAT JALAN (Header)
    `CREATE TABLE IF NOT EXISTS thsuratjalan (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      tanggal DATE NOT NULL,
      keterangan TEXT,
      gudang VARCHAR(100),
      nomor_kendaraan VARCHAR(50),
      sopir VARCHAR(100),
      nomormhcustomer INT,
      customer VARCHAR(100),
      nomormhsales INT,
      sales VARCHAR(100),
      kode_order_jual VARCHAR(50),
      nomorthjualorder INT,
      kode_delivery_order VARCHAR(50),
      nomorthdeliveryorder INT,
      subtotal DECIMAL(15, 2) DEFAULT 0,
      diskon_prosentase DECIMAL(5, 2) DEFAULT 0,
      diskon_nominal DECIMAL(15, 2) DEFAULT 0,
      dpp DECIMAL(15, 2) DEFAULT 0,
      ppn_prosentase DECIMAL(5, 2) DEFAULT 0,
      ppn_nominal DECIMAL(15, 2) DEFAULT 0,
      total DECIMAL(15, 2) DEFAULT 0,
      total_idr DECIMAL(15, 2) DEFAULT 0,
      valuta VARCHAR(10) DEFAULT 'IDR',
      nomormhvaluta INT,
      kurs DECIMAL(10, 2) DEFAULT 1,
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dibatalkan_oleh VARCHAR(50),
      dibatalkan_pada DATETIME,
      status_disetujui TINYINT(1) DEFAULT 0,
      disetujui_oleh VARCHAR(50),
      disetujui_pada DATETIME
    )`,

    // 9. PENJUALAN: SURAT JALAN (Detail)
    `CREATE TABLE IF NOT EXISTS tdsuratjalan (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      nomorthsuratjalan INT NOT NULL,
      nomortddeliveryorder INT,
      nomormhbarang INT,
      kode_barang VARCHAR(50),
      nama_barang VARCHAR(100),
      nomormhsatuan INT,
      satuan VARCHAR(20),
      jumlah DECIMAL(10, 2) DEFAULT 0,
      keterangan TEXT,
      harga DECIMAL(15, 2) DEFAULT 0,
      diskon_prosentase DECIMAL(5, 2) DEFAULT 0,
      diskon_nominal DECIMAL(15, 2) DEFAULT 0,
      netto DECIMAL(15, 2) DEFAULT 0,
      subtotal DECIMAL(15, 2) DEFAULT 0,
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dibatalkan_oleh VARCHAR(50),
      dibatalkan_pada DATETIME
    )`,

    // 10. PENJUALAN: NOTA JUAL (Header)
    `CREATE TABLE IF NOT EXISTS thjualnota (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      kode VARCHAR(50) UNIQUE NOT NULL,
      tanggal DATE NOT NULL,
      keterangan TEXT,
      gudang VARCHAR(100),
      nomormhcustomer INT,
      customer VARCHAR(100),
      nomormhsales INT,
      sales VARCHAR(100),
      kode_order_jual VARCHAR(50),
      nomorthjualorder INT,
      subtotal DECIMAL(15, 2) DEFAULT 0,
      diskon_prosentase DECIMAL(5, 2) DEFAULT 0,
      diskon_nominal DECIMAL(15, 2) DEFAULT 0,
      dpp DECIMAL(15, 2) DEFAULT 0,
      uang_muka_penjualan DECIMAL(15, 2) DEFAULT 0,
      ppn_prosentase DECIMAL(5, 2) DEFAULT 0,
      ppn_nominal DECIMAL(15, 2) DEFAULT 0,
      total DECIMAL(15, 2) DEFAULT 0,
      total_idr DECIMAL(15, 2) DEFAULT 0,
      valuta VARCHAR(10) DEFAULT 'IDR',
      nomormhvaluta INT,
      kurs DECIMAL(10, 2) DEFAULT 1,
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dibatalkan_oleh VARCHAR(50),
      dibatalkan_pada DATETIME,
      status_disetujui TINYINT(1) DEFAULT 0,
      disetujui_oleh VARCHAR(50),
      disetujui_pada DATETIME
    )`,

    // 11. PENJUALAN: NOTA JUAL (Detail)
    `CREATE TABLE IF NOT EXISTS tdjualnota (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      nomorthjualnota INT NOT NULL,
      kode_sj VARCHAR(50),
      nomorthsuratjalan INT,
      nomortdsuratjalan INT,
      nomormhbarang INT,
      kode_barang VARCHAR(50),
      nama_barang VARCHAR(100),
      nomormhsatuan INT,
      satuan VARCHAR(20),
      jumlah DECIMAL(10, 2) DEFAULT 0,
      keterangan TEXT,
      harga DECIMAL(15, 2) DEFAULT 0,
      diskon_prosentase DECIMAL(5, 2) DEFAULT 0,
      diskon_nominal DECIMAL(15, 2) DEFAULT 0,
      netto DECIMAL(15, 2) DEFAULT 0,
      subtotal DECIMAL(15, 2) DEFAULT 0,
      status_aktif TINYINT(1) DEFAULT 1,
      dibuat_oleh VARCHAR(50),
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      dibatalkan_oleh VARCHAR(50),
      dibatalkan_pada DATETIME
    )`
  ];

  try {
    for (const q of queries) {
      console.log('Running query...');
      await pool.query(q);
    }
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
