import { NextResponse } from 'next/server';
import { executeQuery, pool } from '@/lib/db';
import { addLogHistory } from '@/lib/history';
import { sendNotification } from '@/lib/notifications';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jenis = searchParams.get('jenis') ?? '1';
    const keyword = searchParams.get('keyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const session = await getSession();
    const active_cabang = session?.active_cabang || 0;
    const active_perusahaan = session?.active_perusahaan || 0;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM thuangkeluar WHERE jenis = ? AND nomormhcabang = ? AND nomormhperusahaan = ?`;
    if (jenis === '1') { query += ` AND status_aktif = 1`; }
    const params: any[] = [jenis, active_cabang, active_perusahaan];
    if (keyword) { query += ` AND (kode LIKE ? OR keterangan LIKE ? OR account_nama LIKE ?)`; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (startDate) { query += ` AND tanggal >= ?`; params.push(startDate); }
    if (endDate) { query += ` AND tanggal <= ?`; params.push(endDate); }
    query += ` ORDER BY tanggal DESC, nomor DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows]: any = await pool.query(query, params);
    const data = rows.map((h: any) => ({
      ...h,
      total: Number(h.total || 0),
      total_idr: Number(h.total_idr || 0),
      kurs: Number(h.kurs || 1)
    }));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const {
      jenis = 1, tanggal, metode, nomormhaccount, account_kode, account_nama,
      nomormhcustomer, nomormhsupplier,
      keterangan, valuta, kurs, total, total_idr,
      items = [],
      selisih = [],
    } = body;

    if (!tanggal || !metode) {
      return NextResponse.json({ success: false, error: 'Tanggal dan metode wajib diisi' }, { status: 400 });
    }

    const session = await getSession();
    const active_cabang = session?.active_cabang || 0;
    const active_perusahaan = session?.active_perusahaan || 0;

    await connection.beginTransaction();

    const dateObj = new Date(tanggal);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const prefix = jenis === 1 ? `UKU-${year}${month}-` : `UKL-${year}${month}-`;

    const [rows]: any = await connection.execute(
      `SELECT kode FROM thuangkeluar WHERE kode LIKE ? AND jenis = ? ORDER BY kode DESC LIMIT 1 FOR UPDATE`,
      [`${prefix}%`, jenis]
    );
    let nextNum = 1;
    if (rows.length > 0) {
      const lastNum = parseInt(rows[0].kode.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const generatedKode = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const [headerResult]: any = await connection.execute(
      `INSERT INTO thuangkeluar 
        (kode, jenis, tanggal, metode, kas, bank, nomormhaccount, account_kode, account_nama, nomormhcustomer, nomormhsupplier, keterangan, valuta, kurs, total, total_idr, nomormhcabang, nomormhperusahaan, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [generatedKode, jenis, tanggal, metode, metode.toLowerCase() === 'kas' ? 1 : 0, metode.toLowerCase() === 'bank' ? 1 : 0, nomormhaccount || 0, account_kode || '', account_nama || '', nomormhcustomer || 0, nomormhsupplier || 0, keterangan || '', valuta || 'IDR', parseFloat(kurs || 1), parseFloat(total || 0), parseFloat(total_idr || (total || 0) * (kurs || 1)), active_cabang, active_perusahaan]
    );
    const headerId = headerResult.insertId;

    for (const item of items) {
      if (jenis == 1) {
        await connection.execute(
          `INSERT INTO tduangkeluar (nomorthuangkeluar, jenis_detail, ref_jenis, ref_kode, ref_nomor, customer_supplier, account_hutang, nominal_transaksi, nominal_transaksi_idr, total_bayar, total_bayar_idr, keterangan, dibuat_pada)
           VALUES (?, 'transaksi', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [headerId, item.ref_jenis || '', item.ref_kode || '', item.ref_nomor || 0, item.customer_supplier || '', item.account_hutang || 'Hutang Usaha', parseFloat(item.nominal_transaksi || 0), parseFloat(item.nominal_transaksi_idr || 0), parseFloat(item.total_bayar || 0), parseFloat(item.total_bayar_idr || 0), item.keterangan || '']
        );
      } else {
        await connection.execute(
          `INSERT INTO tduangkeluar (nomorthuangkeluar, jenis_detail, nomormhaccount, account_kode, account_nama, nominal, total_bayar, total_bayar_idr, keterangan, dibuat_pada)
           VALUES (?, 'lain', ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [headerId, item.nomormhaccount || 0, item.account_kode || '', item.account_nama || '', parseFloat(item.nominal || 0), parseFloat(item.total_bayar || item.nominal || 0), parseFloat(item.total_bayar_idr || item.nominal_idr || 0), item.keterangan || '']
        );
      }
    }

    if (jenis == 1) {
      for (const s of selisih) {
        await connection.execute(
          `INSERT INTO tduangkeluarselisih (nomorthuangkeluar, nomormhaccount, account_kode, account_nama, nominal, keterangan, dibuat_pada)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [headerId, s.nomormhaccount || 0, s.account_kode || '', s.account_nama || '', parseFloat(s.nominal || 0), s.keterangan || '']
        );
      }
    }

    await connection.commit();

    const modulName = jenis == 1 ? 'Uang Keluar Utama' : 'Uang Keluar Lain';
    await addLogHistory(modulName, headerId, "CREATE", body.user || "Admin", `Membuat ${modulName} ${generatedKode}`);
    
    await sendNotification(modulName, `${modulName} Baru: ${generatedKode}`, `Ada pengeluaran ${metode} baru yang perlu diverifikasi.`, generatedKode);

    return NextResponse.json({ success: true, message: `${modulName} berhasil disimpan`, data: { id: headerId, kode: generatedKode } });
  } catch (error: any) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ success: false, error: 'Kode sudah digunakan' }, { status: 400 });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, action, user } = await request.json();
    const [headerRows]: any = await pool.query(`SELECT nomor, kode, jenis FROM thuangkeluar WHERE nomor = ?`, [id]);
    if (headerRows.length === 0) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });
    const { nomor, kode, jenis } = headerRows[0];
    const menuTitle = jenis == 1 ? "Uang Keluar Utama" : "Uang Keluar Lain";

    if (action === 'approve') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [hRows]: any = await conn.execute(`SELECT * FROM thuangkeluar WHERE nomor = ? FOR UPDATE`, [id]);
        const h = hRows[0];

        await conn.execute(`UPDATE thuangkeluar SET status_disetujui = 1, disetujui_oleh = ?, disetujui_pada = NOW() WHERE nomor = ?`, [user || 'Admin', id]);
        
        if (h.jenis == 1) {
          const [details]: any = await conn.execute(`SELECT * FROM tduangkeluar WHERE nomorthuangkeluar = ?`, [id]);
          for (const d of details) {
             if (d.jenis_detail === 'transaksi' && h.nomormhsupplier) {
                await conn.execute(`
                  INSERT INTO rhlaporanhutang (
                    nomormhcabang, nomormhperusahaan, nomormhsupplier, nomormhvaluta, 
                    nomormhtransaksi, jenis, tanggal, transaksi_nomor, transaksi_kode, 
                    transaksi_tanggal, jatuh_tempo, kurs, total, total_idr, keterangan
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  h.nomormhcabang, h.nomormhperusahaan, h.nomormhsupplier, 0,
                  h.nomor, 'UKU', h.tanggal, h.nomor, h.kode,
                  h.tanggal, h.tanggal, h.kurs, -parseFloat(d.total_bayar || 0), -parseFloat(d.total_bayar_idr || 0), 
                  `Pembayaran ke ${d.ref_kode} via ${h.kode}`
                ]);
             }
          }
        }

        await conn.commit();
        await addLogHistory(menuTitle, nomor, "APPROVE", user || "Admin", `Menyetujui ${menuTitle} ${kode}`);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
    if (action === 'disapprove') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(`UPDATE thuangkeluar SET status_disetujui = 0, disetujui_oleh = NULL, disetujui_pada = NULL WHERE nomor = ?`, [id]);
        await conn.execute(`DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND jenis = 'UKU'`, [id]);
        await conn.commit();
        await addLogHistory(menuTitle, nomor, "DISAPPROVE", user || "Admin", `Membatalkan Approval ${menuTitle} ${kode}`);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
    if (action === 'delete') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(`UPDATE thuangkeluar SET status_aktif = 0, dibatalkan_oleh = ?, dibatalkan_pada = NOW() WHERE nomor = ?`, [user || 'Admin', id]);
        await conn.execute(`DELETE FROM rhlaporanhutang WHERE nomormhtransaksi = ? AND jenis = 'UKU'`, [id]);
        await conn.commit();
        await addLogHistory(menuTitle, nomor, "DELETE", user || "Admin", `Membatalkan/Menghapus ${menuTitle} ${kode}`);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const {
      id, jenis, tanggal, metode, nomormhaccount, account_kode, account_nama,
      nomormhcustomer, nomormhsupplier, keterangan, valuta, kurs, total, total_idr,
      items = [], selisih = [], user
    } = body;

    if (!id || !tanggal || !metode) return NextResponse.json({ success: false, error: 'ID, Tanggal, dan metode wajib diisi' }, { status: 400 });

    const session = await getSession();
    const active_cabang = session?.active_cabang || 0;
    const active_perusahaan = session?.active_perusahaan || 0;

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE thuangkeluar SET 
        tanggal = ?, metode = ?, kas = ?, bank = ?, nomormhaccount = ?, account_kode = ?, account_nama = ?, 
        nomormhcustomer = ?, nomormhsupplier = ?, keterangan = ?, valuta = ?, kurs = ?, total = ?, total_idr = ?, 
        nomormhcabang = ?, nomormhperusahaan = ?, diubah_pada = NOW() 
       WHERE nomor = ?`,
      [tanggal, metode, metode.toLowerCase() === 'kas' ? 1 : 0, metode.toLowerCase() === 'bank' ? 1 : 0, nomormhaccount || 0, account_kode || '', account_nama || '', nomormhcustomer || 0, nomormhsupplier || 0, keterangan || '', valuta || 'IDR', parseFloat(kurs || 1), parseFloat(total || 1), parseFloat(total_idr || (total || 0) * (kurs || 1)), active_cabang, active_perusahaan, id]
    );

    await connection.execute(`DELETE FROM tduangkeluar WHERE nomorthuangkeluar = ?`, [id]);
    await connection.execute(`DELETE FROM tduangkeluarselisih WHERE nomorthuangkeluar = ?`, [id]);

    for (const item of items) {
      if (jenis == 1) {
        await connection.execute(
          `INSERT INTO tduangkeluar (nomorthuangkeluar, jenis_detail, ref_jenis, ref_kode, ref_nomor, customer_supplier, account_hutang, nominal_transaksi, nominal_transaksi_idr, total_bayar, total_bayar_idr, keterangan, dibuat_pada)
           VALUES (?, 'transaksi', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [id, item.ref_jenis || '', item.ref_kode || '', item.ref_nomor || 0, item.customer_supplier || '', item.account_hutang || 'Hutang Usaha', parseFloat(item.nominal_transaksi || 0), parseFloat(item.nominal_transaksi_idr || 0), parseFloat(item.total_bayar || 0), parseFloat(item.total_bayar_idr || 0), item.keterangan || '']
        );
      } else {
        await connection.execute(
          `INSERT INTO tduangkeluar (nomorthuangkeluar, jenis_detail, nomormhaccount, account_kode, account_nama, nominal, total_bayar, total_bayar_idr, keterangan, dibuat_pada)
           VALUES (?, 'lain', ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [id, item.nomormhaccount || 0, item.account_kode || '', item.account_nama || '', parseFloat(item.nominal || 0), parseFloat(item.total_bayar || item.nominal || 0), parseFloat(item.total_bayar_idr || item.nominal_idr || 0), item.keterangan || '']
        );
      }
    }

    if (jenis == 1) {
      for (const s of selisih) {
        await connection.execute(
          `INSERT INTO tduangkeluarselisih (nomorthuangkeluar, nomormhaccount, account_kode, account_nama, nominal, keterangan, dibuat_pada)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [id, s.nomormhaccount || 0, s.account_kode || '', s.account_nama || '', parseFloat(s.nominal || 0), s.keterangan || '']
        );
      }
    }

    await connection.commit();
    const menuTitle = jenis == 1 ? "Uang Keluar Utama" : "Uang Keluar Lain";
    await addLogHistory(menuTitle, id, "EDIT", user || "Admin", `Mengubah ${menuTitle} ID:${id}`);

    return NextResponse.json({ success: true, message: 'Data berhasil diperbarui' });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
