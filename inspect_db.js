const mysql = require('mysql2/promise');
async function run() {
  const connection = await mysql.createConnection({host: '127.0.0.1', user: 'root', password: '', database: 'erp_db'});
  const [h] = await connection.execute('DESCRIBE thjualnota');
  console.log('thjualnota:', h);
  const [d] = await connection.execute('DESCRIBE tdjualnota');
  console.log('tdjualnota:', d);
  const [s] = await connection.execute('DESCRIBE rhlaporanstok');
  console.log('rhlaporanstok:', s);
  const [p] = await connection.execute('DESCRIBE rhlaporanpiutang');
  console.log('rhlaporanpiutang:', p);
  await connection.end();
}
run().catch(console.error);
