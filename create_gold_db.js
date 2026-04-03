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
    CREATE TABLE IF NOT EXISTS gold_prices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fetch_date DATE NOT NULL UNIQUE,
      price_1g DECIMAL(15,2) NOT NULL,
      prev_price DECIMAL(15,2) NOT NULL,
      diff DECIMAL(15,2) NOT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log("Table created.");
  connection.end();
}
run();
