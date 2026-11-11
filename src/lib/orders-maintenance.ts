import { pool, query } from "@/lib/db";
import { releaseProductLockInMemory } from "@/lib/stock-locks";

export async function cancelExpiredQrisOrders(orderId?: string) {
  const expired = await query<{ product_id: string }>(`
    UPDATE orders SET status = 'DIBATALKAN',
      cancellation_reason = 'Waktu pembayaran QRIS 10 menit telah habis'
    WHERE status = 'BELUM_BAYAR' AND payment_method = 'QRIS'
      AND created_at <= NOW() - INTERVAL '10 minutes'
      AND ($1::text IS NULL OR order_id = $1)
    RETURNING product_id`, [orderId ?? null]);
  for (const order of expired) {
    const restored = await query(`UPDATE products SET stock = 1 WHERE id = $1
      AND NOT EXISTS (SELECT 1 FROM orders WHERE product_id = $1
        AND status IN ('BELUM_BAYAR','SEDANG_DIKEMAS','DIJADWALKAN_DIKIRIM','DISEWA','SELESAI_DIBELI'))
      RETURNING id`, [order.product_id]);
    if (restored.length) releaseProductLockInMemory(order.product_id);
  }
}

declare global {
  var _lastOrderExpiryCheckAt: number | undefined;
}

/**
 * Checks for pending orders past the 24h seller confirmation deadline.
 * Throttled per server instance (30s cooldown) so normal GET reads stay fast.
 */
export async function maybeAutoCancelExpiredOrders(force: boolean = false) {
  // QRIS expiry is also checked on each read, so it does not wait for the seller-check cooldown.
  await cancelExpiredQrisOrders();
  const now = Date.now();
  if (
    !force &&
    global._lastOrderExpiryCheckAt &&
    now - global._lastOrderExpiryCheckAt < 30_000
  ) {
    return;
  }
  global._lastOrderExpiryCheckAt = now;

  try {
    const expiredOrders = await query(
      `SELECT order_id, user_id, total_price, product_id
       FROM orders
       WHERE status = 'SEDANG_DIKEMAS' AND payment_verified=true
         AND created_at < NOW() - INTERVAL '24 hours'`
    );

    if (!expiredOrders || expiredOrders.length === 0) return;

    for (const expOrder of expiredOrders) {
      const client = await pool.connect();
      try {
      await client.query('BEGIN');
      const orderId = expOrder.order_id;
      const refundAmount = parseFloat(expOrder.total_price) || 0;
      const buyerId = expOrder.user_id;

      const cancelled = await client.query(
        `UPDATE orders
         SET status = 'DIBATALKAN',
             cancellation_reason = 'Dibatalkan otomatis oleh sistem (Batas waktu konfirmasi penjual 24 jam berakhir)'
         WHERE order_id = $1 AND status = 'SEDANG_DIKEMAS' AND payment_verified=true
         RETURNING order_id`,
        [orderId]
      );
      if (!cancelled.rowCount) {
        await client.query('ROLLBACK');
        continue;
      }

      if (refundAmount > 0) {
        await client.query(
          `INSERT INTO user_wallets (user_id, balance, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) DO UPDATE SET
             balance = user_wallets.balance + $2,
             updated_at = CURRENT_TIMESTAMP`,
          [buyerId, refundAmount]
        );

        const txId = `tx_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await client.query(
          `INSERT INTO wallet_transactions (id, user_id, type, amount, description, status, payment_method)
           VALUES ($1, $2, 'REFUND', $3, $4, 'SUCCESS', 'Saldo TryPedia')`,
          [
            txId,
            buyerId,
            refundAmount,
            `Pengembalian Dana: Batas waktu konfirmasi pesanan #${orderId} telah terlewati`,
          ]
        );
      }

      if (expOrder.product_id) {
        await client.query(`UPDATE products SET stock = 1 WHERE id = $1
          AND NOT EXISTS (SELECT 1 FROM orders WHERE product_id=$1
          AND status IN ('BELUM_BAYAR','SEDANG_DIKEMAS','DIJADWALKAN_DIKIRIM','DISEWA','SELESAI_DIBELI'))`, [
          expOrder.product_id,
        ]);
      }
      await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.error("Auto cancel check error:", err);
  }
}

