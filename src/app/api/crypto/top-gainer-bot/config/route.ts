import { NextResponse } from 'next/server';
import { updateTopGainerBotConfig } from '@/lib/topGainerBot';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const state = await updateTopGainerBotConfig(body);

    return NextResponse.json({
      success: true,
      message: 'Pengaturan Top Gainer Bot berhasil diperbarui',
      data: state,
    });
  } catch (error: any) {
    console.error("POST /api/crypto/top-gainer-bot/config error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memperbarui pengaturan Top Gainer Bot',
    }, { status: 500 });
  }
}
