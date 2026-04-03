import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;
    
    const data: any = await executeQuery(
      `SELECT * FROM mhvaluta WHERE kode = ?`, 
      [id]
    );

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: "Master Valuta tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id; // Existing kode
    const body = await request.json();
    
    const { kode, nama, kurs, keterangan, status_aktif } = body;

    // Cek jika ganti kode, apakah kode bari tsb sudah dipakai valuta lain
    if (kode !== id) {
       const checkKode: any = await executeQuery(
         `SELECT nomor FROM mhvaluta WHERE kode = ?`, 
         [kode]
       );
       if (checkKode.length > 0) {
         return NextResponse.json({ success: false, error: "Kode Valuta sudah digunakan" }, { status: 400 });
       }
    }

    const result: any = await executeQuery(
      `UPDATE mhvaluta SET kode = ?, nama = ?, kurs = ?, keterangan = ?, status_aktif = ? WHERE kode = ?`,
      [kode.toUpperCase(), nama, parseFloat(kurs) || 1, keterangan || '', status_aktif !== undefined ? status_aktif : 1, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Master Valuta tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Valuta berhasil diperbarui" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const params = await context.params;
    const id = params.id;

    const result: any = await executeQuery(
      `UPDATE mhvaluta SET status_aktif = 0 WHERE kode = ?`, 
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Master Valuta tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Valuta berhasil dinonaktifkan" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
