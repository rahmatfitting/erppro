import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const query = message.toLowerCase();
    const session = await getSession();

    let response = "Saya mengerti. Bagaimana lagi saya bisa membantu Anda dengan ERP Pro?";

    // 1. Dynamic Stock Query (E.g., "Gula ada berapa?")
    if (query.includes("ada berapa") || query.includes("stok") && !query.includes("lihat")) {
      // Try to extract item name. 
      // Simple logic: remove common trigger words
      const cleaned = query
        .replace("ada berapa", "")
        .replace("stok", "")
        .replace("berapa", "")
        .replace("ya", "")
        .replace("tolong", "")
        .replace("cek", "")
        .replace("?", "")
        .trim();

      if (cleaned && cleaned.length > 1) {
        if (!session || !session.active_perusahaan) {
          response = "Mohon maaf, Anda harus login dan memilih perusahaan terlebih dahulu untuk melihat data stok.";
        } else {
          const { active_perusahaan, active_cabang } = session;
          const today = new Date().toISOString().split('T')[0];

          // 1. First, search for the item in Master Barang
          const itemMasterQuery = `
            SELECT nomor, nama, (SELECT nama FROM mhsatuan WHERE nomor = mhbarang.nomormhsatuan) as satuan
            FROM mhbarang 
            WHERE nama LIKE ? AND status_aktif = 1
            LIMIT 1
          `;
          
          const masterResults: any = await executeQuery(itemMasterQuery, [`%${cleaned}%`]);
          
          if (masterResults && masterResults.length > 0) {
            const item = masterResults[0];
            const today = new Date().toISOString().split('T')[0];

            // 2. Then, calculate stock from Report Stok
            const stockQuery = `
              SELECT SUM(jumlah) as total_stok
              FROM rhlaporanstok 
              WHERE nomormhperusahaan = ? 
                AND nomormhcabang = ?
                AND nomormhbarang = ?
                AND DATE(tanggal) <= ?
            `;
            
            const stockResults: any = await executeQuery(stockQuery, [active_perusahaan, active_cabang, item.nomor, today]);
            const stok = parseFloat(stockResults[0]?.total_stok || 0);
            
            response = `Stok untuk *${item.nama}* per hari ini adalah **${stok.toLocaleString('id-ID')} ${item.satuan || ''}** (All Gudang).`;
          } else {
            response = `Mohon maaf, saya tidak menemukan barang dengan nama "${cleaned}" di Master Data. Pastikan nama barang sudah benar.`;
          }
        }
      }
    } 
    // 2. Intelligent Mock Responses
    else if (query.includes("stok per barang") || (query.includes("stok") && query.includes("hari ini"))) {
      response = "Untuk melihat posisi stok per barang hari ini, silakan buka menu Laporan > Stok dan pilih laporan 'Posisi Stok'. Anda juga bisa memfilter berdasarkan gudang tertentu.";
    } else if (query.includes("stok") || query.includes("barang") || query.includes("inventory")) {
      response = "Anda dapat melihat laporan stok real-time di menu Laporan > Stok. Jika Anda butuh bantuan untuk opname, silakan buka menu Transaksi > Stok > Stok Opname.";
    } else if (query.includes("jual") || query.includes("penjualan") || query.includes("invoice")) {
      response = "Data penjualan hari ini dapat dipantau langsung di Dashboard Utama. Untuk detail per transaksi, silakan cek menu Laporan > Penjualan.";
    } else if (query.includes("proyek") || query.includes("rab")) {
      response = "Modul Manajemen Proyek tersedia untuk memantau timeline dan progress lapangan. Anda bisa membuat RAB baru di menu Proyek & Lapangan > RAB (Anggaran).";
    } else if (query.includes("crypto") || query.includes("bot") || query.includes("fvg")) {
      response = "Master Flow AI sedang aktif memantau market. Anda bisa mengatur strategi trading di menu Market Intelligence > Auto FVG Trading Bot.";
    } else if (query.includes("halo") || query.includes("hi") || query.includes("pagi") || query.includes("siang")) {
      response = "Halo! Senang bertemu Anda. Ada yang bisa saya bantu terkait operasional ERP hari ini?";
    } else if (query.includes("terima kasih") || query.includes("thanks")) {
      response = "Sama-sama! Senang bisa membantu. Klik ikon minus jika Anda ingin menyembunyikan chat ini.";
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
