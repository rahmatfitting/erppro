const mysql = require('mysql2/promise');

async function updateSchema() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db'
  });

  try {
    const [rows] = await connection.execute('DESCRIBE mhbarang');
    const hasGambar = rows.some(r => r.Field === 'gambar');
    
    if (!hasGambar) {
      await connection.execute('ALTER TABLE mhbarang ADD COLUMN gambar TEXT AFTER nama');
      console.log("Column 'gambar' added to 'mhbarang'.");
    } else {
      console.log("Column 'gambar' already exists.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

updateSchema();
