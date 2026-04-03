const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db',
    port: 3306,
  });

  try {
    const [rows] = await pool.execute(`SELECT * FROM mhcabang WHERE status_aktif = 1 LIMIT 10`);
    console.log("Branches:", rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit();
  }
}

test();
