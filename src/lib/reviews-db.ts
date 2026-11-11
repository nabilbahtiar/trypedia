import { query } from "@/lib/db";
import type { ProductReview } from "@/lib/reviews";
import { maskReviewerName } from "@/lib/reviews";

let reviewsTableEnsured = false;

export async function ensureReviewsTable() {
  if (reviewsTableEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      product_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      order_type TEXT NOT NULL DEFAULT 'rent',
      rent_duration INTEGER NOT NULL DEFAULT 3,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      photos JSONB NOT NULL DEFAULT '[]'::jsonb,
      helpful_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS mask_name BOOLEAN NOT NULL DEFAULT true`);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_id_unique_idx
    ON reviews (order_id) WHERE order_id IS NOT NULL
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS reviews_seller_id_idx
    ON reviews (seller_id, created_at DESC)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS reviews_product_id_idx
    ON reviews (product_id, created_at DESC)
  `);
  reviewsTableEnsured = true;
}

export function mapReviewRow(row: any): ProductReview {
  return {
    id: row.id,
    orderId: row.order_id ?? row.orderId ?? null,
    productId: row.product_id ?? row.productId,
    productName: (row.product_name ?? row.productName) || undefined,
    productImage: (row.product_image ?? row.productImage) || undefined,
    sellerId: row.seller_id ?? row.sellerId,
    userId: row.user_id ?? row.userId,
    reviewerName: (row.mask_name ?? row.maskName ?? true)
      ? maskReviewerName(row.reviewer_name ?? row.reviewerName)
      : (row.reviewer_name ?? row.reviewerName),
    maskName: row.mask_name ?? row.maskName ?? true,
    orderType: (row.order_type ?? row.orderType) || "rent",
    rentDuration: Number(row.rent_duration ?? row.rentDuration) || 3,
    rating: Number(row.rating) || 5,
    comment: row.comment || "",
    photos: Array.isArray(row.photos) ? row.photos.slice(0, 3) : [],
    helpfulCount: Number(row.helpful_count ?? row.helpfulCount) || 0,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  };
}

export async function recalculateRatings(productId: string, sellerId: string) {
  await ensureReviewsTable();

  const prodStats = await query(
    `SELECT COUNT(*)::int as review_count,
            COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as avg_rating
     FROM reviews
     WHERE product_id = $1`,
    [productId]
  );
  const reviewCount = prodStats[0]?.review_count || 0;
  const prodRating = reviewCount > 0 ? parseFloat(prodStats[0].avg_rating) : 0;

  await query(
    `UPDATE products
     SET rating = $1, review_count = $2,
         rent_count = (SELECT COUNT(*) FROM orders WHERE product_id = $3 AND order_type = 'rent'
           AND status IN ('DISEWA', 'SELESAI', 'SELESAI_DIBELI'))
     WHERE id = $3`,
    [prodRating, reviewCount, productId]
  );

  const storeStats = await query(
    `SELECT COUNT(*)::int as review_count,
            COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as avg_rating
     FROM reviews
     WHERE seller_id = $1`,
    [sellerId]
  );
  const storeReviewCount = storeStats[0]?.review_count || 0;
  const storeRating =
    storeReviewCount > 0 ? parseFloat(storeStats[0].avg_rating) : 0;

  await query(
    `UPDATE stores SET rating = $1 WHERE user_id = $2`,
    [storeRating, sellerId]
  );

  return {
    productRating: prodRating,
    productReviewCount: reviewCount,
    storeRating,
  };
}

