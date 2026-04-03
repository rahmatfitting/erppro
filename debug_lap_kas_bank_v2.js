const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp_db'
};

async function debugSP() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const is_detail = '1';
        const nomormhcabang = 4; // Use matched branch
        const tanggal_awal = '2026-02-28';
        const tanggal_akhir = '2026-03-29';
        const kas_bank = '0'; // Bank
        const p_account_nomor = '9';
        const p_transaksi_kode = '%';

        console.log('Calling SP with params:', [is_detail, nomormhcabang, tanggal_awal, tanggal_akhir, kas_bank, p_account_nomor, p_transaksi_kode]);
        
        const [results] = await connection.query('CALL rp_lap_akuntansi_kas(?, ?, ?, ?, ?, ?, ?)', [
            is_detail, nomormhcabang, tanggal_awal, tanggal_akhir, kas_bank, p_account_nomor, p_transaksi_kode
        ]);

        console.log('First result set (Data):');
        console.table(results[0]);
    } catch (err) {
        console.error('SP Error:', err);
    } finally {
        await connection.end();
    }
}

debugSP();
