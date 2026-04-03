import { executeQuery } from './src/lib/db';

async function main() {
  try {
    const id = process.argv[2];
    const headers = await executeQuery(
      `SELECT h.*, v.nama as valuta_nama 
       FROM thbelinota h 
       LEFT JOIN mhvaluta v ON h.nomormhvaluta = v.nomor 
       WHERE h.nomor = ? AND h.jenis = 'FBL'`,
      [id]
    );
    console.log("HEADERS:", JSON.stringify(headers, null, 2));

    const items = await executeQuery(
      `SELECT d.*, b.nama as barang_nama, s.nama as satuan_nama 
       FROM tdbelinota d 
       LEFT JOIN mhbarang b ON d.nomormhbarang = b.nomor 
       LEFT JOIN mhsatuan s ON d.nomormhsatuan = s.nomor 
       WHERE d.nomorthbelinota = ?`,
      [id]
    );
    console.log("ITEMS:", JSON.stringify(items, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

main();
