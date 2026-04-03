const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'erp_db'
    });
    const [rows] = await conn.execute("DESCRIBE mhbarang");
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
