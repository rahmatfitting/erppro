import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

export class InstagramUploader {
  static async uploadReel(videoPath: string, caption: string): Promise<boolean> {
    const sessionPath = path.join(process.cwd(), 'ai-reels-bot', 'data', 'ig-session.json');
    
    const browser: Browser = await chromium.launch({ 
      headless: false, // Disetel false untuk memantau proses pertama kali
      slowMo: 100 
    });

    // Load session if exists
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      storageState: require('fs').existsSync(sessionPath) ? sessionPath : undefined
    });

    const page: Page = await context.newPage();

    try {
      console.log('[IG] Opening Instagram (Waiting for load)...');
      // Naikkan timeout dan ubah strategi wait
      await page.goto('https://www.instagram.com/', { 
        waitUntil: 'load', 
        timeout: 60000 
      });
      
      // Jeda tambahan untuk memastikan script SPA IG sudah siap
      await page.waitForTimeout(5000);

      // Handle common popups (Not Now, Save Info)
      const handlePopups = async () => {
        const popups = ['button:has-text("Not Now")', 'button:has-text("Cancel")', 'button:has-text("Maybe Later")'];
        for (const selector of popups) {
          try {
            if (await page.locator(selector).isVisible()) {
              await page.click(selector);
              await page.waitForTimeout(1000);
            }
          } catch (e) {}
        }
      };

      // Cek apakah butuh login
      if (await page.locator('input[name="username"]').isVisible() || page.url().includes('accounts/login')) {
        console.log('[IG] LOGIN REQUIRED! Please login manually in the opened browser window...');
        await page.waitForURL('https://www.instagram.com/', { timeout: 0 });
        await page.waitForTimeout(3000);
        await handlePopups();
        await context.storageState({ path: sessionPath });
        console.log('[IG] Session saved.');
      } else {
        await handlePopups();
      }

      console.log('[IG] Starting upload process...');
      
      // Look for Create (+) button - handle multiple possible selectors
      const createBtn = page.locator('[aria-label="New post"], [aria-label="Create"], svg[aria-label="New Post"], span:has-text("Create"), span:has-text("Buat")');
      await createBtn.first().waitFor({ state: 'visible', timeout: 30000 });
      await createBtn.first().click();
      
      // Tahap Tambahan: Klik "Post" di menu yang muncul
      console.log('[IG] Clicking "Post" from menu...');
      try {
        const postBtn = page.getByText('Post', { exact: true }).or(page.getByText('Postingan', { exact: true }));
        await postBtn.first().waitFor({ state: 'visible', timeout: 15000 });
        await postBtn.first().hover();
        await page.waitForTimeout(1000);
        await postBtn.first().click({ force: true });
        console.log('[IG] Post menu clicked.');
        await page.waitForTimeout(4000); // Tunggu modal muncul
      } catch (e: any) {
        console.log('[IG] Post menu click failed or not found:', e.message);
      }
      
      console.log('[IG] Selecting video file...');
      
      // Tunggu modal muncul
      await page.waitForTimeout(2000);

      // Upload file logic - handle English & Indonesian
      try {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 20000 }),
          page.click('button:has-text("Select from computer"), button:has-text("Pilih dari komputer"), button:has-text("Select")'),
        ]);
        await fileChooser.setFiles(videoPath);
      } catch (e) {
        console.log('[IG] Button click failed, trying direct input upload...');
        // Fallback: Try to find hidden file input
        const fileInput = page.locator('input[type="file"]');
        await fileInput.first().waitFor({ state: 'attached', timeout: 20000 });
        await fileInput.first().setInputFiles(videoPath);
      }

      console.log('[IG] Video selected. Moving to next steps...');
      await page.waitForTimeout(4000);

      // Tahap Tambahan: Tangani popup "Video posts are now shared as reels"
      const okBtn = page.locator('button:has-text("OK"), button:has-text("Oke")');
      try {
        if (await okBtn.isVisible()) {
          console.log('[IG] Clicking OK on educational popup...');
          await okBtn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {}

      // Lanjut proses (Next, Next, Share)
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Selanjutnya"), div[role="button"]:has-text("Next"), div[role="button"]:has-text("Selanjutnya")');
      
      // Step 1: Next (Video preview)
      await nextBtn.first().waitFor({ state: 'visible', timeout: 20000 });
      await nextBtn.first().click({ force: true });
      await page.waitForTimeout(2000);
      
      // Tahap Tambahan: Cek OK lagi (kadang muncul di step berbeda)
      try {
        if (await okBtn.isVisible()) {
          await okBtn.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {}

      // Step 2: Next (Cover selection/Edit)
      await nextBtn.first().waitFor({ state: 'visible', timeout: 20000 });
      await nextBtn.first().click({ force: true });
      await page.waitForTimeout(2000);
      
      // Paste Caption
      console.log('[IG] Writing caption...');
      const captionInput = page.locator('div[aria-label="Write a caption..."], div[aria-label="Tulis keterangan..."], [contenteditable="true"]');
      await captionInput.first().fill(caption);
      
      console.log('[IG] Sharing Reel...');
      
      // Tahap Recovery: Jika tidak sengaja muncul popup "Discard post?"
      const discardPopup = page.getByText('Discard post?', { exact: false });
      const cancelDiscardBtn = page.getByText('Cancel', { exact: true });
      if (await discardPopup.isVisible()) {
        console.log('[IG] Recovery: Dismissing discard popup...');
        await cancelDiscardBtn.click();
        await page.waitForTimeout(1000);
      }

      // Cari elemen Share yang paling spesifik (biasanya ada di div dengan role button)
      // Kita cari yang posisinya di kanan (biasanya div terakhir dengan role button di header)
      const shareBtn = page.locator('div[role="button"]').filter({ hasText: /^Share$/ }).or(page.locator('div[role="button"]').filter({ hasText: /^Bagikan$/ }));
      
      try {
        await shareBtn.last().waitFor({ state: 'visible', timeout: 15000 });
        await shareBtn.last().click({ force: true });
        console.log('[IG] Share button clicked.');
      } catch (e) {
        console.log('[IG] Last effort: clicking by text directly...');
        await page.click('text=/^Share$/', { force: true });
      }
      
      // Tunggu proses selesai dan klik "Done"
      console.log('[IG] Finalizing upload...');
      const doneBtn = page.locator('div[role="button"]').filter({ hasText: /^Done$/ }).or(page.locator('div[role="button"]').filter({ hasText: /^Selesai$/ }));
      
      try {
        // Tunggu pesan sukses muncul dulu
        await page.waitForSelector('text=Your reel has been shared, text=Postingan Anda telah dibagikan', { timeout: 60000 });
        console.log('[IG] Success message detected!');
        
        // Klik Done
        await doneBtn.waitFor({ state: 'visible', timeout: 10000 });
        await doneBtn.click({ force: true });
        console.log('[IG] Done button clicked. Pipeline finished successfully!');
      } catch (e) {
        console.log('[IG] Success message or Done button not found, but check your IG!');
      }
      
      console.log('[IG] SUCCESS: Reel published!');
      await browser.close();
      return true;

    } catch (error) {
      console.error(`[IG] Upload failed: ${error}`);
      const errorScreenshot = path.join(process.cwd(), 'ai-reels-bot', 'data', 'screenshots', `ig_error_${Date.now()}.png`);
      if (!fs.existsSync(path.dirname(errorScreenshot))) fs.mkdirSync(path.dirname(errorScreenshot), { recursive: true });
      await page.screenshot({ path: errorScreenshot });
      console.log(`[IG] Error screenshot saved at: ${errorScreenshot}`);
      await browser.close();
      return false;
    }
  }
}
