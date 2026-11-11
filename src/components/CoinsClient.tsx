"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  HelpCircle,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";

interface CoinTx {
  id: string;
  userId: string;
  type: "BONUS" | "CASHBACK" | "REDEEM" | "EXPIRED";
  amount: number;
  description: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  createdAt: string;
}

interface CoinsClientProps {
  initialUserId?: string | null;
  initialCoins?: number | null;
  initialTransactions?: CoinTx[] | null;
}

export default function CoinsClient({
  initialUserId = null,
  initialCoins = null,
  initialTransactions = null,
}: CoinsClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [coins, setCoins] = useState<number>(initialCoins ?? 0);
  const [transactions, setTransactions] = useState<CoinTx[]>(initialTransactions ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(initialTransactions === null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [isHowToModalOpen, setIsHowToModalOpen] = useState<boolean>(false);

  // Fetch Coins Data
  const fetchCoins = async () => {
    try {
      setIsLoading(true);
      const targetUserId = user?.id || initialUserId || "usr_001";
      const res = await fetch(`/api/coins?userId=${encodeURIComponent(targetUserId)}`);
      const data = await res.json();
      if (data.success) {
        setCoins(data.coins);
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Gagal memuat koin:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const didSkipInitialCoinsFetch = React.useRef(false);

  useEffect(() => {
    const uid = user?.id || initialUserId;
    if (
      initialTransactions !== null &&
      initialUserId &&
      uid === initialUserId &&
      !didSkipInitialCoinsFetch.current
    ) {
      didSkipInitialCoinsFetch.current = true;
      return;
    }
    fetchCoins();
  }, [user, initialUserId, initialTransactions]);

  // Format Coin Number
  const formatCoins = (val: number) => {
    return new Intl.NumberFormat("id-ID").format(val);
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === "IN") return tx.type === "BONUS" || tx.type === "CASHBACK";
    if (activeFilter === "OUT") return tx.type === "REDEEM" || tx.type === "EXPIRED";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-xs text-gray-500 mb-6 gap-2">
          <Link href="/" className="hover:text-[#03AC0E] transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <Link href="/settings" className="hover:text-[#03AC0E] transition-colors">
            Profil
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-semibold">Koin Saya</span>
        </nav>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-500 border border-amber-200">
              <Coins className="w-6 h-6" />
            </span>
            Koin Saya
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Kumpulkan koin dari transaksi dan gunakan sebagai potongan langsung saat berbelanja di Trypedia.
          </p>
        </div>

        {/* Hero Coin Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 p-6 sm:p-8 text-amber-950 shadow-xl shadow-amber-500/15 mb-8">
          {/* Decorative Elements */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/20 blur-xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-12 w-44 h-44 rounded-full bg-black/10 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              {/* Top Row: Badge */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/10 backdrop-blur-md text-xs font-bold text-amber-950 border border-amber-950/15">
                  <Coins className="w-4 h-4 text-amber-900" />
                  <span>Trypedia Coins</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/40 backdrop-blur-md text-[11px] font-semibold text-amber-950">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>1 Koin = Rp 1</span>
                </div>
              </div>

              {/* Coin Balance */}
              <div>
                <span className="text-xs sm:text-sm font-semibold text-amber-900/80">Total Koin Saya</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-950">
                    {formatCoins(coins)}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-amber-900">Koin</span>
                </div>
                <p className="text-xs text-amber-900/90 font-medium mt-1">
                  Setara dengan <strong>Rp {formatCoins(coins)}</strong> untuk potongan belanja.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-amber-950/15">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-950 text-white font-bold text-sm shadow-md hover:bg-amber-900 active:scale-95 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Gunakan Belanja</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsHowToModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/40 backdrop-blur-sm text-amber-950 font-bold text-sm hover:bg-white/60 active:scale-95 transition-all border border-amber-950/15 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-amber-900" />
                <span>Cara Dapat Koin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Riwayat Koin</h2>
              <p className="text-xs text-gray-500 mt-0.5">Daftar perolehan dan penggunaan koin di akun Anda.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold text-gray-600 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === "ALL"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "hover:text-gray-900 text-gray-500"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("IN")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === "IN"
                    ? "bg-white text-amber-600 shadow-xs"
                    : "hover:text-gray-900 text-gray-500"
                }`}
              >
                Koin Masuk
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("OUT")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilter === "OUT"
                    ? "bg-white text-rose-600 shadow-xs"
                    : "hover:text-gray-900 text-gray-500"
                }`}
              >
                Koin Keluar
              </button>
            </div>
          </div>

          {/* Transaction List */}
          <div className="divide-y divide-gray-100 mt-2">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-gray-700 text-sm">Belum Ada Riwayat Koin</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Aktivitas koin Anda akan tercatat secara otomatis di sini.
                </p>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isIncoming = tx.type === "BONUS" || tx.type === "CASHBACK";
                const dateObj = new Date(tx.createdAt);
                const dateStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) + " WIB"
                  : tx.createdAt;

                return (
                  <div
                    key={tx.id}
                    className="py-4 flex items-center justify-between gap-4 hover:bg-gray-50/70 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncoming
                            ? "bg-amber-50 text-amber-500 border border-amber-200"
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{tx.description}</p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tx.status === "SUCCESS"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {tx.status === "SUCCESS" ? "Berhasil" : tx.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-gray-400">{tx.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm sm:text-base font-bold ${
                          isIncoming ? "text-amber-600" : "text-rose-600"
                        }`}
                      >
                        {isIncoming ? "+" : "-"} {formatCoins(tx.amount)} Koin
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* HOW TO GET COINS MODAL */}
      {isHowToModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-500">
                  <Coins className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Cara Mendapatkan Koin</h3>
              </div>
              <button
                onClick={() => setIsHowToModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs sm:text-sm">Bonus Pengguna Baru</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Otomatis mendapatkan <strong>10.000 Koin</strong> saat membuat akun Trypedia.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="w-8 h-8 rounded-lg bg-[#03AC0E] text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs sm:text-sm">Cashback Belanja</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Dapatkan cashback koin hingga 2% setiap kali Anda berbelanja produk.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="w-8 h-8 rounded-lg bg-blue-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs sm:text-sm">Ulas Produk</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Tulis ulasan dan foto barang setelah pesanan sampai untuk memperoleh 500 Koin per ulasan.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsHowToModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#03AC0E] text-white font-bold text-xs sm:text-sm shadow-md hover:bg-[#02910c] active:scale-95 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

