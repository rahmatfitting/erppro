import { NextResponse } from 'next/server';
import { runVolumeScreenerCore } from '@/lib/volumeEngine';

export async function POST(req: Request) {
  try {
    const scanResults = await runVolumeScreenerCore();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Volume scan completed successfully', 
      count: scanResults.length,
      data: scanResults
    });
  } catch (error: any) {
    console.error('API /crypto/volume/scan Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Allow GET for easy browser testing
export async function GET(req: Request) {
  return POST(req);
}
