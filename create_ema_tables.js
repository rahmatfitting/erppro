const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db',
    port: 3306
  });
  
  console.log("Creating EMA screener tables...");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS coins (
      symbol VARCHAR(20) PRIMARY KEY,
      name VARCHAR(100)
    )
  `);
  console.log("- Table 'coins' created/verified.");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS ema_results (
      symbol VARCHAR(20),
      timeframe VARCHAR(10),
      ema20 DECIMAL(20, 8),
      ema50 DECIMAL(20, 8),
      ema100 DECIMAL(20, 8),
      ema200 DECIMAL(20, 8),
      trend VARCHAR(20),
      timestamp DATETIME,
      PRIMARY KEY (symbol, timeframe)
    )
  `);
  console.log("- Table 'ema_results' created/verified.");

  console.log("All EMA tables are ready.");
  connection.end();
}

run().catch(err => {
  console.error("Error creating tables:", err);
  process.exit(1);
});
