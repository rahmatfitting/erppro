import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'ALL';
    const minScore = parseFloat(searchParams.get('minScore') || '0');

    const where = type === 'ALL'
      ? `WHERE score >= ${minScore}`
      : `WHERE dominant_type = '${type}' AND score >= ${minScore}`;

    const data: any = await executeQuery(
      `SELECT * FROM crypto_divergence_signals
       ${where}
       ORDER BY score DESC
       LIMIT 50`
    );
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
