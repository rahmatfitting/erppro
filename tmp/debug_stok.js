const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'erp_db'
    });
    const [rows] = await conn.execute("SELECT * FROM rhlaporanstok WHERE nomormhbarang = 3 AND nomormhgudang = 1 ORDER BY tanggal DESC LIMIT 10");
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
