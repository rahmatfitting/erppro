const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const randomDelay = (min = 500, max = 1500) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return delay(ms);
};

module.exports = { delay, randomDelay };
