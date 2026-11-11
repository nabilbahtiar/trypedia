import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureReviewsTable, mapReviewRow, recalculateRatings } from "@/lib/reviews-db";
import { persistDataUrlIfNeeded } from "@/lib/media";
import { getServerSessionUser } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    await ensureReviewsTable();
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const productId = searchParams.get("productId");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    let sql = `
      SELECT r.id, r.order_id, r.product_id, r.seller_id, r.user_id, r.reviewer_name,
             r.order_type, r.rent_duration, r.rating, r.comment, r.photos, r.mask_name, r.helpful_count, r.created_at,
             p.name as product_name,
             COALESCE(p.images->>0, '') as product_image
      FROM reviews r
      LEFT JOIN products p ON p.id = r.product_id
    `;
    const params: any[] = [];

    if (productId) {
      params.push(productId);
      sql += ` WHERE r.product_id = $${params.length}`;
    } else if (sellerId) {
      params.push(sellerId);
      sql += ` WHERE r.seller_id = $${params.length}`;
    }

    sql += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await query(sql, params);
    const reviews = rows.map(mapReviewRow);

    return NextResponse.json({ success: true, reviews });
  } catch (err: any) {
    console.error("GET /api/reviews error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ success: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
    await ensureReviewsTable();
    const body = await request.json();
    const {
      orderId,
      productId: inputProductId,
      rating: rawRating,
      comment = "",
      photos: rawPhotos = [],
      maskName = true,
    } = body;
    const userId = user.id;
    const reviewerName = user.name || "Pengguna TryPedia";

    const rating = Number(rawRating);
    if (!orderId || !Number.isInteger(rating) || rating < 1 || rating > 5 || !Array.isArray(rawPhotos) || rawPhotos.length > 3 || typeof maskName !== "boolean") {
      return NextResponse.json({ success: false, message: "Pilih pesanan, beri bintang 1–5, dan unggah maksimal 3 foto." }, { status: 400 });
    }
    const cleanComment = String(comment).trim();

    if (!cleanComment) {
      return NextResponse.json(
        { success: false, message: "Deskripsi ulasan tidak boleh kosong." },
        { status: 400 }
      );
    }

    let finalProductId = inputProductId;
    let finalSellerId = "";
    let finalOrderType = "rent";
    let finalRentDuration = 3;

    // Check order validation if orderId provided
    if (orderId) {
      const existingReviews = await query(
        `SELECT id FROM reviews WHERE order_id = $1`,
        [orderId]
      );
      if (existingReviews && existingReviews.length > 0) {
        return NextResponse.json(
          { success: false, message: "Pesanan ini sudah pernah Anda beri ulasan." },
          { status: 400 }
        );
      }

      const orderRows = await query(`SELECT * FROM orders WHERE order_id = $1`, [orderId]);
      if (!orderRows.length || orderRows[0].user_id !== userId) {
        return NextResponse.json({ success: false, message: "Pesanan tidak ditemukan." }, { status: 404 });
      }
      if (orderRows && orderRows.length > 0) {
        const ord = orderRows[0];
        if (ord.status !== "SELESAI" && ord.status !== "SELESAI_DIBELI") {
          return NextResponse.json(
            { success: false, message: "Hanya pesanan yang telah selesai yang dapat diulas." },
            { status: 400 }
          );
        }
        finalProductId = ord.product_id;
        finalOrderType = ord.status === "SELESAI_DIBELI" ? "buy" : ord.order_type || "rent";
        finalRentDuration = ord.rent_duration || 3;
        finalSellerId = ord.seller_id;
      }
    }

    if (!finalProductId) {
      return NextResponse.json(
        { success: false, message: "ID Produk tidak valid." },
        { status: 400 }
      );
    }

    // Lookup product to confirm seller_id and increase rent count
    const prodRows = await query(`SELECT id, seller_id, name FROM products WHERE id = $1`, [
      finalProductId,
    ]);
    if (!prodRows || prodRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Produk tidak ditemukan di sistem." },
        { status: 404 }
      );
    }

    if (!finalSellerId) {
      finalSellerId = prodRows[0].seller_id;
    }

    // Persist photos (max 3)
    const photosArray = Array.isArray(rawPhotos) ? rawPhotos.slice(0, 3) : [];
    const persistedPhotos: string[] = [];
    for (const photo of photosArray) {
      if (typeof photo === "string" && photo.trim()) {
        const safeUrl = await persistDataUrlIfNeeded(photo.trim(), "reviews");
        if (safeUrl) persistedPhotos.push(safeUrl);
      }
    }

    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const inserted = await query(
      `INSERT INTO reviews (
        id, order_id, product_id, seller_id, user_id, reviewer_name,
        order_type, rent_duration, rating, comment, photos, mask_name, helpful_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, 0, CURRENT_TIMESTAMP)
      ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO NOTHING RETURNING id`,
      [
        reviewId,
        orderId || null,
        finalProductId,
        finalSellerId,
        userId,
        reviewerName,
        finalOrderType,
        finalRentDuration,
        rating,
        cleanComment,
        JSON.stringify(persistedPhotos),
        maskName,
      ]
    );
    if (!inserted.length) {
      return NextResponse.json({ success: false, message: "Pesanan ini sudah pernah Anda beri ulasan." }, { status: 409 });
    }

    // Auto recalculate aggregate ratings for product and seller store
    const newStats = await recalculateRatings(finalProductId, finalSellerId);

    // Reward user with 500 coins for submitting review
    try {
      await query(
        `INSERT INTO user_coins (user_id, balance) VALUES ($1, 500)
         ON CONFLICT (user_id) DO UPDATE SET balance = user_coins.balance + 500`,
        [userId]
      );
      const coinTxId = `coin_tx_rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await query(
        `INSERT INTO coin_transactions (id, user_id, type, amount, description, status)
         VALUES ($1, $2, 'BONUS', 500, $3, 'SUCCESS')
         ON CONFLICT (id) DO NOTHING`,
        [coinTxId, userId, `Bonus Ulasan Produk: ${prodRows[0].name.slice(0, 40)}`]
      );
    } catch (coinErr) {
      console.warn("Failed to credit review coins:", coinErr);
    }

    const newReview = mapReviewRow({
      id: reviewId,
      order_id: orderId || null,
      product_id: finalProductId,
      product_name: prodRows[0].name,
      seller_id: finalSellerId,
      user_id: userId,
      reviewer_name: reviewerName,
      mask_name: maskName,
      order_type: finalOrderType,
      rent_duration: finalRentDuration,
      rating,
      comment: cleanComment,
      photos: persistedPhotos,
      helpful_count: 0,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Terima kasih! Ulasan Anda berhasil diterbitkan.",
      review: newReview,
      stats: newStats,
    });
  } catch (err: any) {
    console.error("POST /api/reviews error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureReviewsTable();
    const body = await request.json();
    const { reviewId, delta = 1 } = body;

    if (!reviewId) {
      return NextResponse.json(
        { success: false, message: "reviewId wajib disertakan" },
        { status: 400 }
      );
    }

    const diff = Number(delta) || 1;
    const rows = await query(
      `UPDATE reviews
       SET helpful_count = GREATEST(0, helpful_count + $1)
       WHERE id = $2
       RETURNING helpful_count`,
      [diff, reviewId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Ulasan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      helpfulCount: Number(rows[0].helpful_count) || 0,
    });
  } catch (err: any) {
    console.error("PATCH /api/reviews error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

