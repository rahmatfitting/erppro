const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db'
  });

  try {
    console.log("Creating tpos_settlement table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tpos_settlement (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        dibuat_oleh VARCHAR(100) NOT NULL,
        waktu_closing DATETIME NOT NULL,
        expected_cash DECIMAL(15,2) DEFAULT 0,
        expected_transfer DECIMAL(15,2) DEFAULT 0,
        expected_qris DECIMAL(15,2) DEFAULT 0,
        actual_cash DECIMAL(15,2) DEFAULT 0,
        actual_transfer DECIMAL(15,2) DEFAULT 0,
        actual_qris DECIMAL(15,2) DEFAULT 0,
        selisih_cash DECIMAL(15,2) DEFAULT 0,
        selisih_transfer DECIMAL(15,2) DEFAULT 0,
        selisih_qris DECIMAL(15,2) DEFAULT 0,
        total_penjualan DECIMAL(15,2) DEFAULT 0,
        jumlah_transaksi INT DEFAULT 0,
        catatan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_tanggal_kasir (tanggal, dibuat_oleh)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("tpos_settlement table created successfully.");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    await connection.end();
  }
}

run();
