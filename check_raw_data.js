const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp_db'
};

async function checkData() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const accId = 9;
        const start = '2026-02-28';
        const end = '2026-03-29';

        console.log(`Checking thuangmasuk for account ${accId} between ${start} and ${end}...`);
        const [masuk] = await connection.query(
            'SELECT COUNT(*) as count FROM thuangmasuk WHERE nomormhaccount = ? AND tanggal BETWEEN ? AND ? AND status_aktif = 1',
            [accId, start, end]
        );
        console.log('thuangmasuk count:', masuk[0].count);

        console.log(`Checking thuangkeluar for account ${accId} between ${start} and ${end}...`);
        const [keluar] = await connection.query(
            'SELECT COUNT(*) as count FROM thuangkeluar WHERE nomormhaccount = ? AND tanggal BETWEEN ? AND ? AND status_aktif = 1',
            [accId, start, end]
        );
        console.log('thuangkeluar count:', keluar[0].count);

        if (masuk[0].count > 0) {
            const [rows] = await connection.query(
                'SELECT kode, tanggal, total FROM thuangmasuk WHERE nomormhaccount = ? AND tanggal BETWEEN ? AND ? AND status_aktif = 1',
                [accId, start, end]
            );
            console.table(rows);
        }

        if (keluar[0].count > 0) {
            const [rows] = await connection.query(
                'SELECT kode, tanggal, total FROM thuangkeluar WHERE nomormhaccount = ? AND tanggal BETWEEN ? AND ? AND status_aktif = 1',
                [accId, start, end]
            );
            console.table(rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkData();
