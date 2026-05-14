const { chromium } = require('playwright');
const path = require('path');
const logger = require('./logger');

class BrowserFactory {
  static async create({ headless = false, storagePath = null } = {}) {
    logger.info('Launching browser...');
    
    const browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const contextOptions = {
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (storagePath) {
      contextOptions.storageState = storagePath;
      logger.info('Using saved session state.');
    }

    const context = await browser.newContext(contextOptions);
    return { browser, context };
  }
}

module.exports = BrowserFactory;
