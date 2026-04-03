const mysql = require('./node_modules/mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'',database:'erp_db'});
  try {
    const [stok] = await conn.execute('SELECT * FROM rhlaporanstok WHERE nomormhbarang = 1 AND nomormhgudang = 1');
    console.log('STOK DATA GULA:', JSON.stringify(stok, null, 2));
    
    const [all] = await conn.execute('SELECT nomormhperusahaan, nomormhcabang, nomormhbarang, nomormhgudang, tanggal FROM rhlaporanstok LIMIT 20');
    console.log('ALL STOK DATA SAMPLES:', JSON.stringify(all, null, 2));

    const [comp] = await conn.execute('SELECT nomor, nama FROM mhperusahaan');
    console.log('COMPANIES:', comp);

    const [cab] = await conn.execute('SELECT nomor, nama FROM mhcabang');
    console.log('BRANCHES:', cab);
  } finally {
    await conn.end();
  }
})()
