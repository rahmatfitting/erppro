const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp_db'
};

async function inspectData() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const is_detail = '1';
        const nomormhcabang = 4;
        const tanggal_awal = '2026-02-28';
        const tanggal_akhir = '2026-03-29';
        const kas_bank = '0'; // Bank
        const p_account_nomor = '9';
        
        const [results] = await connection.query('CALL rp_lap_akuntansi_kas(?, ?, ?, ?, ?, ?, ?)', [
            is_detail, nomormhcabang, tanggal_awal, tanggal_akhir, kas_bank, p_account_nomor, '%'
        ]);

        const rows = results[0];
        if (rows && rows.length > 0) {
            console.log('Row 0 data:');
            console.log({
                transaksikode: rows[0].transaksikode,
                keterangan: rows[0].keterangan,
                tanggal: rows[0].tanggal,
                is_saldo_awal: rows[0].is_saldo_awal
            });
            console.log('Row 1 data:');
            console.log({
                transaksikode: rows[1].transaksikode,
                keterangan: rows[1].keterangan,
                tanggal: rows[1].tanggal,
                is_saldo_awal: rows[1].is_saldo_awal
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

inspectData();
