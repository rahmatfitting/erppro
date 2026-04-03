const mysql = require('mysql2/promise');
async function test() {
  const connection = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'erp_db' });
  try {
    const [stok] = await connection.execute('SELECT COUNT(*) as count FROM rhlaporanstok');
    const [hutang] = await connection.execute('SELECT COUNT(*) as count FROM rhlaporanhutang');
    console.log('COUNT STOK:', stok[0].count);
    console.log('COUNT HUTANG:', hutang[0].count);
    if (stok[0].count > 0) {
      const [data] = await connection.execute('SELECT nomormhbarang, nomormhgudang, nomormhcabang, tanggal FROM rhlaporanstok LIMIT 5');
      console.log('SAMPLE STOK:', data);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await connection.end();
  }
}
test();
