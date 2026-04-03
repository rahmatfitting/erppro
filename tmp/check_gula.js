const mysql = require('mysql2/promise');
const path = require('path');
(async () => {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'',database:'erp_db'});
  try {
    const [barang] = await conn.execute("SELECT nomor, kode, nama FROM mhbarang WHERE nama LIKE '%Gula%'");
    console.log('BARANG GULA:', barang);
    
    const [stok] = await conn.execute("SELECT * FROM rhlaporanstok LIMIT 20");
    console.log('STOK ALL:', JSON.stringify(stok, null, 2));
  } finally {
    await conn.end();
  }
})()
