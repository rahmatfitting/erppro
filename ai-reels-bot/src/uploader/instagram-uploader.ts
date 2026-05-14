import { chromium, Browser, Page } from 'playwright';
import path from 'path';

export class InstagramUploader {
  static async uploadReel(videoPath: string, caption: string): Promise<boolean> {
    const sessionPath = path.join(process.cwd(), 'ai-reels-bot', 'data', 'ig-session.json');
    
    const browser: Browser = await chromium.launch({ 
      headless: false, // Disetel false untuk memantau proses pertama kali
      slowMo: 100 
    });

    // Load session if exists
    const context = await browser.newContext({
      viewport: { width: 400, height: 800 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
      storageState: require('fs').existsSync(sessionPath) ? sessionPath : undefined
    });

    const page: Page = await context.newPage();

    try {
      console.log('[IG] Opening Instagram...');
      await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });

      // Cek apakah butuh login
      if (page.url().includes('accounts/login')) {
        console.log('[IG] Manual login required. Please login in the browser window...');
        await page.waitForURL('https://www.instagram.com/', { timeout: 0 });
        await context.storageState({ path: sessionPath });
        console.log('[IG] Session saved.');
      }

      console.log('[IG] Starting upload process...');
      
      // Klik tombol Create (+) - Selector mungkin berubah, perlu penyesuaian berkala
      await page.click('svg[aria-label="New Post"]');
      
      // Upload file logic
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('button:has-text("Select from computer")'), // Mobile view mungkin berbeda
      ]);
      await fileChooser.setFiles(videoPath);

      // Lanjut proses (Next, Next, Share)
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(2000);
      await page.click('button:has-text("Next")');
      
      // Paste Caption
      await page.fill('div[aria-label="Write a caption..."]', caption);
      
      console.log('[IG] Sharing Reel...');
      await page.click('button:has-text("Share")');
      
      // Tunggu proses selesai
      await page.waitForSelector('text=Your reel has been shared', { timeout: 60000 });
      
      console.log('[IG] SUCCESS: Reel published!');
      await browser.close();
      return true;

    } catch (error) {
      console.error(`[IG] Upload failed: ${error}`);
      await browser.close();
      return false;
    }
  }
}
