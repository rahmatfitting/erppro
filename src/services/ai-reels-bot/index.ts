import { ShopeeScraper } from './scraper/shopee-scraper';
import { AIService } from './ai/ai-service';
import { InstagramUploader } from './uploader/instagram-uploader';
import path from 'path';
import fs from 'fs';

export class AIReelsOrchestrator {
  static async syncCookies() {
    try {
      const { prisma } = await import('@/lib/prisma');
      // Menggunakan queryRaw agar tidak tergantung pada prisma generate yang mungkin terhambat file lock
      const settings: any = await prisma.$queryRaw`
        SELECT * FROM ai_reels_settings 
        WHERE \`key\` IN ('shopee_cookies', 'instagram_cookies')
      `;

      if (Array.isArray(settings)) {
        for (const setting of settings) {
          let filePath = '';
          if (setting.key === 'shopee_cookies') {
            filePath = path.join(process.cwd(), 'shopee-bot', 'storage', 'state.json');
          } else if (setting.key === 'instagram_cookies') {
            filePath = path.join(process.cwd(), 'ai-reels-bot', 'data', 'ig-session.json');
          }

          if (filePath && setting.value) {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, setting.value);
            console.log(`[Sync] Restored ${setting.key} from database to ${filePath}`);
          }
        }
      }
    } catch (error) {
      console.error('[Sync] Error syncing cookies from database:', error);
    }
  }

  static async runFullPipeline(shopeeUrl: string, generateVoice: boolean = true, isMobile: boolean = false) {
    console.log('--- STARTING AI REELS PIPELINE ---');
    
    // Sinkronisasi cookies dari database sebelum jalan
    await this.syncCookies();

    try {
      // 1. Scrape Product
      const product = await ShopeeScraper.scrapeProduct(shopeeUrl, isMobile);
      if (!product) throw new Error('Failed to scrape product');

      // 2. Download Media (Video/Images)
      const videoFilename = `product_${Date.now()}.mp4`;
      const videoDir = path.join(process.cwd(), 'ai-reels-bot', 'data', 'videos');
      const voiceDir = path.join(process.cwd(), 'ai-reels-bot', 'data', 'processed');
      
      // Pastikan folder ada
      if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });
      if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

      let mediaToUpload: string | null = null;

      if (product.videoUrl) {
        console.log(`[Scraper] Downloading product video...`);
        mediaToUpload = await ShopeeScraper.downloadAsset(product.videoUrl, 'videos', videoFilename);
      } else if (product.images && product.images.length > 0) {
        console.log(`[Scraper] No video found, downloading primary image as fallback...`);
        // Gunakan nama file tanpa ekstensi karena downloadAsset akan menambahkannya
        mediaToUpload = await ShopeeScraper.downloadAsset(product.images[0], 'videos', `product_${Date.now()}`);
      }

      // 3. Generate AI Script
      const script = await AIService.generateScript(product, shopeeUrl);
      if (!script) throw new Error('Failed to generate script');

      // 4. Generate Voice-Over
      let voicePath: string | null = null;
      if (generateVoice) {
        const voiceFilename = `voice_${Date.now()}.mp3`;
        const fullScriptText = script.script;
        voicePath = await AIService.generateVoice(fullScriptText, voiceFilename);
      } else {
        console.log('[AI] Skipping voice generation as requested.');
      }

      // 5. Video Assembly (Mock/Remotion)
      console.log('[Video] Finalizing media assets...');
      
      if (!mediaToUpload || !fs.existsSync(mediaToUpload)) {
        throw new Error('No media assets found to upload');
      }

      // 6. Upload to Instagram
      console.log('[Uploader] Preparing Instagram upload...');
      const success = await InstagramUploader.uploadReel(mediaToUpload, script.caption);

      return {
        success,
        product,
        script,
        voicePath,
        videoPath: mediaToUpload || ''
      };

    } catch (error) {
      console.error(`[Pipeline] Fatal Error: ${error}`);
      throw error;
    }
  }
}
