import { executeQuery } from './src/lib/db';

async function checkColumns() {
  try {
    const columns = await executeQuery('DESCRIBE rhlaporanstok');
    console.log(JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error(error);
  }
}

checkColumns();
