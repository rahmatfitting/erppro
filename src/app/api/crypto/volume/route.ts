import { NextResponse } from 'next/server';
import { getVolumeSignalsFromDB } from '@/lib/volumeEngine';

export async function GET() {
  try {
    const data = await getVolumeSignalsFromDB();
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error: any) {
    console.error('API /crypto/volume GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
