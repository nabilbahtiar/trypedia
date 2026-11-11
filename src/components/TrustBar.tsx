import React from "react";
import { ShieldCheck, KeyRound, RefreshCw, Award, CheckCircle } from "lucide-react";

interface TrustBarProps {
  onOpenPinModal: () => void;
  onOpenCalculator: () => void;
}

export default function TrustBar({ onOpenPinModal, onOpenCalculator }: TrustBarProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200/90 shadow-2xs">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 gap-4 md:gap-0">
        {/* Pilar 1: Rekber */}
        <div className="flex items-start gap-3.5 md:px-4">
          <div className="w-10 h-10 rounded-xl bg-[#EBF8EE] text-[#03AC0E] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
              Rekber TryPedia 100% Aman
              <span className="text-[10px] bg-emerald-100 text-[#03AC0E] px-1.5 py-0.2 rounded font-semibold">
                Escrow
              </span>
            </h4>
            <p className="text-[11.5px] text-gray-500 mt-0.5 leading-relaxed">
              Uang sewa & deposit ditahan sistem TryPedia. Dana hanya diteruskan ke seller setelah pembeli puas cek fisik barang.
            </p>
          </div>
        </div>

        {/* Pilar 2: PIN COD */}
        <div
          onClick={onOpenPinModal}
          className="flex items-start gap-3.5 md:px-4 pt-3 md:pt-0 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5 group-hover:text-blue-600 transition-colors">
              Verifikasi PIN Serah-Terima COD
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                Anti-Tipu
              </span>
            </h4>
            <p className="text-[11.5px] text-gray-500 mt-0.5 leading-relaxed">
              COD tatap muka di Jember. Pembeli memasukkan 6-digit PIN dari layar seller sebagai tanda sah barang sudah diserah-terimakan.
            </p>
          </div>
        </div>

        {/* Pilar 3: Rent to Own */}
        <div
          onClick={onOpenCalculator}
          className="flex items-start gap-3.5 md:px-4 pt-3 md:pt-0 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 group-hover:bg-orange-600 group-hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5 group-hover:text-orange-600 transition-colors">
              Konsep Rent-to-Own Fleksibel
              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.2 rounded font-semibold">
                100% Jadi DP
              </span>
            </h4>
            <p className="text-[11.5px] text-gray-500 mt-0.5 leading-relaxed">
              Biaya sewa yang telah dibayar akan memotong sisa harga beli secara langsung jika Anda memutuskan memiliki barangnya.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

