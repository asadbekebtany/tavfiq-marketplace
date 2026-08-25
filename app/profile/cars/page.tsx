"use client";

import { useState } from "react";
import { Car, Plus, Trash2 } from "lucide-react";

const MAKES: Record<string, string[]> = {
  Chevrolet: ["Cobalt", "Lacetti", "Nexia 3", "Gentra", "Spark", "Malibu", "Tracker"],
  Toyota: ["Camry", "Corolla", "RAV4", "Land Cruiser", "Prius"],
  Hyundai: ["Sonata", "Elantra", "Tucson", "Santa Fe", "Accent"],
  Kia: ["K5", "Sportage", "Sorento", "Cerato", "Rio"],
  BMW: ["3 Series", "5 Series", "7 Series", "X3", "X5"],
};

type SavedCar = { id: string; make: string; model: string; year: string };

export default function CarsPage() {
  const [cars, setCars] = useState<SavedCar[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ make: "", model: "", year: "" });

  const years = Array.from({ length: 25 }, (_, i) => String(2024 - i));

  const handleAdd = () => {
    if (!form.make || !form.model || !form.year) return;
    setCars([...cars, { id: Date.now().toString(), ...form }]);
    setForm({ make: "", model: "", year: "" });
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Avtomobillarim</h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm font-bold bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] px-4 py-2 rounded-xl hover:from-[#ffc733] hover:to-[#f5b51b] transition-all"
        >
          <Plus size={14} /> Qo'shish
        </button>
      </div>

      {adding && (
        <div className="bg-white rounded-2xl border border-[#004733]/30 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Yangi avtomobil</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <select value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value, model: "" })}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004733]">
              <option value="">Marka</option>
              {Object.keys(MAKES).map((m) => <option key={m}>{m}</option>)}
            </select>
            <select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
              disabled={!form.make}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004733] disabled:opacity-50">
              <option value="">Model</option>
              {(MAKES[form.make] ?? []).map((m) => <option key={m}>{m}</option>)}
            </select>
            <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004733]">
              <option value="">Yil</option>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!form.make || !form.model || !form.year}
              className="px-5 py-2 bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] rounded-xl text-sm font-bold hover:from-[#ffc733] hover:to-[#f5b51b] disabled:opacity-50 transition-all">
              Saqlash
            </button>
            <button onClick={() => setAdding(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Bekor
            </button>
          </div>
        </div>
      )}

      {cars.length === 0 && !adding && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Car size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">Avtomobil qo'shilmagan</p>
          <p className="text-xs text-gray-400">Avtomobilingizni qo'shing va mos ehtiyot qismlarni toping</p>
        </div>
      )}

      <div className="space-y-3">
        {cars.map((car) => (
          <div key={car.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#004733]/10 flex items-center justify-center">
                <Car size={20} className="text-[#004733]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{car.make} {car.model}</p>
                <p className="text-sm text-gray-500">{car.year} yil</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`/catalog?carMake=${car.make}&carModel=${car.model}`}
                className="text-xs px-3 py-1.5 bg-[#004733]/10 text-[#004733] rounded-lg hover:bg-[#004733]/20 transition-colors font-medium">
                Ehtiyot qismlar
              </a>
              <button onClick={() => setCars(cars.filter((c) => c.id !== car.id))}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
