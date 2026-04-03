import mysql from 'mysql2/promise';

async function test() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'erp_db',
    port: 3306,
  });

  try {
    console.log('Connecting to DB...');
    const [results] = await pool.execute('SELECT 1 as test');
    console.log('Connectivity test:', results);

    console.log('Testing SP CALL...');
    const query = `CALL rp_lap_akuntansi_kas(?, ?, ?, ?, ?, ?, ?)`;
    const params = ['1', 0, '2026-03-01', '2026-03-31', '%', '%', '%'];
    const [spResults]: any = await pool.execute(query, params);
    console.log('SP result sets count:', spResults.length);
    if (spResults.length > 0 && Array.isArray(spResults[0])) {
      console.log('First result set rows:', spResults[0].length);
    } else {
      console.log('SP did not return expected result sets.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

test();
