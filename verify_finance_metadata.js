const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp_db'
};

async function verify() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('--- thuangmasuk ---');
        const [masuk] = await connection.query('SELECT kode, metode, kas, bank FROM thuangmasuk LIMIT 5');
        console.table(masuk);

        console.log('--- thuangkeluar ---');
        const [keluar] = await connection.query('SELECT kode, metode, kas, bank FROM thuangkeluar LIMIT 5');
        console.table(keluar);
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

verify();
