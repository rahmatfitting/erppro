import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { executeQuery } from '@/lib/db';
import webpush from 'web-push';

export async function GET() {
  try {
    const response = await fetch('https://emasantam.id/', { cache: 'no-store' });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract text values based on widget-harga-emas class or plain parsing
    let priceText = '';
    let prevPriceText = '';
    let diffText = '';

    // Emas 1 gram
    const elements = $('.widget-harga-emas .row .col-md-4');
    if (elements.length >= 3) {
      priceText = $(elements[0]).find('h3').text() || $(elements[0]).text();
      prevPriceText = $(elements[1]).find('h3').text() || $(elements[1]).text();
      diffText = $(elements[2]).find('h3').text() || $(elements[2]).text();
    } else {
      // Fallback parsing strategy as the exact classes might differ
      const plainText = $('body').text();
      const matchHarga = plainText.match(/Harga Emas 1 gram[\s\S]*?Rp\.\s*([\d\.]+)/);
      const matchPrevHarga = plainText.match(/Harga Sebelumnya[\s\S]*?Rp\.\s*([\d\.]+)/);
      const matchDiff = plainText.match(/Perubahan[\s\S]*?Rp\.\s*([\d\.]+)/);
      
      if (matchHarga) priceText = matchHarga[1];
      if (matchPrevHarga) prevPriceText = matchPrevHarga[1];
      if (matchDiff) diffText = matchDiff[1];
    }

    // Clean data
    const parsePrice = (str: string) => {
        const cleaned = str.replace(/[^\d]/g, '');
        return cleaned ? parseFloat(cleaned) : 0;
    };

    const price1g = parsePrice(priceText);
    const prevPrice = parsePrice(prevPriceText);
    const diff = parsePrice(diffText);
    
    // Default fetch_date is today
    const now = new Date();
    const fetchDate = now.toISOString().split('T')[0];

    if (price1g <= 0) {
      return NextResponse.json({ success: false, message: 'Could not extract gold price.' });
    }

    // Check last DB record
    const lastPrices = await executeQuery<any[]>(`
      SELECT * FROM gold_prices ORDER BY id DESC LIMIT 1
    `);

    let didInsert = false;
    let didChangePrice = false;

    if (lastPrices.length === 0) {
      // First insert
      await executeQuery(
        `INSERT INTO gold_prices (fetch_date, price_1g, prev_price, diff) VALUES (?, ?, ?, ?)`,
        [fetchDate, price1g, prevPrice, diff]
      );
      didInsert = true;
    } else {
      const last = lastPrices[0];
      // Check if price changed or date changed
      if (last.price_1g !== price1g) {
          didChangePrice = true;
          // Check if same date
          const dateStr = new Date(last.fetch_date).toISOString().split('T')[0];
          if (dateStr === fetchDate) {
              await executeQuery(
                  `UPDATE gold_prices SET price_1g=?, prev_price=?, diff=? WHERE id=?`,
                  [price1g, prevPrice, diff, last.id]
              );
          } else {
              await executeQuery(
                  `INSERT INTO gold_prices (fetch_date, price_1g, prev_price, diff) VALUES (?, ?, ?, ?)`,
                  [fetchDate, price1g, prevPrice, diff]
              );
              didInsert = true;
          }
      } else {
          // Check if date changed but price is same
          const dateStr = new Date(last.fetch_date).toISOString().split('T')[0];
          if (dateStr !== fetchDate) {
              await executeQuery(
                  `INSERT INTO gold_prices (fetch_date, price_1g, prev_price, diff) VALUES (?, ?, ?, ?)`,
                  [fetchDate, price1g, prevPrice, diff]
              );
              didInsert = true;
          }
      }
    }
    
    // Always insert into history if price or date changed
    if (didChangePrice || didInsert) {
       await executeQuery(
           `INSERT INTO gold_prices_history (fetch_date, price_1g, prev_price, diff) VALUES (?, ?, ?, ?)`,
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
                title: 'Update Harga Emas Antam!',
                body: `Harga baru: Rp. ${price1g.toLocaleString('id-ID')}/gram`,
                icon: '/gold-icon.png',
                url: '/gold-prices'
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
    console.error("Gold scrape Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
