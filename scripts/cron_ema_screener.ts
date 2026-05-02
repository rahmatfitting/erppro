import { runScreenerCore, getScreenerResultsFromDB } from '../src/lib/emaEngine';
import { sendTelegramNotification } from '../src/lib/binance';

async function executeCron() {
  console.log(`[${new Date().toISOString()}] Starting CRON: EMA Multi-Timeframe Screener...`);
  try {
    // 1. Run the screener for Top 150 coins
    await runScreenerCore(150);
    
    // 2. Fetch processed results
    const results = await getScreenerResultsFromDB();
    
    // 3. Filter coins that achieved 'STRONG_BULLISH'
    const stellarBulls = results.filter(c => c.status === 'STRONG_BULLISH');
    
    console.log(`[${new Date().toISOString()}] Screener finished. Found ${stellarBulls.length} Stellar Bulls.`);

    // 4. Alerting
    if (stellarBulls.length > 0) {
      const topCoins = stellarBulls.slice(0, 10); // send max 10 to reduce spam
      let msg = `🟢 *STELLAR BULL ALERT* 🟢\n\n`;
      msg += `The following coins have perfectly aligned EMA footprints (20>50>100>200) across *H4, 1D, 1W, 1M*:\n\n`;
      
      topCoins.forEach((c) => {
        msg += `🚀 *${c.symbol}* \n`;
      });
      
      if (stellarBulls.length > 10) {
        msg += `\n_...and ${stellarBulls.length - 10} more! Check the Dashboard._`;
      }

      await sendTelegramNotification(msg);
      console.log('Telegram Alert dispatched!');
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
