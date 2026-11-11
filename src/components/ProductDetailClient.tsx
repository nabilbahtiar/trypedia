"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PinHandoverDemo from "@/components/PinHandoverDemo";
import LocationModal from "@/components/LocationModal";
import ReviewsShowcase from "@/components/ReviewsShowcase";
import ShareButton from "@/components/ShareButton";
import DeleteProductButton from "@/components/DeleteProductButton";
import { Product } from "@/data/products";
import type { ProductReview } from "@/lib/reviews";
import { calculateDistanceKm, parseStoredRadius, type RadiusFilter } from "@/lib/geo";
import {
  Star,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ShoppingCart,
  ChevronRight,
  ArrowLeft,
  MapPin,
  AlertCircle,
  Clock,
  Edit3,
  Package,
} from "lucide-react";

interface ProductDetailClientProps {
  initialProduct: Product;
  initialStore: any | null;
  initialStats: any | null;
  initialReviews?: ProductReview[];
  initialViewerId?: string | null;
  initialCartContains?: boolean;
}

export default function ProductDetailClient({
  initialProduct,
  initialStore,
  initialStats,
  initialReviews = [],
  initialViewerId = null,
  initialCartContains = false,
}: ProductDetailClientProps) {
  const router = useRouter();
  const { user, isLoggedIn, openLoginModal } = useAuth();

  const [product, setProduct] = useState<Product>(initialProduct);
  const [sellerStore, setSellerStore] = useState<any | null>(initialStore);
  const [sellerStats, setSellerStats] = useState<any | null>(initialStats);
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews);
  const [stock, setStock] = useState<number>(initialProduct.stock ?? 1);
  const [isStockLocked, setIsStockLocked] = useState<boolean>(
    Boolean(initialProduct.isStockLocked)
  );

  useEffect(() => {
    setProduct(initialProduct);
    setSellerStore(initialStore);
    setSellerStats(initialStats);
    setReviews(initialReviews || []);
    setStock(initialProduct.stock ?? 1);
    setIsStockLocked(Boolean(initialProduct.isStockLocked));
  }, [initialProduct, initialStore, initialStats, initialReviews]);

  const [activeTab, setActiveTab] = useState<"rent" | "buy">("rent");
  const [rentDuration, setRentDuration] = useState<number>(3); // default 3 days
  const [isAddedToCart, setIsAddedToCart] = useState(initialCartContains);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartError, setCartError] = useState("");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("Jember");
  const [selectedRadius, setSelectedRadius] = useState<RadiusFilter>(2);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Dynamic user coordinates from localStorage (OpenStreetMap / GPS)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: -8.1725,
    lng: 113.7000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawCoords = localStorage.getItem("trypedia_user_coords");
    if (rawCoords) {
      try {
        const parsed = JSON.parse(rawCoords);
        if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          setUserCoords(parsed);
          return;
        }
      } catch {}
    }

    if (user?.id) {
      fetch(`/api/addresses?userId=${encodeURIComponent(user.id)}`)
        .then((r) => r.json())
        .then((d) => {
          const primary = d?.addresses?.find((a: any) => a.isPrimary) || d?.addresses?.[0];
          if (primary && Number.isFinite(Number(primary.latitude)) && Number.isFinite(Number(primary.longitude))) {
            setUserCoords({ lat: Number(primary.latitude), lng: Number(primary.longitude) });
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const sellerLat =
    parseFloat(sellerStore?.latitude) ||
    Number(product.seller?.lat) ||
    -8.16441;
  const sellerLng =
    parseFloat(sellerStore?.longitude) ||
    Number(product.seller?.lng) ||
    113.7178;

  const dynamicDistanceKm = calculateDistanceKm(
    userCoords.lat,
    userCoords.lng,
    sellerLat,
    sellerLng
  );

  const targetSellerId = product.sellerId || product.seller?.id || sellerStore?.userId || "";
  const storeHref = targetSellerId
    ? `/store/${encodeURIComponent(targetSellerId)}`
    : `/store/${encodeURIComponent(sellerStore?.storeName || product.seller.name)}`;

  // Determine if the current logged-in user is the owner of this product
  const isOwner = Boolean((user?.id || initialViewerId) && (user?.id || initialViewerId) === targetSellerId);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/products/stock?productId=${encodeURIComponent(product.id)}`);
        const data = await res.json();
        if (data.success) {
          setStock(data.stock);
          setIsStockLocked(Boolean(data.isLocked));
        }
      } catch {}
    };

    const handleStockChange = () => fetchStock();
    window.addEventListener("trypedia_stock_change", handleStockChange);
    window.addEventListener("storage", handleStockChange);

    return () => {
      window.removeEventListener("trypedia_stock_change", handleStockChange);
      window.removeEventListener("storage", handleStockChange);
    };
  }, [product.id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLoc = localStorage.getItem("trypedia_user_location");
      const savedRad = localStorage.getItem("trypedia_user_radius");
      if (savedLoc) setSelectedDistrict(savedLoc);
      if (savedRad) setSelectedRadius(parseStoredRadius(savedRad));
    }
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const productImages: string[] =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.image];
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const rentPriceDaily = product.rentPriceDaily || 30000;
  const rentPrice3d = product.rentPrice3d || Math.round(rentPriceDaily * 2.8);
  const rentPrice7d = product.rentPrice7d || Math.round(rentPriceDaily * 5.8);

  const currentRentCost =
    rentDuration === 1
      ? rentPriceDaily
      : rentDuration === 7
      ? rentPrice7d
      : rentPrice3d;

  const remainingBuyPrice = Math.max(0, product.buyPrice - currentRentCost);

  const changeCart = async () => {
    if(cartBusy) return;
    setCartBusy(true); setCartError("");
    try {
      const response=await fetch('/api/cart'+(isAddedToCart?'?productId='+encodeURIComponent(product.id):''),{method:isAddedToCart?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:isAddedToCart?undefined:JSON.stringify({productId:product.id,mode:activeTab,duration:rentDuration})});
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.message||'Keranjang gagal diperbarui.');
      setIsAddedToCart(!isAddedToCart);window.dispatchEvent(new Event('trypedia_activity_change'));
    }catch(error){setCartError(error instanceof Error?error.message:'Keranjang gagal diperbarui.');}finally{setCartBusy(false);}
  };

  const handleProceed = (mode: "rent" | "buy") => {
    const targetUrl =
      mode === "rent"
        ? `/checkout?id=${product.id}&type=rent&duration=${rentDuration}&price=${currentRentCost}`
        : `/checkout?id=${product.id}&type=buy`;

    if (!isLoggedIn) {
      // Pengguna wajib login terlebih dahulu sebelum lanjut ke checkout
      openLoginModal(() => {
        router.push(targetUrl);
      });
      return;
    }

    // Jika sudah login, langsung lanjutkan ke checkout
    router.push(targetUrl);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      {/* Header */}
      <Header
        selectedDistrict={selectedDistrict}
        selectedRadius={selectedRadius}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
      />

      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5 text-xs text-gray-500 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-[#03AC0E] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="hover:text-[#03AC0E] cursor-pointer">{product.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-800 font-semibold truncate max-w-xs sm:max-w-md">
            {product.name}
          </span>
        </div>
      </div>

      {/* Main Product Detail Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-5">
          {/* LEFT COLUMN: Photos (4 cols) */}
          <div className="lg:col-span-4 lg:self-stretch min-w-0 space-y-4">
            <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs lg:sticky lg:top-24">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                <img
                  src={productImages[activeImageIndex] || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-200"
                />
              </div>

              {/* Photo Thumbnails (Max 5 photos) */}
              {productImages.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {productImages.slice(0, 5).map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                        activeImageIndex === idx
                          ? "border-[#03AC0E] shadow-xs ring-1 ring-[#03AC0E]"
                          : "border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {cartError && <p role="alert" className="mt-3 text-xs text-red-600">{cartError}</p>}
              {/* Action Bar */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                {isOwner ? (
                  <Link
                    href={`/seller?tab=products&edit=${encodeURIComponent(product.id)}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#03AC0E] bg-[#EBF8EE] hover:bg-[#d8f3de] text-[#03AC0E] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Produk Ini</span>
                  </Link>
                ) : (
                  <button
                    disabled={stock <= 0 || cartBusy}
                    onClick={() => {
                      if (!isLoggedIn) openLoginModal(() => { changeCart(); });
                      else changeCart();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      stock <= 0
                        ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                        : isAddedToCart
                        ? "border-[#03AC0E] bg-[#EBF8EE] text-[#03AC0E] cursor-pointer"
                        : "border-gray-300 hover:border-[#03AC0E] hover:text-[#03AC0E] text-gray-700 bg-white cursor-pointer"
                    }`}
                  >
                    <ShoppingCart className={`w-4 h-4 ${isAddedToCart && stock > 0 ? "text-[#03AC0E]" : ""}`} />
                    <span>
                      {stock <= 0
                        ? "Stok Habis (Tidak Tersedia)"
                        : isAddedToCart
                        ? "Hapus dari Keranjang"
                        : "Masukkan ke Keranjang"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: Product Info & Seller Info (5 cols) */}
          <div className="lg:col-span-5 min-w-0 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                {product.name}
              </h1>
              <div className="shrink-0"><ShareButton title={product.name} description={product.description} image={product.image} path={`/products/${encodeURIComponent(product.id)}`} /></div>
              </div>

              {/* Rating Section */}
              {(() => {
                const count = reviews.length > 0 ? reviews.length : (product.reviewCount || 0);
                const avgRating =
                  reviews.length > 0
                    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
                    : Number(product.rating) > 0
                    ? Number(product.rating).toFixed(1)
                    : "0.0";
                const rentCount = product.rentCount || 0;

                return (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-2">
                    {count > 0 ? (
                      <div className="flex items-center gap-1 text-gray-900 font-bold">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{avgRating}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400 font-medium">
                        <Star className="w-4 h-4 fill-gray-300 text-gray-300" />
                        <span>0.0</span>
                      </div>
                    )}
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-600 font-medium">
                      {count > 0 ? `${count} ulasan` : "Belum ada ulasan"}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-600 font-medium">{rentCount}x disewa</span>
                  </div>
                );
              })()}

              {/* Price display header */}
              <div className="mt-4 py-3 border-y border-gray-200 flex flex-wrap items-center gap-x-5 gap-y-3">
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 block">Sewa</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-gray-900">
                      {formatRupiah(product.rentPriceDaily)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">/hari</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 block">Beli</span>
                  <div className="text-2xl font-black text-gray-900 mt-0.5">
                    {formatRupiah(product.buyPrice)}
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center overflow-hidden shrink-0 shadow-xs border border-emerald-400/30">
                    {sellerStore?.photoUrl ? (
                      <img
                        src={sellerStore.photoUrl}
                        alt={sellerStore.storeName || product.seller.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      sellerStore?.storeAvatar || product.seller.avatar
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={storeHref}
                        className="text-sm font-bold text-gray-900 hover:text-[#03AC0E] transition-colors"
                      >
                        {sellerStore?.storeName || product.seller.name}
                      </Link>
                      {(sellerStore?.isVerified ?? product.seller.isVerified) && <CheckCircle2 className="w-4 h-4 text-[#03AC0E]" />}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5 mt-0.5">
                      <p>{sellerStore?.address || product.seller.location}</p>
                      {isOwner ? (
                        <p className="flex items-center gap-1 text-[#03AC0E] font-medium">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>(Lokasi Toko Anda)</span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsLocationModalOpen(true)}
                          title="Klik untuk atur / sesuaikan titik lokasi Anda"
                          className="flex items-center gap-1 text-[#03AC0E] font-medium hover:underline cursor-pointer text-left"
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>({dynamicDistanceKm.toFixed(1)} km dari Anda)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-[52px]">
                  {!isOwner && (
                    <Link
                      href={`/chat?seller=${encodeURIComponent(sellerStore?.storeName || product.seller.name)}`}
                      className="text-xs font-semibold text-gray-700 border border-gray-300 hover:border-[#03AC0E] hover:text-[#03AC0E] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat Penjual</span>
                    </Link>
                  )}
                  <Link
                    href={storeHref}
                    className="text-xs font-semibold text-[#03AC0E] border border-[#03AC0E] px-3 py-1.5 rounded-lg hover:bg-[#EBF8EE] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Kunjungi Toko
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-2.5 border-t border-gray-100 text-xs text-gray-500">
                <div className="text-left">
                  Rating Toko: <strong className="text-gray-700">{Number(sellerStore?.rating ?? 0).toFixed(1)}</strong>
                </div>
                <div>
                  Produk: <strong className="text-gray-700">{sellerStats?.totalProducts ?? 1}</strong>
                </div>
                <div className="text-right">
                  Jam: <strong className="text-gray-800">{sellerStore?.hours || product.seller.hours}</strong>
                </div>
              </div>
            </div>

            {/* Description & Package Details */}
            <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4 shadow-2xs">
              <h2 className="text-base font-bold text-gray-900">Deskripsi Produk</h2>
  
              <div className="grid grid-cols-2 gap-3 text-gray-700">
                <div className="min-w-0">
                  <span className="text-xs text-gray-500 block mb-1">Kategori</span>
                  <span className="font-semibold text-gray-900">{product.category}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-gray-500 block mb-1">Kondisi Barang</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    {product.condition || "Seperti Baru"}
                  </span>
                </div>
              </div>
  
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
  
              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">Kelengkapan Paket</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 text-sm text-gray-600">
                  {(Array.isArray(product.packageIncludes) && product.packageIncludes.length > 0
                    ? product.packageIncludes
                    : Array.isArray((product as any).package_includes) && (product as any).package_includes.length > 0
                    ? (product as any).package_includes
                    : ["Unit Produk"]
                  ).map((inc: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#03AC0E] shrink-0"></span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN: Sticky Action Box (3 cols) - Single place for transaction options */}
          <div className="lg:col-span-3 lg:self-stretch min-w-0">
            {isOwner ? (
              <div className="bg-white border-2 border-[#03AC0E]/30 rounded-2xl p-4 shadow-sm lg:sticky lg:top-24 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF8EE] text-[#03AC0E] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-[#03AC0E]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Produk Toko Anda</span>
                    <span className="text-[11px] text-gray-500 block">Anda adalah pemilik produk ini</span>
                  </div>
                </div>

                {/* Status Etalase */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-[11.5px]">Status Etalase:</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        stock > 0
                          ? "bg-[#EBF8EE] text-[#03AC0E] border border-[#03AC0E]/30"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {stock > 0 ? "Aktif Disewakan / Dijual" : "Stok Habis / Disewa"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11.5px]">
                    <span className="text-gray-500">Kondisi Fisik:</span>
                    <span className="font-semibold text-gray-800">{product.condition || "Seperti Baru"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11.5px]">
                    <span className="text-gray-500">Kategori:</span>
                    <span className="font-semibold text-gray-800">{product.category}</span>
                  </div>
                </div>

                {/* Ringkasan Tarif Toko */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80 space-y-1.5 text-xs">
                  <span className="text-[11px] font-bold text-gray-700 block ">
                    Tarif Aktif Produk
                  </span>
                  <div className="flex justify-between text-gray-600 text-[11.5px]">
                    <span>Sewa 1 Hari:</span>
                    <span className="font-semibold text-gray-900">{formatRupiah(rentPriceDaily)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-[11.5px]">
                    <span>Sewa 3 Hari:</span>
                    <span className="font-semibold text-gray-900">{formatRupiah(rentPrice3d)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-[11.5px]">
                    <span>Sewa 7 Hari:</span>
                    <span className="font-semibold text-gray-900">{formatRupiah(rentPrice7d)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-gray-200 flex justify-between text-gray-900 font-bold text-xs">
                    <span>Harga Beli Penuh:</span>
                    <span className="text-[#03AC0E]">{formatRupiah(product.buyPrice)}</span>
                  </div>
                </div>

                {/* Action Button for Owner */}
                <div className="pt-1">
                  <Link
                    href={`/seller?tab=products&edit=${encodeURIComponent(product.id)}`}
                    className="w-full bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Informasi Produk</span>
                  </Link>
                  <DeleteProductButton productId={product.id} sellerId={targetSellerId} />
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm lg:sticky lg:top-24 space-y-4">
                {/* Opsi Transaksi (Hanya 1 di sini) */}
                <div>
                  <span className="text-xs font-bold text-gray-800 block mb-2">Pilih Opsi Transaksi:</span>
                  <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setActiveTab("rent")}
                      className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                        activeTab === "rent"
                          ? "bg-white text-[#03AC0E] shadow-xs font-bold"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Sewa Sekarang
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
                    </button>
                  </div>
                </div>

                {activeTab === "rent" ? (
                  <div className="space-y-3.5">
                    {/* Duration Tier Picker (1, 3, 7 Hari) */}
                    <div>
                      <label className="text-xs font-bold text-gray-800 block mb-1.5">
                        Pilih Durasi Sewa:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { days: 1, label: "1 Hari", price: rentPriceDaily },
                          { days: 3, label: "3 Hari", price: rentPrice3d },
                          { days: 7, label: "7 Hari", price: rentPrice7d },
                        ].map((tier) => (
                          <button
                            key={tier.days}
                            type="button"
                            onClick={() => setRentDuration(tier.days)}
                            className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                              rentDuration === tier.days
                                ? "border-[#03AC0E] bg-[#EBF8EE] text-[#03AC0E] shadow-2xs ring-1 ring-[#03AC0E]"
                                : "border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <span className="block text-xs font-bold">{tier.label}</span>
                            <span className="block text-[10px] font-semibold text-gray-900 mt-0.5">
                              {formatRupiah(tier.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80 text-xs space-y-2">
                      <div className="flex justify-between text-gray-600 text-[11.5px]">
                        <span>Biaya Sewa ({rentDuration} hari):</span>
                        <span className="font-semibold text-gray-900">{formatRupiah(currentRentCost)}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                        <span>Total Biaya:</span>
                        <span className="text-[#03AC0E]">{formatRupiah(currentRentCost)}</span>
                      </div>
                    </div>

                    {/* Dynamic Rent-to-Own Deduction Calculation */}
                    <div className="bg-[#EBF8EE] border border-[#03AC0E]/30 rounded-xl p-3 text-[11.5px]">
                      <div className="font-bold text-[#03AC0E] flex items-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-[#03AC0E]" />
                        <span>Kalkulasi Sewa ke Beli:</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-[11px]">
                        Jika cocok & lanjut beli permanen, pembayaran <strong>{formatRupiah(currentRentCost)}</strong> ini langsung memotong harga <strong>{formatRupiah(product.buyPrice)}</strong>.
                      </p>
                      <div className="mt-2 bg-white rounded-lg p-2 border border-[#03AC0E]/20 text-center">
                        <span className="text-[10px] text-gray-500 block font-medium">Sisa Bayar Beli:</span>
                        <span className="text-base font-extrabold text-[#03AC0E]">
                          {formatRupiah(remainingBuyPrice)}
                        </span>
                      </div>
                    </div>

                    {/* CTA Rent Button */}
                    {stock <= 0 ? (
                      <button
                        disabled
                        className="w-full bg-gray-200 border border-gray-300 text-gray-500 font-semibold py-3 rounded-xl text-xs sm:text-sm cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span>Stok Habis</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleProceed("rent")}
                        className="w-full bg-[#03AC0E] hover:bg-[#02980C] text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-xs active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Lanjut Sewa</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/80 text-xs space-y-2">
                      <div className="flex justify-between text-gray-600 text-[11.5px]">
                        <span>Harga Beli Penuh:</span>
                        <span className="font-semibold text-gray-900">{formatRupiah(product.buyPrice)}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                        <span>Total Harga:</span>
                        <span className="text-gray-900">{formatRupiah(product.buyPrice)}</span>
                      </div>
                    </div>

                    {stock <= 0 ? (
                      <button
                        disabled
                        className="w-full bg-gray-200 border border-gray-300 text-gray-500 font-semibold py-3 rounded-xl text-xs sm:text-sm cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span>Stok Habis</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleProceed("buy")}
                        className="w-full bg-[#03AC0E] hover:bg-[#02980C] text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-xs active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Lanjut Beli</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {/* Reviews Section */}
          <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xs">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 ">
                  Ulasan Pembeli
                </h2>
                <p className="text-sm text-gray-500 mt-1">{reviews.length} ulasan</p>
              </div>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800 shrink-0">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span>
                    {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                  </span>
                  <span className="text-gray-400 font-normal">/ 5.0</span>
                </div>
              )}
            </div>
            <ReviewsShowcase reviews={reviews} showProductInfo={false} preview />
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive PIN Serah-Terima COD Modal */}
      <PinHandoverDemo
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
      />

      {/* Location & Radius Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentDistrict={selectedDistrict}
        currentRadius={selectedRadius}
        onApplyLocation={(district, radius, coords) => {
          setSelectedDistrict(district);
          setSelectedRadius(radius);
          if (coords) {
            setUserCoords(coords);
          }
          if (typeof window !== "undefined") {
            localStorage.setItem("trypedia_user_location", district);
            localStorage.setItem("trypedia_user_radius", String(radius));
            localStorage.setItem("trypedia_radius_active", "1");
            if (coords) {
              localStorage.setItem("trypedia_user_coords", JSON.stringify(coords));
            }
          }
        }}
      />
    </div>
  );
}
