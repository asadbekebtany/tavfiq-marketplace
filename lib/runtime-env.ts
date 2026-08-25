import "server-only";

/** Next.js `process.env.DATABASE_URL` ni build vaqtida bake qilmasligi uchun */
export function getRuntimeDatabaseUrl(): string | undefined {
  const value = process.env["DATABASE" + "_URL"];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
