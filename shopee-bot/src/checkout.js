const products = require('../config/products');
const runWorker = require('./workers/checkout.worker');
const logger = require('./utils/logger');

const main = async () => {
  logger.info('Starting Shopee Auto Checkout Bot...');
  
  if (products.length === 0) {
    logger.warn('No products configured in config/products.js');
    return;
  }

  // Run workers for each product (concurrently)
  const tasks = products.map(product => runWorker(product));
  
  await Promise.all(tasks);
  logger.info('All bot tasks completed.');
};

main().catch(err => logger.error(`MAIN ERROR: ${err.message}`));
