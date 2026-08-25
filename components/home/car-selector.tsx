"use client";

import { useState } from "react";
import { Car, Search } from "lucide-react";

const carMakes = [
  "Chevrolet",
  "Toyota",
  "Hyundai",
  "Kia",
  "BMW",
  "Mercedes-Benz",
  "Volkswagen",
  "Honda",
  "Nissan",
  "Daewoo",
];
const carModels: Record<string, string[]> = {
  Chevrolet: ["Cobalt", "Lacetti", "Nexia 3", "Gentra", "Spark", "Damas", "Labo", "Malibu", "Tracker", "Captiva"],
  Toyota: ["Camry", "Corolla", "RAV4", "Land Cruiser", "Prius", "Yaris"],
  Hyundai: ["Sonata", "Elantra", "Tucson", "Santa Fe", "Accent", "Creta"],
  Kia: ["K5", "K7", "Sportage", "Sorento", "Cerato", "Rio"],
  BMW: ["3 Series", "5 Series", "7 Series", "X3", "X5", "X6"],
  "Mercedes-Benz": ["E-Class", "C-Class", "S-Class", "GLE", "GLC"],
  Volkswagen: ["Passat", "Golf", "Tiguan", "Polo", "Jetta"],
  Honda: ["Accord", "Civic", "CR-V", "Pilot", "Jazz"],
  Nissan: ["Almera", "Qashqai", "Juke", "X-Trail", "Patrol"],
  Daewoo: ["Nexia", "Matiz", "Lanos", "Nubira", "Leganza"],
};

export function CarSelector() {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const years = Array.from({ length: 25 }, (_, i) => (2024 - i).toString());

  const handleSearch = () => {
    if (make && model) {
      window.location.href = `/catalog?carMake=${make}&carModel=${model}${year ? `&year=${year}` : ""}`;
    }
  };

  const selectCls =
    "w-full appearance-none rounded-xl border border-[#002d21]/10 bg-white px-3.5 py-3 text-sm font-medium text-[#002d21] outline-none transition focus:border-[#f5b51b] focus:ring-2 focus:ring-[#f5b51b]/25 disabled:opacity-45";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#f5b51b]/25 bg-[#fffdf7] shadow-[0_16px_40px_rgba(0,45,33,0.12)] sm:rounded-[22px]">
      {/* Header strip */}
      <div className="flex items-center gap-3 border-b border-[#f5b51b]/15 bg-gradient-to-r from-[#002d21] to-[#014433] px-4 py-3.5 sm:px-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5b51b]/15 ring-1 ring-[#f5b51b]/30">
          <Car size={20} className="text-[#f5b51b]" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-white sm:text-base">
            Mashinangizga mos qism
          </h3>
          <p className="text-[11px] text-white/60 sm:text-xs">Marka · model · yil</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:gap-3 sm:p-5">
        {/* Mobile: compact 1 col; sm+: still stacked but tighter for side panel */}
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#004733]/70">
            Marka
          </span>
          <select
            value={make}
            onChange={(e) => {
              setMake(e.target.value);
              setModel("");
            }}
            className={selectCls}
          >
            <option value="">Tanlang</option>
            {carMakes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#004733]/70">
            Model
          </span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!make}
            className={selectCls}
          >
            <option value="">Tanlang</option>
            {make &&
              (carModels[make] || []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#004733]/70">
            Yil
          </span>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={!model}
            className={selectCls}
          >
            <option value="">Ixtiyoriy</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleSearch}
          disabled={!make || !model}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5b51b] py-3.5 text-sm font-extrabold text-[#002d21] shadow-[0_8px_20px_rgba(245,181,27,0.3)] transition hover:bg-[#ffc733] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Search size={17} strokeWidth={2.5} />
          Topish
        </button>
      </div>
    </div>
  );
}
