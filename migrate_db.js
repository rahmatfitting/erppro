const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db',
    port: 3306
  });

  try {
    console.log('Running standalone migration...');

    const alterTable = async (table, cmd) => {
      try {
        await connection.execute(cmd);
        console.log(`✓ ${table}: Command executed`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_COLUMN') {
          console.log(`- ${table}: Column already exists, skipping`);
        } else {
          throw e;
        }
      }
    };

    // 1. Add columns to thuangmasuk
    await alterTable('thuangmasuk', `ALTER TABLE thuangmasuk ADD COLUMN nomormhcabang INT DEFAULT 0 AFTER jenis`);
    await alterTable('thuangmasuk', `ALTER TABLE thuangmasuk ADD COLUMN nomormhperusahaan INT DEFAULT 0 AFTER nomormhcabang`);

    // 2. Add columns to thuangkeluar
    await alterTable('thuangkeluar', `ALTER TABLE thuangkeluar ADD COLUMN nomormhcabang INT DEFAULT 0 AFTER jenis`);
    await alterTable('thuangkeluar', `ALTER TABLE thuangkeluar ADD COLUMN nomormhperusahaan INT DEFAULT 0 AFTER nomormhcabang`);

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
    const [groups] = await connection.execute('SELECT nomor FROM mhusergrup');
    for (const g of groups) {
      await connection.execute(`
        INSERT IGNORE INTO mhusergruphakakses (grup_id, menu, akses_view, akses_add, akses_edit, akses_delete, akses_approve)
        VALUES (?, 'Laporan', 1, 0, 0, 0, 0), (?, 'Laporan Piutang', 1, 0, 0, 0, 0)
      `, [g.nomor, g.nomor]);
    }
    console.log('✓ Permissions updated for Laporan module');

    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
    process.exit();
  }
}

run();
