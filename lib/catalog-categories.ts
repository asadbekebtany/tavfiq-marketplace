/** Katalog slug → ko‘rinadigan nom */
export const CATEGORY_NAMES: Record<string, string> = {
  shinalar: "Shinalar",
  disklar: "Disklar",
  moylar: "Motor moylari",
  filtrlar: "Filtrlar",
  akkumulyator: "Akkumulyatorlar",
  tormoz: "Tormoz tizimi",
  faralar: "Yoritish",
  kuzov: "Kuzov qismlari",
  salon: "Salon aksessuarlar",
  aksessuarlar: "Aksessuarlar",
  elektronika: "Avtomobil elektronika",
  kimyo: "Avtokimyo",
  asboblar: "Instrumentlar",
  amortizator: "Amortizatorlar",
  svechalar: "Svechalar",
  remenlar: "Remenlar",
  podshipnik: "Podshipniklar",
  radiator: "Radiatorlar",
  yuvish: "Yuvish mahsulotlari",
  "moy-nasos": "Moy nasooslari",
  boshqa: "Boshqa qismlar",
};

/** Header/menu sluglarini seed kategoriyalariga moslashtirish */
export const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  aksessuarlar: "salon",
};

export function resolveCategorySlug(slug: string): string {
  return CATEGORY_SLUG_ALIASES[slug] ?? slug;
}

export function getCategoryLabel(slug: string): string {
  return CATEGORY_NAMES[slug] ?? CATEGORY_NAMES[resolveCategorySlug(slug)] ?? slug;
}
