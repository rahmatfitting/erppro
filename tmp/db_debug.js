const mysql = require('mysql2/promise');

async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp_db'
  });
  
  try {
    const [stok] = await connection.execute('SELECT * FROM rhlaporanstok LIMIT 10');
    console.log('STOK DATA:', JSON.stringify(stok, null, 2));
    
    const [hutang] = await connection.execute('SELECT * FROM rhlaporanhutang LIMIT 10');
    console.log('HUTANG DATA:', JSON.stringify(hutang, null, 2));
    
    const [comp] = await connection.execute('SELECT nomor, nama FROM mhperusahaan');
    console.log('COMPANIES:', comp);
    
    const [cab] = await connection.execute('SELECT nomor, nama FROM mhcabang');
    console.log('BRANCHES:', cab);
    
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await connection.end();
  }
}

test();
