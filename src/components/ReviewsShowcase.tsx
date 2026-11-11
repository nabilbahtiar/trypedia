"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  User,
  X,
  ExternalLink,
} from "lucide-react";
import {
  ProductReview,
  maskReviewerName,
  formatRelativeReviewDate,
} from "@/lib/reviews";

interface ReviewsShowcaseProps {
  reviews: ProductReview[];
  showProductInfo?: boolean;
  preview?: boolean;
}

export default function ReviewsShowcase({
  reviews: initialReviews,
  showProductInfo = false,
  preview = false,
}: ReviewsShowcaseProps) {
  const [showAll, setShowAll] = useState(!preview);
  const [reviewsList, setReviewsList] = useState<ProductReview[]>(initialReviews);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [onlyWithPhotos, setOnlyWithPhotos] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"newest" | "rating_high" | "rating_low" | "helpful">("newest");
  const [mediaOpen, setMediaOpen] = useState(true);
  const [ratingOpen, setRatingOpen] = useState(true);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Track client-side helpful votes
  const [votedReviews, setVotedReviews] = useState<Record<string, boolean>>({});
  const [helpfulOverrides, setHelpfulOverrides] = useState<Record<string, number>>({});

  const handleToggleRating = (ratingNum: number) => {
    setSelectedRatings((prev) =>
      prev.includes(ratingNum)
        ? prev.filter((r) => r !== ratingNum)
        : [...prev, ratingNum]
    );
  };

  const handleToggleHelpful = async (reviewId: string) => {
    const isVoted = Boolean(votedReviews[reviewId]);
    const currentCount =
      helpfulOverrides[reviewId] ??
      (reviewsList.find((r) => r.id === reviewId)?.helpfulCount || 0);

    const nextVoted = !isVoted;
    const nextCount = Math.max(0, currentCount + (nextVoted ? 1 : -1));

    setVotedReviews((prev) => ({ ...prev, [reviewId]: nextVoted }));
    setHelpfulOverrides((prev) => ({ ...prev, [reviewId]: nextCount }));

    try {
      await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, delta: nextVoted ? 1 : -1 }),
      });
    } catch (err) {
      console.warn("Failed to update helpful count:", err);
    }
  };

  const filteredReviews = useMemo(() => {
    let list = [...reviewsList];

    if (onlyWithPhotos) {
      list = list.filter((r) => Array.isArray(r.photos) && r.photos.length > 0);
    }

    if (selectedRatings.length > 0) {
      list = list.filter((r) => selectedRatings.includes(r.rating));
    }

    list.sort((a, b) => {
      if (sortBy === "rating_high") return b.rating - a.rating;
      if (sortBy === "rating_low") return a.rating - b.rating;
      if (sortBy === "helpful") {
        const countA = helpfulOverrides[a.id] ?? a.helpfulCount;
        const countB = helpfulOverrides[b.id] ?? b.helpfulCount;
        return countB - countA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [reviewsList, onlyWithPhotos, selectedRatings, sortBy, helpfulOverrides]);

  const visibleReviews = showAll ? filteredReviews : filteredReviews.slice(0, 1);

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
        {/* SIDEBAR FILTER ULASAN (Left) */}
        {showAll && <aside className="w-full lg:w-64 xl:w-72 shrink-0">
          <div className="lg:sticky lg:top-24 bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900  pb-3 border-b border-gray-100">
              Filter Ulasan
            </h3>

            {/* Filter Media */}
            <div className="py-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setMediaOpen((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-800 hover:text-gray-900"
              >
                <span>Media</span>
                {mediaOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
              {mediaOpen && (
                <div className="mt-2.5 space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={onlyWithPhotos}
                      onChange={(e) => setOnlyWithPhotos(e.target.checked)}
                      className="w-4 h-4 text-[#03AC0E] rounded border-gray-300 focus:ring-[#03AC0E] accent-[#03AC0E]"
                    />
                    <span>Dengan Foto</span>
                  </label>
                </div>
              )}
            </div>

            {/* Filter Rating */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setRatingOpen((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-800 hover:text-gray-900"
              >
                <span>Rating</span>
                {ratingOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
              {ratingOpen && (
                <div className="mt-2.5 space-y-2">
                  {[5, 4, 3, 2, 1].map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRatings.includes(r)}
                        onChange={() => handleToggleRating(r)}
                        className="w-4 h-4 text-[#03AC0E] rounded border-gray-300 focus:ring-[#03AC0E] accent-[#03AC0E]"
                      />
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 inline" />
                        <span className="font-semibold">{r}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {(onlyWithPhotos || selectedRatings.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setOnlyWithPhotos(false);
                  setSelectedRatings([]);
                }}
                className="w-full mt-2 py-1.5 text-xs font-medium text-[#03AC0E] hover:text-[#02980C] border border-[#03AC0E]/30 rounded-lg hover:bg-emerald-50 transition"
              >
                Reset Filter
              </button>
            )}
          </div>
        </aside>}

        {/* FEED ULASAN PILIHAN (Right) */}
        <div className="flex-1 min-w-0 w-full">
          {/* Header Row: Title & Sort Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-base font-bold text-gray-900 ">
                {showAll ? "Semua ulasan" : "Ulasan terbaru"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Menampilkan {visibleReviews.length} dari {reviewsList.length} ulasan
              </p>
            </div>

            {showAll && <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-gray-600 font-medium">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-[#03AC0E] cursor-pointer"
              >
                <option value="newest">Terbaru</option>
                <option value="rating_high">Rating Tertinggi</option>
                <option value="rating_low">Rating Terendah</option>
                <option value="helpful">Paling Membantu</option>
              </select>
            </div>}
          </div>

          {/* List of Reviews */}
          {filteredReviews.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-4">
              <p className="text-sm font-semibold text-gray-700">
                Belum ada ulasan yang sesuai dengan filter
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Silakan hapus beberapa pilihan filter untuk melihat ulasan lainnya.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOnlyWithPhotos(false);
                  setSelectedRatings([]);
                }}
                className="mt-3 px-4 py-1.5 text-xs font-medium text-[#03AC0E] border border-[#03AC0E] rounded-lg hover:bg-emerald-50"
              >
                Lihat Semua Ulasan
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleReviews.map((rev) => {
                const maskedName = rev.maskName === false ? rev.reviewerName : maskReviewerName(rev.reviewerName);
                const relativeDate = formatRelativeReviewDate(rev.createdAt);
                const currentHelpful =
                  helpfulOverrides[rev.id] ?? rev.helpfulCount;
                const isVoted = Boolean(votedReviews[rev.id]);

                return (
                  <article key={rev.id} className="py-6 space-y-4">
                    {/* Optional Product Info Tag if shown on store page */}
                    {showProductInfo && rev.productName && (
                      <div className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg border border-gray-100 w-fit max-w-full">
                        {rev.productImage && (
                          <div className="w-8 h-8 rounded-md overflow-hidden bg-white shrink-0 border border-gray-200 relative">
                            <Image
                              src={rev.productImage}
                              alt={rev.productName}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <Link
                          href={`/products/${rev.productId}`}
                          className="text-xs font-semibold text-gray-800 hover:text-[#03AC0E] truncate flex items-center gap-1 group"
                        >
                          <span className="truncate">{rev.productName}</span>
                          <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#03AC0E] shrink-0" />
                        </Link>
                      </div>
                    )}

                    {/* Star Rating & Date */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-200 fill-gray-100"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">•</span>
                      <time className="text-xs text-gray-500">{relativeDate}</time>
                    </div>

                    {/* Reviewer identity & Order badge */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {maskedName}
                      </span>
                      {rev.orderType === "rent" && rev.rentDuration ? (
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          Sewa {rev.rentDuration} Hari
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          Beli Produk
                        </span>
                      )}
                    </div>

                    {/* Comment text */}
                    <p className="text-sm text-gray-800 leading-7 break-words">
                      {rev.comment}
                    </p>

                    {/* Photos Gallery (Max 3 thumbnails) */}
                    {Array.isArray(rev.photos) && rev.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {rev.photos.slice(0, 3).map((photoUrl, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setActivePhoto(photoUrl)}
                            className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 hover:opacity-90 hover:ring-2 hover:ring-[#03AC0E] transition shrink-0"
                            title="Klik untuk memperbesar foto"
                          >
                            <Image
                              src={photoUrl}
                              alt={`Foto ulasan ${pIdx + 1}`}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Helpful Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleHelpful(rev.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          isVoted
                            ? "bg-emerald-50 text-[#03AC0E] border border-[#03AC0E]/30"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <ThumbsUp
                          className={`w-3.5 h-3.5 ${
                            isVoted ? "fill-[#03AC0E] text-[#03AC0E]" : "text-gray-500"
                          }`}
                        />
                        <span>Membantu</span>
                        {currentHelpful > 0 && (
                          <span className="font-semibold ml-0.5">({currentHelpful})</span>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {preview && !showAll && reviewsList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full rounded-xl border border-[#03AC0E] px-4 py-2.5 text-sm font-semibold text-[#03AC0E] hover:bg-[#EBF8EE] transition-colors"
            >
              Lihat semua ulasan ({reviewsList.length})
            </button>
          )}
        </div>
      </div>

      {/* LIGHTBOX MODAL UNTUK FOTO ULASAN */}
      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-black rounded-xl overflow-hidden flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative w-full h-[70vh]">
              <Image
                src={activePhoto}
                alt="Foto Ulasan Pembesar"
                fill
                sizes="(max-width: 1024px) 100vw, 800px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
