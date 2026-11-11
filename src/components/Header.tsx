"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatRadiusLabel, type RadiusFilter } from "@/lib/geo";
import {
  Search,
  ShoppingCart,
  Bell,
  MapPin,
  ChevronDown,
  CheckCircle2,
  LogOut,
  Settings,
  Store,
  Wallet,
  Coins,
  Package,
  MessageSquare,
} from "lucide-react";

interface HeaderProps {
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  selectedDistrict?: string;
  selectedRadius?: RadiusFilter;
  onOpenLocationModal?: () => void;
  cartCount?: number;
}

// Persistent per-user cache for navbar data during client-side navigation
const cachedBalancesByUser: Record<
  string,
  { wallet: number; coin: number; unreadChat: number; fetchedAt: number }
> = {};

const summaryCache:Record<string,any>={};
const summaryPending:Record<string,Promise<any>|undefined>={};
export default function Header({
  searchQuery = "",
  setSearchQuery = () => { },
  selectedDistrict = "",
  selectedRadius = 2,
  onOpenLocationModal = () => { },
  cartCount: providedCartCount = 0,
}: HeaderProps) {
  const { user, isLoggedIn, logout, openLoginModal } = useAuth();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userKey = user?.id || "";
  const initialCache = userKey ? cachedBalancesByUser[userKey] : undefined;
  const [walletBalance, setWalletBalance] = useState<number>(
    initialCache?.wallet ?? 0
  );
  const [coinBalance, setCoinBalance] = useState<number>(
    initialCache?.coin ?? 0
  );
  const [unreadChatCount, setUnreadChatCount] = useState<number>(
    initialCache?.unreadChat ?? 0
  );

  const [cartCount,setActivityCartCount]=useState(0);
  const [notificationCount,setNotificationCount]=useState(0);
  useEffect(()=>{
    if(!userKey||user?.role==='SUPERADMIN')return;
    let active=true;
    const sync=async(force=false)=>{if(document.hidden)return;let value=summaryCache[userKey];if(force||!value||Date.now()-value.at>15000){let pending=summaryPending[userKey];if(!pending){pending=fetch('/api/account-summary').then(async r=>r.ok?r.json():null).then(data=>{if(data)summaryCache[userKey]={...data,at:Date.now()};return summaryCache[userKey];}).finally(()=>{delete summaryPending[userKey];});summaryPending[userKey]=pending;}value=await pending;}if(active&&value){if(value.isVerified!==user?.isVerified)window.dispatchEvent(new Event("trypedia_identity_change"));setWalletBalance(value.wallet);setCoinBalance(value.coin);setUnreadChatCount(value.unreadChat);setActivityCartCount(value.cartCount);setNotificationCount(value.unreadCount);}};
    sync().catch(()=>{});const timer=setInterval(()=>{sync().catch(()=>{});},30000);const invalidate=()=>{sync(true).catch(()=>{});};
    window.addEventListener('trypedia_wallet_change',invalidate);window.addEventListener('trypedia_activity_change',invalidate);window.addEventListener('focus',invalidate);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('trypedia_wallet_change',invalidate);window.removeEventListener('trypedia_activity_change',invalidate);window.removeEventListener('focus',invalidate);};
  },[userKey,user?.role,user?.isVerified]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatCoins = (val: number) => {
    return new Intl.NumberFormat("id-ID").format(val);
  };
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-xs">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
        <div className={`flex items-center gap-4 lg:gap-6 ${!isHomePage ? "justify-between" : ""}`}>
          {/* Official Brand Logo */}
          <Link href="/" className="shrink-0 flex items-center">
            <img
              src="/images/trypedia-logo.png"
              alt="TryPedia Logo"
              className="h-8 sm:h-9 object-contain"
            />
          </Link>

          {/* Search Box (Tokopedia style) - Only on Home Page */}
          {isHomePage && (
            <div className="flex-1">
              <div className="relative flex items-center">
                <div className="w-full relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      selectedDistrict
                        ? `Cari sepatu, gadget, laptop di ${selectedDistrict}...`
                        : "Cari sepatu, gadget, laptop, atau coba sewa..."
                    }
                    className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-24 py-2 text-[13.5px] placeholder-gray-400 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] transition-all"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="button"
                  className="absolute right-1 top-1 bottom-1 bg-[#03AC0E] hover:bg-[#02980C] text-white px-4 rounded-md text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Cari</span>
                </button>
              </div>
            </div>
          )}

          {/* Icons: Cart, Notification, User Profile */}
          <div className="flex items-center gap-2 lg:gap-3 text-gray-600">
            {/* Saldo & Koin Quick Badges */}
            {isLoggedIn && user && user.role !== "SUPERADMIN" && (
              <div className="hidden md:flex items-center gap-1 bg-gray-50/90 border border-gray-200/80 p-0.5 rounded-xl text-xs mr-1">
                {/* Saldo Dompet */}
                <Link
                  href="/wallet"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white hover:shadow-xs text-gray-700 hover:text-[#03AC0E] transition-all group"
                  title="Lihat Dompet Saya"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#03AC0E] shrink-0" />
                  <span className="font-bold text-[11px] sm:text-xs text-gray-800">
                    {formatRupiah(walletBalance)}
                  </span>
                </Link>

                <div className="h-3.5 w-px bg-gray-200"></div>

                {/* Koin Saya */}
                <Link
                  href="/coins"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white hover:shadow-xs text-gray-700 hover:text-amber-600 transition-all group"
                  title="Lihat Koin Saya"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-bold text-[11px] sm:text-xs text-gray-800">
                    {formatCoins(coinBalance)}
                  </span>
                </Link>
              </div>
            )}

            {user?.role !== "SUPERADMIN" && <>
            <Link href="/cart" aria-label="Keranjang" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#EF144A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link href="/notifications" aria-label="Notifikasi" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
              <Bell className="w-5 h-5 text-gray-700" />
              {notificationCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF144A] rounded-full" aria-label={`${notificationCount} notifikasi belum dibaca`} />}
            </Link>

            {/* Chat Icon Link */}
            <Link
              href="/chat"
              prefetch={true}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-700 hover:text-[#03AC0E]"
              title="Chat"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadChatCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#03AC0E] text-white text-[9.5px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {unreadChatCount}
                </span>
              )}
            </Link>

            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

            </>}

            {/* User Profile or Login/Register Buttons */}
            {isLoggedIn && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-1 cursor-pointer hover:opacity-90"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-[#03AC0E] to-emerald-400 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-xs">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.avatar || "KN"
                    )}
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-gray-800">{user.name}</span>
                      {user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-[#03AC0E] fill-[#03AC0E]/20" />}
                    </div>
                    <span className="text-[10px] text-[#03AC0E] font-medium leading-none">
                      {user.isVerified ? "Akun Terverifikasi" : "Belum Terverifikasi"}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30 bg-transparent"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-40 text-xs space-y-0.5 animate-in fade-in">
                      {/* Navigation Links */}
                      {user.role === "SUPERADMIN" ? <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[#03AC0E] font-semibold"><Wallet className="h-4 w-4" />Keuangan TryPedia</Link> : <>
                      <Link
                        href="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-[#EBF8EE] hover:text-[#03AC0E] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-gray-500" />
                        <span>Pengaturan Akun</span>
                      </Link>

                      <Link
                        href="/orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-[#EBF8EE] hover:text-[#03AC0E] transition-colors"
                      >
                        <Package className="w-4 h-4 text-gray-500" />
                        <span>Pesanan Saya</span>
                      </Link>

                      <Link
                        href={user?.id ? `/store/${encodeURIComponent(user.id)}?tab=beranda` : "/seller"}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-[#EBF8EE] hover:text-[#03AC0E] transition-colors"
                      >
                        <Store className="w-4 h-4 text-gray-500" />
                        <span>Manajemen Toko</span>
                      </Link>

                      <Link
                        href="/wallet"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-[#EBF8EE] hover:text-[#03AC0E] transition-colors"
                      >
                        <Wallet className="w-4 h-4 text-gray-500" />
                        <span>Dompet Saya</span>
                      </Link>

                      <Link
                        href="/coins"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-[#EBF8EE] hover:text-[#03AC0E] transition-colors"
                      >
                        <Coins className="w-4 h-4 text-gray-500" />
                        <span>Koin Saya</span>
                      </Link>

                      </>}
                      <div className="h-px bg-gray-100 my-1"></div>

                      {/* Logout Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Keluar</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center pl-1">
                <button
                  type="button"
                  onClick={() => openLoginModal()}
                  className="text-xs font-bold text-white bg-[#03AC0E] hover:bg-[#02980C] px-4 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Masuk
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Location & Radius selector row - Only on Home Page */}
        {isHomePage && (
          <div className="flex items-center pt-2 border-t border-gray-100 mt-2 text-[12px]">
            <button
              onClick={onOpenLocationModal}
              className="flex items-center gap-1.5 text-gray-700 hover:text-[#03AC0E] transition-colors font-medium cursor-pointer group bg-gray-50 hover:bg-[#EBF8EE] px-2.5 py-1 rounded-md border border-gray-200 hover:border-[#03AC0E]/40"
            >
              <MapPin className="w-3.5 h-3.5 text-[#03AC0E] shrink-0" />
              {selectedDistrict ? (
                <span className="text-gray-700 flex items-center gap-1">
                  <span className="text-gray-600 font-medium">Radius Lokasi:</span>{" "}
                  <strong className="text-gray-900 group-hover:text-[#03AC0E] font-semibold">
                    {selectedDistrict}
                  </strong>{" "}
                  <span className="text-[#03AC0E] font-bold">
                    ({formatRadiusLabel(selectedRadius)})
                  </span>
                </span>
              ) : (
                <span className="text-gray-700 flex items-center gap-1">
                  <span className="text-gray-600 font-medium">Lokasi:</span>{" "}
                  <strong className="text-gray-800 group-hover:text-[#03AC0E] font-semibold">
                    Pilih Lokasi Saya
                  </strong>{" "}
                  <span className="text-[11px] text-[#03AC0E] font-medium">
                    (Atur Radius COD)
                  </span>
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5 group-hover:text-[#03AC0E]" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
