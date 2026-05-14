import { NextResponse } from 'next/server';
import { AIReelsOrchestrator } from '@/services/ai-reels-bot/index';

export async function POST(req: Request) {
  try {
    const { url, generateVoice, isMobile } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL Shopee wajib diisi' }, { status: 400 });
    }

    const result = await AIReelsOrchestrator.runFullPipeline(url, generateVoice !== false, isMobile === true);

    return NextResponse.json({ 
      success: true, 
      message: 'Pipeline completed',
      data: result 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
