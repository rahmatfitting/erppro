const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'wiratech',
      port: 3306
    });
    console.log('Connected to MySQL!');
    const [rows] = await conn.execute('SELECT * FROM __tmp_rp_layout');
    console.log('Fetched rows:', rows.length);
    
    // Write header
    const fields = Object.keys(rows[0]);
    const csvContent = [
      fields.join(','),
      ...rows.map(row => {
        return fields.map(f => {
          const val = row[f];
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        }).join(',');
      })
    ].join('\n');
    
    fs.writeFileSync('d:/rahmat/belajar next js/wiratech/__tmp_rp_layout_backup.csv', csvContent, 'utf8');
    console.log('Successfully backed up __tmp_rp_layout from DB!');
    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
