const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkUser() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  try {
    const [tables] = await connection.execute("SHOW TABLES LIKE 'mhuser'");
    if (tables.length === 0) {
      console.log("Table 'mhuser' does not exist.");
      return;
    }

    const [users] = await connection.execute("SELECT nomor, username, nama, password FROM mhuser");
    console.log("Users found:", users.length);
    users.forEach(u => {
      console.log(`- ${u.username} (${u.nama}): ${u.password.substring(0, 10)}...`);
    });
  } catch (err) {
    console.error("Error checking users:", err.message);
  } finally {
    await connection.end();
  }
}

checkUser();
