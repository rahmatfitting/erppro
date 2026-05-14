import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export interface ProductData {
  title: string;
  price: string;
  discount: string;
  rating: string;
  sold: string;
  video_url?: string;
  image_urls: string[];
}

export class ShopeeScraper {
  static async scrapeProduct(url: string): Promise<ProductData | null> {
    const browser: Browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    });
    const page: Page = await context.newPage();

    try {
      console.log(`[Scraper] Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Wait for product info to load
      await page.waitForSelector('div.V77P_V', { timeout: 10000 });

      const data = await page.evaluate(() => {
        const title = document.querySelector('div.V77P_V')?.textContent || '';
        const price = document.querySelector('div.pqS769')?.textContent || '';
        const discount = document.querySelector('div.vP99n1')?.textContent || '';
        const rating = document.querySelector('div._1k4Z7H')?.textContent || '0';
        const sold = document.querySelector('div.e4r938')?.textContent || '0';
        
        // Extract images
        const images = Array.from(document.querySelectorAll('div.V66U_z img'))
          .map((img: any) => img.src)
          .filter(src => src.startsWith('http'));

        // Look for video element
        const videoElement = document.querySelector('video.vjs-tech source');
        const videoUrl = videoElement ? (videoElement as any).src : null;

        return { title, price, discount, rating, sold, videoUrl, images };
      });

      console.log(`[Scraper] Successfully extracted: ${data.title}`);

      const product: ProductData = {
        title: data.title,
        price: data.price,
        discount: data.discount,
        rating: data.rating,
        sold: data.sold,
        video_url: data.videoUrl || undefined,
        image_urls: data.images
      };

      await browser.close();
      return product;

    } catch (error) {
      console.error(`[Scraper] Error: ${error}`);
      await browser.close();
      return null;
    }
  }

  static async downloadAsset(url: string, folder: string, filename: string): Promise<string | null> {
    const filePath = path.join(process.cwd(), 'ai-reels-bot', 'data', folder, filename);
    const writer = fs.createWriteStream(filePath);

    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', (err) => {
          console.error(`[Asset] Download error: ${err}`);
          reject(null);
        });
      });
    } catch (error) {
      console.error(`[Asset] Failed to download: ${url}`);
      return null;
    }
  }
}
