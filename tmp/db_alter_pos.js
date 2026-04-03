const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db'
  });

  try {
    console.log("Altering tpos_settlement...");
    await connection.execute(`ALTER TABLE tpos_settlement ADD COLUMN IF NOT EXISTS nomormhcabang INT DEFAULT 0 AFTER dibuat_oleh`);
    await connection.execute(`ALTER TABLE tpos_settlement ADD COLUMN IF NOT EXISTS nomormhperusahaan INT DEFAULT 0 AFTER nomormhcabang`);

    console.log("Altering thpos...");
    await connection.execute(`ALTER TABLE thpos ADD COLUMN IF NOT EXISTS nomormhcabang INT DEFAULT 0 AFTER keterangan`);
    await connection.execute(`ALTER TABLE thpos ADD COLUMN IF NOT EXISTS nomormhperusahaan INT DEFAULT 0 AFTER nomormhcabang`);
    await connection.execute(`ALTER TABLE thpos ADD COLUMN IF NOT EXISTS nomormhcustomer INT DEFAULT 0 AFTER nomormhperusahaan`);

    console.log("Altering tdpos...");
    await connection.execute(`ALTER TABLE tdpos ADD COLUMN IF NOT EXISTS nomormhbarang INT DEFAULT 0 AFTER id_header`);
    await connection.execute(`ALTER TABLE tdpos ADD COLUMN IF NOT EXISTS nomormhsatuan INT DEFAULT 0 AFTER nomormhbarang`);

    console.log("DB alterations completed.");
  } catch (error) {
    console.error("Error altering tables:", error);
  } finally {
    await connection.end();
  }
}

run();
