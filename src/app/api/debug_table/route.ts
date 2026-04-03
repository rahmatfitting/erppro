import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const columns: any = await executeQuery(`DESC tdbelipenerimaan`);
    return NextResponse.json({ success: true, columns });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
