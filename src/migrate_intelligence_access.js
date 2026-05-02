const mysql = require('mysql2/promise');

async function migratePermissions() {
  const pool = mysql.createPool({
    host: '103.125.180.37',
    user: 'erpproco_erp_db',
    password: 'erp_db99*',
    database: 'erpproco_erp_db',
    port: 3306,
  });

  const intelligenceMenus = [
    // Market Intelligence
    "Master Flow AI",
    "Whale Flow Screener",
    "Volume Spike AI",
    "Inflow / Outflow AI",
    "Crypto FVG Screener",
    "Crypto SMC Screener",
    "Visual Market Screener",
    "RSI Heatmap",
    "Reversal Sniper",
    "Hedge Fund Screener",
    "Liquidity Sweep",
    "Hammer Reversal",
    "Top Trader Flow",
    "Divergence Screener",
    "ICT Kill Zone",
    "Break Trendline MTF",
    "Funding Fee Farming",
    "Crypto SMC 5M Multi-Pair",
    "EMA MTF Screener",
    "Auto FVG Trading Bot",
    // Forex Intelligence
    "Forex Probability",
    "XAUUSD AI Screener",
    "XAUUSD 5M Scalper",
    "XAGUSD AI Screener",
    "EURUSD AI Screener"
  ];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log('Checking for Super Admin role...');
    const [roles] = await connection.execute('SELECT nomor FROM mhusergrup WHERE kode = "SA"');
    let saGroupId = roles.length > 0 ? roles[0].nomor : 1;

    console.log(`Adding permissions to Super Admin (ID: ${saGroupId})...`);
    for (const menu of intelligenceMenus) {
      // Check if exists
      const [exists] = await connection.execute(
        'SELECT 1 FROM mhusergruphakakses WHERE grup_id = ? AND menu = ?',
        [saGroupId, menu]
      );

      if (exists.length === 0) {
        await connection.execute(
          'INSERT INTO mhusergruphakakses (grup_id, menu, akses_view, akses_add, akses_edit, akses_delete, akses_approve) VALUES (?, ?, 1, 1, 1, 1, 1)',
          [saGroupId, menu]
        );
        console.log(`  + Added: ${menu}`);
      } else {
        console.log(`  . Already exists: ${menu}`);
      }
    }

    // Create a new Intelligence role if it doesn't exist
    console.log('Checking for Intelligence role...');
    const [intelRoles] = await connection.execute('SELECT nomor FROM mhusergrup WHERE kode = "INTEL"');
    let intelGroupId;
    if (intelRoles.length === 0) {
      const [res] = await connection.execute(
        'INSERT INTO mhusergrup (kode, nama, keterangan, status_aktif) VALUES ("INTEL", "INTELLIGENCE USER", "Access to Market & Forex Intelligence", 1)'
      );
      intelGroupId = res.insertId;
      console.log(`Created new role: INTELLIGENCE USER (ID: ${intelGroupId})`);
    } else {
      intelGroupId = intelRoles[0].nomor;
      console.log(`Role INTELLIGENCE USER already exists (ID: ${intelGroupId})`);
    }

    console.log(`Assigning permissions to INTELLIGENCE USER...`);
    for (const menu of intelligenceMenus) {
      const [exists] = await connection.execute(
        'SELECT 1 FROM mhusergruphakakses WHERE grup_id = ? AND menu = ?',
        [intelGroupId, menu]
      );

      if (exists.length === 0) {
        await connection.execute(
          'INSERT INTO mhusergruphakakses (grup_id, menu, akses_view, akses_add, akses_edit, akses_delete, akses_approve) VALUES (?, ?, 1, 0, 0, 0, 0)',
          [intelGroupId, menu]
        );
      }
    }

    await connection.commit();
    console.log('Migration completed successfully.');
  } catch (error) {
    await connection.rollback();
    console.error('Migration failed:', error);
  } finally {
    connection.release();
    await pool.end();
  }
}

migratePermissions();
