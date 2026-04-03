import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { executeQuery } from '@/lib/db';
import webpush from 'web-push';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
     return new Response('Unauthorized', { status: 401 });
  }

  try {
    const response = await fetch('https://www.logammulia.com/id/sell/gold', { cache: 'no-store' });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract value
    const basePriceInput = $('#valBasePrice');
    const priceValue = basePriceInput.attr('value');
    if (!priceValue) {
      return NextResponse.json({ success: false, message: 'Could not extract buyback price element.' });
    }

    const price1g = parseFloat(priceValue);
    if (isNaN(price1g) || price1g <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid extracted buyback price.' });
    }

    // Extract official "Perubahan" directly from logammulia chart widget
    // Extract official "Perubahan" directly from logammulia chart widget
    const diffText = $('span.title:contains("Perubahan:")').next('.value').find('.text').text();
    let scrapedDiff = 0;
    if (diffText) {
       // Keep digits
       const cleaned = diffText.replace(/[^\d]/g, '');
       scrapedDiff = cleaned ? parseFloat(cleaned) : 0;
    }
    const isUp = $('span.title:contains("Perubahan:")').next('.value').find('.fa-wrapper .fa-caret-up').length > 0;
    const isDown = $('span.title:contains("Perubahan:")').next('.value').find('.fa-wrapper .fa-caret-down').length > 0;

    // Apply sign to diff
    const finalDiff = isDown ? -scrapedDiff : scrapedDiff;

    let computedPrevPrice = price1g;
    if (isUp) computedPrevPrice = price1g - scrapedDiff;
    else if (isDown) computedPrevPrice = price1g + scrapedDiff;

    const now = new Date();
    const fetchDate = now.toISOString().split('T')[0];

    // Check last DB record
    const lastPrices = await executeQuery<any[]>(`
      SELECT * FROM buyback_prices ORDER BY id DESC LIMIT 1
    `);

    let prevPrice = price1g;
    let diff = 0;
    
    let didInsert = false;
    let didChangePrice = false;

    if (lastPrices.length === 0) {
      // First insert
      await executeQuery(
        `INSERT INTO buyback_prices (fetch_date, price_1g, prev_price, diff) VALUES (?, ?, ?, ?)`,
        [fetchDate, price1g, price1g, 0]
      );
      didInsert = true;
    } else {
      const last = lastPrices[0];

      if (last.price_1g !== price1g) {
          didChangePrice = true;
          prevPrice = computedPrevPrice;
          diff = finalDiff;

          // Check if same date
          const dateStr = new Date(last.fetch_date).toISOString().split('T')[0];
          if (dateStr === fetchDate) {
              await executeQuery(
                  `UPDATE buyback_prices SET price_1g=?, prev_price=?, diff=? WHERE id=?`,
                  [price1g, prevPrice, diff, last.id]
              );
          } else {
              await executeQuery(
                  `INSERT INTO buyback_prices (fetch_date, price_1g, prev_price, diff) VALUES (?, ?, ?, ?)`,
                  [fetchDate, price1g, prevPrice, diff]
              );
              didInsert = true;
          }
      } else {
          prevPrice = computedPrevPrice;
          diff = finalDiff;
          // Check if date changed but price is same
          const dateStr = new Date(last.fetch_date).toISOString().split('T')[0];
          if (dateStr !== fetchDate) {
              await executeQuery(
                  `INSERT INTO buyback_prices (fetch_date, price_1g, prev_price, diff) VALUES (?, ?, ?, ?)`,
                  [fetchDate, price1g, prevPrice, diff]
              );
              didInsert = true;
          }
      }
    }

    // Always insert into history if price or date changed
    if (didChangePrice || didInsert) {
       await executeQuery(
           `INSERT INTO buyback_prices_history (fetch_date, price_1g, prev_price, diff) VALUES (?, ?, ?, ?)`,
           [fetchDate, price1g, prevPrice, diff]
       );
    }

    // Send Push Notification if price changed
    if (didChangePrice) {
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          'mailto:admin@example.com',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );

        // Fetch all subscriptions
        const subs = await executeQuery<any[]>(`SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions`);
        
        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.keys_p256dh,
                  auth: sub.keys_auth
                }
              },
              JSON.stringify({
                title: 'Update Harga Buyback Emas!',
                body: `Harga Buyback baru: Rp. ${price1g.toLocaleString('id-ID')}/gram`,
                icon: '/gold-icon.png',
                url: '/gold-buyback'
              })
            );
          } catch (e) {
            console.error("Push Error", e);
          }
        }
      }
    }

    return NextResponse.json({ 
        success: true, 
        data: { price_1g: price1g, prev_price: prevPrice, diff: diff, date: fetchDate },
        action: didChangePrice ? 'price_changed' : (didInsert ? 'new_date' : 'no_change')
    });

  } catch (error: any) {
    console.error("Buyback scrape Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
