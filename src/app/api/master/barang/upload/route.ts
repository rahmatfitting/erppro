import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Security check: Only allow image types (we expect WebP from our frontend)
    const allowedTypes = ['image/webp', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: "File type not allowed" }, { status: 400 });
    }

    // Size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large (Max 5MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Modern name: timestamp + random
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'barang');
    
    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {}

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({ 
        success: true, 
        url: `/uploads/barang/${filename}` 
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
