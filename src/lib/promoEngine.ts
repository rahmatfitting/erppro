/**
 * Promo Engine Core Logic
 */

export interface CartItem {
  nomormhbarang: number;
  kode_barang: string;
  nama_barang: string;
  kategori?: string;
  harga: number;
  jumlah: number;
  diskon_nominal: number;
  subtotal: number;
}

export interface PromoImpact {
  promoId: number;
  promoNama: string;
  promoKode: string;
  totalDiscount: number;
  appliedItems: { kode_barang: string, discount: number }[];
  type: string;
}

export async function calculatePromotions(
  cart: CartItem[], 
  context: { 
    branchId?: number, 
    memberLevel?: string, 
    customerNomor?: number,
    voucherCode?: string 
  },
  dbPool: any // Passing pool to avoid cross-layer imports
) {
  const now = new Date();
  const today = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];
  const currentTime = now.toTimeString().split(' ')[0];

  // 1. Fetch Active Promos
  let query = `
    SELECT p.* 
    FROM mhpromo p
    LEFT JOIN mhpromo_branch pb ON p.nomor = pb.nomormhpromo
    WHERE p.status_aktif = 1
      AND (p.tanggal_mulai <= CURDATE() OR p.tanggal_mulai IS NULL)
      AND (p.tanggal_selesai >= CURDATE() OR p.tanggal_selesai IS NULL)
      AND (p.jam_mulai <= ? AND p.jam_selesai >= ?)
  `;
  const params: any[] = [currentTime, currentTime];

  if (context.branchId) {
    query += ` AND (pb.nomormhcabang = ? OR pb.nomormhcabang IS NULL)`;
    params.push(context.branchId);
  }

  query += ` ORDER BY p.prioritas DESC, p.nomor DESC`;

  const [promos]: any = await dbPool.query(query, params);

  // 2. Fetch Rules (Items, Members)
  const results: PromoImpact[] = [];
  const subtotalItems = cart.reduce((sum, item) => sum + item.subtotal, 0);

  for (const promo of promos) {
    // Check Date & Time (Already done in SQL, but double check days)
    const hariBerlaku = JSON.parse(promo.hari_berlaku || '[]');
    if (hariBerlaku.length > 0 && !hariBerlaku.includes(today)) continue;

    // Check Voucher
    if (promo.metode_aplikasi === 'VOUCHER' && promo.kode_voucher !== context.voucherCode) continue;

    // Check Min Purchase
    if (subtotalItems < parseFloat(promo.min_pembelian || 0)) continue;

    // Check Member Level
    if (promo.target_pengguna === 'MEMBER') {
       const [levels]: any = await dbPool.query(`SELECT level FROM mhpromo_member_level WHERE nomormhpromo = ?`, [promo.nomor]);
       const levelNames = levels.map((l: any) => l.level);
       if (levelNames.length > 0 && !levelNames.includes(context.memberLevel)) continue;
    }

    // Check Target Items
    const [targetItems]: any = await dbPool.query(`SELECT * FROM mhpromo_item WHERE nomormhpromo = ?`, [promo.nomor]);
    
    let promoDiscount = 0;
    const appliedItems: { kode_barang: string, discount: number }[] = [];

    if (promo.jenis_promo === 'PERCENT') {
        const perc = parseFloat(promo.nilai_promo) / 100;
        
        if (targetItems.length === 0) {
            // Global Percent
            promoDiscount = subtotalItems * perc;
            if (promo.max_diskon > 0) promoDiscount = Math.min(promoDiscount, promo.max_diskon);
        } else {
            // Specific Items/Categories Percent
            for (const cartItem of cart) {
                const match = targetItems.find((t: any) => 
                   (t.tipe_target === 'PRODUCT' && t.target_id === cartItem.nomormhbarang.toString()) ||
                   (t.tipe_target === 'CATEGORY' && t.target_id === cartItem.kategori)
                );
                if (match) {
                    const d = cartItem.subtotal * perc;
                    promoDiscount += d;
                    appliedItems.push({ kode_barang: cartItem.kode_barang, discount: d });
                }
            }
        }
    } else if (promo.jenis_promo === 'NOMINAL') {
        if (targetItems.length === 0) {
            promoDiscount = parseFloat(promo.nilai_promo);
        } else {
            // Nominal per targeted item in cart
            for (const cartItem of cart) {
                const match = targetItems.find((t: any) => 
                    (t.tipe_target === 'PRODUCT' && t.target_id === cartItem.nomormhbarang.toString())
                );
                if (match) {
                    const d = parseFloat(promo.nilai_promo) * cartItem.jumlah;
                    promoDiscount += d;
                    appliedItems.push({ kode_barang: cartItem.kode_barang, discount: d });
                }
            }
        }
    } else if (promo.jenis_promo === 'BUY_X_GET_Y') {
        // Simple 2+1 style (X=2, Y=nilai_promo=1)
        // This usually targets specific items
        for (const cartItem of cart) {
            const match = targetItems.find((t: any) => t.tipe_target === 'PRODUCT' && t.target_id === cartItem.nomormhbarang.toString());
            if (match) {
                const x = promo.min_pembelian || 1; // Buy X
                const y = promo.nilai_promo || 1; // Get Y
                const freeCount = Math.floor(cartItem.jumlah / (parseFloat(x.toString()) + parseFloat(y.toString()))) * parseFloat(y.toString());
                if (freeCount > 0) {
                   const d = freeCount * cartItem.harga;
                   promoDiscount += d;
                   appliedItems.push({ kode_barang: cartItem.kode_barang, discount: d });
                }
            }
        }
    }

    if (promoDiscount > 0) {
        results.push({
            promoId: promo.nomor,
            promoNama: promo.nama,
            promoKode: promo.kode,
            totalDiscount: promoDiscount,
            appliedItems,
            type: promo.jenis_promo
        });

        // Stacking Logic
        if (!promo.is_stackable) break; // If current best promo is not stackable, stop.
    }
  }

  return results;
}
