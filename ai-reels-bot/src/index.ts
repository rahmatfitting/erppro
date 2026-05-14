import { ShopeeScraper } from './scraper/shopee-scraper';
import { AIService } from './ai/ai-service';
import { InstagramUploader } from './uploader/instagram-uploader';
import path from 'path';
import fs from 'fs';

export class AIReelsOrchestrator {
  static async runFullPipeline(shopeeUrl: string) {
    console.log('--- STARTING AI REELS PIPELINE ---');

    try {
      // 1. Scrape Product
      const product = await ShopeeScraper.scrapeProduct(shopeeUrl);
      if (!product) throw new Error('Failed to scrape product');

      // 2. Download Media (Video/Images)
      const videoFilename = `product_${Date.now()}.mp4`;
      if (product.video_url) {
        await ShopeeScraper.downloadAsset(product.video_url, 'videos', videoFilename);
      }

      // 3. Generate AI Script
      const script = await AIService.generateScript(product.title, product.price);
      if (!script) throw new Error('Failed to generate AI script');

      // 4. Generate Voice-Over
      const voiceFilename = `voice_${Date.now()}.mp3`;
      const fullScriptText = `${script.hook}. ${script.body}. ${script.cta}`;
      const voicePath = await AIService.generateVoice(fullScriptText, voiceFilename);

      // 5. Video Assembly (Mock/Remotion)
      console.log('[Video] Assembling Final Reel (Remotion/FFmpeg)...');
      // Di sini kita asumsikan video sudah jadi (final-output.mp4)
      const finalVideoPath = path.join(process.cwd(), 'ai-reels-bot', 'data', 'videos', videoFilename);

      // 6. Upload to Instagram
      console.log('[Uploader] Preparing Instagram upload...');
      const success = await InstagramUploader.uploadReel(finalVideoPath, script.caption);

      return {
        success,
        product,
        script,
        voicePath,
        videoPath: finalVideoPath
      };

    } catch (error) {
      console.error(`[Pipeline] Fatal Error: ${error}`);
      throw error;
    }
  }
}
