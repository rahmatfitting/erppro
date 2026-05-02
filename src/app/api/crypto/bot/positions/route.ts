import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { ensureBotTables } from '@/lib/fvgBot';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = parseInt(searchParams.get('bot_id') ?? '1', 10);

    await ensureBotTables();
    
    // Get OPEN positions
    const open: any = await executeQuery(`
      SELECT * FROM fvg_bot_positions 
      WHERE status = 'OPEN' AND bot_id = ?
      ORDER BY created_at DESC
    `, [botId]);

    // Get CLOSED positions (History)
    const history: any = await executeQuery(`
      SELECT * FROM fvg_bot_positions 
      WHERE status = 'CLOSED' AND bot_id = ?
      ORDER BY closed_at DESC LIMIT 50
    `, [botId]);

    // GET Today's PnL
    const today = new Date().toISOString().split('T')[0];
    const pnlRows: any = await executeQuery(`
      SELECT SUM(pnl) as today_pnl 
      FROM fvg_bot_positions 
      WHERE status = 'CLOSED' AND bot_id = ? AND DATE(closed_at) = ?
    `, [botId, today]);

    const todayPnl = pnlRows && pnlRows[0] && pnlRows[0].today_pnl ? parseFloat(pnlRows[0].today_pnl) : 0;

    return NextResponse.json({ 
      success: true, 
      data: {
        open,
        history,
        todayPnl
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
