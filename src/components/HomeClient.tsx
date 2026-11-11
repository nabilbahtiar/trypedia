"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import HomeBannerGallery from "@/components/HomeBannerGallery";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import LocationModal from "@/components/LocationModal";
import { type Product } from "@/data/products";
import { useAuth } from "@/context/AuthContext";
import {
  calculateDistanceKm,
  formatDistanceKm,
  formatRadiusLabel,
  isSellerRegisteredInJember,
  parseStoredRadius,
  type Coordinates,
  type RadiusFilter,
} from "@/lib/geo";
import {
  ArrowRight,
  LayoutGrid,
  Shirt,
  Smartphone,
  Gamepad2,
  Armchair,
  Sliders,
  AlertCircle,
} from "lucide-react";

interface HomeClientProps {
  initialProducts: Product[];
}

export default function HomeClient({ initialProducts }: HomeClientProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedRadius, setSelectedRadius] = useState<RadiusFilter>(2);
  const [radiusFilterActive, setRadiusFilterActive] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Load saved location & coordinates first; geolocate only if not saved yet
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLoc = localStorage.getItem("trypedia_user_location");
    const savedRad = localStorage.getItem("trypedia_user_radius");
    const savedRadActive = localStorage.getItem("trypedia_radius_active");
    const savedCoords = localStorage.getItem("trypedia_user_coords");

    if (savedLoc) setSelectedDistrict(savedLoc);
    if (savedRad) {
      setSelectedRadius(parseStoredRadius(savedRad));
    }
    if (savedRadActive === "1") {
      setRadiusFilterActive(true);
    }
    if (savedCoords) {
      try {
        const parsed = JSON.parse(savedCoords);
        if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
          setUserCoords({ lat: parsed.lat, lng: parsed.lng });
        }
      } catch {}
    }

    if ((!savedLoc || !savedCoords) && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracyM = pos.coords.accuracy || 0;

          // On desktop PCs without GPS hardware, browser IP/Wi-Fi fallback often reports > 5km inaccuracy.
          // If user is logged in and accuracy is coarse (> 5km), prefer their primary saved account address first.
          if (accuracyM > 5000 && user?.id && !savedCoords) {
            try {
              const addrRes = await fetch(`/api/addresses?userId=${encodeURIComponent(user.id)}`);
              const addrData = await addrRes.json();
              const primary = addrData?.addresses?.find((a: any) => a.isPrimary) || addrData?.addresses?.[0];
              if (primary && Number.isFinite(Number(primary.latitude)) && Number.isFinite(Number(primary.longitude))) {
                const accCoords = { lat: Number(primary.latitude), lng: Number(primary.longitude) };
                setUserCoords(accCoords);
                localStorage.setItem("trypedia_user_coords", JSON.stringify(accCoords));
                if (!savedLoc && primary.streetAddress) {
                  const shortName = primary.streetAddress.split(",")[0]?.trim() || "Jember";
                  setSelectedDistrict(shortName);
                  localStorage.setItem("trypedia_user_location", shortName);
                }
                return;
              }
            } catch {}
          }

          const coords = { lat, lng };
          setUserCoords(coords);
          localStorage.setItem("trypedia_user_coords", JSON.stringify(coords));

          if (!savedLoc) {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                  headers: { "Accept-Language": "id,en" },
                }
              );
              if (res.ok) {
                const data = await res.json();
                const addr = data.address || {};
                const road = addr.road || addr.residential || addr.street || addr.pedestrian || "";
                const suburb = addr.suburb || addr.village || addr.neighbourhood || addr.city_district || "";
                const city = addr.city || addr.town || addr.municipality || addr.county || addr.state_district || "";

                let formattedName = "";
                if (road && suburb) {
                  formattedName = `${road}, ${suburb}`;
                } else if (suburb && city) {
                  formattedName = `${suburb}, ${city}`;
                } else if (road && city) {
                  formattedName = `${road}, ${city}`;
                } else if (city) {
                  formattedName = city;
                } else if (suburb) {
                  formattedName = suburb;
                }

                if (formattedName) {
                  setSelectedDistrict(formattedName);
                  localStorage.setItem("trypedia_user_location", formattedName);
                }
              }
            } catch {
              // Ignore fetch error
            }
          }
        },
        () => {
          // Denied or unavailable
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const [productList, setProductList] = useState<Product[]>(initialProducts);

  useEffect(() => {
    setProductList(initialProducts);
  }, [initialProducts]);

  // Refresh lightweight summary only when stock or catalog mutates
  useEffect(() => {
    const refreshProducts = async () => {
      try {
        const res = await fetch("/api/products?summary=1");
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setProductList(data.products);
        }
      } catch {}
    };

    window.addEventListener("trypedia_stock_change", refreshProducts);
    window.addEventListener("trypedia_products_change", refreshProducts);
    return () => {
      window.removeEventListener("trypedia_stock_change", refreshProducts);
      window.removeEventListener("trypedia_products_change", refreshProducts);
    };
  }, []);

  const categories = [
    { id: "all", name: "Semua Kategori", icon: LayoutGrid, color: "text-emerald-600 bg-emerald-50" },
    { id: "Fashion & Aksesori", name: "Fashion & Aksesori", icon: Shirt, color: "text-rose-600 bg-rose-50" },
    { id: "Gadget & Elektronik", name: "Gadget & Elektronik", icon: Smartphone, color: "text-blue-600 bg-blue-50" },
    { id: "Hobi & Koleksi", name: "Hobi & Koleksi", icon: Gamepad2, color: "text-purple-600 bg-purple-50" },
    { id: "Perlengkapan Rumah Tangga & Furnitur", name: "Perlengkapan Rumah Tangga & Furnitur", icon: Armchair, color: "text-amber-600 bg-amber-50" },
  ];

  const matchingProducts = productList.filter((product) => {
    if (
      searchQuery.trim() &&
      !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !product.category.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (selectedCategory !== "all" && product.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const getProductDistanceKm = (product: Product): number | null => {
    if (
      !userCoords ||
      typeof product.seller?.lat !== "number" ||
      typeof product.seller?.lng !== "number"
    ) {
      return null;
    }
    return calculateDistanceKm(
      userCoords.lat,
      userCoords.lng,
      product.seller.lat,
      product.seller.lng
    );
  };

  const hasSavedCoords = userCoords !== null;
  const filteredProducts = matchingProducts.filter((product) => {
    if (!radiusFilterActive) return true;
    if (selectedRadius === "jember") {
      return isSellerRegisteredInJember(product.seller);
    }
    if (!hasSavedCoords) return true;
    const isOwner = Boolean(user?.id && (product.sellerId === user.id || product.seller?.id === user.id));
    if (isOwner) return true;
    const dist = getProductDistanceKm(product);
    if (dist === null) return true;
    return dist <= selectedRadius;
  }).sort((a, b) => Number((a.stock ?? 1) <= 0) - Number((b.stock ?? 1) <= 0));

  const nearestOutOfRadius = matchingProducts
    .map((p) => ({ product: p, dist: getProductDistanceKm(p) }))
    .filter((entry): entry is { product: Product; dist: number } => entry.dist !== null)
    .sort((a, b) => a.dist - b.dist)[0] || null;
  const isBlockedByJemberFilter =
    selectedRadius === "jember" &&
    radiusFilterActive &&
    matchingProducts.length > 0 &&
    filteredProducts.length === 0;
  const isBlockedByRadius =
    selectedRadius !== "jember" &&
    matchingProducts.length > 0 &&
    filteredProducts.length === 0 &&
    nearestOutOfRadius !== null;
  const suggestedRadius: RadiusFilter =
    nearestOutOfRadius && nearestOutOfRadius.dist <= 5
      ? 5
      : nearestOutOfRadius && nearestOutOfRadius.dist <= 10
      ? 10
      : "jember";

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      {/* Header Marketplace */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedDistrict={selectedDistrict}
        selectedRadius={selectedRadius}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        cartCount={0}
      />

      {/* Main Marketplace Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-5 flex-1 w-full space-y-6">
        <section aria-labelledby="home-hero-title" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <div className="grid grid-cols-1 items-center gap-7 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 lg:p-9">
            <div className="max-w-lg py-1 sm:py-3">
              <h1 id="home-hero-title" className="text-3xl font-bold leading-[1.15] tracking-tight text-gray-900 sm:text-4xl lg:text-[42px]">
                Sewa dulu,<br /><span className="text-[#03AC0E]">beli kalau cocok.</span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-gray-600 sm:text-base">
                Temukan barang bekas untuk kebutuhanmu. Kalau ingin memilikinya, biaya sewa yang sudah dibayar memotong harga beli.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <a href="#produk" className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#03AC0E] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#02980C]">Lihat Produk<ArrowRight className="h-4 w-4" /></a>
                <Link href="/seller?tab=products&create=1" className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-[#03AC0E]">Mulai Jual Barang<ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
            <div className="min-w-0"><HomeBannerGallery /></div>
          </div>
        </section>

        {/* Categories Shortcut Row (Like Tokopedia) */}
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-gray-900">Kategori Pilihan</h2>
            {selectedCategory !== "all" && (
              <button
                onClick={() => setSelectedCategory("all")}
                className="text-xs text-[#03AC0E] font-semibold cursor-pointer hover:underline"
              >
                Lihat Semua Kategori
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all cursor-pointer text-center group border ${
                    isActive
                      ? "border-[#03AC0E] bg-[#EBF8EE] shadow-xs"
                      : "border-gray-200/80 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      isActive ? "bg-white text-[#03AC0E] shadow-2xs" : cat.color
                    } group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs text-center line-clamp-1 ${
                      isActive ? "font-bold text-[#03AC0E]" : "font-medium text-gray-800"
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Listing Section */}
        <div id="produk" className="scroll-mt-24 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                Rekomendasi Produk di Sekitar Anda
              </h2>
              {selectedCategory !== "all" && (
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="text-xs bg-[#EBF8EE] text-[#03AC0E] font-semibold px-2.5 py-0.5 rounded-full border border-[#03AC0E]/30 flex items-center gap-1 hover:bg-[#d8f3dc] transition-colors cursor-pointer"
                  title="Hapus filter kategori"
                >
                  <span>{selectedCategory}</span>
                  <span className="font-bold ml-1 text-xs">✕</span>
                </button>
              )}
              <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                {`${filteredProducts.length} Produk`}
              </span>
            </div>

            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="text-xs font-semibold text-[#03AC0E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ubah Radius ({formatRadiusLabel(selectedRadius, "km")})</span>
            </button>
          </div>

          {/* Grid Cards or Empty States */}
          {isBlockedByJemberFilter ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-200 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Belum Ada Produk Terdaftar di Jember
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Saat ini belum ada produk yang lokasi penjualnya terdaftar di area Kabupaten Jember untuk filter ini.
                </p>
              </div>
            </div>
          ) : isBlockedByRadius && nearestOutOfRadius ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-200 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Tidak Ada Produk dalam Radius {formatRadiusLabel(selectedRadius, "km")}
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Penjual terdekat ({nearestOutOfRadius.product.seller.name}) berjarak{" "}
                  <strong>{formatDistanceKm(nearestOutOfRadius.dist)}</strong> dari titik lokasi Anda.
                  Silakan perluas radius pencarian untuk melihat barang.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedRadius(suggestedRadius);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("trypedia_user_radius", String(suggestedRadius));
                  }
                }}
                className="bg-[#03AC0E] hover:bg-[#02980C] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>
                  {suggestedRadius === "jember"
                    ? "Tampilkan Seluruh Jember"
                    : `Atur Radius ke ${formatRadiusLabel(suggestedRadius)}`}
                </span>
              </button>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  userCoords={userCoords}
                  currentUserId={user?.id ?? null}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-200 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Belum Ada Produk di Kategori Ini
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Produk untuk kategori ini belum tersedia saat ini. Silakan cek kategori lainnya.
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory("all")}
                className="bg-[#03AC0E] hover:bg-[#02980C] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Lihat Semua Kategori</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Marketplace Footer */}
      <Footer />

      {/* Interactive Location & Radius Map Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentDistrict={selectedDistrict}
        currentRadius={selectedRadius}
        onApplyLocation={(district, radius, coords) => {
          setSelectedDistrict(district);
          setSelectedRadius(radius);
          setRadiusFilterActive(true);
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
