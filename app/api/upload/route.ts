import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
    }

    const ext = ALLOWED.get(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Faqat JPG, PNG yoki WebP formatlari qabul qilinadi" },
        { status: 415 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Rasm hajmi 5 MB dan oshmasligi kerak" },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", "hero");
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    await fs.writeFile(path.join(uploadDir, filename), bytes);

    return NextResponse.json({ url: `/uploads/hero/${filename}` });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Rasmni yuklashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
