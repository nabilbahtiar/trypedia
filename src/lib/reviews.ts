export interface ProductReview {
  id: string;
  orderId?: string | null;
  productId: string;
  productName?: string;
  productImage?: string;
  sellerId: string;
  userId: string;
  reviewerName: string;
  maskName: boolean;
  orderType: string;
  rentDuration: number;
  rating: number;
  comment: string;
  photos: string[];
  helpfulCount: number;
  createdAt: string;
}

export function maskReviewerName(name: string): string {
  const clean = (name || "Pengguna").trim();
  if (!clean) return "P***a";
  if (clean.includes("***")) return clean;
  const firstWord = clean.split(/\s+/)[0] || clean;
  if (firstWord.length <= 2) {
    return `${firstWord[0]}***`;
  }
  return `${firstWord[0]}***${firstWord[firstWord.length - 1]}`;
}

export function formatRelativeReviewDate(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) return "Baru saja";

  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Hari ini";
  if (diffDays === 1) return "1 hari lalu";
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} minggu lalu`;
  }
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

