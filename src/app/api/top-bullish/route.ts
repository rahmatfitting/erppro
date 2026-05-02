import { NextResponse } from 'next/server';
import { getScreenerResultsFromDB } from '@/lib/emaEngine';

export async function GET() {
  try {
    const data = await getScreenerResultsFromDB();
    const bullishData = data.filter(d => 
      d.status === 'STRONG_BULLISH' || d.status === 'BULLISH'
    );
    
    // Sort logic for ranking could be added here (e.g. comparing EMA gaps)
    return NextResponse.json({ success: true, count: bullishData.length, data: bullishData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
