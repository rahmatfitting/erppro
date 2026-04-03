const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp_db'
};

async function checkBranch() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const accId = 9;
        const [rows] = await connection.query(
            'SELECT kode, nomormhcabang, nomormhperusahaan FROM thuangmasuk WHERE nomormhaccount = ? AND status_aktif = 1',
            [accId]
        );
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkBranch();
