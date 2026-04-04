import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const headers = [
      ['Nama Barang', 'Satuan', 'Kategori', 'Harga Beli', 'Harga Jual']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Import_Barang.xlsx"'
      }
    });
  } catch (error: any) {
    console.error("Template download error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
