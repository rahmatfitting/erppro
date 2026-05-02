import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getConfig, ensureBotTables } from '@/lib/fvgBot';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = parseInt(searchParams.get('bot_id') ?? '1', 10);
    const config = await getConfig(botId);
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await ensureBotTables();

    const { searchParams } = new URL(request.url);
    const botId = parseInt(searchParams.get('bot_id') ?? '1', 10);
    
    // Partial update
    const config = await getConfig(botId);
    const isActive = body.is_active !== undefined ? body.is_active : config.is_active;
    const mode = body.mode !== undefined ? body.mode : config.mode;
    const maxLoss = body.max_daily_loss !== undefined ? body.max_daily_loss : config.max_daily_loss;
    const leverage = body.leverage !== undefined ? body.leverage : config.leverage;
    const initialMargin = body.initial_margin !== undefined ? body.initial_margin : config.initial_margin;
    const isCompounding = body.is_compounding !== undefined ? body.is_compounding : config.is_compounding;
    const coins = body.coins !== undefined ? JSON.stringify(body.coins) : JSON.stringify(config.coins);

    await executeQuery(`
      UPDATE fvg_bot_config 
      SET is_active = ?, mode = ?, max_daily_loss = ?, leverage = ?, initial_margin = ?, is_compounding = ?, coins = ?
      WHERE id = ?
    `, [isActive, mode, maxLoss, leverage, initialMargin, isCompounding, coins, botId]);

    const updated = await getConfig(botId);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
