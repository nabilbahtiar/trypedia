"use client";

import React, { useState } from "react";
import {
  X,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  MapPin,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Store,
  User,
} from "lucide-react";

interface PinHandoverDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PinHandoverDemo({ isOpen, onClose }: PinHandoverDemoProps) {
  if (!isOpen) return null;

  // Active perspective: 'seller' or 'buyer'
  const [activeRole, setActiveRole] = useState<"buyer" | "seller">("buyer");
  const [sellerPin, setSellerPin] = useState("742918");
  const [buyerInputPin, setBuyerInputPin] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle");

  const handleVerify = () => {
    if (buyerInputPin === sellerPin) {
      setVerificationStatus("success");
    } else {
      setVerificationStatus("error");
    }
  };

  const handleReset = () => {
    // Generate new random 6 digit PIN
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    setSellerPin(newPin);
    setBuyerInputPin("");
    setVerificationStatus("idle");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="bg-[#F5F7FA] border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Simulasi Sistem PIN Serah-Terima COD
              </h3>
              <p className="text-[11px] text-gray-500">
                Fitur proteksi transaksi langsung di Jember (Mirip Sistem PIN Ojol)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Switcher Tabs */}
        <div className="p-5 space-y-5">
          <div className="bg-gray-100 p-1 rounded-xl grid grid-cols-2 gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveRole("buyer")}
              className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeRole === "buyer"
                  ? "bg-white text-[#03AC0E] shadow-xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>📱 Tampilan Pembeli (Input PIN)</span>
            </button>
            <button
              onClick={() => setActiveRole("seller")}
              className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeRole === "seller"
                  ? "bg-white text-blue-600 shadow-xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>🏪 Tampilan Penjual (Lihat PIN)</span>
            </button>
          </div>

          {/* Context Banner */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#03AC0E] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-gray-800">
                Lokasi Toko: Jl. Kalimantan No.84a, Krajan Timur, Sumbersari, Jember
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Barang: Sepatu New Balance 2022R (Paket Sewa 3 Hari Uji Coba)
              </p>
            </div>
          </div>

          {/* Perspective 1: SELLER VIEW */}
          {activeRole === "seller" && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 text-[11px] font-bold px-3 py-1 rounded-full">
                <Store className="w-3.5 h-3.5" />
                <span>Layar Penjual (Sneaker Zone Jember)</span>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-1">
                  PIN Rahasia Serah-Terima Barang Anda:
                </p>
                <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-blue-700 bg-white py-3 px-6 rounded-xl border border-blue-300 shadow-xs inline-block">
                  {sellerPin}
                </div>
              </div>

              <div className="bg-white/80 rounded-xl p-3 border border-blue-100 text-[11.5px] text-gray-600 text-left space-y-1.5">
                <div className="font-bold text-gray-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Instruksi untuk Penjual:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  1. Biarkan pembeli memeriksa fisik, sensor, dan lensa hingga puas.
                </p>
                <p className="text-[11px] leading-relaxed">
                  2. Jika pembeli setuju dan menerima unit, berikan <strong>PIN 6 Digit di atas</strong> kepada pembeli untuk diinput di aplikasinya.
                </p>
                <p className="text-[11px] leading-relaxed">
                  3. Setelah pembeli menekan verifikasi, sistem TryPedia mencatat masa uji coba aktif dan dana escrow Anda aman!
                </p>
              </div>

              <button
                onClick={() => {
                  setBuyerInputPin(sellerPin);
                  setActiveRole("buyer");
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
              >
                <span>Coba Salin PIN ke Layar Pembeli</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Perspective 2: BUYER VIEW */}
          {activeRole === "buyer" && (
            <div className="space-y-4">
              {verificationStatus === "success" ? (
                /* Success State */
                <div className="bg-[#EBF8EE] border border-[#03AC0E]/30 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-[#03AC0E] text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-gray-900">
                      Serah-Terima Sukses Terverifikasi!
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Sepatu New Balance 2022R telah resmi Anda terima dari penjual Sneaker Zone Jember.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-3.5 border border-[#03AC0E]/20 text-xs text-left space-y-1.5 shadow-xs">
                    <div className="flex justify-between text-gray-600 text-[11.5px]">
                      <span>Status Transaksi:</span>
                      <strong className="text-[#03AC0E]">Masa Uji Coba Sewa Aktif</strong>
                    </div>
                    <div className="flex justify-between text-gray-600 text-[11.5px]">
                      <span>Durasi Sewa:</span>
                      <strong>3 Hari (s.d 7 Nov 2026)</strong>
                    </div>
                    <div className="flex justify-between text-gray-600 text-[11.5px]">
                      <span>Uang Sewa Terpotong jika Beli:</span>
                      <strong className="text-[#03AC0E]">Rp 90.000</strong>
                    </div>
                    <div className="flex justify-between text-gray-600 text-[11.5px]">
                      <span>Sisa Pelunasan jika Lanjut Beli:</span>
                      <strong className="text-gray-900 font-bold">Rp 1.360.000</strong>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={handleReset}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ulangi Simulasi</span>
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 bg-[#03AC0E] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#02980C] transition-colors cursor-pointer"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ) : (
                /* Input State */
                <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
                  <div className="text-center">
                    <span className="text-xs font-bold text-gray-800 block">
                      Masukkan PIN 6 Digit dari Layar Penjual:
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Mintalah kode PIN ini kepada seller hanya setelah Anda selesai cek kondisi fisik unit.
                    </p>
                  </div>

                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={6}
                      value={buyerInputPin}
                      onChange={(e) => {
                        setBuyerInputPin(e.target.value.replace(/\D/g, ""));
                        setVerificationStatus("idle");
                      }}
                      placeholder="Contoh: 742918"
                      className="w-full text-center tracking-widest text-2xl font-mono font-bold py-3 px-4 border-2 border-gray-300 focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] rounded-xl outline-none transition-all"
                    />

                    {verificationStatus === "error" && (
                      <p className="text-xs text-[#EF144A] flex items-center justify-center gap-1 mt-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>PIN salah! Pastikan mencocokkan dengan PIN di layar penjual.</span>
                      </p>
                    )}
                  </div>

                  {/* Helper shortcut for tester */}
                  <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 bg-gray-50 py-2 rounded-lg">
                    <span>PIN Penjual saat ini:</span>
                    <strong className="font-mono text-blue-600 font-bold">{sellerPin}</strong>
                    <button
                      onClick={() => setBuyerInputPin(sellerPin)}
                      className="text-[#03AC0E] hover:underline font-semibold cursor-pointer"
                    >
                      (Auto-Isi)
                    </button>
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={buyerInputPin.length < 6}
                    className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      buyerInputPin.length === 6
                        ? "bg-[#03AC0E] hover:bg-[#02980C] text-white shadow-md active:scale-98"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Verifikasi Serah-Terima Barang</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

