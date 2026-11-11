"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calculator,
  RefreshCw,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { PRODUCTS } from "@/data/products";

interface RentCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProduct: (id: string) => void;
}

export default function RentCalculator({
  isOpen,
  onClose,
  onOpenProduct,
}: RentCalculatorProps) {
  if (!isOpen) return null;

  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id);
  const [days, setDays] = useState(3);

  const product = PRODUCTS.find((p) => p.id === selectedProductId) || PRODUCTS[0];

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalRentCost = product.rentPriceDaily * days;
  const remainingBuyPrice = Math.max(0, product.buyPrice - totalRentCost);
  const percentageCut = ((totalRentCost / product.buyPrice) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03AC0E] to-[#00880A] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Kalkulator Simulasi Sewa ke Beli (Rent to Own)</h3>
              <p className="text-xs text-white/80">
                Hitung langsung potongan harga beli dari biaya sewa ujicoba di TryPedia Jember
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Pick Product */}
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">
              Pilih Barang Uji Coba:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-gray-800 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
            >
              {PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - Sewa: {formatRupiah(p.rentPriceDaily)}/hari (Beli: {formatRupiah(p.buyPrice)})
                </option>
              ))}
            </select>
          </div>

          {/* Duration Slider / Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-800">
                Durasi Uji Coba Sewa:
              </label>
              <span className="text-xs font-bold text-[#03AC0E] bg-[#EBF8EE] px-2 py-0.5 rounded-full">
                {days} Hari Uji Coba
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 7, 14].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    days === d
                      ? "border-[#03AC0E] bg-[#EBF8EE] text-[#03AC0E] shadow-2xs"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {d} Hari
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Simulation Display */}
          <div className="bg-[#F5F7FA] border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-600 pb-3 border-b border-gray-200">
              <span>Harga Normal Barang Bekas:</span>
              <strong className="text-gray-900 text-sm">{formatRupiah(product.buyPrice)}</strong>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600 pb-3 border-b border-gray-200">
              <div>
                <span>Total Biaya Uji Coba Sewa:</span>
                <span className="block text-[10px] text-gray-400">
                  {days} hari × {formatRupiah(product.rentPriceDaily)}
                </span>
              </div>
              <strong className="text-[#03AC0E] text-sm">
                - {formatRupiah(totalRentCost)} (100% Memotong)
              </strong>
            </div>

            {/* Result Box */}
            <div className="bg-white rounded-xl p-4 border-2 border-[#03AC0E] shadow-xs text-center space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Sisa Pelunasan Hak Milik Permanen:
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#03AC0E]">
                {formatRupiah(remainingBuyPrice)}
              </div>
              <p className="text-[11px] text-gray-500 font-medium pt-1">
                Uang sewa Rp {formatRupiah(totalRentCost).replace("Rp", "")} tidak hangus! Langsung menjadi DP kepemilikan Anda.
              </p>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenProduct(product.id);
              }}
              className="flex-1 bg-[#03AC0E] hover:bg-[#02980C] text-white py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <span>Lihat Detail Unit di Jember</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

