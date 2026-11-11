"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, KeyRound, Sparkles, MapPin, ArrowRight } from "lucide-react";

interface BannerSliderProps {
  onOpenPinModal: () => void;
  onOpenCalculator: () => void;
}

export default function BannerSlider({ onOpenPinModal, onOpenCalculator }: BannerSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const banners = [
    {
      id: 1,
      badge: "Inovasi Sewa-ke-Milik Pertama di Jember",
      title: "Coba Dulu Baru Beli! Uang Sewa Langsung Potong Harga",
      desc: "Mau beli kamera atau laptop tapi ragu kualitasnya? Sewa 1-7 hari dulu. Bila cocok dan mau beli permanen, 100% uang sewa otomatis memotong sisa harga!",
      gradient: "from-[#03AC0E] via-[#02980C] to-[#016808]",
      tag: "Rent to Own Hemat",
      actionText: "Coba Hitung Simulasi",
      actionFn: onOpenCalculator,
      icon: Sparkles,
      highlight: "Sisa Bayar = Harga Beli - Total Sewa",
    },
    {
      id: 2,
      badge: "Sistem Keamanan COD Jember",
      title: "Verifikasi PIN Serah-Terima (Anti Penipuan Fisik)",
      desc: "COD langsung di area Sumbersari, Kaliwates, atau Patrang. Cek bodi, shutter, dan sensor sepuasnya. Masukkan 6 digit PIN penjual hanya setelah barang benar-benar diterima!",
      gradient: "from-blue-600 via-indigo-600 to-emerald-700",
      tag: "Sistem PIN Ala Ojol",
      actionText: "Lihat Cara Kerja PIN",
      actionFn: onOpenPinModal,
      icon: KeyRound,
      highlight: "Uang di Rekber, Aman 100%",
    },
    {
      id: 3,
      badge: "Eksklusif Mahasiswa & Kreator Jember",
      title: "Sewa Gear Profesional Tanpa Bikin Kantong Jebol",
      desc: "Sony A7 IV, Canon R6, MacBook Air M2, & Tenda Camping. Tersedia opsi verifikasi KTM UNEJ & POLIJE untuk syarat sewa instan tanpa jaminan berbelit.",
      gradient: "from-emerald-700 via-teal-700 to-green-800",
      tag: "Dukungan Kreator Jember",
      actionText: "Jelajahi Produk",
      actionFn: () => {},
      icon: ShieldCheck,
      highlight: "Bisa COD di Area Kampus",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const slide = banners[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm text-white select-none">
      <div
        className={`bg-gradient-to-r ${slide.gradient} p-6 sm:p-8 md:p-10 transition-all duration-500 min-h-[220px] sm:min-h-[240px] flex flex-col justify-between relative`}
      >
        {/* Background decorative circles */}
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-24 bottom-0 translate-y-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full mb-3 border border-white/20">
            <Icon className="w-3.5 h-3.5 text-yellow-300" />
            <span>{slide.badge}</span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight mb-2">
            {slide.title}
          </h2>

          <p className="text-xs sm:text-sm text-white/90 leading-relaxed mb-5 max-w-xl">
            {slide.desc}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={slide.actionFn}
              className="bg-white text-[#03AC0E] hover:bg-gray-100 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow-md transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>{slide.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium text-emerald-200 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {slide.highlight}
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-xs flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % banners.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-xs flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-3 right-6 flex items-center gap-1.5 z-10">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentSlide ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

