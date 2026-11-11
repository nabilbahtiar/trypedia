import { query } from "@/lib/db";
import { getActiveLockedProductIds } from "@/lib/stock-locks";

export interface CartItem {
  productId: string; name: string; image: string; sellerId: string; sellerName: string;
  mode: "rent" | "buy"; duration: number; rent1d: number; rent3d: number; rent7d: number; buyPrice: number; available: boolean;
}
export interface AccountNotification { id: string; title: string; message: string; href: string; isRead: boolean; createdAt: string }

export async function getCartItems(userId: string): Promise<CartItem[]> {
  const rows = await query(`SELECT c.product_id AS "productId",c.mode,c.duration,p.name,p.image,
    p.seller_id AS "sellerId",u.name AS "sellerName",p.rent_price_daily AS "rent1d",p.rent_price_3d AS "rent3d",
    p.rent_price_7d AS "rent7d",p.buy_price AS "buyPrice",p.stock,
    EXISTS(SELECT 1 FROM orders o WHERE o.product_id=p.id AND o.status IN ('BELUM_BAYAR','SEDANG_DIKEMAS','DIJADWALKAN_DIKIRIM','DISEWA')) AS locked
    FROM cart_items c JOIN products p ON p.id=c.product_id JOIN users u ON u.id=p.seller_id
    WHERE c.user_id=$1 ORDER BY c.created_at DESC`, [userId]);
  const locks = getActiveLockedProductIds();
  return rows.map(row => ({ ...row, rent1d:Number(row.rent1d),rent3d:Number(row.rent3d),rent7d:Number(row.rent7d),buyPrice:Number(row.buyPrice),available:row.stock>0&&!row.locked&&!locks.has(row.productId) }));
}
export async function getNotifications(userId: string): Promise<AccountNotification[]> {
  const rows = await query(`SELECT id,title,message,href,is_read AS "isRead",created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [userId]);
  return rows.map(row => ({ ...row, createdAt: new Date(row.created_at).toISOString() }));
}
