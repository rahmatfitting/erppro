const mysql = require('mysql2/promise');

async function checkRoles() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db',
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
