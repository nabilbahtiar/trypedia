"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Star, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { Product } from "@/data/products";
import { calculateDistanceKm, formatDistanceKm, type Coordinates } from "@/lib/geo";

interface ProductCardProps {
  product: Product;
  userCoords?: Coordinates | null;
  currentUserId?: string | null;
}

export default function ProductCard({
  product,
  userCoords = null,
  currentUserId = null,
}: ProductCardProps) {
  const [stock, setStock] = useState<number>(product.stock ?? 1);
  const [isLockedByPayment, setIsLockedByPayment] = useState<boolean>(
    Boolean(product.isStockLocked)
  );

  useEffect(() => {
    setStock(product.stock ?? 1);
    setIsLockedByPayment(Boolean(product.isStockLocked));
  }, [product.stock, product.isStockLocked]);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/products/stock?productId=${encodeURIComponent(product.id)}`);
        const data = await res.json();
        if (data.success) {
          setStock(data.stock);
          setIsLockedByPayment(Boolean(data.isLocked));
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

  const sellerId = product.sellerId || product.seller?.id;
  const isOwner = Boolean(currentUserId && sellerId && currentUserId === sellerId);
  const distanceLabel =
    !isOwner &&
    userCoords &&
    typeof product.seller?.lat === "number" &&
    typeof product.seller?.lng === "number"
      ? formatDistanceKm(
          calculateDistanceKm(
            userCoords.lat,
            userCoords.lng,
            product.seller.lat,
            product.seller.lng
          )
        )
      : "";
  const districtText = product.seller?.district || "Jember";
  const locationPillText = isOwner
    ? `${districtText} (Toko Anda)`
    : distanceLabel
      ? `${districtText} (${distanceLabel})`
      : districtText;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isOutOfStock = stock <= 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className={`bg-white rounded-xl border transition-all duration-200 flex flex-col overflow-hidden cursor-pointer group block ${
        isOutOfStock
          ? "border-red-200 shadow-2xs opacity-90"
          : "border-gray-200/90 hover:border-[#03AC0E]/60 shadow-2xs hover:shadow-md"
      }`}
    >
      {/* Product Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
            isOutOfStock ? "grayscale-[35%]" : ""
          }`}
        />

        {/* Badge Stok Habis (hanya tampil jika stok kosong) */}
        {isOutOfStock && (
          <div className="absolute top-2 left-2 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md backdrop-blur-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Stok Habis</span>
          </div>
        )}

        {/* Distance Pill */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs text-gray-800 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#03AC0E]" />
          <span>{locationPillText}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Title / Nama Produk */}
          <h3 className="text-xs sm:text-[13px] font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-[#03AC0E] transition-colors mb-2">
            {product.name}
          </h3>

          {/* Pricing Highlight (Sewa vs Beli) */}
          <div className="space-y-1 mb-2">
            {/* Sewa */}
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-semibold text-gray-500">Sewa:</span>
              <span className="text-sm sm:text-base font-bold text-gray-900">
                {formatRupiah(product.rentPriceDaily)}
              </span>
              <span className="text-[10px] font-medium text-gray-500">/hari</span>
            </div>

            {/* Beli */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="font-medium text-gray-500">Beli:</span>
              <span className="font-bold text-gray-900">{formatRupiah(product.buyPrice)}</span>
            </div>
          </div>

          {isOutOfStock && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                <AlertCircle className="w-2.5 h-2.5 text-red-600" />
                <span>Stok Habis</span>
              </span>
            </div>
          )}
        </div>

        {/* Rating & Seller */}
        <div className="pt-2 border-t border-gray-100 text-[11px]">
          {/* Rating */}
          <div className="flex items-center gap-1 text-gray-700">
            {product.reviewCount && product.reviewCount > 0 ? (
              <>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-gray-800">
                  {Number(product.rating) > 0 ? Number(product.rating).toFixed(1) : "0.0"}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">{product.reviewCount} ulasan</span>
              </>
            ) : (
              <>
                <Star className="w-3.5 h-3.5 fill-gray-300 text-gray-300" />
                <span className="font-semibold text-gray-400">0.0</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400">Belum ada ulasan</span>
              </>
            )}
          </div>

          {/* Seller */}
          <div className="flex items-center gap-1 text-gray-500 mt-1 text-[10.5px]">
            <CheckCircle2 className="w-3 h-3 text-[#03AC0E] shrink-0" />
            <span className="truncate font-semibold text-gray-700">{product.seller.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
