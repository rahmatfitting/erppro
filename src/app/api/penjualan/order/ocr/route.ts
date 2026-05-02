import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import Tesseract from "tesseract.js";

// Helper for fuzzy matching in JS
function calculateSimilarity(str1: string, str2: string) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  if (s1 === s2) return 1.0;
  
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  let matches = 0;
  for (const word of words1) {
    if (words2.includes(word)) matches++;
  }
  
  return matches / Math.max(words1.length, words2.length);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "Tidak ada file yang diupload" }, { status: 400 });
    }

    // Convert file to buffer for Tesseract
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Perform OCR using Tesseract.js (Pure JS)
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    
    if (!text) {
      throw new Error("Gagal mengekstrak teks dari gambar");
    }

    // 2. Parse Text Logic
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedData: any = {
      po_number: "",
      date: new Date().toISOString().split('T')[0],
      items: []
    };

    // Regex patterns
    const poNumRegex = /(PO|Order|No|Nomor)\s*(Number|No)?[:.\s-]+([A-Z0-9/-]+)/i;
    const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}-\d{2}-\d{2})/;

    for (const line of lines) {
      // PO Number
      if (!parsedData.po_number) {
        const poMatch = line.match(poNumRegex);
        if (poMatch) parsedData.po_number = poMatch[3];
      }

      // Date
      const dateMatch = line.match(dateRegex);
      if (dateMatch && parsedData.date === new Date().toISOString().split('T')[0]) {
         // Attempt to normalize date or just use raw
         parsedData.date = dateMatch[0].replace(/\//g, '-');
      }

      // Item detection logic
      // Looking for lines like: [ITEM NAME] [QUANTITY] [PRICE]
      // Pattern: (.+?) (\d+) (PCS|UNIT)? (\d+[.,]\d+)
      const itemMatch = line.match(/(.+?)\s+(\d+)\s*(PCS|UNIT|BOX|KG)?\s*(\d+[.,]\d+)/i);
      if (itemMatch) {
        parsedData.items.push({
          rawName: itemMatch[1].trim(),
          quantity: parseFloat(itemMatch[2]),
          unit: itemMatch[3] || "PCS",
          price: parseFloat(itemMatch[4].replace(',', ''))
        });
      }
    }

    // 3. Match with Master Barang
    const allBarangs: any = await executeQuery("SELECT kode, nama, satuan, harga_jual FROM mhbarang WHERE status_aktif = 1", []);

    const matchedItems = parsedData.items.map((item: any) => {
      let bestMatch = null;
      let highestScore = 0;

      for (const barang of allBarangs) {
        const score = calculateSimilarity(item.rawName, barang.nama);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = barang;
        }
      }

      if (bestMatch && highestScore > 0.4) {
        return {
          kode_barang: bestMatch.kode,
          nama_barang: bestMatch.nama,
          satuan: bestMatch.satuan,
          jumlah: item.quantity,
          harga: item.price || bestMatch.harga_jual || 0,
          diskon_prosentase: 0,
          diskon_nominal: 0,
          netto: item.price || bestMatch.harga_jual || 0,
          subtotal: (item.price || bestMatch.harga_jual || 0) * item.quantity,
          keterangan: `OCR Match (${Math.round(highestScore * 100)}%)`
        };
      }

      return {
        kode_barang: "MANUAL",
        nama_barang: item.rawName,
        satuan: item.unit || "",
        jumlah: item.quantity,
        harga: item.price,
        diskon_prosentase: 0,
        diskon_nominal: 0,
        netto: item.price,
        subtotal: item.price * item.quantity,
        keterangan: "OCR - Manual Entry Required"
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        po_number: parsedData.po_number,
        date: parsedData.date,
        items: matchedItems
      }
    });

  } catch (error: any) {
    console.error("OCR API Error (Node):", error);
    return NextResponse.json({ success: false, error: "Gagal memproses OCR: " + error.message }, { status: 500 });
  }
}
