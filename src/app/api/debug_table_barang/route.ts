import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const columns: any = await executeQuery(`DESCRIBE mhbarang`);
    return NextResponse.json({ success: true, columns });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
