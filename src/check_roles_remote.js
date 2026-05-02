const mysql = require('mysql2/promise');

async function checkRoles() {
  const pool = mysql.createPool({
    host: '103.125.180.37',
    user: 'erpproco_erp_db',
    password: 'erp_db99*',
    database: 'erpproco_erp_db',
    port: 3306,
  });

  try {
    const [roles] = await pool.execute('SELECT nomor, kode, nama FROM mhusergrup');
    console.log('Roles:', roles);

    const [hakAkses] = await pool.execute('SELECT DISTINCT menu FROM mhusergruphakakses');
    console.log('Existing Menus in Hak Akses:', hakAkses.map(h => h.menu));

  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await pool.end();
  }
}

checkRoles();
