import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth-session";
import { query } from "@/lib/db";
import {
  getActiveProductLock,
  lockProductInMemory,
  releaseProductLockInMemory,
} from "@/lib/stock-locks";

const DEFAULT_STOCK = 1;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "new-balance-2022r";

    const now = Date.now();
    const activeLock = getActiveProductLock(productId);

    if (activeLock) {
      const remainingSeconds = Math.max(
        0,
        Math.round((activeLock.expiresAt - now) / 1000)
      );
      return NextResponse.json({
        success: true,
        productId,
        stock: 0,
        isLocked: true,
        reason: "PAYMENT_IN_PROGRESS",
        message: "Produk sedang dalam proses pembayaran oleh pembeli lain",
        remainingSeconds,
      });
    }

    try {
      const activeOrders = await query(
        `SELECT order_id, status FROM orders 
         WHERE product_id = $1 AND status IN ('BELUM_BAYAR', 'SEDANG_DIKEMAS', 'DIJADWALKAN_DIKIRIM') 
         LIMIT 1`,
        [productId]
      );

      if (activeOrders && activeOrders.length > 0) {
        return NextResponse.json({
          success: true,
          productId,
          stock: 0,
          isLocked: true,
          reason: "ORDER_ACTIVE",
          message: "Produk telah dipesan / habis",
          orderId: activeOrders[0].order_id,
        });
      }
    } catch {
      // Fallback to normal stock
    }

    return NextResponse.json({
      success: true,
      productId,
      stock: DEFAULT_STOCK,
      isLocked: false,
      reason: "AVAILABLE",
      message: "Produk tersedia",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
 const user=await getVerifiedSessionUser();if(!user)return NextResponse.json({success:false},{status:401});if(!user.isVerified)return NextResponse.json({success:false,message:"Verifikasi identitas diperlukan."},{status:403});
  try {
    const body = await request.json();
    const {
      productId = "new-balance-2022r",
      action = "lock",
      durationSeconds = 600,
      lockedBy = "usr_001",
    } = body;

    if (action === "lock") {
      const { expiresAt } = lockProductInMemory(productId, durationSeconds, lockedBy);
      return NextResponse.json({
        success: true,
        productId,
        stock: 0,
        isLocked: true,
        message: "Stok produk berhasil dikunci menjadi 0 (Sedang dalam proses pembayaran)",
        expiresAt,
        durationSeconds,
      });
    }

    if (action === "release") {
      releaseProductLockInMemory(productId);
      return NextResponse.json({
        success: true,
        productId,
        stock: DEFAULT_STOCK,
        isLocked: false,
        message: "Pembayaran gagal/dibatalkan. Stok produk berhasil dikembalikan menjadi 1",
      });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
