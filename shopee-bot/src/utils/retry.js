const logger = require('./logger');

const retry = async (fn, { retries = 3, delay = 1000, name = 'Action' } = {}) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`${name} failed (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

module.exports = retry;
