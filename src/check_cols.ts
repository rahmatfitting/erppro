import { executeQuery } from './lib/db';

async function checkCols() {
  try {
    const masal: any = await executeQuery('SHOW COLUMNS FROM thuangmasuk');
    console.log('thuangmasuk columns:', masal.map((c: any) => c.Field));
    const keluar: any = await executeQuery('SHOW COLUMNS FROM thuangkeluar');
    console.log('thuangkeluar columns:', keluar.map((c: any) => c.Field));
  } catch (err) {
    console.error(err);
  }
}

checkCols();
