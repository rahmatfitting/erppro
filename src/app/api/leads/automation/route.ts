import { NextResponse } from 'next/server';
import { AutomationService } from '@/services/automation';

export async function POST(request: Request) {
  try {
    const { niche, city } = await request.json();

    if (!niche || !city) {
      return NextResponse.json({ error: 'Niche and City are required' }, { status: 400 });
    }

    const result = await AutomationService.runDailyScan(niche, city);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
