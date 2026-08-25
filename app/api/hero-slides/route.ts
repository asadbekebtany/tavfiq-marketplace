import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAllSlides,
  getActiveSlides,
  createSlide,
} from "@/lib/hero-slides";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";
  const slides = all ? getAllSlides() : getActiveSlides();
  return NextResponse.json({ slides });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slide = createSlide(body);
    return NextResponse.json({ slide }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
}
