const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp_db'
};

async function migrate() {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database.');

    try {
        // Add columns to thuangmasuk
        console.log('Adding kas/bank columns to thuangmasuk...');
        await connection.query(`
            ALTER TABLE thuangmasuk 
            ADD COLUMN IF NOT EXISTS kas TINYINT(4) DEFAULT 0 AFTER metode,
            ADD COLUMN IF NOT EXISTS bank TINYINT(4) DEFAULT 0 AFTER kas
        `);

        // Add columns to thuangkeluar
        console.log('Adding kas/bank columns to thuangkeluar...');
        await connection.query(`
            ALTER TABLE thuangkeluar 
            ADD COLUMN IF NOT EXISTS kas TINYINT(4) DEFAULT 0 AFTER metode,
            ADD COLUMN IF NOT EXISTS bank TINYINT(4) DEFAULT 0 AFTER kas
        `);

        // Update existing data for thuangmasuk
        console.log('Updating existing data in thuangmasuk...');
        await connection.query(`
            UPDATE thuangmasuk 
            SET kas = CASE WHEN LOWER(metode) = 'kas' THEN 1 ELSE 0 END,
                bank = CASE WHEN LOWER(metode) = 'bank' THEN 1 ELSE 0 END
        `);

        // Update existing data for thuangkeluar
        console.log('Updating existing data in thuangkeluar...');
        await connection.query(`
            UPDATE thuangkeluar 
            SET kas = CASE WHEN LOWER(metode) = 'kas' THEN 1 ELSE 0 END,
                bank = CASE WHEN LOWER(metode) = 'bank' THEN 1 ELSE 0 END
        `);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await connection.end();
    }
}

migrate();
