const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db',
    port: 3306
  });
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS gold_prices_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fetch_date DATE NOT NULL,
      price_1g DECIMAL(15,2) NOT NULL,
      prev_price DECIMAL(15,2) NOT NULL,
      diff DECIMAL(15,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS buyback_prices_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fetch_date DATE NOT NULL,
      price_1g DECIMAL(15,2) NOT NULL,
      prev_price DECIMAL(15,2) NOT NULL,
      diff DECIMAL(15,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("History tables created.");

  const [gh] = await connection.execute('SELECT COUNT(*) as count FROM gold_prices_history');
  if (gh[0].count === 0) {
     await connection.execute(`
       INSERT INTO gold_prices_history (fetch_date, price_1g, prev_price, diff)
       SELECT fetch_date, price_1g, prev_price, diff FROM gold_prices
     `);
     console.log("Migrated gold_prices to history.");
  }
  
  const [bh] = await connection.execute('SELECT COUNT(*) as count FROM buyback_prices_history');
  if (bh[0].count === 0) {
     await connection.execute(`
       INSERT INTO buyback_prices_history (fetch_date, price_1g, prev_price, diff)
       SELECT fetch_date, price_1g, prev_price, diff FROM buyback_prices
     `);
     console.log("Migrated buyback_prices to history.");
  }

  connection.end();
}
run();
