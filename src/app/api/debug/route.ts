import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table') || 'tdbeliretur';
    const data = await executeQuery(`SELECT * FROM ${table} ORDER BY nomor DESC LIMIT 5`, []);
    return NextResponse.json({ success: true, table, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
