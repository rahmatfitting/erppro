const pino = require('pino');
const path = require('path');

const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      options: { destination: 1, colorize: true }
    },
    {
      target: 'pino/file',
      options: { destination: path.join(__dirname, '../../storage/logs/bot.log') }
    }
  ]
});

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: { pid: false },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

module.exports = logger;
