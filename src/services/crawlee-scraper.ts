import { chromium } from 'playwright';

export class CrawleeScraperService {
  static async scrapeGoogleMaps(query: string, location: string, limit: number = 10) {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query + ' in ' + location)}`;
    const results: any[] = [];
    
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
      });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      const page = await context.newPage();

      console.log(`Searching Google Maps: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle' });

      // Wait for results
      await page.waitForSelector('div[role="feed"]', { timeout: 15000 }).catch(() => null);

      // Scroll to load results
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) feed.scrollTop = feed.scrollHeight;
        });
        await page.waitForTimeout(1500);
      }

      // Extract data
      const items = await page.$$eval('div[role="article"]', (elements, limit) => {
        return elements.slice(0, limit).map(el => {
          const name = el.querySelector('h1, h2, .fontHeadlineSmall')?.textContent || '';
          
          // Get Rating & Reviews
          const ratingElement = el.querySelector('span[aria-label*="bintang"]');
          const ratingText = ratingElement?.getAttribute('aria-label') || '';
          const rating = parseFloat(ratingText.split(' ')[0]) || 0;
          
          const reviewsText = el.querySelector('span[aria-label*="ulasan"]')?.textContent || '(0)';
          const reviews = parseInt(reviewsText.replace(/[^0-9]/g, '')) || 0;
          
          // Try to find address and phone via data-item-id
          const address = el.querySelector('button[data-item-id*="address"]')?.textContent?.trim() || '';
          const phone = el.querySelector('button[data-item-id*="phone"]')?.textContent?.trim() || '';
          
          // Find website
          const website = el.querySelector('a[data-item-id*="authority"]')?.getAttribute('href') || null;
          const maps_url = el.querySelector('a')?.getAttribute('href') || '';

          return {
            place_id: `scraped_${Math.random().toString(36).substr(2, 9)}`,
            name,
            category: 'Business',
            city: '',
            rating,
            reviews,
            website,
            phone,
            address,
            maps_url,
          };
        });
      }, limit);

      results.push(...items);
    } catch (error) {
      console.error('Scraping Error:', error);
    } finally {
      if (browser) await browser.close();
    }

    return results;
  }
}
