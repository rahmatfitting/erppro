import { NextResponse } from 'next/server';
import { runBotScan, ensureBotTables } from '@/lib/fvgBot';

// This endpoint runs the main loop manually or ideally via an external cron job every 5 min.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await ensureBotTables();
    const result = await runBotScan();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
