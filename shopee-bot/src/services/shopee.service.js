const logger = require('../utils/logger');
const selectors = require('../../config/selectors');
const retry = require('../utils/retry');
const { randomDelay } = require('../utils/delay');

class ShopeeService {
  constructor(page) {
    this.page = page;
  }

  async openProduct(url) {
    logger.info(`Opening product: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async selectVariant(variantName) {
    if (!variantName) return;
    logger.info(`Selecting variant: ${variantName}`);
    const variants = variantName.split(',').map(v => v.trim());
    
    for (const v of variants) {
      const selector = `button:has-text("${v}")`;
      await this.page.click(selector).catch(() => {
        logger.warn(`Variant "${v}" not found or already selected.`);
      });
      await randomDelay(200, 500);
    }
  }

  async detectSoldOut() {
    const isSoldOut = await this.page.isVisible(selectors.SOLD_OUT_BADGE);
    if (isSoldOut) {
      logger.error('Product is SOLD OUT!');
      return true;
    }
    return false;
  }

  async clickBuyNow() {
    logger.info('Clicking Buy Now...');
    await retry(async () => {
      await this.page.click(selectors.BUTTON_BUY_NOW, { timeout: 2000 });
    }, { name: 'Buy Now Button' });
  }

  async checkout() {
    logger.info('Waiting for Checkout page...');
    await this.page.waitForSelector(selectors.BUTTON_CHECKOUT, { timeout: 10000 });
    await this.page.click(selectors.BUTTON_CHECKOUT);
  }

  async applyVoucherCode(code) {
    if (!code) return;
    try {
      logger.info(`Applying voucher code: ${code}`);
      // Click the voucher selection area
      await this.page.click('div:has-text("Voucher Shopee")').catch(() => null);
      await this.page.waitForSelector('input[placeholder="Masukkan kode voucher"]', { timeout: 5000 });
      
      // Type code
      await this.page.fill('input[placeholder="Masukkan kode voucher"]', code);
      await randomDelay(200, 500);
      
      // Click Apply/Pakai
      await this.page.click('button:has-text("Pakai")');
      await randomDelay(1000, 2000); // Wait for voucher to be applied
      
      // Click OK/Selesai in the modal
      await this.page.click('button:has-text("OK"), button:has-text("Selesai")').catch(() => null);
      logger.info('Voucher code applied successfully!');
    } catch (err) {
      logger.warn(`Could not apply voucher code: ${err.message}`);
    }
  }

  async placeOrder() {
    logger.info('Placing Order...');
    await this.page.waitForSelector(selectors.BUTTON_PLACE_ORDER, { timeout: 10000 });
    await this.page.click(selectors.BUTTON_PLACE_ORDER);
    logger.info('ORDER PLACED SUCCESSFULLY!');
  }

  async detectCaptcha() {
    const hasCaptcha = await this.page.isVisible(selectors.CAPTCHA_CONTAINER);
    if (hasCaptcha) {
      logger.warn('CAPTCHA DETECTED! Manual intervention required.');
      return true;
    }
    return false;
  }

  async refreshPage() {
    logger.info('Refreshing page...');
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }
}

module.exports = ShopeeService;
