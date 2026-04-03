const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db'
  });

  try {
    const [rows] = await connection.execute('DESCRIBE mhbarang');
    console.log("mhbarang:", JSON.stringify(rows, null, 2));
    
    const [pb] = await connection.execute('DESCRIBE thbelipenerimaan');
    console.log("thbelipenerimaan:", JSON.stringify(pb, null, 2));

    const [tdpb] = await connection.execute('DESCRIBE tdbelipenerimaan');
    console.log("tdbelipenerimaan:", JSON.stringify(tdpb, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkSchema();
