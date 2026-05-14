const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createProductsTable() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('Creating ai_reels_products table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_reels_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        affiliate_url TEXT NOT NULL,
        price DECIMAL(15, 2),
        rating FLOAT,
        sold INT,
        discount INT,
        has_video BOOLEAN DEFAULT FALSE,
        video_url TEXT,
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Creating ai_reels_history table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_reels_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT,
        video_path TEXT,
        caption TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        posted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES ai_reels_products(id)
      )
    `);
    
    console.log('Tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await connection.end();
  }
}

createProductsTable();
