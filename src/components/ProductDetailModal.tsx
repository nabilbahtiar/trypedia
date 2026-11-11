"use client";

import React, { useState } from "react";
import {
  X,
  Star,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  KeyRound,
  MessageSquare,
  Heart,
  ChevronRight,
  Info,
  Calendar,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Product } from "@/data/products";

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenPinModal: () => void;
  onAddToCart: (p: Product, mode: "rent" | "buy", days: number) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onOpenPinModal,
  onAddToCart,
}: ProductDetailModalProps) {
  if (!product) return null;

  const [activeTab, setActiveTab] = useState<"rent" | "buy">("rent");
  const [rentDuration, setRentDuration] = useState<number>(3); // default 3 days
  const [isWishlisted, setIsWishlisted] = useState(false);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalRentCost = product.rentPriceDaily * rentDuration;
  const remainingBuyPrice = Math.max(0, product.buyPrice - totalRentCost);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 my-auto">
        {/* Top Header Modal */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-[#F5F7FA]">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-semibold text-gray-800">Detail Produk & Skema Sewa ke Beli</span>
            <span>•</span>
            <span className="text-[#03AC0E] font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              COD Wilayah Jember
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-130px)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Photos & Trust Badges (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5">
                  <span className="bg-[#03AC0E] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                    {product.condition}
                  </span>
                </div>
              </div>

              {/* Rekber Escrow Jember Info Card */}
              <div className="bg-[#EBF8EE] border border-[#03AC0E]/30 rounded-xl p-3.5 text-xs text-gray-700">
                <div className="flex items-center gap-2 text-[#03AC0E] font-bold mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Jaminan Rekber TryPedia Jember</span>
                </div>
                <p className="text-[11.5px] text-gray-600 leading-relaxed">
                  Uang sewa & deposit Anda aman tertahan di rekening bersama. Dana diteruskan ke seller hanya setelah Anda inspeksi fisik dan menginput <strong>PIN Verifikasi Serah-Terima</strong> saat COD di Jember.
                </p>
              </div>

              {/* Shutter count & check details */}
              {product.shutterCount && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="font-semibold text-gray-800">Status Fisik & Fungsi:</div>
                  <div className="text-gray-600 text-[11.5px]">• Shutter Count: {product.shutterCount}</div>
                  <div className="text-gray-600 text-[11.5px]">• Sensor Bersih: Bebas jamur, debu, atau dead pixel</div>
                  <div className="text-gray-600 text-[11.5px]">• Port & Tombol: 100% responsif & empuk</div>
                </div>
              )}
            </div>

            {/* Middle Column: Details & Rent-to-Own Explanation (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                    OFFICIAL PARTNER SELLER
                  </span>
                  <span className="text-xs text-gray-500">• Garansi Resmi Terverifikasi</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                  {product.name}
                </h1>

                {/* Rating & Stats */}
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span>{product.reviewCount} Ulasan</span>
                  <span className="text-gray-300">•</span>
                  <span>{product.rentCount}x disewa & terjual</span>
                </div>
              </div>

              {/* Dual Price Boxes */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-emerald-50/70 border border-[#03AC0E]/30 rounded-xl p-3">
                  <span className="text-[10.5px] font-bold text-[#03AC0E] uppercase tracking-wide block">
                    OPSI COBA SEWA
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base sm:text-lg font-black text-[#03AC0E]">
                      {formatRupiah(product.rentPriceDaily)}
                    </span>
                    <span className="text-[11px] text-gray-500">/hari</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Bebas risiko beli kucing dalam karung
                  </span>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <span className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wide block">
                    HARGA BELI PENUH
                  </span>
                  <div className="text-base sm:text-lg font-black text-gray-900 mt-0.5">
                    {formatRupiah(product.buyPrice)}
                  </div>
                  {product.originalPrice && (
                    <span className="text-[10px] text-[#03AC0E] font-medium mt-0.5 block">
                      Hemat {formatRupiah(product.originalPrice - product.buyPrice)} dari harga baru
                    </span>
                  )}
                </div>
              </div>

              {/* Benefit Banner */}
              <div className="bg-gradient-to-r from-[#EBF8EE] to-emerald-50 border border-[#03AC0E]/30 rounded-xl p-3 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#03AC0E] shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-emerald-950 font-medium leading-relaxed">
                  <strong>Keuntungan Sewa-Milik Jember:</strong> Seluruh biaya sewa hari pertama hingga selesai akan langsung memotong harga beli bila Anda lanjut beli permanen!
                </p>
              </div>

              {/* Seller Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      {product.seller.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900">{product.seller.name}</span>
                        {product.seller.isVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#03AC0E]" />
                        )}
                      </div>
                      <p className="text-[10.5px] text-gray-500">
                        {product.seller.location} ({product.seller.distance})
                      </p>
                    </div>
                  </div>
                  <button className="text-[11px] font-semibold text-[#03AC0E] border border-[#03AC0E] px-2.5 py-1 rounded-md hover:bg-[#EBF8EE] transition-colors cursor-pointer">
                    Kunjungi
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-[10.5px] text-gray-500">
                  <div>
                    Rating: <strong className="text-gray-800">{product.seller.rating} / 5.0</strong>
                  </div>
                  <div>
                    Kecepatan: <strong className="text-gray-800">{product.seller.responseSpeed}</strong>
                  </div>
                  <div>
                    Jam: <strong className="text-gray-800">{product.seller.hours}</strong>
                  </div>
                </div>

                <div className="pt-2 text-[11px] space-y-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <div className="text-gray-700 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#03AC0E]" />
                    <span>Hanya Melayani COD Jember (Tatap Muka Langsung)</span>
                  </div>
                  <div className="text-[10.5px] text-gray-500 leading-normal">
                    Metode Serah Terima: Bebas cek fisik & fungsi unit sepuasnya sebelum serah-terima deal.
                  </div>
                  <div className="text-[10.5px] text-blue-700 font-medium flex items-center gap-1 pt-0.5">
                    <KeyRound className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>Verifikasi PIN Anti Tipu (Mirip Sistem PIN Ojol Driver)</span>
                  </div>
                </div>
              </div>

              {/* Package includes */}
              <div className="text-xs space-y-1 pt-1">
                <span className="font-semibold text-gray-800">Kelengkapan Paket:</span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11.5px] text-gray-600">
                  {(Array.isArray(product.packageIncludes) && product.packageIncludes.length > 0
                    ? product.packageIncludes
                    : Array.isArray((product as any).package_includes) && (product as any).package_includes.length > 0
                    ? (product as any).package_includes
                    : ["Unit Produk"]
                  ).map((inc: string, i: number) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#03AC0E]"></span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Interactive Action Box (3 cols) */}
            <div className="lg:col-span-3">
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm sticky top-4 space-y-4">
                {/* 2 Tabs: Uji Coba Sewa vs Beli Sekarang */}
                <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab("rent")}
                    className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                      activeTab === "rent"
                        ? "bg-white text-[#03AC0E] shadow-xs font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Uji Coba Sewa
                    <span className="block text-[9px] font-normal text-emerald-700">Potong Harga Beli</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("buy")}
                    className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                      activeTab === "buy"
                        ? "bg-white text-[#03AC0E] shadow-xs font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Beli Sekarang
                    <span className="block text-[9px] font-normal text-gray-500">Kepemilikan Penuh</span>
                  </button>
                </div>

                {activeTab === "rent" ? (
                  <div className="space-y-3.5">
                    {/* Duration Picker */}
                    <div>
                      <label className="text-xs font-bold text-gray-800 block mb-1.5">
                        Pilih Durasi Sewa:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[1, 3, 7].map((days) => (
                          <button
                            key={days}
                            onClick={() => setRentDuration(days)}
                            className={`py-1.5 text-xs rounded-lg border font-semibold transition-all cursor-pointer ${
                              rentDuration === days
                                ? "border-[#03AC0E] bg-[#EBF8EE] text-[#03AC0E]"
                                : "border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {days} Hari
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80 text-xs space-y-2">
                      <div className="flex justify-between text-gray-600 text-[11.5px]">
                        <span>Biaya Sewa ({rentDuration} hari):</span>
                        <span className="font-semibold text-gray-900">{formatRupiah(totalRentCost)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[11.5px]">
                        <span>Deposit Garansi (Balik 100%):</span>
                        <span className="font-semibold text-gray-900">{formatRupiah(product.deposit)}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                        <span>Total Bayar Ujicoba:</span>
                        <span className="text-[#03AC0E]">{formatRupiah(totalRentCost + product.deposit)}</span>
                      </div>
                    </div>

                    {/* Live Rent-to-Own Calculation Tag (The Magic Formula) */}
                    <div className="bg-[#EBF8EE] border border-[#03AC0E]/30 rounded-xl p-3 text-[11.5px]">
                      <div className="font-bold text-[#03AC0E] flex items-center gap-1 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Kalkulasi Sewa ke Beli:</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        Jika cocok & lanjut beli permanen, pembayaran <strong>{formatRupiah(totalRentCost)}</strong> ini langsung memotong harga <strong>{formatRupiah(product.buyPrice)}</strong>.
                      </p>
                      <div className="mt-2 bg-white rounded-lg p-2 border border-[#03AC0E]/20 text-center">
                        <span className="text-[10px] text-gray-500 uppercase block font-medium">Sisa Bayar:</span>
                        <span className="text-base font-extrabold text-[#03AC0E]">
                          {formatRupiah(remainingBuyPrice)}
                        </span>
                      </div>
                    </div>

                    {/* CTA Rent Button */}
                    <button
                      onClick={() => {
                        onAddToCart(product, "rent", rentDuration);
                        onOpenPinModal();
                      }}
                      className="w-full bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span>Mulai Uji Coba Sekarang</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80 text-xs space-y-2">
                      <div className="flex justify-between text-gray-600 text-[11.5px]">
                        <span>Harga Beli Penuh:</span>
                        <span className="font-semibold text-gray-900">{formatRupiah(product.buyPrice)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[11.5px]">
                        <span>Metode Penyerahan:</span>
                        <span className="font-semibold text-gray-900">COD Jember (Free)</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                        <span>Total Pelunasan:</span>
                        <span className="text-gray-900">{formatRupiah(product.buyPrice)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onAddToCart(product, "buy", 0);
                        onOpenPinModal();
                      }}
                      className="w-full bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Beli Langsung (COD Jember)</span>
                    </button>
                  </div>
                )}

                {/* Secondary action buttons */}
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 border border-gray-300 hover:border-[#03AC0E] hover:text-[#03AC0E] text-gray-700 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat Penjual</span>
                  </button>
                  <button
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isWishlisted
                        ? "border-[#EF144A] bg-rose-50 text-[#EF144A]"
                        : "border-gray-300 hover:border-gray-400 text-gray-600"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? "fill-[#EF144A]" : ""}`} />
                  </button>
                </div>

                {/* PIN Info Helper */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sistem PIN Serah-Terima TryPedia</span>
                  </div>
                  <p className="text-[10.5px] text-blue-800 leading-relaxed">
                    Saat bertemu dengan seller di Jember, cek fisik kamera dulu. Seller akan memberikan 6-digit PIN dari layarnya, Anda masukkan ke HP Anda untuk verifikasi selesai.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

