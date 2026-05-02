const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db',
    port: 3306
  });
  
  console.log("Creating Whale Crypto Screener table...");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS whale_screener_signals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      type VARCHAR(20) NOT NULL, -- INFLOW or OUTFLOW
      amount_usd DECIMAL(20, 2) NOT NULL,
      signal_type VARCHAR(50) NOT NULL, -- BUY_ZONE, SELL_PRESSURE
      score INT NOT NULL,
      confidence VARCHAR(20) NOT NULL,
      metadata JSON,
      timestamp DATETIME NOT NULL
    )
  `);
  console.log("- Table 'whale_screener_signals' created/verified.");

  console.log("Whale Screener DB setup complete.");
  connection.end();
}

run().catch(err => {
  console.error("Error creating tables:", err);
  process.exit(1);
});
