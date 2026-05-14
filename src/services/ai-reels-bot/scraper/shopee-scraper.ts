import { chromium, Browser, Page, BrowserContext } from 'playwright';
import fs from 'fs';
import path from 'path';

export interface ProductData {
  title: string;
  price: string;
  discount: string;
  rating: string;
  sold: string;
  videoUrl?: string;
  images: string[];
}

export class ShopeeScraper {
  static async launchBrowser(isMobile: boolean = false) {
    // Persistent context menggabungkan browser dan context
    const userDataDir = path.join(process.cwd(), 'shopee-bot', 'storage', 'chrome-profile');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    
    let executablePath = undefined;
    for (const p of chromePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    console.log(`[Scraper] Launching Persistent Context: ${userDataDir}`);

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      executablePath,
      viewport: isMobile ? { width: 393, height: 852 } : { width: 1366, height: 768 },
      isMobile: isMobile,
      hasTouch: isMobile,
      ignoreDefaultArgs: ['--enable-automation'],
      userAgent: isMobile 
        ? 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36' 
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-web-security'
      ]
    });

    // Stealth: Lebih dalam menyembunyikan bot
    await context.addInitScript(() => {
      // @ts-ignore
      delete navigator.__proto__.webdriver;
      // @ts-ignore
      window.chrome = { runtime: {} };
      // @ts-ignore
      navigator.languages = ['id-ID', 'id', 'en-US', 'en'];
    });

    return context;
  }

  // Kompatibilitas: jika ada yang panggil ini, kita kembalikan context-nya saja
  static async createSessionContext(context: any) {
    return context as BrowserContext;
  }

  static async scrapeProduct(url: string, isMobile: boolean = false): Promise<ProductData | null> {
    const context: BrowserContext = await this.launchBrowser(isMobile);
    const page: Page = await context.newPage();

    try {
      console.log(`[Scraper] Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      
      // Deteksi Verifikasi / Anti-Bot / Redirect ke Home
      const pageTitle = await page.title();
      const pageContentRaw = await page.content();
      const pageBody = await page.textContent('body') || '';
      
      const isGenericTitle = pageTitle === 'Shopee Indonesia | Situs Belanja Online Terlengkap & Terpercaya';
      const hasCaptcha = pageContentRaw.includes('pcmall-captcha') || pageContentRaw.includes('verify/traffic');
      const isErrorPage = pageBody.includes('Terjadi kesalahan') || pageBody.includes('Oops') || pageBody.includes('Silakan coba lagi');

      if (isGenericTitle || hasCaptcha || isErrorPage) {
        console.log('[Scraper] BLOCKED OR CAPTCHA DETECTED! (Title: ' + pageTitle + '). Please solve it manually in the opened browser window...');
        
        try {
          // Wait for the title to change from the generic one, or captcha to disappear
          await page.waitForFunction(() => {
            const titleBlocked = document.title === 'Shopee Indonesia | Situs Belanja Online Terlengkap & Terpercaya';
            const hasCaptchaNode = document.body.innerHTML.includes('pcmall-captcha') || document.body.innerHTML.includes('verify/traffic');
            return !titleBlocked && !hasCaptchaNode;
          }, { timeout: 300000 });
          console.log('[Scraper] Manual fix detected! Re-navigating to ensure fresh data...');
          await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        } catch (e) {
          console.warn('[Scraper] Manual intervention timeout.');
        }
      }

      // Handle Language Selection Modal if it appears
      const langButton = page.locator('button:has-text("Bahasa Indonesia")');
      if (await langButton.isVisible()) {
        console.log('[Scraper] Language modal detected. Clicking Bahasa Indonesia...');
        await langButton.click();
        await page.waitForTimeout(2000); 
      }

      // Check if Login is required
      const loginButton = page.locator('button:has-text("Log In"), .shopee-button-solid--primary');
      if (await loginButton.isVisible() || (await page.title()).includes('Login')) {
        console.log('[Scraper] LOGIN REQUIRED! Please login manually in the opened browser window...');
        // Wait up to 5 minutes for user to login and reach product page
        await page.waitForSelector('div.V77P_V, h1, .product-briefing', { timeout: 300000 });
        console.log('[Scraper] Login detected! Resuming scraping...');
        
        // Shopee often redirects to the homepage after login. Check and re-navigate if needed.
        if (!page.url().includes('-i.') && !page.url().includes('/product/')) {
          console.log('[Scraper] Redirected after login. Re-navigating to product page...');
          await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        }
      }

      // Final wait for product info to load
      try {
        console.log('[Scraper] Waiting for product content to be visible...');
        await page.waitForSelector('div.V77P_V, h1, .product-briefing, [data-testid="product-title"]', { timeout: 30000 });
      } catch (e) {
        console.warn('[Scraper] Title selector timeout. Saving screenshot...');
        const screenshotPath = path.join(process.cwd(), 'ai-reels-bot', 'data', 'screenshots', `error_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        throw e;
      }

      // Auto-scroll to trigger lazy loading of images
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve(true);
            }
          }, 100);
        });
        window.scrollTo(0, 0); // Scroll back to top
      });

      const data = await page.evaluate(() => {
        console.log('--- Evaluate Phase ---');
        // Try multiple selectors for title
        const titleEl = document.querySelector('div.V77P_V, h1, .product-briefing, [data-testid="product-title"]');
        const title = titleEl?.textContent?.trim() || document.title || '';
                     
        const priceEl = document.querySelector('div.pqS769, .price, [data-testid="product-price"]');
        const price = priceEl?.textContent?.trim() || '';
                     
        const discount = document.querySelector('div.vP99n1, .discount-tag')?.textContent?.trim() || '';
        const rating = document.querySelector('div._1k4Z7H, .rating-stars')?.textContent?.trim() || '0';
        const sold = document.querySelector('div.e4r938, .sold-count')?.textContent?.trim() || '0';
        
        // Extract images - PRIORITIZE HERO IMAGE
        const allImages: string[] = [];
        
        // 1. Try to find the HERO IMAGE first (using the specific attributes you provided)
        const heroImg = document.querySelector('img[elementtiming="shopee:heroComponentPaint"], img.uXN1L5, img.fMm3P2');
        if (heroImg && (heroImg as any).src) {
          allImages.push((heroImg as any).src);
          console.log('Hero image found and prioritized!');
        }

        // 2. Add other images from gallery
        const productGallery = document.querySelector('.page-product__content, .product-briefing, .flex.flex-column.items-center');
        if (productGallery) {
          productGallery.querySelectorAll('img').forEach((img: any) => {
            if (img.src && img.src.startsWith('http')) allImages.push(img.src);
          });
        }

        const images = [...new Set(allImages)].filter(src => {
          if (!src || !src.startsWith('http')) return false;
          const isShopee = src.includes('shopee') || src.includes('susercontent');
          const isSmall = src.includes('icon') || src.includes('avatar') || src.includes('logo');
          return isShopee && !isSmall;
        }).map(src => {
          // Optimization: Force high-res for Shopee images (Use JPG for better IG compatibility)
          if (src.includes('susercontent.com') && !src.includes('@resize')) {
            return `${src}@resize_w900_nl.jpg`;
          }
          return src;
        });

        // Look for video element - Shopee use specific classes
        const videoElement = document.querySelector('video.shopee-video-player__video, video source, video');
        const videoUrl = videoElement ? (videoElement as any).src || (videoElement as any).currentSrc : null;

        return { title, price, discount, rating, sold, videoUrl, images };
      });

      console.log(`[Scraper] Successfully extracted data for: ${data.title}`);
      console.log(`[Scraper] ALL DISCOVERED IMAGES:`, data.images);
      console.log(`[Scraper] Found ${data.images.length} images and ${data.videoUrl ? '1 video' : '0 video'}.`);

      const product: ProductData = {
        title: data.title,
        price: data.price,
        discount: data.discount,
        rating: data.rating,
        sold: data.sold,
        videoUrl: data.videoUrl || undefined,
        images: data.images
      };

      await context.close();
      return product;

    } catch (error) {
      console.error(`[Scraper] Error: ${error}`);
      if (context) await context.close();
      return null;
    }
  }

  static async downloadAsset(url: string, folder: string, filename: string): Promise<string | null> {
    try {
      // Deteksi ekstensi dari URL (misal: .webp atau .jpg)
      let ext = '.jpg';
      if (url.includes('.webp')) ext = '.webp';
      else if (url.includes('.png')) ext = '.png';
      else if (url.includes('.mp4')) ext = '.mp4';
      
      const finalFilename = filename.includes('.') ? filename : `${filename}${ext}`;
      const filePath = path.join(process.cwd(), 'ai-reels-bot', 'data', folder, finalFilename);
      
      const storageDir = path.dirname(filePath);
      if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

      console.log(`[Asset] Downloading from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Referer': 'https://shopee.co.id/',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });

      if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);
      console.log(`[Asset] Saved to: ${filePath} (${buffer.length} bytes)`);
      return filePath;
    } catch (error) {
      console.error(`[Asset] Error downloading asset: ${error}`);
      return null;
    }
  }
}
