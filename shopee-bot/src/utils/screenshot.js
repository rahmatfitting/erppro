const path = require('path');
const logger = require('./logger');

const takeScreenshot = async (page, name = 'error') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filePath = path.join(__dirname, '../../storage/screenshots', filename);
  
  try {
    await page.screenshot({ path: filePath, fullPage: true });
    logger.info(`Screenshot saved: ${filePath}`);
    return filePath;
  } catch (err) {
    logger.error(`Failed to take screenshot: ${err.message}`);
  }
};

module.exports = takeScreenshot;
