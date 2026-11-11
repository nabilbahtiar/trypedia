import { settleSeller } from "@/lib/escrow";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getVerifiedSessionUser as getServerSessionUser } from "@/lib/auth-session";

export async function POST(request: Request) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ success: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
if(!user.isVerified)return NextResponse.json({success:false,message:'Lengkapi verifikasi KTP/KTM di profil terlebih dahulu.'},{status:403});
  const body = await request.json().catch(() => null);
  if (!body || typeof body.orderId !== "string" || typeof body.expectedAmount !== "number") {
    return NextResponse.json({ success: false, message: "Data pembayaran tidak valid." }, { status: 400 });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      SELECT o.*, p.seller_id, p.buy_price,
             COALESCE(o.purchase_service_fee, CASE WHEN o.purchase_amount IS NULL THEN 2000 ELSE 0 END) AS service_fee,
             COALESCE(o.purchase_amount, GREATEST(0, p.buy_price - o.seller_income) + 2000) AS remaining
      FROM orders o JOIN products p ON p.id = o.product_id
      WHERE o.order_id = $1 AND o.user_id = $2 FOR UPDATE OF o, p`, [body.orderId, user.id]);
    const order = result.rows[0];
    if (!order) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, message: "Pesanan tidak ditemukan." }, { status: 404 });
    }
    // The order lock serializes repeat submissions, so an already paid order is never charged again.
    if (order.status === "SELESAI_DIBELI") {
      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    }
    if (order.status !== "DISEWA" || order.order_type !== "rent" || order.seller_income == null || order.seller_id === user.id) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, message: "Pesanan ini tidak dapat dilanjutkan ke pembelian." }, { status: 409 });
    }
    if (order.purchase_payment_status === "PENDING") {
      await client.query("COMMIT");
      return NextResponse.json({ success: true, pending: true });
    }
    const amount = Number(order.remaining);
    if (!Number.isFinite(amount) || amount !== body.expectedAmount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, message: "Harga berubah. Muat ulang halaman untuk melihat sisa pembayaran terbaru." }, { status: 409 });
    }
    const serviceFee = Number(order.service_fee);
    const sellerAmount = amount - serviceFee;
    const method = body.paymentMethod ?? "wallet";
    if (method !== "wallet" && method !== "qris") {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, message: "Pilih metode pembayaran yang tersedia." }, { status: 400 });
    }
    if (method === "qris" && amount > 0) {
      const proofUrl = body.proofUrl;
      if (typeof proofUrl !== "string" || !/^\/api\/media\/proofs\/[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)$/.test(proofUrl)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, message: "Unggah bukti pembayaran QRIS terlebih dahulu." }, { status: 400 });
      }
      await client.query(`UPDATE orders SET purchase_payment_method = 'QRIS', purchase_payment_status = 'PENDING',
        purchase_payment_proof_url = $2, purchase_amount = $3, purchase_buy_price = $4,
        purchase_rent_paid = seller_income, purchase_service_fee = $5,
        rental_total_price = COALESCE(rental_total_price, total_price) WHERE order_id = $1`, [order.order_id, proofUrl, amount, order.buy_price, serviceFee]);
      await client.query("COMMIT");
      return NextResponse.json({ success: true, pending: true });
    }
    if (amount > 0) {
      const debit = await client.query(`UPDATE user_wallets SET balance = balance - $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND balance >= $2 RETURNING balance`, [user.id, amount]);
      if (!debit.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, message: "Saldo Dompet TryPedia belum cukup." }, { status: 409 });
      }
      await settleSeller(client,{...order,seller_id:order.seller_id},Number(order.seller_income)+sellerAmount);
      await client.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method) VALUES($1,$2,'PAYMENT',$3,$4,'SUCCESS','Saldo TryPedia')`,['purchase_'+order.order_id,user.id,amount,'Pembelian sewa-milik '+order.order_id]);
    }
    await client.query(`UPDATE orders SET status = 'SELESAI_DIBELI', purchase_payment_status = 'PAID',
      purchase_payment_method = 'Saldo TryPedia', purchase_amount = $2, purchase_buy_price = $3,
      purchase_rent_paid = seller_income, purchase_service_fee = $4,
      rental_total_price = COALESCE(rental_total_price, total_price),
      total_price = COALESCE(rental_total_price, total_price) + $2,
      seller_income = seller_income + $5 WHERE order_id = $1`, [order.order_id, amount, order.buy_price, serviceFee, sellerAmount]);
    await client.query("UPDATE products SET stock = 0 WHERE id = $1", [order.product_id]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Rental purchase failed", error);
    return NextResponse.json({ success: false, message: "Pembayaran gagal. Silakan coba lagi." }, { status: 500 });
  } finally {
    client.release();
  }
}
