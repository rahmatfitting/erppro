import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'shopee-bot', 'Panduan_Lengkap_Bot_Shopee.md');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File panduan tidak ditemukan.' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
