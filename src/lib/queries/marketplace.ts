import { query } from "@/lib/db";
import { PRODUCTS, Product } from "@/data/products";
import { getActiveLockedProductIds } from "@/lib/stock-locks";
import { maybeAutoCancelExpiredOrders } from "@/lib/orders-maintenance";
import type { ProductReview } from "@/lib/reviews";
import { mapReviewRow } from "@/lib/reviews-db";

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString();
  return new Date(String(val)).toISOString();
}

export interface ProductQueryOptions {
  id?: string | null;
  category?: string | null;
  sellerId?: string | null;
  summary?: boolean;
}

/**
 * Queries products directly from PostgreSQL joined with live user profile names,
 * store details, active order stock locks, and primary COD coordinates.
 */
export async function getMarketplaceProducts(
  options: ProductQueryOptions = {}
): Promise<Product[]> {
  const { id, category, sellerId, summary = false } = options;
  const lockedInMem = getActiveLockedProductIds();

  try {
    const imageCol = summary
      ? `p.image as "image"`
      : `p.image as "image", p.images as "images"`;

    let sql = `
      SELECT p.id, p.seller_id as "sellerId", p.seller_name as "sellerName", p.name, p.category,
             ${imageCol}, p.condition, p.size, p.rent_price_daily as "rentPriceDaily",
             p.rent_price_3d as "rentPrice3d", p.rent_price_7d as "rentPrice7d",
             p.buy_price as "buyPrice",
             p.stock, p.rating, p.review_count as "reviewCount", p.rent_count as "rentCount",
             ${summary ? "" : `p.description, p.features, p.package_includes as "packageIncludes",`}
             p.deposit,
             COALESCE(u.name, s.store_name, p.seller_name) as "resolvedSellerName",
             COALESCE(u.photo_url, s.photo_url) as "resolvedSellerPhoto",
             s.store_avatar as "sellerAvatar",
             s.rating as "sellerRating",
             COALESCE(
               (SELECT a.street_address || ', ' || a.province_city_district
                FROM user_addresses a
                WHERE a.user_id = p.seller_id AND (a.is_shop_address = true OR a.is_primary = true)
                ORDER BY a.is_shop_address DESC, a.is_primary DESC, a.updated_at DESC
                LIMIT 1),
               s.address,
               'Jember, Jawa Timur'
             ) as "sellerLocation",
             s.district as "sellerDistrict",
             s.distance as "sellerDistance",
             s.response_speed as "sellerResponseSpeed",
             s.hours as "sellerHours",
             u.is_verified as "sellerIsVerified",
             COALESCE(
               (SELECT a.latitude
                FROM user_addresses a
                WHERE a.user_id = p.seller_id AND (a.is_shop_address = true OR a.is_primary = true)
                ORDER BY a.is_shop_address DESC, a.is_primary DESC, a.updated_at DESC
                LIMIT 1)::numeric,
               (SELECT loc.lat FROM seller_cod_locations loc WHERE loc.seller_id = p.seller_id ORDER BY loc.id ASC LIMIT 1)::numeric,
               -8.16441
             ) as "sellerLat",
             COALESCE(
               (SELECT a.longitude
                FROM user_addresses a
                WHERE a.user_id = p.seller_id AND (a.is_shop_address = true OR a.is_primary = true)
                ORDER BY a.is_shop_address DESC, a.is_primary DESC, a.updated_at DESC
                LIMIT 1)::numeric,
               (SELECT loc.lng FROM seller_cod_locations loc WHERE loc.seller_id = p.seller_id ORDER BY loc.id ASC LIMIT 1)::numeric,
               113.7178
             ) as "sellerLng",
             EXISTS (
               SELECT 1 FROM orders o
               WHERE o.product_id = p.id
                 AND o.status IN ('BELUM_BAYAR', 'SEDANG_DIKEMAS', 'DIJADWALKAN_DIKIRIM')
             ) as "activeOrderLock"
      FROM products p
      LEFT JOIN stores s ON p.seller_id = s.user_id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (id) {
      params.push(id);
      sql += ` AND p.id = $${params.length}`;
    }
    if (category && category !== "all") {
      params.push(`%${category}%`);
      sql += ` AND p.category ILIKE $${params.length}`;
    }
    if (sellerId) {
      params.push(sellerId);
      sql += ` AND p.seller_id = $${params.length}`;
    }

    sql += ` ORDER BY p.created_at DESC`;

    const rows = await query(sql, params);

    if (rows && rows.length > 0) {
      return rows.map((r: any) => {
        const isLockedMem = lockedInMem.has(r.id);
        const isLockedOrder = Boolean(r.activeOrderLock);
        const dbStock = r.stock != null ? Number(r.stock) : 1;
        const effectiveStock = isLockedMem || isLockedOrder || dbStock <= 0 ? 0 : dbStock;

        const galleryImages = summary
          ? [r.image]
          : Array.isArray(r.images) && r.images.length > 0
          ? r.images
          : [r.image];

        return {
          id: r.id,
          sellerId: r.sellerId,
          name: r.name,
          category: r.category,
          image: r.image,
          images: galleryImages,
          condition: r.condition,
          size: r.size,
          rentPriceDaily: parseFloat(r.rentPriceDaily) || 0,
          rentPrice3d: parseFloat(r.rentPrice3d) || parseFloat(r.rentPriceDaily) * 2.8 || 0,
          rentPrice7d: parseFloat(r.rentPrice7d) || parseFloat(r.rentPriceDaily) * 5.8 || 0,
          buyPrice: parseFloat(r.buyPrice) || 0,
          rating: parseFloat(r.rating) || 0,
          reviewCount: r.reviewCount || 0,
          rentCount: r.rentCount || 0,
          stock: effectiveStock,
          isStockLocked: isLockedMem || isLockedOrder,
          seller: {
            id: r.sellerId,
            name: r.resolvedSellerName || r.sellerName,
            avatar: r.resolvedSellerPhoto || r.sellerAvatar || "SZ",
            photoUrl: r.resolvedSellerPhoto || null,
            location: r.sellerLocation || "Jember",
            district: r.sellerDistrict || "Sumbersari",
            distance: r.sellerDistance || "1.2 km dari Anda",
            lat: parseFloat(r.sellerLat) || -8.16441,
            lng: parseFloat(r.sellerLng) || 113.7178,
            responseSpeed: r.sellerResponseSpeed || "~10 Menit",
            hours: r.sellerHours || "09.00 - 21.00 WIB",
            isVerified: Boolean(r.sellerIsVerified),
            rating: Number(r.sellerRating) || 0,
          },
          features: !summary && Array.isArray(r.features) ? r.features : [],
          packageIncludes: !summary && Array.isArray(r.packageIncludes) ? r.packageIncludes : [],
          deposit: parseFloat(r.deposit) || 0,
          description: !summary ? r.description || "" : "",
        };
      });
    }

    if (id) {
      const matchedStatic = PRODUCTS.find((p) => p.id === id);
      return matchedStatic ? [matchedStatic] : [];
    }
  } catch (err: any) {
    console.warn("getMarketplaceProducts DB error:", err?.message);
    if (id) {
      const matchedStatic = PRODUCTS.find((p) => p.id === id);
      return matchedStatic ? [matchedStatic] : [];
    }
    return PRODUCTS;
  }

  return PRODUCTS;
}

export async function getSellerStoreBundle(options: {
  userId?: string | null;
  storeName?: string | null;
}) {
  const { userId, storeName } = options;
  if (!userId && !storeName) return null;

  try {
    const selectQuery = `
      SELECT s.id, s.user_id as "userId", COALESCE(u.name, s.store_name) as "storeName",
             s.store_slogan as "storeSlogan", s.store_avatar as "storeAvatar",
             s.store_description as "storeDescription",
             COALESCE(
               (SELECT a.street_address || ', ' || a.province_city_district
                FROM user_addresses a
                WHERE a.user_id = s.user_id AND (a.is_shop_address = true OR a.is_primary = true)
                ORDER BY a.is_shop_address DESC, a.is_primary DESC, a.updated_at DESC
                LIMIT 1),
               s.address
             ) as address,
             s.district, s.distance, s.hours, s.response_speed as "responseSpeed",
             s.rating, u.is_verified as "isVerified",
             COALESCE(
               (SELECT a.latitude
                FROM user_addresses a
                WHERE a.user_id = s.user_id AND (a.is_shop_address = true OR a.is_primary = true)
                ORDER BY a.is_shop_address DESC, a.is_primary DESC, a.updated_at DESC
                LIMIT 1)::numeric, NULL
             ) as latitude,
             COALESCE(
               (SELECT a.longitude
                FROM user_addresses a
                WHERE a.user_id = s.user_id AND (a.is_shop_address = true OR a.is_primary = true)
                ORDER BY a.is_shop_address DESC, a.is_primary DESC, a.updated_at DESC
                LIMIT 1)::numeric, NULL
             ) as longitude,
             COALESCE(
               (SELECT a.front_photo_url
                FROM user_addresses a
                WHERE a.user_id = s.user_id AND (a.is_shop_address = true OR a.is_primary = true) AND a.front_photo_url IS NOT NULL
                ORDER BY a.is_shop_address DESC, a.is_primary DESC, a.updated_at DESC
                LIMIT 1),
               s.front_photo_url
             ) as "frontPhotoUrl",
             COALESCE(u.photo_url, s.photo_url) as "photoUrl",
             s.created_at as "createdAt"
      FROM stores s
      LEFT JOIN users u ON u.id = s.user_id
    `;

    let storeRows: any[] = [];
    if (userId) {
      storeRows = await query(`${selectQuery} WHERE s.user_id = $1`, [userId]);
    } else if (storeName) {
      storeRows = await query(
        `${selectQuery} WHERE COALESCE(u.name, s.store_name) ILIKE $1`,
        [`%${storeName}%`]
      );
    }

    if ((!storeRows || storeRows.length === 0) && userId) {
      const userRows = await query(
        `SELECT name, avatar, photo_url,is_verified FROM users WHERE id = $1`,
        [userId]
      );
      if (!userRows || userRows.length === 0) {
        return null;
      }
      const userName = userRows[0]?.name || "Toko Baru";
      const userAvatar = userRows[0]?.avatar || "TB";
      const userPhoto = userRows[0]?.photo_url || null;

      await query(
        `INSERT INTO stores (user_id, store_name, store_slogan, store_avatar, address, district, photo_url,is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7,$8)
         ON CONFLICT (user_id) DO NOTHING`,
        [
          userId,
          userName,
          "Toko Preloved & Rental Terpercaya di Jember",
          userAvatar,
          "Jember, Jawa Timur",
          "Sumbersari",
          userPhoto,
          Boolean(userRows[0].is_verified),
        ]
      );
      storeRows = await query(`${selectQuery} WHERE s.user_id = $1`, [userId]);
    }

    if (!storeRows || storeRows.length === 0) return null;

    const rawStore = storeRows[0];
    const store = {
      ...rawStore,
      latitude: rawStore.latitude == null ? null : Number(rawStore.latitude),
      longitude: rawStore.longitude == null ? null : Number(rawStore.longitude),
      createdAt: toIsoString(rawStore.createdAt),
    };
    const targetUserId = store.userId || userId;

    const [productCountRows, orderStats, codLocationsRows] = await Promise.all([
      query(`SELECT COUNT(*)::int as count FROM products WHERE seller_id = $1`, [
        targetUserId,
      ]),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'SEDANG_DIKEMAS' AND payment_verified=true)::int as pending_count,
           COUNT(*) FILTER (WHERE status = 'DIJADWALKAN_DIKIRIM')::int as scheduled_count,
           COUNT(*) FILTER (WHERE status = 'DISEWA')::int as rented_count,
           COUNT(*) FILTER (WHERE status IN ('SELESAI', 'SELESAI_DIBELI'))::int as completed_count,
           COUNT(*)::int as total_orders
         FROM orders
         WHERE seller_id = $1 OR seller_name ILIKE $2`,
        [targetUserId, `%${store.storeName}%`]
      ),
      query(
        `SELECT id, seller_id as "sellerId", location_id as "locationId",
                name, address, detail, maps_url as "mapsUrl", lat, lng, created_at as "createdAt"
         FROM seller_cod_locations
         WHERE seller_id = $1
         ORDER BY id ASC`,
        [targetUserId]
      ),
    ]);

    const locations = (codLocationsRows || []).map((loc: any) => ({
      ...loc,
      lat: loc.lat == null ? null : parseFloat(loc.lat),
      lng: loc.lng == null ? null : parseFloat(loc.lng),
      createdAt: toIsoString(loc.createdAt),
    }));

    return {
      store,
      locations,
      stats: {
        totalProducts: productCountRows[0]?.count || 0,
        totalOrders: orderStats[0]?.total_orders || 0,
        pendingOrdersCount: orderStats[0]?.pending_count || 0,
        scheduledOrdersCount: orderStats[0]?.scheduled_count || 0,
        rentedOrdersCount: orderStats[0]?.rented_count || 0,
        completedOrdersCount: orderStats[0]?.completed_count || 0,
        codLocationsCount: locations.length,
      },
    };
  } catch (err: any) {
    console.warn("getSellerStoreBundle error:", err?.message);
    return null;
  }
}

export async function getReviewsForStore(sellerId: string): Promise<ProductReview[]> {
  if (!sellerId) return [];
  try {
    const rows = await query(
      `SELECT r.id, r.order_id, r.product_id, r.seller_id, r.user_id, r.reviewer_name,
              r.order_type, r.rent_duration, r.rating, r.comment, r.photos, r.mask_name, r.helpful_count, r.created_at,
              p.name as product_name,
              COALESCE(p.images->>0, '') as product_image
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       WHERE r.seller_id = $1
       ORDER BY r.created_at DESC`,
      [sellerId]
    );
    return (rows || []).map(mapReviewRow);
  } catch (err) {
    console.warn("getReviewsForStore error:", err);
    return [];
  }
}

export async function getReviewsForProduct(productId: string): Promise<ProductReview[]> {
  if (!productId) return [];
  try {
    const rows = await query(
      `SELECT r.id, r.order_id, r.product_id, r.seller_id, r.user_id, r.reviewer_name,
              r.order_type, r.rent_duration, r.rating, r.comment, r.photos, r.mask_name, r.helpful_count, r.created_at,
              p.name as product_name,
              COALESCE(p.images->>0, '') as product_image
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );
    return (rows || []).map(mapReviewRow);
  } catch (err) {
    console.warn("getReviewsForProduct error:", err);
    return [];
  }
}

export async function getProductDetailBundle(productId: string) {
  const products = await getMarketplaceProducts({ id: productId, summary: false });
  const product = products[0] || null;
  if (!product) {
    return null;
  }

  const targetSellerId = product.sellerId || product.seller?.id || null;
  const [storeBundle, reviews] = await Promise.all([
    getSellerStoreBundle({
      userId: targetSellerId,
      storeName: product.seller?.name || null,
    }),
    getReviewsForProduct(productId),
  ]);

  return {
    product,
    store: storeBundle?.store || null,
    stats: storeBundle?.stats || null,
    locations: storeBundle?.locations || [],
    reviews: reviews || [],
  };
}

/**
 * Loads public storefront profile, COD locations, stats, and product catalog
 * directly from PostgreSQL for `/store/[id]`.
 */
export async function getPublicStorePageBundle(storeIdentifier: string) {
  const decoded = decodeURIComponent(storeIdentifier || "").trim();
  if (!decoded) return null;

  let storeBundle = await getSellerStoreBundle({ userId: decoded });
  if (!storeBundle) {
    storeBundle = await getSellerStoreBundle({ storeName: decoded });
  }
  if (!storeBundle?.store) {
    return null;
  }

  const targetSellerId = storeBundle.store.userId;
  const [products, reviews] = await Promise.all([
    getMarketplaceProducts({
      sellerId: targetSellerId,
      summary: true,
    }),
    getReviewsForStore(targetSellerId),
  ]);

  return {
    store: storeBundle.store,
    stats: storeBundle.stats,
    locations: storeBundle.locations,
    products: products.filter(
      (p) => (p.sellerId || p.seller?.id) === targetSellerId
    ),
    reviews: reviews || [],
  };
}

export async function getUserOrdersSSR(userId: string) {
  if (!userId) return [];
  await maybeAutoCancelExpiredOrders();
  try {
    const rows = await query(
      `SELECT order_id as "orderId", user_id as "userId", user_name as "userName",
              product_id as "productId", product_title as "productTitle", product_image as "productImage",
              seller_name as "sellerName", order_type as "orderType", delivery_option as "deliveryOption",
              cod_location as "codLocation", cod_date as "codDate", cod_time as "codTime", cod_notes as "codNotes",
              payment_method as "paymentMethod", total_price as "totalPrice", status, payment_proof_url as "paymentProofUrl",
              payment_verified as "paymentVerified", purchase_payment_status as "purchasePaymentStatus", purchase_amount as "purchaseAmount", rental_total_price as "rentalTotalPrice", purchase_service_fee as "purchaseServiceFee", cancellation_reason as "cancellationReason",
              rent_duration as "rentDuration", rent_started_at as "rentStartedAt", rent_end_at as "rentEndAt",
              created_at as "createdAt",
              EXISTS (SELECT 1 FROM reviews rev WHERE rev.order_id = orders.order_id) as "hasReview"
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    return (rows || []).map((r: any) => ({
      ...r,
      totalPrice: Number(r.totalPrice) || 0,
      hasReview: Boolean(r.hasReview),
      rentStartedAt: r.rentStartedAt ? toIsoString(r.rentStartedAt) : null,
      rentEndAt: r.rentEndAt ? toIsoString(r.rentEndAt) : null,
      createdAt: toIsoString(r.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function getSellerDashboardBundleSSR(sellerId: string, orderTab = "PERLU_KONFIRMASI") {
  const statuses = orderTab === "SELESAI" ? ["SELESAI", "SELESAI_DIBELI"] : [orderTab === "DISEWA" || orderTab === "DIJADWALKAN_DIKIRIM" ? orderTab : "SEDANG_DIKEMAS"];
  if (!sellerId) return null;
  await maybeAutoCancelExpiredOrders();

  try {
    const [storeBundle, productsRows] = await Promise.all([
      getSellerStoreBundle({ userId: sellerId }),
      query(
        `SELECT id, seller_id as "sellerId", seller_name as "sellerName", name, category,
                image, images, condition, size,
                rent_price_daily as "rentPriceDaily",
                rent_price_3d as "rentPrice3d",
                rent_price_7d as "rentPrice7d",
                buy_price as "buyPrice",
                stock, rating, review_count as "reviewCount", rent_count as "rentCount",
                description, features, package_includes as "packageIncludes", deposit,
                created_at as "createdAt"
         FROM products
         WHERE seller_id = $1
         ORDER BY created_at DESC`,
        [sellerId]
      ),
    ]);

    const storeNamePattern = storeBundle?.store?.storeName
      ? `%${storeBundle.store.storeName}%`
      : null;
    const ordersRows = await query(
      `SELECT order_id as "orderId", user_id as "userId", user_name as "userName",
              product_id as "productId", product_title as "productTitle", product_image as "productImage",
              seller_name as "sellerName", seller_id as "sellerId", order_type as "orderType", delivery_option as "deliveryOption",
              cod_location as "codLocation", cod_date as "codDate", cod_time as "codTime", cod_notes as "codNotes",
              payment_method as "paymentMethod", total_price as "totalPrice",
              seller_income as "sellerIncome",
              cancellation_reason as "cancellationReason",
              status, payment_proof_url as "paymentProofUrl",
              payment_verified as "paymentVerified", purchase_payment_status as "purchasePaymentStatus", purchase_amount as "purchaseAmount", rental_total_price as "rentalTotalPrice", purchase_service_fee as "purchaseServiceFee", handover_pin as "handoverPin",
              rent_duration as "rentDuration", rent_started_at as "rentStartedAt", rent_end_at as "rentEndAt",
              created_at as "createdAt"
       FROM orders
       WHERE (seller_id = $1 OR ($2::text IS NOT NULL AND seller_name ILIKE $2)) AND status = ANY($3::text[])
       ORDER BY created_at DESC`,
      [sellerId, storeNamePattern, statuses]
    );

    const products = (productsRows || []).map((r: any) => ({
      ...r,
      rentPriceDaily: parseFloat(r.rentPriceDaily) || 0,
      rentPrice3d: parseFloat(r.rentPrice3d) || parseFloat(r.rentPriceDaily) * 2.8 || 0,
      rentPrice7d: parseFloat(r.rentPrice7d) || parseFloat(r.rentPriceDaily) * 5.8 || 0,
      buyPrice: parseFloat(r.buyPrice) || 0,
      images: Array.isArray(r.images) && r.images.length > 0 ? r.images : [r.image],
      createdAt: toIsoString(r.createdAt),
    }));

    const orders = (ordersRows || []).map((r: any) => ({
      ...r,
      totalPrice: Number(r.totalPrice) || 0,
      sellerIncome: Number(r.sellerIncome) || 0,
      rentStartedAt: r.rentStartedAt ? toIsoString(r.rentStartedAt) : null,
      rentEndAt: r.rentEndAt ? toIsoString(r.rentEndAt) : null,
      createdAt: toIsoString(r.createdAt),
    }));

    const counts = {
      pending: storeBundle?.stats?.pendingOrdersCount || 0,
      scheduled: storeBundle?.stats?.scheduledOrdersCount || 0,
      rented: storeBundle?.stats?.rentedOrdersCount || 0,
      completed: storeBundle?.stats?.completedOrdersCount || 0,
      total: storeBundle?.stats?.totalOrders || 0,
    };

    return {
      store: storeBundle?.store || null,
      stats: storeBundle?.stats || null,
      locations: storeBundle?.locations || [],
      products,
      orders,
      counts,
    };
  } catch (err: any) {
    console.warn("getSellerDashboardBundleSSR error:", err?.message);
    return null;
  }
}

export async function getWalletBundleSSR(userId: string) {
  if (!userId) return null;
  try {
    const [balRes, txRes] = await Promise.all([
      query<{ balance: string | number }>(
        `SELECT balance FROM user_wallets WHERE user_id = $1`,
        [userId]
      ),
      query<any>(
        `SELECT id, user_id, type, amount, description, status, payment_method, created_at
         FROM wallet_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      ),
    ]);

    const balance = balRes && balRes.length > 0 ? Number(balRes[0].balance) : 0;
    const transactions = (txRes || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      amount: Number(r.amount),
      description: r.description,
      status: r.status,
      paymentMethod: r.payment_method || "Midtrans",
      createdAt: toIsoString(r.created_at),
    }));

    return { balance, transactions };
  } catch {
    return null;
  }
}

export async function getCoinsBundleSSR(userId: string) {
  if (!userId) return null;
  try {
    const [coinRes, txRes] = await Promise.all([
      query<{ balance: number }>(`SELECT balance FROM user_coins WHERE user_id = $1`, [
        userId,
      ]),
      query<any>(
        `SELECT id, user_id, type, amount, description, status, created_at
         FROM coin_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      ),
    ]);

    const coins = coinRes && coinRes.length > 0 ? Number(coinRes[0].balance) : 0;
    const transactions = (txRes || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      amount: Number(r.amount),
      description: r.description,
      status: r.status,
      createdAt: toIsoString(r.created_at),
    }));

    return { coins, transactions };
  } catch {
    return null;
  }
}

export async function getUserAddressesSSR(userId: string) {
  if (!userId) return [];
  try {
    const rows = await query(
      `SELECT id, user_id as "userId", recipient_name as "recipientName", phone,
              province_city_district as "provinceCityDistrict", street_address as "streetAddress",
              address_notes as "addressNotes", latitude, longitude, label,
              COALESCE(is_primary, false) as "isPrimary",
              COALESCE(is_shop_address, false) as "isShopAddress",
              COALESCE(is_return_address, false) as "isReturnAddress",
              front_photo_url as "frontPhotoUrl", created_at as "createdAt"
       FROM user_addresses
       WHERE user_id = $1
       ORDER BY is_primary DESC, is_shop_address DESC, created_at DESC`,
      [userId]
    );
    return (rows || []).map((r: any) => ({
      ...r,
      latitude: r.latitude == null ? null : Number(r.latitude),
      longitude: r.longitude == null ? null : Number(r.longitude),
      createdAt: toIsoString(r.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function getUserChatConversationsSSR(userId: string) {
  if (!userId) return [];
  try {
    const checkAny = await query(
      `SELECT id FROM chat_conversations WHERE user1_id = $1 OR user2_id = $1 LIMIT 1`,
      [userId]
    );

    if (!checkAny || checkAny.length === 0) {
      const partnerId = userId === "usr_001" ? "usr_002" : "usr_001";
      const u1 = userId < partnerId ? userId : partnerId;
      const u2 = userId < partnerId ? partnerId : userId;
      const convId = `conv_${u1}_${u2}`;

      await query(
        `INSERT INTO chat_conversations (id, user1_id, user2_id, order_id, product_id, last_message, last_message_at)
         VALUES ($1, $2, $3, 'TRY-848005', 'prod_001', 'Halo! Ada yang bisa kami bantu seputar pesanan atau produk?', CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING`,
        [convId, u1, u2]
      );

      await query(
        `INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message, is_read, created_at)
         VALUES ($1, $2, $3, 'Halo! Ada yang bisa kami bantu seputar pesanan atau produk?', true, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [convId, partnerId, userId]
      );
    }

    const rows = await query(
      `SELECT 
        c.id,
        c.user1_id as "user1Id",
        c.user2_id as "user2Id",
        c.order_id as "orderId",
        c.product_id as "productId",
        c.last_message as "lastMessage",
        c.last_message_at as "lastMessageAt",
        c.created_at as "createdAt",
        CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END as "interlocutorId",
        COALESCE(u.name, s.store_name) as "interlocutorName",
        u.avatar as "interlocutorAvatar",
        COALESCE(u.photo_url, s.photo_url) as "interlocutorPhotoUrl",
        u.is_verified as "interlocutorVerified",
        (
          SELECT COUNT(*)::int 
          FROM chat_messages m 
          WHERE m.conversation_id = c.id AND m.receiver_id = $1 AND m.is_read = false
        ) as "unreadCount"
      FROM chat_conversations c
      LEFT JOIN users u ON u.id = (CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END)
      LEFT JOIN stores s ON s.user_id = u.id
      WHERE c.user1_id = $1 OR c.user2_id = $1
      ORDER BY c.last_message_at DESC`,
      [userId]
    );

    return (rows || []).map((r: any) => ({
      ...r,
      lastMessageAt: toIsoString(r.lastMessageAt),
      createdAt: toIsoString(r.createdAt),
    }));
  } catch {
    return [];
  }
}
export async function getRentalPurchaseSummary(orderId: string, userId: string): Promise<import("@/lib/rental-purchase").RentalPurchaseSummary | null> {
  const rows = await query(`
    SELECT o.order_id, o.product_title, o.product_image, o.status,
           COALESCE(o.purchase_buy_price, p.buy_price) AS buy_price,
           COALESCE(o.purchase_rent_paid, o.seller_income) AS rent_paid,
           o.purchase_payment_status, o.purchase_payment_method, o.purchase_payment_proof_url, o.purchase_rejection_reason,
           COALESCE(w.balance, 0) AS balance,
           COALESCE(o.purchase_amount - COALESCE(o.purchase_service_fee, 0), GREATEST(0, p.buy_price - o.seller_income)) AS remaining,
           COALESCE(o.purchase_service_fee, CASE WHEN o.purchase_amount IS NULL THEN 2000 ELSE 0 END) AS service_fee
    FROM orders o JOIN products p ON p.id = o.product_id
    LEFT JOIN user_wallets w ON w.user_id = o.user_id
    WHERE o.order_id = $1 AND o.user_id = $2 AND o.order_type = 'rent'
      AND o.seller_income IS NOT NULL`, [orderId, userId]);
  const row = rows[0];
  if (!row) return null;
  return { orderId: row.order_id, productTitle: row.product_title, productImage: row.product_image,
    status: row.status, buyPrice: Number(row.buy_price), rentPaid: Number(row.rent_paid),
    remaining: Number(row.remaining), serviceFee: Number(row.service_fee),
    totalDue: Number(row.remaining) + Number(row.service_fee), balance: Number(row.balance),
    paymentStatus: row.purchase_payment_status, paymentMethod: row.purchase_payment_method,
    proofUrl: row.purchase_payment_proof_url, rejectionReason: row.purchase_rejection_reason };
}
