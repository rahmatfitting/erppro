const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'erp_db'
    });
    
    console.log("Fixing POS stock mutations...");
    const [posFix] = await conn.execute(`
      UPDATE rhlaporanstok s
      JOIN thpos h ON s.transaksi_kode = h.kode
      SET s.tanggal = h.tanggal, s.jenis = 'POS'
      WHERE s.transaksi_kode LIKE 'POS-%'
    `);
    console.log(`Updated ${posFix.affectedRows} POS records.`);

    console.log("Fixing Retur Jual stock mutations...");
    const [rjFix] = await conn.execute(`
      UPDATE rhlaporanstok s
      JOIN thjualretur h ON s.transaksi_kode = h.kode
      SET s.tanggal = h.tanggal, s.jenis = 'RJ'
      WHERE h.jenis = 'RJ'
    `);
    console.log(`Updated ${rjFix.affectedRows} Retur Jual records.`);

    await conn.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
