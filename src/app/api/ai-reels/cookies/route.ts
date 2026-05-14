import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma');
    const settings = await prisma.$queryRaw`
      SELECT \`key\`, updated_at FROM ai_reels_settings 
      WHERE \`key\` IN ('shopee_cookies', 'instagram_cookies')
    `;

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { cookies, platform } = await req.json();
    
    if (!cookies) {
      return NextResponse.json({ error: 'Cookies tidak boleh kosong' }, { status: 400 });
    }

    let sessionPath = path.join(process.cwd(), 'shopee-bot', 'storage', 'state.json');
    if (platform === 'instagram') {
      sessionPath = path.join(process.cwd(), 'ai-reels-bot', 'data', 'ig-session.json');
    }
    
    // Pastikan folder storage ada
    const storageDir = path.dirname(sessionPath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    let cookieData;
    try {
      // Coba parse jika input adalah JSON (format dari extension browser)
      cookieData = JSON.parse(cookies);
    } catch (e) {
      return NextResponse.json({ error: 'Format cookies harus JSON (export dari EditThisCookie atau sejenisnya)' }, { status: 400 });
    }

    // Bungkus dalam format storageState Playwright dengan sanitasi
    const rawCookies = Array.isArray(cookieData) ? cookieData : (cookieData.cookies || []);
    
    const sanitizedCookies = rawCookies.map((cookie: any) => {
      const sanitized: any = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
      };

      // Force sameSite to valid Playwright values
      let ss = cookie.sameSite;
      if (typeof ss === 'string') {
        ss = ss.charAt(0).toUpperCase() + ss.slice(1).toLowerCase();
      }
      
      if (['Strict', 'Lax', 'None'].includes(ss)) {
        sanitized.sameSite = ss;
      } else {
        sanitized.sameSite = 'Lax'; // Safe default
      }
      
      return sanitized;
    });

    const storageState = {
      cookies: sanitizedCookies,
      origins: cookieData.origins || []
    };

    fs.writeFileSync(sessionPath, JSON.stringify(storageState, null, 2));

    // SIMPAN KE DATABASE (Raw SQL)
    try {
      const { prisma } = await import('@/lib/prisma');
      const dbKey = platform === 'instagram' ? 'instagram_cookies' : 'shopee_cookies';
      const val = JSON.stringify(storageState);
      
      await prisma.$executeRaw`
        INSERT INTO ai_reels_settings (\`key\`, value) 
        VALUES (${dbKey}, ${val})
        ON DUPLICATE KEY UPDATE value = ${val}, updated_at = NOW()
      `;

      console.log(`[DB] ${dbKey} saved successfully!`);
    } catch (dbError) {
      console.error('[DB] Failed to save cookies to database:', dbError);
    }

    return NextResponse.json({ success: true, message: `Cookies ${platform} berhasil disimpan ke database & file` });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
