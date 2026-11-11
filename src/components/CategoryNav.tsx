"use client";

import React from "react";
import {
  Camera,
  Smartphone,
  Laptop,
  Gamepad2,
  Mic2,
  Tent,
  Plane,
  Grid,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

interface CategoryNavProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  activeFilter: string;
  setActiveFilter: (fil: string) => void;
}

export default function CategoryNav({
  selectedCategory,
  setSelectedCategory,
  activeFilter,
  setActiveFilter,
}: CategoryNavProps) {
  const categories = [
    { id: "all", name: "Semua Kategori", icon: Grid, color: "text-[#03AC0E] bg-[#EBF8EE]" },
    { id: "Kamera & Lensa", name: "Kamera & Lensa", icon: Camera, color: "text-blue-600 bg-blue-50" },
    { id: "Gadget & HP", name: "Gadget & HP", icon: Smartphone, color: "text-purple-600 bg-purple-50" },
    { id: "Laptop & PC", name: "Laptop & PC", icon: Laptop, color: "text-emerald-600 bg-emerald-50" },
    { id: "PlayStation & Game", name: "PS5 & Gaming", icon: Gamepad2, color: "text-indigo-600 bg-indigo-50" },
    { id: "Audio & Studio", name: "Audio & Studio", icon: Mic2, color: "text-rose-600 bg-rose-50" },
    { id: "Camping & Outdoor", name: "Outdoor & Tenda", icon: Tent, color: "text-amber-600 bg-amber-50" },
    { id: "Drone & Gimbal", name: "Drone & Gimbal", icon: Plane, color: "text-cyan-600 bg-cyan-50" },
  ];

  const filterTabs = [
    { id: "for_you", label: "Rekomendasi Untuk Anda", isHot: false },
    { id: "rent_to_own", label: "Bisa Sewa-Milik (Rent to Own)", isHot: true },
    { id: "near_unej", label: "Radius Terdekat (< 2 km)", isHot: false },
    { id: "under_100k", label: "Sewa di bawah 100rb/hari", isHot: false },
    { id: "like_new", label: "Second Like New (98%+)", isHot: false },
  ];

  return (
    <div className="space-y-4">
      {/* Category Icons Row */}
      <div className="bg-white rounded-xl p-4 border border-gray-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <span>Kategori Barang Sewa & Beli</span>
            <span className="text-[11px] text-gray-400 font-normal">| Wilayah Terdekat</span>
          </h3>
          <span className="text-xs text-[#03AC0E] font-semibold cursor-pointer hover:underline">
            Lihat Semua Kategori
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.name || (cat.id === "all" && selectedCategory === "all");
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === "all" ? "all" : cat.name)}
                className={`flex flex-col items-center min-w-[85px] sm:min-w-[95px] p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#03AC0E] bg-[#EBF8EE] shadow-xs scale-102"
                    : "border-gray-200/80 bg-white hover:border-[#03AC0E]/50 hover:bg-gray-50/80"
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-1.5 ${cat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11.5px] font-medium text-center line-clamp-1 ${
                    isSelected ? "text-[#03AC0E] font-bold" : "text-gray-700"
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tokopedia Tabs Row (For You / Promo / etc.) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? "bg-[#03AC0E] text-white shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {tab.isHot && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-yellow-300" : "bg-[#03AC0E]"}`} />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

