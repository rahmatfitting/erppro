import { ShopeeScraper, ProductData } from './shopee-scraper';
import { prisma } from '@/lib/prisma';
import path from 'path';
import * as fs from 'fs';

export class ShopeeScreener {
  static async screenUrls(urls: string[]) {
    console.log(`[Screener] Starting screening for ${urls.length} URLs...`);
    const results = [];

    for (const url of urls) {
      try {
        // Tambahkan jeda acak antara produk agar tidak terdeteksi (2-5 detik)
        const jitter = 2000 + Math.floor(Math.random() * 3000);
        console.log(`[Screener] Waiting ${jitter}ms before next product...`);
        await new Promise(r => setTimeout(r, jitter));

        console.log(`[Screener] Processing: ${url}`);
        const product = await ShopeeScraper.scrapeProduct(url);
        
        if (product) {
          const processed = await this.saveToInventory(url, product);
          results.push(processed);
        } else {
          console.warn(`[Screener] Failed to scrape: ${url}`);
        }
      } catch (error) {
        console.error(`[Screener] Error screening ${url}:`, error);
      }
    }

    return results;
  }

  static async discoverViralProducts(keyword: string = 'viral') {
    console.log(`[Discovery] Starting Human-Like discovery for: ${keyword}`);
    
    const context = await ShopeeScraper.launchBrowser(); 
    const page = await context.newPage();

    try {
      // Step 1: Masuk lewat pintu depan (Homepage)
      console.log('[Discovery] Step 1: Entering Shopee Home...');
      await page.goto('https://shopee.co.id/', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(3000 + Math.random() * 2000);

      // Step 2: Tunggu dan tutup gangguan (Modal/Pop-up)
      const langButton = page.locator('button:has-text("Bahasa Indonesia")');
      if (await langButton.isVisible()) {
        console.log('[Discovery] Selecting language...');
        await langButton.click();
        await page.waitForTimeout(1000);
      }

      const popupClose = page.locator('.shopee-popup__close-btn');
      if (await popupClose.isVisible()) {
        console.log('[Discovery] Closing pop-up...');
        await popupClose.click();
        await page.waitForTimeout(1000);
      }

      // Step 3: Ketik keyword secara manual (Simulasi Manusia)
      console.log(`[Discovery] Step 3: Typing keyword "${keyword}"...`);
      const searchInput = page.locator('input[aria-label="Cari di Shopee"], .shopee-searchbar-input__input').first();
      await searchInput.click({ delay: 500 });
      await searchInput.type(keyword, { delay: 150 + Math.random() * 100 });
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');

      console.log('[Discovery] Search initiated. Waiting for results...');
      
      // Deteksi Verifikasi / Halaman Error
      let pageContent = await page.textContent('body');
      if (page.url().includes('verify/traffic') || pageContent?.includes('Terjadi kesalahan') || pageContent?.includes('Oops')) {
        console.log('[Discovery] DETECTED ERROR PAGE. Please solve the captcha or login in the opened browser...');
        try {
          // Tunggu user membantu
          await page.waitForURL(u => u.toString().includes('search') && !u.toString().includes('verify'), { timeout: 300000 });
          console.log('[Discovery] Verification resolved! Continuing...');
        } catch (e) {
          console.warn('[Discovery] Manual intervention timeout. Closing...');
          await context.close();
          return [];
        }
      }

      // Tunggu sampai minimal ada satu produk muncul
      console.log('[Discovery] Waiting for search results to load...');
      try {
        await page.waitForSelector('[data-sqe="item"], .shopee-search-item-result__item', { timeout: 20000 });
      } catch (e) {
        console.warn('[Discovery] Search results timeout. Trying to extract anyway...');
      }

      // Scroll lebih "manusiawi" (bertahap dan acak)
      console.log('[Discovery] Scrolling naturally to avoid bot detection...');
      for (let i = 0; i < 4; i++) {
        const scrollAmount = 600 + Math.floor(Math.random() * 400); // Acak jarak scroll
        await page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
        
        // Jeda acak antara scroll (1-3 detik)
        const delay = 1000 + Math.floor(Math.random() * 2000);
        await page.waitForTimeout(delay);
        
        // Sesekali gerakkan mouse (simulasi manusia melihat-lihat)
        if (i % 2 === 0) {
          await page.mouse.move(200 + Math.random() * 500, 200 + Math.random() * 500);
        }
      }

      // Ambil semua link produk di halaman pencarian (Mata Elang Version 2.0)
      const productLinks = await page.evaluate(() => {
        const links: string[] = [];
        // Cari SEMUA link di halaman
        document.querySelectorAll('a').forEach((a: any) => {
          const href = a.href || '';
          // Pola link Shopee sangat beragam, kita ambil semua yang terlihat seperti produk
          if (href.includes('-i.') || href.includes('/product/') || /\/\d+\/\d+/.test(href)) {
             if (href.includes('shopee.co.id') || href.startsWith('/')) {
                const fullUrl = href.startsWith('/') ? `https://shopee.co.id${href}` : href;
                links.push(fullUrl.split('?')[0]);
             }
          }
        });
        
        return [...new Set(links)]; // Hapus duplikat
      });

      console.log(`[Discovery] Links found by generic scan: ${productLinks.length}`);
      
      // Jika masih 0, kita investigasi kenapa
      if (productLinks.length === 0) {
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log(`[Discovery] NO LINKS FOUND. Page Snippet: "${bodyText.replace(/\n/g, ' ')}"`);
        
        const screenshotPath = path.join(process.cwd(), 'ai-reels-bot', 'data', 'screenshots', `discovery_failed_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`[Discovery] Debug screenshot saved!`);
      }

      await context.close();
      const validLinks = productLinks.filter(l => l.includes('-i.') || l.includes('/product/'));
      console.log(`[Discovery] Validated ${validLinks.length} product links. Limiting to 5 for safety.`);
      return validLinks.slice(0, 5);

    } catch (error) {
      console.error('[Discovery] Error:', error);
      if (context) await context.close();
      return [];
    }
  }

  private static async saveToInventory(url: string, product: ProductData) {
    // Parsing data mentah (misal: "4.8" -> 4.8, "1,2RB Terjual" -> 1200)
    const rating = parseFloat(product.rating.replace(',', '.')) || 0;
    
    let sold = 0;
    if (product.sold.toLowerCase().includes('rb')) {
      sold = parseFloat(product.sold.replace(',', '.').replace(/[^\d.]/g, '')) * 1000;
    } else {
      sold = parseInt(product.sold.replace(/[^\d]/g, '')) || 0;
    }

    const price = parseFloat(product.price.replace(/[^\d]/g, '')) || 0;
    const discount = parseInt(product.discount.replace(/[^\d]/g, '')) || 0;
    const hasVideo = !!product.videoUrl;

    console.log(`[Screener] Cleaned Data: Rating ${rating}, Sold ${sold}, Video: ${hasVideo}`);

    // Simpan ke MySQL via Raw SQL agar tidak tergantung pada prisma generate
    const videoUrl = product.videoUrl || null;
    const imageUrl = product.images[0] || '';
    
    await prisma.$executeRaw`
      INSERT INTO ai_reels_products (
        title, affiliate_url, price, rating, sold, discount, 
        has_video, video_url, image_url, status
      ) 
      VALUES (
        ${product.title}, ${url}, ${price}, ${rating}, ${sold}, ${discount}, 
        ${hasVideo}, ${videoUrl}, ${imageUrl}, 'pending'
      )
      ON DUPLICATE KEY UPDATE 
        title = ${product.title},
        price = ${price},
        rating = ${rating},
        sold = ${sold},
        discount = ${discount},
        has_video = ${hasVideo},
        video_url = ${videoUrl},
        image_url = ${imageUrl},
        status = 'pending'
    `;

    // Ambil data yang baru saja disimpan untuk return (Opsional)
    const saved: any = await prisma.$queryRaw`SELECT * FROM ai_reels_products WHERE affiliate_url = ${url} LIMIT 1`;
    return Array.isArray(saved) ? saved[0] : null;
  }

  static async getPendingInventory() {
    return await prisma.$queryRaw`
      SELECT * FROM ai_reels_products 
      WHERE status = 'pending' 
      AND has_video = 1 
      AND rating >= 4.5 
      AND sold >= 100
      ORDER BY created_at DESC
    `;
  }
}
