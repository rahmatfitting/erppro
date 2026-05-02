import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
if (!process.env.DB_HOST) {
  dotenv.config({ path: '.env' });
}

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  try {
    console.log('Migrating EMA Screener tables...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS coins (
        symbol VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ema_results (
        symbol VARCHAR(50),
        timeframe VARCHAR(20),
        ema20 DOUBLE,
        ema50 DOUBLE,
        ema100 DOUBLE,
        ema200 DOUBLE,
        trend VARCHAR(50),
        timestamp DATETIME,
        PRIMARY KEY (symbol, timeframe),
        INDEX idx_trend (trend),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
