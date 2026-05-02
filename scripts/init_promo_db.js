const mysql = require('mysql2/promise');
// Removed dotenv dependency

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
});

async function initDB() {
  console.log('Connecting to database...');
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL.');

    // 1. Table mhpromo (Header)
    console.log('Creating table mhpromo...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mhpromo (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        nama VARCHAR(255) NOT NULL,
        keterangan TEXT,
        jenis_promo ENUM('PERCENT', 'NOMINAL', 'BUY_X_GET_Y', 'BUNDLE', 'SPECIAL_PRICE') NOT NULL,
        nilai_promo DECIMAL(15,2) DEFAULT 0,
        min_pembelian DECIMAL(15,2) DEFAULT 0,
        max_diskon DECIMAL(15,2) DEFAULT 0,
        tanggal_mulai DATE,
        tanggal_selesai DATE,
        jam_mulai TIME DEFAULT '00:00:00',
        jam_selesai TIME DEFAULT '23:59:59',
        hari_berlaku VARCHAR(100) DEFAULT '["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"]',
        status_aktif TINYINT(1) DEFAULT 1,
        is_stackable TINYINT(1) DEFAULT 0,
        prioritas INT DEFAULT 0,
        limit_per_user INT DEFAULT 0,
        limit_total INT DEFAULT 0,
        kode_voucher VARCHAR(50),
        metode_aplikasi ENUM('AUTO', 'MANUAL', 'VOUCHER') DEFAULT 'AUTO',
        target_pengguna ENUM('ALL', 'MEMBER', 'NEW_CUSTOMER') DEFAULT 'ALL',
        dibuat_oleh VARCHAR(50),
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Table mhpromo_item (Products/Categories)
    console.log('Creating table mhpromo_item...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mhpromo_item (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhpromo INT NOT NULL,
        tipe_target ENUM('PRODUCT', 'CATEGORY') NOT NULL,
        target_id VARCHAR(100) NOT NULL, 
        FOREIGN KEY (nomormhpromo) REFERENCES mhpromo(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 3. Table mhpromo_branch (Outlets)
    console.log('Creating table mhpromo_branch...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mhpromo_branch (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhpromo INT NOT NULL,
        nomormhcabang INT NOT NULL,
        FOREIGN KEY (nomormhpromo) REFERENCES mhpromo(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 4. Table mhpromo_member_level (Member Levels)
    console.log('Creating table mhpromo_member_level...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mhpromo_member_level (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhpromo INT NOT NULL,
        level VARCHAR(50) NOT NULL,
        FOREIGN KEY (nomormhpromo) REFERENCES mhpromo(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 5. Table thpromousage (Audit/Usage Log)
    console.log('Creating table thpromousage...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS thpromousage (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhpromo INT NOT NULL,
        nomorthpenjualan INT,
        nomorthpenjualannota INT, -- Add for after payment link
        tanggal DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_diskon DECIMAL(15,2) DEFAULT 0,
        customer_id INT,
        user VARCHAR(50),
        FOREIGN KEY (nomormhpromo) REFERENCES mhpromo(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    console.log('All promotion tables created successfully.');
    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('Error creating promotion tables:', err);
    process.exit(1);
  }
}

initDB();
