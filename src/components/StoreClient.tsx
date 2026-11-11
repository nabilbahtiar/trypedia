"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ReviewsShowcase from "@/components/ReviewsShowcase";
import ShareButton from "@/components/ShareButton";
import StoreHoursDisplay from "@/components/StoreHoursDisplay";
import { useAuth } from "@/context/AuthContext";
import { Product } from "@/data/products";
import type { ProductReview } from "@/lib/reviews";
import { calculateDistanceKm, type Coordinates } from "@/lib/geo";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Star,
  Clock,
  Search,
  Check,
  Package,
  Settings,
  Plus,
} from "lucide-react";

export interface PublicStoreInfo {
  id: string;
  userId: string;
  storeName: string;
  storeSlogan?: string | null;
  storeAvatar?: string | null;
  storeDescription?: string | null;
  address?: string | null;
  district?: string | null;
  hours?: string | null;
  responseSpeed?: string | null;
  rating?: number | string | null;
  isVerified?: boolean | null;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
  frontPhotoUrl?: string | null;
}

export interface PublicStoreStats {
  totalProducts: number;
  totalOrders: number;
  completedOrdersCount: number;
  rentedOrdersCount: number;
  codLocationsCount: number;
}

export interface PublicCodLocation {
  id: string | number;
  name: string;
  address?: string | null;
  detail?: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl?: string | null;
}

interface StoreClientProps {
  store: PublicStoreInfo;
  stats: PublicStoreStats;
  locations: PublicCodLocation[];
  products: Product[];
  reviews?: ProductReview[];
  initialViewerId?: string | null;
}

type StoreTab = "beranda" | "produk" | "ulasan";
type SortOption = "newest" | "rent_asc" | "rent_desc" | "buy_asc" | "popular";

function StoreClientContent({
  store,
  stats,
  locations,
  products,
  reviews = [],
  initialViewerId = null,
}: StoreClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabQuery = searchParams.get("tab");
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<StoreTab>(
    tabQuery === "ulasan" ? "ulasan" : tabQuery === "produk" ? "produk" : "beranda"
  );
  const [selectedEtalase, setSelectedEtalase] = useState<string>("all");
  const [storeSearch, setStoreSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);

  const viewerId = user?.id ?? initialViewerId;
  const isOwner = Boolean(viewerId && viewerId === store.userId);
  useEffect(() => {
    setActiveTab(tabQuery === "ulasan" ? "ulasan" : tabQuery === "produk" ? "produk" : "beranda");
  }, [tabQuery]);
  const selectTab = (tab: StoreTab) => {
    setActiveTab(tab);
    router.replace(`/store/${encodeURIComponent(store.userId)}?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawCoords = localStorage.getItem("trypedia_user_coords");
    if (rawCoords) {
      try {
        const parsed = JSON.parse(rawCoords);
        if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
          setUserCoords({ lat: parsed.lat, lng: parsed.lng });
          return;
        }
      } catch {}
    }

    if (viewerId) {
      fetch(`/api/addresses?userId=${encodeURIComponent(viewerId)}`)
        .then((res) => res.json())
        .then((data) => {
          const primary =
            data?.addresses?.find((a: any) => a.isPrimary) || data?.addresses?.[0];
          if (
            primary &&
            Number.isFinite(Number(primary.latitude)) &&
            Number.isFinite(Number(primary.longitude))
          ) {
            setUserCoords({
              lat: Number(primary.latitude),
              lng: Number(primary.longitude),
            });
          }
        })
        .catch(() => {});
    }
  }, [viewerId]);

  const dynamicDistanceKm = useMemo(() => {
    if (
      isOwner ||
      !userCoords ||
      !Number.isFinite(store.latitude) ||
      !Number.isFinite(store.longitude)
    ) {
      return null;
    }
    return calculateDistanceKm(
      userCoords.lat,
      userCoords.lng,
      store.latitude,
      store.longitude
    );
  }, [isOwner, userCoords, store.latitude, store.longitude]);

  const availableProductsCount = useMemo(
    () => products.filter((p) => (p.stock ?? 1) > 0).length,
    [products]
  );

  const outOfStockProductsCount = useMemo(
    () => products.filter((p) => (p.stock ?? 1) <= 0).length,
    [products]
  );

  const categoriesInStore = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      if (!product.category) continue;
      counts.set(product.category, (counts.get(product.category) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  const etalaseOptions = useMemo(() => {
    const list: { id: string; label: string; count: number }[] = [
      { id: "all", label: "Semua Produk", count: products.length },
    ];
    if (outOfStockProductsCount > 0) {
      list.push({ id: "available", label: "Produk Tersedia", count: availableProductsCount });
      list.push({ id: "out_of_stock", label: "Stok Habis", count: outOfStockProductsCount });
    }
    for (const cat of categoriesInStore) {
      list.push({ id: `cat:${cat.name}`, label: cat.name, count: cat.count });
    }
    return list;
  }, [products.length, availableProductsCount, outOfStockProductsCount, categoriesInStore]);

  const activeEtalaseLabel =
    etalaseOptions.find((opt) => opt.id === selectedEtalase)?.label || "Semua Produk";

  const filteredAndSortedProducts = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    const list = products.filter((product) => {
      if (q && !product.name.toLowerCase().includes(q) && !product.category.toLowerCase().includes(q)) {
        return false;
      }
      if (selectedEtalase === "available") return (product.stock ?? 1) > 0;
      if (selectedEtalase === "out_of_stock") return (product.stock ?? 1) <= 0;
      if (selectedEtalase.startsWith("cat:")) {
        return product.category === selectedEtalase.slice(4);
      }
      return true;
    });

    if (sortBy === "rent_asc") {
      return [...list].sort((a, b) => a.rentPriceDaily - b.rentPriceDaily);
    }
    if (sortBy === "rent_desc") {
      return [...list].sort((a, b) => b.rentPriceDaily - a.rentPriceDaily);
    }
    if (sortBy === "buy_asc") {
      return [...list].sort((a, b) => a.buyPrice - b.buyPrice);
    }
    if (sortBy === "popular") {
      return [...list].sort(
        (a, b) => (b.rentCount || 0) - (a.rentCount || 0) || (b.rating || 0) - (a.rating || 0)
      );
    }
    return list;
  }, [products, storeSearch, selectedEtalase, sortBy]);

  const totalReviewCount = useMemo(
    () =>
      reviews.length > 0
        ? reviews.length
        : products.reduce((sum, p) => sum + (p.reviewCount || 0), 0),
    [reviews.length, products]
  );

  const totalTransactions = (stats.completedOrdersCount || 0) + (stats.rentedOrdersCount || 0);

  const storeRatingText = useMemo(() => {
    if (totalReviewCount === 0) return "0.0";
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      return avg.toFixed(1);
    }
    return Number(store.rating) > 0 ? Number(store.rating).toFixed(1) : "0.0";
  }, [reviews, store.rating, totalReviewCount]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5 text-xs text-gray-500 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-[#03AC0E] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-900 font-medium truncate">{store.storeName}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-5 flex-1 w-full space-y-5">
        {/* Store Header Banner Card (Tokopedia Style) */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-center gap-5 lg:gap-8">
            {/* Store Identity & Actions */}
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-600 text-white font-bold text-xl flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 shadow-xs">
                {store.photoUrl ? (
                  <img
                    src={store.photoUrl}
                    alt={store.storeName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  store.storeAvatar || store.storeName.slice(0, 2).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {store.isVerified === true && (
                    <CheckCircle2 className="w-4 h-4 text-[#03AC0E] shrink-0" />
                  )}
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    {store.storeName}
                  </h1>
                </div>

                <div className="mt-1.5 text-xs text-gray-500 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 leading-relaxed">
                  <span className="inline-flex items-start gap-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-[#03AC0E] shrink-0" />
                    <span>{store.address || store.district || "Jember, Jawa Timur"}</span>
                  </span>
                  {isOwner ? (
                    <span className="text-[#03AC0E] font-medium">(Toko Anda)</span>
                  ) : (
                    dynamicDistanceKm !== null && (
                      <span className="text-[#03AC0E] font-medium">
                        • {dynamicDistanceKm.toFixed(1)} km dari Anda
                      </span>
                    )
                  )}
                  <StoreHoursDisplay hours={store.hours} compact />
                </div>

                {/* Action Row: No Follow button for any user; No Chat button for owner */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {!isOwner && (
                    <Link
                      href={`/chat?seller=${encodeURIComponent(store.storeName)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#03AC0E] hover:bg-[#02980C] px-4 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat Penjual</span>
                    </Link>
                  )}

                  <ShareButton title={store.storeName} description={store.storeDescription || store.address} image={store.photoUrl || store.frontPhotoUrl} path={`/store/${encodeURIComponent(store.userId)}`} />
                </div>
              </div>
            </div>

            {/* Store Rating & Performance Metrics */}
            <div className="grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-gray-50/70 py-3 lg:min-w-[320px] text-center">
              <div className="px-3">
                <div className="flex flex-wrap items-center justify-center gap-1 text-sm sm:text-base font-bold text-gray-900">
                  <Star className={`w-4 h-4 ${totalReviewCount > 0 ? "fill-amber-400 text-amber-400" : "fill-gray-300 text-gray-300"}`} />
                  <span>{storeRatingText}</span>
                  <span className="text-xs font-normal text-gray-500">
                    ({totalReviewCount} ulasan)
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">Rating &amp; Ulasan</p>
              </div>
              <div className="px-3">
                <div className="text-sm sm:text-base font-bold text-gray-900">
                  {products.length} Produk
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">Etalase Aktif</p>
              </div>
              <div className="px-3">
                <div className="text-sm sm:text-base font-bold text-gray-900">
                  {totalTransactions}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">Total Transaksi</p>
              </div>
            </div>
          </div>

          {/* Store Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-100 pt-3 -mb-5 sm:-mb-6">
            <nav className="flex items-center gap-6" aria-label="Navigasi toko">
            {(
              [
                { id: "beranda", label: "Beranda" },
                { id: "produk", label: "Produk" },
                { id: "ulasan", label: "Ulasan" },
              ] as { id: StoreTab; label: string }[]
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                    active
                      ? "border-[#03AC0E] text-[#03AC0E]"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            </nav>
            {isOwner && <Link href="/seller?tab=orders" className="mb-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#03AC0E]/25 bg-[#EBF8EE] px-3.5 py-2 text-xs font-semibold text-[#03AC0E] hover:bg-green-100 transition-colors"><Package className="h-4 w-4" />Pesanan Toko</Link>}
          </div>
        </section>

        {/* TAB: PRODUK */}
        {activeTab === "produk" && (
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 items-start">
            {/* Left Sidebar: Etalase Toko */}
            <aside className="bg-white rounded-2xl border border-gray-200 p-3 shadow-2xs">
              <h2 className="text-xs font-bold text-gray-900 px-2.5 py-2 border-b border-gray-100 mb-1.5">
                Etalase Toko ({etalaseOptions.length})
              </h2>
              <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
                {etalaseOptions.map((opt) => {
                  const isActive = selectedEtalase === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedEtalase(opt.id)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer whitespace-nowrap lg:whitespace-normal shrink-0 ${
                        isActive
                          ? "bg-[#EBF8EE] text-[#03AC0E] font-bold"
                          : "text-gray-700 hover:bg-gray-50 font-medium"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span
                        className={`text-[11px] ${
                          isActive ? "text-[#03AC0E]" : "text-gray-400"
                        }`}
                      >
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Right Main Catalog */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">
                    {activeEtalaseLabel}
                  </h2>
                  <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                    {filteredAndSortedProducts.length} Produk
                  </span>
                  {isOwner && <Link href="/seller?tab=products&create=1" className="ml-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#03AC0E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#02980C] transition-colors"><Plus className="h-4 w-4 shrink-0" />Tambah Produk Baru</Link>}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 border-t border-gray-100 pt-3">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={storeSearch}
                      onChange={(e) => setStoreSearch(e.target.value)}
                      placeholder="Cari produk di toko..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-[#03AC0E]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">Urutkan</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#03AC0E] cursor-pointer"
                    >
                      <option value="newest">Terbaru</option>
                      <option value="rent_asc">Sewa Termurah</option>
                      <option value="rent_desc">Sewa Tertinggi</option>
                      <option value="buy_asc">Beli Termurah</option>
                      <option value="popular">Paling Banyak Disewa</option>
                    </select>
                  </div>
                </div>
              </div>

              {filteredAndSortedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {filteredAndSortedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      userCoords={userCoords}
                      currentUserId={viewerId}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-2 shadow-2xs">
                  <Package className="w-8 h-8 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-bold text-gray-900">
                    Produk Tidak Ditemukan
                  </h3>
                  <p className="text-xs text-gray-500">
                    Tidak ada produk yang cocok dengan filter atau kata kunci Anda.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: BERANDA */}
        {activeTab === "beranda" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <h2 className="text-base font-bold text-gray-900">Informasi Toko</h2>
                {isOwner && <Link href="/seller?tab=settings" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-[#03AC0E] hover:text-[#03AC0E] transition-colors"><Settings className="h-4 w-4" />Pengaturan</Link>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 text-sm">
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 text-xs block">Deskripsi Toko</span>
                    <p className="text-gray-800 leading-relaxed mt-0.5">
                      {store.storeDescription ||
                        "Menyediakan barang second berkualitas yang siap disewa terlebih dahulu maupun dibeli permanen di wilayah Jember."}
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="text-gray-500 text-xs block">Jam Operasional</span>
                    <StoreHoursDisplay hours={store.hours} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500 text-xs block">Alamat Toko</span>
                    <p className="text-gray-800 mt-0.5">
                      {store.address || store.district || "Jember, Jawa Timur"}
                    </p>
                  </div>
                  {locations.length > 0 && (
                    <div className="pt-2">
                      <span className="text-gray-500 text-xs block mb-1.5">
                        Titik Temu COD Tersedia ({locations.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {locations.map((loc) => (
                          <span
                            key={String(loc.id)}
                            className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-md font-medium"
                          >
                            <MapPin className="w-3 h-3 text-[#03AC0E]" />
                            <span>{loc.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {products.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">
                    Produk Terbaru dari {store.storeName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => selectTab("produk")}
                    className="text-xs font-semibold text-[#03AC0E] hover:underline cursor-pointer"
                  >
                    Lihat Semua Produk
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {products.slice(0, 5).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      userCoords={userCoords}
                      currentUserId={viewerId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: ULASAN */}
        {activeTab === "ulasan" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Rating &amp; Ulasan Toko
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ulasan asli dari pembeli yang telah menyelesaikan transaksi dan sewa di {store.storeName}
                </p>
              </div>
              <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-xl font-bold text-gray-900">{storeRatingText}</span>
                <span className="text-xs text-gray-500">/ 5.0 ({totalReviewCount} ulasan)</span>
              </div>
            </div>

            <ReviewsShowcase reviews={reviews} showProductInfo={true} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function StoreClient(props: StoreClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#03AC0E] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <StoreClientContent {...props} />
    </Suspense>
  );
}

