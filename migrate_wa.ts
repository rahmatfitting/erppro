import { executeQuery } from './src/lib/db';

async function migrate() {
  try {
    console.log("Checking and creating table mhsetting_notifikasi_wa...");
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS mhsetting_notifikasi_wa (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        target_number VARCHAR(20) NOT NULL,
        gateway_url VARCHAR(255) DEFAULT 'https://api.fonnte.com/send',
        gateway_token VARCHAR(255),
        is_enabled TINYINT(1) DEFAULT 1,
        send_time TIME DEFAULT '20:00:00',
        dibuat_pada DATETIME DEFAULT CURRENT_TIMESTAMP,
        diperbarui_pada DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit();
  }
}

migrate();
