const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'erp_db',
        port: 3306,
        multipleStatements: true
    });

    const sqlPath = path.join(__dirname, '../rab_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing schema on local DB...');
    try {
        await connection.query(sql);
        console.log('Success resolving schema definitions on local db');
    } catch (e) {
        console.error('Failed', e);
    }
    
    await connection.end();
}

run();
