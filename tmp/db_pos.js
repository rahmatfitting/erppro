const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db'
  });

  try {
    console.log("Creating thpos table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS thpos (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(50) NOT NULL UNIQUE,
        tanggal DATETIME NOT NULL,
        customer VARCHAR(150),
        subtotal DECIMAL(15,2) DEFAULT 0,
        diskon_nominal DECIMAL(15,2) DEFAULT 0,
        dpp DECIMAL(15,2) DEFAULT 0,
        ppn_nominal DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        pembayaran TEXT,
        jumlah_bayar DECIMAL(15,2) DEFAULT 0,
        kembalian DECIMAL(15,2) DEFAULT 0,
        dibuat_oleh VARCHAR(100),
        status_aktif TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log("Creating tdpos table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tdpos (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomorthpos INT NOT NULL,
        kode_barang VARCHAR(50),
        nama_barang VARCHAR(200),
        satuan VARCHAR(50),
        jumlah DECIMAL(10,2) DEFAULT 0,
        harga DECIMAL(15,2) DEFAULT 0,
        diskon_prosentase DECIMAL(5,2) DEFAULT 0,
        diskon_nominal DECIMAL(15,2) DEFAULT 0,
        netto DECIMAL(15,2) DEFAULT 0,
        subtotal DECIMAL(15,2) DEFAULT 0,
        INDEX idx_nomorthpos (nomorthpos),
        CONSTRAINT fk_tdpos_thpos FOREIGN KEY (nomorthpos) REFERENCES thpos(nomor) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log("Tables created successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    await connection.end();
  }
}

run();
