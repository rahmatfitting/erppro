import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'pairs'; // 'pairs' | 'news'

    if (type === 'news') {
      const news: any = await executeQuery(
        `SELECT * FROM forex_news_cache
         WHERE impact IN ('High', 'Medium')
         ORDER BY event_date DESC LIMIT 50`
      );
      return NextResponse.json({ success: true, data: news });
    }

    // Default: probability signals
    const action = searchParams.get('action') || 'ALL';
    const where  = action === 'ALL' ? '' : `WHERE action = '${action}'`;
    const data: any = await executeQuery(
      `SELECT * FROM forex_probability_signals ${where} ORDER BY probability DESC LIMIT 20`
    );
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
