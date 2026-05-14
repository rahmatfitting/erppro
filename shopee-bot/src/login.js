const BrowserFactory = require('./utils/browser');
const path = require('path');
const logger = require('./utils/logger');
require('dotenv').config();

const login = async () => {
  const storagePath = path.join(__dirname, '../storage/state.json');
  const { browser, context } = await BrowserFactory.create({ headless: false });
  const page = await context.newPage();

  logger.info('Please login manually in the browser window...');
  await page.goto('https://shopee.co.id/buyer/login');

  // Wait for user to login (manual intervention)
  // We detect login by checking if we are redirected or seeing specific elements
  logger.info('Waiting for you to complete login...');
  
  await page.waitForURL('**/shopee.co.id/**', { timeout: 0 }); 
  
  // Give user time to settle
  await new Promise(r => setTimeout(r, 5000));

  await context.storageState({ path: storagePath });
  logger.info(`Login successful! Session saved to ${storagePath}`);
  
  await browser.close();
};

if (require.main === module) {
  login().catch(err => logger.error(`Login error: ${err.message}`));
}

module.exports = login;
