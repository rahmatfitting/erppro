import { pool } from './lib/db';

async function runMigrations() {
  const connection = await pool.getConnection();
  try {
    console.log('Running Finance & Report migrations...');

    // 1. Add columns to thuangmasuk
    try {
      await connection.execute(`ALTER TABLE thuangmasuk ADD COLUMN nomormhcabang INT DEFAULT 0 AFTER jenis`);
      await connection.execute(`ALTER TABLE thuangmasuk ADD COLUMN nomormhperusahaan INT DEFAULT 0 AFTER nomormhcabang`);
      console.log('✓ Columns added to thuangmasuk');
    } catch (e: any) { if (e.code === 'ER_DUP_COLUMN') console.log('- Columns already exist in thuangmasuk'); else throw e; }

    // 2. Add columns to thuangkeluar
    try {
      await connection.execute(`ALTER TABLE thuangkeluar ADD COLUMN nomormhcabang INT DEFAULT 0 AFTER jenis`);
      await connection.execute(`ALTER TABLE thuangkeluar ADD COLUMN nomormhperusahaan INT DEFAULT 0 AFTER nomormhcabang`);
      console.log('✓ Columns added to thuangkeluar');
    } catch (e: any) { if (e.code === 'ER_DUP_COLUMN') console.log('- Columns already exist in thuangkeluar'); else throw e; }

    // 3. Create rhlaporanpiutang
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rhlaporanpiutang (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        nomormhcabang INT,
        nomormhperusahaan INT,
        nomormhcustomer INT,
        nomormhvaluta INT,
        nomormhtransaksi INT,
        jenis VARCHAR(10),
        tanggal DATE,
        transaksi_nomor INT,
        transaksi_kode VARCHAR(50),
        transaksi_tanggal DATE,
        jatuh_tempo DATE,
        kurs DECIMAL(15,2),
        total DECIMAL(15,2),
        total_idr DECIMAL(15,2),
        keterangan TEXT,
        pelunasan_nomor INT DEFAULT 0,
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    console.log('✓ Table rhlaporanpiutang created/verified');

    // 4. Update Permissions for Laporan
    const [groups]: any = await connection.execute('SELECT nomor FROM mhusergrup');
    for (const g of groups) {
      await connection.execute(`
        INSERT IGNORE INTO mhusergruphakakses (grup_id, menu, akses_view, akses_add, akses_edit, akses_delete, akses_approve)
        VALUES (?, 'Laporan', 1, 0, 0, 0, 0), (?, 'Laporan Piutang', 1, 0, 0, 0, 0)
      `, [g.nomor, g.nomor]);
    }
    console.log('✓ Permissions updated for Laporan module');

    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

runMigrations();
