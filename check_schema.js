const mysql = require('mysql2/promise');

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'erp_db'
    });
    try {
        const [rows] = await connection.query('DESCRIBE tduangkeluar');
        console.log('Columns in tduangkeluar:');
        rows.forEach(r => console.log(r.Field));
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkSchema();
