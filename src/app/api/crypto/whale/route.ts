import { NextResponse } from 'next/server';
import { getWhaleSignalsFromDB } from '@/lib/whaleEngine';

export async function GET() {
  try {
    const data = await getWhaleSignalsFromDB();
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error: any) {
    console.error('API /crypto/whale GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
