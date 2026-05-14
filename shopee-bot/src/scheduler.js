const dayjs = require('dayjs');
const logger = require('./utils/logger');

class Scheduler {
  static async wait(targetTimeStr) {
    const target = dayjs(targetTimeStr);
    logger.info(`Scheduling task for: ${target.format('YYYY-MM-DD HH:mm:ss.SSS')}`);

    return new Promise((resolve) => {
      const timer = setInterval(() => {
        const now = dayjs();
        const diff = target.diff(now);

        if (diff <= 0) {
          clearInterval(timer);
          logger.info('TARGET TIME REACHED! EXECUTING...');
          resolve();
        } else {
          // Print countdown every second or every 100ms if close
          if (diff < 5000 || diff % 1000 < 100) {
            process.stdout.write(`\rCountdown: ${(diff / 1000).toFixed(3)}s    `);
          }
        }
      }, 50);
    });
  }
}

module.exports = Scheduler;
