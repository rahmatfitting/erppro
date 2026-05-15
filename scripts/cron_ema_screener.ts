import 'dotenv/config';
import { runScreenerCore, getScreenerResultsFromDB } from '../src/lib/emaEngine';
import { sendTelegramNotification } from '../src/lib/binance';

async function executeCron() {
  console.log(`[${new Date().toISOString()}] Starting CRON: EMA Multi-Timeframe Screener...`);
  try {
    // 1. Get existing Strong Bulls before scan
    const oldResults = await getScreenerResultsFromDB();
    const oldStellarBulls = new Set(oldResults.filter(c => c.status === 'STRONG_BULLISH').map(c => c.symbol));

    // 2. Run the screener for Top 150 coins
    await runScreenerCore(150);
    
    // 3. Fetch new results
    const results = await getScreenerResultsFromDB();
    
    // 4. Filter ONLY NEW coins that achieved 'STRONG_BULLISH'
    const newStellarBulls = results.filter(c => c.status === 'STRONG_BULLISH' && !oldStellarBulls.has(c.symbol));
    
    console.log(`[${new Date().toISOString()}] Screener finished. Found ${newStellarBulls.length} NEW Stellar Bulls.`);

    // 5. Alerting
    if (newStellarBulls.length > 0) {
      const topCoins = newStellarBulls.slice(0, 10); // send max 10 to reduce spam
      let msg = `🟢 *NEW STELLAR BULL ALERT* 🟢\n\n`;
      msg += `The following coins have newly aligned EMA footprints (20>50>100>200) across *H4, 1D*:\n\n`;
      
      topCoins.forEach((c) => {
        msg += `🚀 *${c.symbol}* \n`;
      });
      
      if (newStellarBulls.length > 10) {
        msg += `\n_...and ${newStellarBulls.length - 10} more! Check the Dashboard._`;
      }

      await sendTelegramNotification(msg);
      console.log('Telegram Alert dispatched for new Stellar Bulls!');
    }
  } catch (error) {
    console.error('CRON Execution Failed:', error);
  }
}

executeCron().then(() => {
  console.log('Cron script executed successfully. Exiting.');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
