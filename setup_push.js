const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();
console.log('--- VAPID KEYS ---');
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
console.log('------------------\n');

// Also create the table in DB using mysql2
const mysql = require('mysql2/promise');

async function setupDB() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_db',
  });

  try {
    const query = `
      CREATE TABLE IF NOT EXISTS mhuser_push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nomor_user INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_nomor_user (nomor_user)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(query);
    console.log('Table mhuser_push_subscriptions verified/created.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    pool.end();
  }
}

setupDB();
