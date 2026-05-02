const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db',
    port: 3306
  });
  
  console.log("Creating Volume Screener table...");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS volume_screener_signals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      money_volume DECIMAL(20, 2) NOT NULL,
      signal_type VARCHAR(50) NOT NULL,
      score INT NOT NULL,
      bias VARCHAR(20) NOT NULL,
      metadata JSON,
      timestamp DATETIME NOT NULL
    )
  `);
  console.log("- Table 'volume_screener_signals' created/verified.");

  console.log("Volume Screener DB setup complete.");
  connection.end();
}

run().catch(err => {
  console.error("Error creating tables:", err);
  process.exit(1);
});
