import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

async function recordWaLog(target: string, status: 'SUCCESS' | 'FAILED', pesan: string, response: string, jenis: 'MANUAL' | 'AUTOMATED') {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS mhnotifikasi_wa_log (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATETIME DEFAULT CURRENT_TIMESTAMP,
        target VARCHAR(20),
        status VARCHAR(10),
        pesan TEXT,
        response TEXT,
        jenis VARCHAR(20)
      )
    `);
    await executeQuery(
      `INSERT INTO mhnotifikasi_wa_log (target, status, pesan, response, jenis) VALUES (?, ?, ?, ?, ?)`,
      [target, status, pesan, response, jenis]
    );
  } catch (err) {
    console.error("Failed to record WA log:", err);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isCron = searchParams.get('cron') === 'true';

    // Fetch WA settings
    const settings: any = await executeQuery(`SELECT * FROM mhsetting_notifikasi_wa LIMIT 1`);
    if (!settings || settings.length === 0) {
      return NextResponse.json({ success: false, error: 'Setting WA tidak ditemukan' });
    }

    const { is_enabled, send_time, gateway_url, gateway_token, target_number } = settings[0];

    if (isCron) {
      if (is_enabled !== 1) return NextResponse.json({ success: true, message: 'Cron skipped: Disabled' });
      
      const now = new Date();
      // Adjust to local time (assuming server is GMT+7 based on metadata)
      const localTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); 
      const currentHHi = localTime.toISOString().split('T')[1].substring(0, 5); // "HH:mm"
      const targetHHi = send_time.substring(0, 5);

      if (currentHHi !== targetHHi) {
        return NextResponse.json({ success: true, message: `Cron skipped: Time mismatch (${currentHHi} vs ${targetHHi})` });
      }
    }

    const reportData = await getDailyStats();
    const message = formatMessage(reportData);

    if (isCron) {
      // Actually send if it's cron and time matches
      let resText = "";
      let statusLog: 'SUCCESS' | 'FAILED' = 'FAILED';
      try {
        const response = await fetch(gateway_url, {
          method: 'POST',
          headers: { 'Authorization': `${gateway_token}` },
          body: new URLSearchParams({ 'target': target_number, 'message': message, 'countryCode': '62' })
        });
        const result = await response.json();
        resText = JSON.stringify(result);
        statusLog = result.status ? 'SUCCESS' : 'FAILED';
        // Log result
        recordWaLog(target_number, statusLog, message, resText, 'AUTOMATED');
        return NextResponse.json({ success: true, message: 'Laporan otomatis terkirim', result });
      } catch (err: any) {
        recordWaLog(target_number, 'FAILED', message, err.message, 'AUTOMATED');
        throw err;
      }
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const reportData = await getDailyStats();
    const message = formatMessage(reportData);

    // Fetch WA settings
    const settings: any = await executeQuery(`SELECT * FROM mhsetting_notifikasi_wa LIMIT 1`);
    if (!settings || settings.length === 0 || !settings[0].gateway_token || !settings[0].target_number) {
      throw new Error('Setting WhatsApp belum lengkap (nomor atau token kosong)');
    }

    const { gateway_url, gateway_token, target_number } = settings[0];

    // Send to WA (assuming Fonnte format)
    let resText = "";
    let statusLog: 'SUCCESS' | 'FAILED' = 'FAILED';
    try {
      const response = await fetch(gateway_url, {
        method: 'POST',
        headers: {
          'Authorization': `${gateway_token}`
        },
        body: new URLSearchParams({
          'target': target_number,
          'message': message,
          'countryCode': '62'
        })
      });

      const result = await response.json();
      resText = JSON.stringify(result);
      statusLog = result.status ? 'SUCCESS' : 'FAILED';
      
      // Log it
      recordWaLog(target_number, statusLog, message, resText, 'MANUAL');

      if (!result.status) {
        throw new Error(result.reason || 'Gagal mengirim pesan WhatsApp');
      }

      return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim ke WhatsApp', result });
    } catch (err: any) {
        recordWaLog(target_number, 'FAILED', message, err.message, 'MANUAL');
        throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function getDailyStats() {
  const today = new Date().toISOString().split('T')[0];

  // 1. Total Sales
  const sales: any = await executeQuery(`
    SELECT SUM(total_idr) as total 
    FROM thjualnota 
    WHERE status_aktif = 1 AND DATE(tanggal) = ?
  `, [today]);

  // 2. Items Sold
  const items: any = await executeQuery(`
    SELECT SUM(d.jumlah) as total 
    FROM tdjualnota d
    JOIN thjualnota h ON d.nomorthjualnota = h.nomor
    WHERE h.status_aktif = 1 AND DATE(h.tanggal) = ?
  `, [today]);

  // 3. Low Stock Items dibawah stok minimal
  const lowStock: any = await executeQuery(`
    SELECT b.nama, sum(a.jumlah) as stok 
    FROM rhlaporanstok a
    JOIN mhbarang b ON b.nomor = a.nomormhbarang
    GROUP BY b.nama
    HAVING stok <= 5
  `);

  // 4. Profit
  // Profit = subtotal - (jumlah * HPP/harga_beli)
  const profitRes: any = await executeQuery(`
    SELECT SUM(d.subtotal - (d.jumlah * IFNULL(b.harga_beli, 0))) as total
    FROM tdjualnota d
    JOIN thjualnota h ON d.nomorthjualnota = h.nomor
    LEFT JOIN mhbarang b ON d.kode_barang = b.kode
    WHERE h.status_aktif = 1 AND DATE(h.tanggal) = ?
  `, [today]);

  return {
    date: today,
    totalSales: parseFloat(sales[0]?.total || 0),
    itemsSold: parseInt(items[0]?.total || 0),
    lowStock: lowStock as any[],
    profit: parseFloat(profitRes[0]?.total || 0)
  };
}

function formatMessage(data: any) {
  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const dateStr = new Date(data.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let lowStockText = '';
  if (data.lowStock.length === 0) {
    lowStockText = '- (Tidak ada)';
  } else {
    lowStockText = data.lowStock.map((i: any) => `- ${i.nama}: ${i.stok} pcs`).join('\n');
  }

  return `📊 *Laporan Harian*
Tanggal: ${dateStr}

💰 *Total Penjualan*: ${formatter.format(data.totalSales)}
📦 *Produk Terjual*: ${data.itemsSold} item
📉 *Stok Hampir Habis*:
${lowStockText}

📈 *Profit*: ${formatter.format(data.profit)}`;
}
