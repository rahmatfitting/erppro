import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS gold_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fetch_date DATE NOT NULL UNIQUE,
        price_1g DECIMAL(15,2) NOT NULL,
        prev_price DECIMAL(15,2) NOT NULL,
        diff DECIMAL(15,2) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    return NextResponse.json({ success: true, message: 'Table gold_prices created successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
