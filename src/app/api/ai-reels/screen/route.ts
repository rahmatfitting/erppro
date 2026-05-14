import { NextResponse } from 'next/server';
import { ShopeeScreener } from '@/services/ai-reels-bot/scraper/shopee-screener';

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'List URL (array) wajib diisi' }, { status: 400 });
    }

    // Jalankan screening (bisa memakan waktu lama, jadi kita kirim respon awal jika perlu, 
    // tapi untuk sekarang kita tunggu sampai selesai atau gunakan antrean)
    const results = await ShopeeScreener.screenUrls(urls);

    return NextResponse.json({ 
      success: true, 
      message: `${results.length} produk berhasil di-screen dan disimpan ke inventory`,
      data: results 
    });

  } catch (error: any) {
    console.error('Screening API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const inventory = await ShopeeScreener.getPendingInventory();
    return NextResponse.json({ success: true, data: inventory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
