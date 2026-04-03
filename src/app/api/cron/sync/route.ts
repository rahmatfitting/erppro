import { NextResponse } from 'next/server';
import { GET as syncGold } from '../../gold-prices/sync/route';
import { GET as syncBuyback } from '../../buyback-prices/sync/route';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Run both syncs
    const goldRes = await syncGold(request);
    const buybackRes = await syncBuyback(request);

    return NextResponse.json({
      success: true,
      message: "Sync all completed",
      gold: await goldRes.json(),
      buyback: await buybackRes.json()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
