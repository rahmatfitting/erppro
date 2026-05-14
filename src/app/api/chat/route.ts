import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { message, engine, apiKey } = await request.json();
    const query = message.toLowerCase();
    const session = await getSession();

    // ==========================================
    // MODE 1: ChatGPT Engine (OpenAI API + Live DB Context)
    // ==========================================
    if (engine === "chatgpt") {
      if (!apiKey || !apiKey.startsWith("sk-")) {
        return NextResponse.json({ 
          success: false, 
          error: "API Key OpenAI tidak valid atau belum diisi di Pengaturan Chat." 
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const active_perusahaan = session?.active_perusahaan || 0;
      
      // Gather live database schema/metrics context
      const prQuery: any = await executeQuery(`SELECT COUNT(*) as total, SUM(CASE WHEN status_disetujui = 0 THEN 1 ELSE 0 END) as pending FROM thbelipermintaan WHERE status_aktif = 1 AND DATE(tanggal) = ?`, [today]);
      const poQuery: any = await executeQuery(`SELECT COUNT(*) as total FROM thbeliorder WHERE status_aktif = 1 AND DATE(tanggal) = ?`, [today]);
      const pbQuery: any = await executeQuery(`SELECT COUNT(*) as total FROM thbelipenerimaan WHERE status_aktif = 1 AND DATE(tanggal) = ?`, [today]);
      const notaQuery: any = await executeQuery(`SELECT COUNT(*) as total, SUM(total_idr) as nominal FROM thbelinota WHERE status_aktif = 1 AND DATE(tanggal) = ?`, [today]);

      let dbContext = `KONTEKS TRANSAKSI ERP HARI INI (${today}):\n`;
      dbContext += `- Permintaan Pembelian (PR): ${prQuery[0]?.total || 0} dibuat, ${prQuery[0]?.pending || 0} menunggu persetujuan.\n`;
      dbContext += `- Order Pembelian (PO): ${poQuery[0]?.total || 0} PO diterbitkan.\n`;
      dbContext += `- Penerimaan Barang (PB): ${pbQuery[0]?.total || 0} PB diterima di gudang.\n`;
      dbContext += `- Nota Tagihan Pembelian: ${notaQuery[0]?.total || 0} nota terdaftar dengan total nilai Rp ${(parseFloat(notaQuery[0]?.nominal || 0)).toLocaleString('id-ID')}.\n`;

      // Top 5 Supplier Hutang Outstanding
      const hutangQuery: any = await executeQuery(`
        SELECT s.nama, SUM(h.total_idr) as total_hutang 
        FROM rhlaporanhutang h 
        JOIN mhsupplier s ON h.nomormhsupplier = s.nomor 
        WHERE h.nomormhperusahaan = ? 
        GROUP BY s.nama 
        HAVING total_hutang > 0 
        ORDER BY total_hutang DESC 
        LIMIT 5
      `, [active_perusahaan]);

      if (hutangQuery?.length > 0) {
        dbContext += `\nSTATUS HUTANG SUPPLIER TERBESAR (OUTSTANDING):\n`;
        for (const sup of hutangQuery) {
          dbContext += `- ${sup.nama}: Total sisa hutang Rp ${(parseFloat(sup.total_hutang || 0)).toLocaleString('id-ID')}.\n`;
        }
      }

      // Today's Nota Beli Suppliers
      const notaSuppliers: any = await executeQuery(`
        SELECT supplier, COUNT(*) as total_nota, SUM(total_idr) as nominal 
        FROM thbelinota 
        WHERE status_aktif = 1 AND DATE(tanggal) = ? AND nomormhperusahaan = ?
        GROUP BY supplier
      `, [today, active_perusahaan]);

      if (notaSuppliers?.length > 0) {
        dbContext += `\nSUPPLIER NOTA BELI HARI INI:\n`;
        for (const ns of notaSuppliers) {
          dbContext += `- ${ns.supplier || 'Tanpa Nama'}: ${ns.total_nota} nota, senilai Rp ${(parseFloat(ns.nominal || 0)).toLocaleString('id-ID')}.\n`;
        }
      }

      // Check if user is asking about stock or specific items
      const words = query.replace(/(stok|ada berapa|barang|cek|tolong|berapa|status|pr|po|pb|nota)/gi, "").trim().split(" ");
      const keywordTerm = words.find((w: string) => w.length > 2);
      if (keywordTerm) {
        const itemSearch: any = await executeQuery(`SELECT nomor, nama FROM mhbarang WHERE nama LIKE ? AND status_aktif = 1 LIMIT 5`, [`%${keywordTerm}%`]);
        if (itemSearch?.length > 0) {
          dbContext += `\nINFO STOK BARANG TERKAIT PENCARIAN "${keywordTerm}":\n`;
          for (const item of itemSearch) {
            const st: any = await executeQuery(`SELECT SUM(jumlah) as qty FROM rhlaporanstok WHERE nomormhbarang = ?`, [item.nomor]);
            dbContext += `- ${item.nama}: Total sisa stok ${st[0]?.qty || 0} satuan.\n`;
          }
        }

        // Also check if they are looking for specific PR
        const prSearch: any = await executeQuery(`SELECT kode, status_disetujui, status_aktif FROM thbelipermintaan WHERE kode LIKE ? LIMIT 3`, [`%${keywordTerm}%`]);
        if (prSearch?.length > 0) {
          dbContext += `\nSTATUS PR TERKAIT PENCARIAN:\n`;
          for (const pr of prSearch) {
            const statStr = pr.status_aktif === 0 ? "Dibatalkan/Ditolak" : (pr.status_disetujui === 1 ? "Sudah Disetujui" : "Masih Pending");
            dbContext += `- Dokumen ${pr.kode}: ${statStr}.\n`;
          }
        }
      }

      const systemPrompt = `Anda adalah ERP AI Assistant yang ramah, canggih, dan profesional dalam sistem ERP Pro.
Tugas Anda adalah merespon pertanyaan pengguna berdasarkan live context database yang disuntikkan secara otomatis di bawah ini.
Gunakan acuan data berikut untuk menjawab secara akurat dan lugas. Format output menggunakan Markdown yang mudah dibaca.

${dbContext}`;

      const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        })
      });

      const openAiData = await openAiRes.json();
      if (openAiData.error) {
        return NextResponse.json({ success: false, error: `OpenAI API Error: ${openAiData.error.message}` });
      }

      const chatGptResponse = openAiData.choices?.[0]?.message?.content || "Tidak ada respon dari ChatGPT.";
      return NextResponse.json({ success: true, response: chatGptResponse });
    }

    // ==========================================
    // MODE 2: Program Langsung (Native Logic)
    // ==========================================

    let response = "Saya mengerti. Bagaimana lagi saya bisa membantu Anda dengan ERP Pro?";

    // 0. Pertanyaan Stok Kritis (Didahulukan agar tidak salah deteksi sebagai nama barang)
    if (query.includes("mau habis") || query.includes("hampir habis") || query.includes("kebutuhan") || query.includes("harus dibeli") || query.includes("minimal stok otomatis")) {
      response = "Untuk melihat daftar barang yang harus segera dibeli atau hampir habis, Anda bisa menggunakan menu **Laporan > Stok > Stok Kritis**. Sistem akan otomatis menampilkan barang yang jumlahnya di bawah batas minimal (Safety Stock).";
    }
    // 1. Dynamic Stock Query (E.g., "Gula ada berapa?")
    else if (query.includes("ada berapa") || (query.includes("stok") && !query.includes("lihat") && !query.includes("opname"))) {
      // Try to extract item name. 
      // Simple logic: remove common trigger words
      const cleaned = query
        .replace(/\bada berapa\b/g, "")
        .replace(/\bstok\b/g, "")
        .replace(/\bberapa\b/g, "")
        .replace(/\bya\b/g, "")
        .replace(/\btolong\b/g, "")
        .replace(/\bcek\b/g, "")
        .replace(/\?/g, "")
        .trim()
        .replace(/\s+/g, " ");

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
    // 2. Pembelian (Purchasing Module)
    else if (query.includes("permintaan") || query.includes("order") || query.includes("po") || query.includes("penerimaan") || query.includes("nota") || query.includes("beli") || query.includes("tagihan") || query.includes("pembelian") || query.includes("supplier") || query.includes("hutang")) {
      if (!session || !session.active_perusahaan) {
        response = "Mohon maaf, Anda harus login dan memilih perusahaan terlebih dahulu untuk melihat data pembelian.";
      } else {
        const { active_perusahaan, active_cabang } = session;
        const today = new Date().toISOString().split('T')[0];
        
        // 2.1 Tracking Status PR (Specific)
        const prMatch = query.match(/pr-\d{6}-\d{3}/i);
        if (prMatch && (query.includes("status") || query.includes("ditolak") || query.includes("approve") || query.includes("apa"))) {
          const prCode = prMatch[0].toUpperCase();
          const prRes: any = await executeQuery(`SELECT status_disetujui, status_aktif FROM thbelipermintaan WHERE kode = ? AND nomormhperusahaan = ?`, [prCode, active_perusahaan]);
          if (prRes.length > 0) {
             if (prRes[0].status_aktif === 0) response = `Permintaan Pembelian **${prCode}** saat ini berstatus **Dibatalkan/Ditolak**.`;
             else if (prRes[0].status_disetujui === 1) response = `Permintaan Pembelian **${prCode}** **sudah disetujui** dan siap diproses menjadi Order Pembelian (PO).`;
             else response = `Permintaan Pembelian **${prCode}** saat ini **masih Pending** (menunggu persetujuan dari atasan/approver).`;
          } else {
             response = `Maaf, saya tidak menemukan Permintaan Pembelian dengan nomor **${prCode}**.`;
          }
        }
        // 2.2 Daftar PR Pending
        else if ((query.includes("pending") || query.includes("belum diproses") || query.includes("belum approve")) && (query.includes("pr") || query.includes("permintaan"))) {
          const prPendingRes: any = await executeQuery(`SELECT kode, tanggal, divisi FROM thbelipermintaan WHERE status_disetujui = 0 AND status_aktif = 1 AND nomormhperusahaan = ? AND nomormhcabang = ? ORDER BY tanggal DESC LIMIT 5`, [active_perusahaan, active_cabang]);
          if (prPendingRes.length > 0) {
            const list = prPendingRes.map((p: any) => `- **${p.kode}** (${p.divisi || 'Umum'})`).join("\\n");
            response = `Terdapat **${prPendingRes.length} PR terbaru** yang masih pending dan menunggu persetujuan:\\n${list}\\n\\nSilakan cek menu *Pembelian > Permintaan Pembelian* untuk memprosesnya.`;
          } else {
            response = `Saat ini tidak ada Permintaan Pembelian (PR) yang pending. Semua sudah diproses!`;
          }
        }
        // 2.3 Cara / Bantuan Pembuatan PR
        else if (query.includes("cara") && (query.includes("buat") || query.includes("tambah")) && (query.includes("pr") || query.includes("permintaan"))) {
          response = "Untuk membuat Permintaan Pembelian (PR), buka menu **Pembelian > Permintaan Pembelian**, lalu klik tombol **+ Buat Permintaan**. Isi departemen/divisi, tambahkan rincian barang yang dibutuhkan beserta jumlahnya, lalu klik Simpan.";
        }
        else if ((query.includes("edit") || query.includes("batal")) && (query.includes("pr") || query.includes("permintaan"))) {
          response = "Permintaan Pembelian (PR) yang statusnya masih 'Pending' bisa Anda edit atau batalkan. Namun, jika PR sudah disetujui atau sudah ditarik menjadi Order Pembelian (PO), Anda harus membatalkan persetujuan atau menghapus PO-nya terlebih dahulu.";
        }
        // 2.4 Info Approval
        else if (query.includes("approver") || query.includes("limit approval") || query.includes("siapa yang belum approve") || query.includes("approval tidak jalan")) {
          response = "Persetujuan (approval) PR diatur berdasarkan struktur organisasi atau hak akses user. User dengan wewenang 'Manager' atau 'Supervisor' di cabang yang sama biasanya dapat menyetujui PR secara langsung di sistem atau melalui perangkat mobile.";
        }
        // 2.5 Informasi Supplier & Hutang
        else if (query.includes("supplier") || query.includes("hutang")) {
          // Get Top 3 suppliers with outstanding debt
          const topHutang: any = await executeQuery(`
            SELECT s.nama, SUM(h.total_idr) as total_hutang 
            FROM rhlaporanhutang h 
            JOIN mhsupplier s ON h.nomormhsupplier = s.nomor 
            WHERE h.nomormhperusahaan = ? 
            GROUP BY s.nama 
            HAVING total_hutang > 0 
            ORDER BY total_hutang DESC 
            LIMIT 3
          `, [active_perusahaan]);

          // Get Nota Beli for today grouped by supplier
          const notaToday: any = await executeQuery(`
            SELECT supplier, COUNT(*) as total_nota, SUM(total_idr) as nominal 
            FROM thbelinota 
            WHERE status_aktif = 1 AND DATE(tanggal) = ? AND nomormhperusahaan = ?
            GROUP BY supplier
          `, [today, active_perusahaan]);

          let respText = "";
          if (topHutang?.length > 0) {
            const listHutang = topHutang.map((s: any) => `- **${s.nama}**: Rp ${(parseFloat(s.total_hutang || 0)).toLocaleString('id-ID')}`).join("\\n");
            respText += `📊 **Top Sisa Hutang Supplier (Outstanding):**\\n${listHutang}\\n\\n`;
          } else {
            respText += `✨ Saat ini tidak ada catatan sisa hutang ke supplier.\\n\\n`;
          }

          if (notaToday?.length > 0) {
            const listNota = notaToday.map((n: any) => `- **${n.supplier || 'Umum'}**: ${n.total_nota} nota (Rp ${(parseFloat(n.nominal || 0)).toLocaleString('id-ID')})`).join("\\n");
            respText += `🧾 **Nota Pembelian Hari Ini dari Supplier:**\\n${listNota}`;
          } else {
            respText += `Belum ada Nota Pembelian yang terdaftar dari supplier untuk hari ini.`;
          }

          response = respText.trim();
        }
        // 2.6 Default: Ringkasan Hari Ini bergaya ChatGPT (Komprehensif)
        else {
          const prQuery: any = await executeQuery(`SELECT COUNT(*) as total, SUM(CASE WHEN status_disetujui = 0 THEN 1 ELSE 0 END) as pending FROM thbelipermintaan WHERE nomormhperusahaan = ? AND nomormhcabang = ? AND status_aktif = 1 AND DATE(tanggal) = ?`, [active_perusahaan, active_cabang, today]);
          const poQuery: any = await executeQuery(`SELECT COUNT(*) as total FROM thbeliorder WHERE (nomormhperusahaan = ? OR nomormhperusahaan = 0 OR nomormhperusahaan IS NULL) AND (nomormhcabang = ? OR nomormhcabang = 0 OR nomormhcabang IS NULL) AND status_aktif = 1 AND DATE(tanggal) = ?`, [active_perusahaan, active_cabang, today]);
          const pbQuery: any = await executeQuery(`SELECT COUNT(*) as total FROM thbelipenerimaan WHERE (nomormhperusahaan = ? OR nomormhperusahaan = 0 OR nomormhperusahaan IS NULL) AND (nomormhcabang = ? OR nomormhcabang = 0 OR nomormhcabang IS NULL) AND status_aktif = 1 AND DATE(tanggal) = ?`, [active_perusahaan, active_cabang, today]);
          const notaQuery: any = await executeQuery(`SELECT COUNT(*) as total, SUM(total_idr) as nominal FROM thbelinota WHERE nomormhperusahaan = ? AND nomormhcabang = ? AND status_aktif = 1 AND DATE(tanggal) = ?`, [active_perusahaan, active_cabang, today]);

          const prTotal = prQuery[0]?.total || 0;
          const prPending = prQuery[0]?.pending || 0;
          const poTotal = poQuery[0]?.total || 0;
          const pbTotal = pbQuery[0]?.total || 0;
          const notaTotal = notaQuery[0]?.total || 0;
          const notaNominal = parseFloat(notaQuery[0]?.nominal || 0);

          // Get Top 3 Outstanding Supplier Debts
          const topHutang: any = await executeQuery(`
            SELECT s.nama, SUM(h.total_idr) as total_hutang 
            FROM rhlaporanhutang h 
            JOIN mhsupplier s ON h.nomormhsupplier = s.nomor 
            WHERE h.nomormhperusahaan = ? 
            GROUP BY s.nama 
            HAVING total_hutang > 0 
            ORDER BY total_hutang DESC 
            LIMIT 3
          `, [active_perusahaan]);

          let respText = `✨ **Ringkasan Aktivitas Pembelian Hari Ini (${today}):**\\n\\n`;
          respText += `📝 **Permintaan Pembelian (PR):** ${prTotal} dokumen dibuat (${prPending} menunggu persetujuan).\\n`;
          respText += `🛒 **Order Pembelian (PO):** ${poTotal} pesanan diterbitkan ke supplier.\\n`;
          respText += `📦 **Penerimaan Barang (PB):** ${pbTotal} pengiriman telah diterima di gudang.\\n`;
          respText += `🧾 **Nota Tagihan:** ${notaTotal} faktur terdaftar senilai **Rp ${notaNominal.toLocaleString('id-ID')}**.\\n\\n`;

          if (topHutang?.length > 0) {
            respText += `📊 **Top Sisa Hutang Supplier (Outstanding):**\\n`;
            for (const s of topHutang) {
              respText += `- **${s.nama}**: Rp ${(parseFloat(s.total_hutang || 0)).toLocaleString('id-ID')}\\n`;
            }
          } else {
            respText += `💡 *Kondisi keuangan sehat: Tidak ada catatan sisa hutang berjalan ke supplier.*`;
          }

          response = respText.trim();
        }
      }
    }
    // 3. Intelligent Mock Responses
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
