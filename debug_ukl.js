const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp_db'
};

async function verifyUKL() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [rows] = await connection.query('SELECT nomor, kode FROM thuangkeluar WHERE jenis = 0 AND status_aktif = 1 LIMIT 1');
        if (rows.length === 0) {
            console.log('No UKL data found to verify.');
            return;
        }
        const { nomor, kode } = rows[0];
        console.log(`Testing with nomor: ${nomor}, kode: ${kode}`);

        const [headerData] = await connection.query(`SELECT * FROM thuangkeluar WHERE nomor = ? AND status_aktif = 1`, [nomor]);
        
        if (headerData.length > 0) {
            console.log('SUCCESS: Backend logic correctly found data by NOMOR.');
            console.log('Header Kode:', headerData[0].kode);
        } else {
            console.log('FAILED: Backend logic could not find data by NOMOR.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

verifyUKL();
