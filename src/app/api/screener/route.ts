import { NextResponse } from 'next/server';
import { getScreenerResultsFromDB, runScreenerCore } from '@/lib/emaEngine';

export async function GET() {
  try {
    const data = await getScreenerResultsFromDB();
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error: any) {
    console.error('API /screener GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Run scan for top 50 coins by default to avoid timeout
    const scanResults = await runScreenerCore(50);
    return NextResponse.json({ 
      success: true, 
      message: 'Scan completed successfully', 
      count: scanResults.length 
    });
  } catch (error: any) {
    console.error('API /screener POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
