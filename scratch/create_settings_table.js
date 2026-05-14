const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createTable() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Creating ai_reels_settings table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_reels_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) UNIQUE NOT NULL,
        value LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table ai_reels_settings created successfully!');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await connection.end();
  }
}

createTable();
