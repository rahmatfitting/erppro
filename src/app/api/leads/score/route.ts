import { NextResponse } from 'next/server';
import { ScoringService } from '@/ai/scoring';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const result = await ScoringService.updateBusinessScore(id);

    return NextResponse.json({ 
      success: true,
      result 
    });

  } catch (error: any) {
    console.error('Scoring Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
