import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Hero slide data layer.
 *
 * NOTE: This project currently has no connected database (no DATABASE_URL /
 * dormant Prisma datasource) — every feature runs on mock data / file state.
 * To stay consistent with that architecture we persist hero slides in a JSON
 * file on disk. Images are stored as files under /public/uploads and only the
 * URL is saved here (never base64). The matching Prisma `HeroSlide` model is
 * declared in prisma/schema.prisma for when a real DB is wired up.
 */

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  discountText: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HeroSlideInput = Omit<
  HeroSlide,
  "id" | "createdAt" | "updatedAt"
>;

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "hero-slides.json");

const now = () => new Date().toISOString();

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "seed-disklar",
    title: "Alyumin disklar",
    subtitle: "R15 — R20, 500+ model",
    description: "",
    discountText: "-15% chegirma",
    buttonText: "Hozir xarid qilish",
    buttonUrl: "/catalog/disklar",
    imageUrl: "/products/alloy-wheel.png",
    sortOrder: 1,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "seed-shinalar",
    title: "Yozgi shinalar",
    subtitle: "Michelin, Bridgestone, Continental",
    description: "",
    discountText: "-30% chegirma",
    buttonText: "Hozir xarid qilish",
    buttonUrl: "/catalog/shinalar",
    imageUrl: "/products/car-tyre.png",
    sortOrder: 2,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "seed-moylar",
    title: "Original motor moylari",
    subtitle: "Castrol, Shell va Mobil",
    description: "Dvigatelga uzoq muddatli himoya",
    discountText: "-20% chegirma",
    buttonText: "Moylarni tanlash",
    buttonUrl: "/catalog/moylar",
    imageUrl: "/products/motor-oil.png",
    sortOrder: 3,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

function readStore(): HeroSlide[] {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      // Don't write during render; return in-memory defaults. The file is
      // materialized lazily on the first admin mutation.
      return DEFAULT_SLIDES.map((s) => ({ ...s }));
    }
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as HeroSlide[];
    if (!Array.isArray(parsed)) return DEFAULT_SLIDES.map((s) => ({ ...s }));
    return parsed;
  } catch {
    return DEFAULT_SLIDES.map((s) => ({ ...s }));
  }
}

function writeStore(slides: HeroSlide[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(slides, null, 2), "utf-8");
}

function sortSlides(slides: HeroSlide[]): HeroSlide[] {
  return [...slides].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
  );
}

export function getAllSlides(): HeroSlide[] {
  return sortSlides(readStore());
}

export function getActiveSlides(): HeroSlide[] {
  return sortSlides(readStore().filter((s) => s.isActive));
}

export function getSlide(id: string): HeroSlide | undefined {
  return readStore().find((s) => s.id === id);
}

export function createSlide(input: Partial<HeroSlideInput>): HeroSlide {
  const slides = readStore();
  const maxOrder = slides.reduce((m, s) => Math.max(m, s.sortOrder), 0);
  const slide: HeroSlide = {
    id: crypto.randomUUID(),
    title: input.title?.trim() || "Yangi slayd",
    subtitle: input.subtitle ?? "",
    description: input.description ?? "",
    discountText: input.discountText ?? "",
    buttonText: input.buttonText ?? "Hozir xarid qilish",
    buttonUrl: input.buttonUrl ?? "/catalog",
    imageUrl: input.imageUrl ?? "",
    sortOrder:
      typeof input.sortOrder === "number" && !Number.isNaN(input.sortOrder)
        ? input.sortOrder
        : maxOrder + 1,
    isActive: input.isActive ?? true,
    createdAt: now(),
    updatedAt: now(),
  };
  writeStore([...slides, slide]);
  return slide;
}

export function updateSlide(
  id: string,
  input: Partial<HeroSlideInput>
): HeroSlide | undefined {
  const slides = readStore();
  const idx = slides.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  const updated: HeroSlide = {
    ...slides[idx],
    ...input,
    id: slides[idx].id,
    createdAt: slides[idx].createdAt,
    updatedAt: now(),
  };
  slides[idx] = updated;
  writeStore(slides);
  return updated;
}

export function deleteSlide(id: string): boolean {
  const slides = readStore();
  const next = slides.filter((s) => s.id !== id);
  if (next.length === slides.length) return false;
  writeStore(next);
  return true;
}

export function reorderSlides(orderedIds: string[]): HeroSlide[] {
  const slides = readStore();
  const orderMap = new Map(orderedIds.map((id, i) => [id, i + 1]));
  const next = slides.map((s) =>
    orderMap.has(s.id)
      ? { ...s, sortOrder: orderMap.get(s.id)!, updatedAt: now() }
      : s
  );
  writeStore(next);
  return sortSlides(next);
}
