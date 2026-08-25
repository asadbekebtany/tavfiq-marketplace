"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const [form, setForm] = useState({ name: "Demo Foydalanuvchi", phone: "+998 90 123 45 67", email: "" });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Sozlamalar</h1>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Shaxsiy ma'lumotlar</h2>
        <div className="space-y-4">
          {[
            { key: "name", label: "Ism", placeholder: "Ismingiz" },
            { key: "phone", label: "Telefon", placeholder: "+998 XX XXX XX XX" },
            { key: "email", label: "Email", placeholder: "email@example.com" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004733] transition-colors"
              />
            </div>
          ))}
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              saved ? "bg-green-600 text-white" : "bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] hover:from-[#ffc733] hover:to-[#f5b51b]"
            }`}
          >
            {saved ? <><Check size={14} /> Saqlandi!</> : "Saqlash"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Bildirishnomalar</h2>
        {["Buyurtma holati", "Chegirmalar va aksiyalar", "Yangi mahsulotlar"].map((item) => (
          <label key={item} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer">
            <span className="text-sm text-gray-700">{item}</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#004733]" />
          </label>
        ))}
      </div>
    </div>
  );
}
