const BrowserFactory = require('../utils/browser');
const ShopeeService = require('../services/shopee.service');
const Scheduler = require('../scheduler');
const logger = require('../utils/logger');
const takeScreenshot = require('../utils/screenshot');
const path = require('path');
require('dotenv').config();

const runWorker = async (product) => {
  const storagePath = path.join(__dirname, '../../storage/state.json');
  let { browser, context } = await BrowserFactory.create({ 
    headless: process.env.HEADLESS === 'true', 
    storagePath 
  });

  const page = await context.newPage();
  const shopee = new ShopeeService(page);

  try {
    // 1. Prepare: Open product early
    await shopee.openProduct(product.url);
    await shopee.selectVariant(product.variant);

    // 2. Schedule
    await Scheduler.wait(product.checkoutTime);

    // 3. Fast Action
    // Auto refresh 10s before if needed? (handled by scheduler logic if we start early)
    await shopee.refreshPage(); 
    await shopee.selectVariant(product.variant);
    
    if (await shopee.detectSoldOut()) return;

    await shopee.clickBuyNow();
    await shopee.checkout();
    
    // Apply voucher if code is provided
    if (product.voucherCode) {
      await shopee.applyVoucherCode(product.voucherCode);
    }

    await shopee.placeOrder();

    logger.info(`SUCCESS: ${product.name} checked out!`);

  } catch (err) {
    logger.error(`WORKER ERROR for ${product.name}: ${err.message}`);
    await takeScreenshot(page, `error-${product.name}`);
  } finally {
    // Keep browser open for a while to see result if not headless
    if (process.env.HEADLESS !== 'true') {
      await new Promise(r => setTimeout(r, 30000));
    }
    await browser.close();
  }
};

module.exports = runWorker;
