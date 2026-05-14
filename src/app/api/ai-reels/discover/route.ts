import { NextResponse } from 'next/server';
import { ShopeeScreener } from '@/services/ai-reels-bot/scraper/shopee-screener';
import { AIReelsOrchestrator } from '@/services/ai-reels-bot';

export async function POST(req: Request) {
  try {
    const { keyword } = await req.json();
    
    // JANGAN sinkronisasi cookies otomatis untuk sementara agar tidak mengembalikan sesi beracun
    // await AIReelsOrchestrator.syncCookies();
    
    // Mulai proses discovery (berburu produk viral)
    const results = await ShopeeScreener.discoverViralProducts(keyword || 'viral');

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil menemukan dan menyaring ${results.length} produk viral dengan video.`,
      data: results 
    });

  } catch (error: any) {
    console.error('Discovery API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
