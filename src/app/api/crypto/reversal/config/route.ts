import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

const DEFAULT_OVERBOUGHT = ["ARIA", "DEXE", "GALA", "ALGO", "US", "CTSI", "SCRT", "ESPORTS", "TRADOOR", "MMT", "KOMA", "DAM"];
const DEFAULT_OVERSOLD = ["MANTRA", "DYM", "EDU", "ID", "FLUID", "BARD", "DRIFT", "ZK", "AVNT"];

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_reversal_config (
      config_key VARCHAR(50) PRIMARY KEY,
      config_value TEXT
    )
  `);

  // Initialize with default values if not exists
  const rows: any = await executeQuery(`SELECT COUNT(*) as count FROM crypto_reversal_config`);
  if (rows && rows[0].count === 0) {
    await executeQuery(
      `INSERT INTO crypto_reversal_config (config_key, config_value) VALUES (?, ?), (?, ?)`,
      ['COINGLASS_OVERBOUGHT', JSON.stringify(DEFAULT_OVERBOUGHT), 'COINGLASS_OVERSOLD', JSON.stringify(DEFAULT_OVERSOLD)]
    );
  }
}

export async function GET() {
  try {
    await ensureTable();
    const rows: any = await executeQuery(`SELECT * FROM crypto_reversal_config`);
    
    const config: any = {};
    rows.forEach((row: any) => {
      config[row.config_key] = JSON.parse(row.config_value);
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { overbought, oversold } = await request.json();
    
    if (!Array.isArray(overbought) || !Array.isArray(oversold)) {
      return NextResponse.json({ success: false, error: 'Overbought and oversold must be arrays' }, { status: 400 });
    }

    await ensureTable();

    await executeQuery(
      `INSERT INTO crypto_reversal_config (config_key, config_value) 
       VALUES (?, ?), (?, ?) 
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      ['COINGLASS_OVERBOUGHT', JSON.stringify(overbought), 'COINGLASS_OVERSOLD', JSON.stringify(oversold)]
    );

    return NextResponse.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
