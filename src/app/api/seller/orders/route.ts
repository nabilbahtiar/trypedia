import { NextResponse } from "next/server";
import { query,pool } from "@/lib/db";
import { getVerifiedSessionUser as getServerSessionUser } from "@/lib/auth-session";
import { settleSeller } from "@/lib/escrow";
import { randomUUID } from "crypto";
import { maybeAutoCancelExpiredOrders } from "@/lib/orders-maintenance";

export async function GET(request: Request) {
 const viewer=await getServerSessionUser();if(!viewer)return NextResponse.json({success:false},{status:401});
 if(new URL(request.url).searchParams.get("sellerId")!==viewer.id)return NextResponse.json({success:false},{status:403});
  try {
    // Throttled check for pending orders past 24h deadline
    await maybeAutoCancelExpiredOrders();

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const statusTab = searchParams.get("tab"); // "PERLU_KONFIRMASI" | "DIJADWALKAN_DIKIRIM" | "SELESAI" | "SEMUA"

    if (!sellerId) {
      return NextResponse.json(
        { success: false, message: "sellerId wajib disertakan" },
        { status: 400 }
      );
    }

    // Lookup live store/profile name
    const storeRows = await query(
      `SELECT COALESCE(u.name, s.store_name) as "storeName"
       FROM users u
       LEFT JOIN stores s ON s.user_id = u.id
       WHERE u.id = $1`,
      [sellerId]
    );
    const storeName = storeRows[0]?.storeName || "Sneaker Zone Jember";

    let sql = `
      SELECT order_id as "orderId", user_id as "userId", user_name as "userName",
             product_id as "productId", product_title as "productTitle", product_image as "productImage",
             seller_name as "sellerName", seller_id as "sellerId", order_type as "orderType", delivery_option as "deliveryOption",
             cod_location as "codLocation", cod_date as "codDate", cod_time as "codTime", cod_notes as "codNotes",
             payment_method as "paymentMethod", total_price as "totalPrice", 
             seller_income as "sellerIncome",
             cancellation_reason as "cancellationReason",
             status, payment_proof_url as "paymentProofUrl",
             payment_verified as "paymentVerified", handover_pin as "handoverPin",
             rent_duration as "rentDuration", rent_started_at as "rentStartedAt", rent_end_at as "rentEndAt",
             created_at as "createdAt"
      FROM orders
      WHERE (seller_id = $1 OR seller_name ILIKE $2)
    `;

    const params: any[] = [sellerId, `%${storeName}%`];

    if (statusTab === "PERLU_KONFIRMASI") {
      sql += ` AND status = 'SEDANG_DIKEMAS' AND payment_verified=true`;
    } else if (statusTab === "DIJADWALKAN_DIKIRIM") {
      sql += ` AND status = 'DIJADWALKAN_DIKIRIM'`;
    } else if (statusTab === "DISEWA") {
      sql += ` AND status = 'DISEWA'`;
    } else if (statusTab === "SELESAI") {
      sql += ` AND status IN ('SELESAI', 'SELESAI_DIBELI')`;
    }

    sql += ` ORDER BY created_at DESC`;

    const rows = await query(sql, params);

    // Ensure every scheduled order has a 6-digit random handoverPin
    for (const r of rows) {
      if (!r.handoverPin) {
        const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
        r.handoverPin = generatedPin;
        try {
          await query(`UPDATE orders SET handover_pin = $1 WHERE order_id = $2`, [generatedPin, r.orderId]);
        } catch {}
      }
    }

    // Calculate real-time counts for badges
    const countsQuery = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'SEDANG_DIKEMAS' AND payment_verified=true)::int as pending_count,
         COUNT(*) FILTER (WHERE status = 'DIJADWALKAN_DIKIRIM')::int as scheduled_count,
         COUNT(*) FILTER (WHERE status = 'DISEWA')::int as rented_count,
         COUNT(*) FILTER (WHERE status IN ('SELESAI', 'SELESAI_DIBELI'))::int as completed_count,
         COUNT(*)::int as total_count
       FROM orders
       WHERE (seller_id = $1 OR seller_name ILIKE $2)`,
      [sellerId, `%${storeName}%`]
    );

    const counts = {
      pending: countsQuery[0]?.pending_count || 0,
      scheduled: countsQuery[0]?.scheduled_count || 0,
      rented: countsQuery[0]?.rented_count || 0,
      completed: countsQuery[0]?.completed_count || 0,
      total: countsQuery[0]?.total_count || 0,
    };

    const formattedOrders = (rows || []).map((r: any) => ({
      ...r,
      totalPrice: parseFloat(r.totalPrice) || 0,
      sellerIncome: parseFloat(r.sellerIncome) || (parseFloat(r.totalPrice) * 0.9) || 0,
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      counts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(request:Request){
 const user=await getServerSessionUser();if(!user||user.role==='SUPERADMIN')return NextResponse.json({success:false,message:'Sesi login sudah tidak aktif. Silakan masuk ulang untuk memproses pesanan.'},{status:401});
if(!user.isVerified)return NextResponse.json({success:false,message:'Lengkapi verifikasi KTP/KTM di profil terlebih dahulu.'},{status:403});
 const {orderId,action,reason}=await request.json();const client=await pool.connect();
 try{await client.query('BEGIN');const {rows}=await client.query(`SELECT o.*,COALESCE(o.seller_id,p.seller_id) AS resolved_seller FROM orders o LEFT JOIN products p ON p.id=o.product_id WHERE o.order_id=$1 FOR UPDATE OF o`,[orderId]);const order=rows[0];if(!order||order.resolved_seller!==user.id){await client.query('ROLLBACK');return NextResponse.json({success:false,message:'Pesanan ini bukan milik toko akun yang sedang masuk.'},{status:403});}
 const done=action==='CONFIRM'?'DIJADWALKAN_DIKIRIM':action==='REJECT'?'DIBATALKAN':action==='COMPLETE'?'SELESAI':null;
 if(!done){await client.query('ROLLBACK');return NextResponse.json({success:false},{status:400});}
 if(order.status===done){await client.query('COMMIT');return NextResponse.json({success:true,newStatus:done});}
 if(!order.payment_verified||order.status!==(action==='COMPLETE'?'DISEWA':'SEDANG_DIKEMAS')){await client.query('ROLLBACK');return NextResponse.json({success:false,message:'Pembayaran belum diverifikasi atau status pesanan tidak sesuai.'},{status:409});}
 if(action==='CONFIRM')await client.query("UPDATE orders SET status='DIJADWALKAN_DIKIRIM' WHERE order_id=$1",[orderId]);
 if(action==='REJECT'){
 await client.query("UPDATE orders SET status='DIBATALKAN',cancellation_reason=$2 WHERE order_id=$1",[orderId,reason||'Pesanan ditolak penjual']);
 await client.query(`INSERT INTO user_wallets(user_id,balance) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET balance=user_wallets.balance+$2,updated_at=NOW()`,[order.user_id,order.total_price]);
 await client.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method) VALUES($1,$2,'REFUND',$3,$4,'SUCCESS','Saldo TryPedia')`,['ref_'+randomUUID(),order.user_id,order.total_price,'Pengembalian dana pesanan '+orderId]);
 await client.query('UPDATE products SET stock=1 WHERE id=$1',[order.product_id]);
 }
 if(action==='COMPLETE'){await settleSeller(client,{...order,seller_id:user.id},Number(order.seller_income));await client.query("UPDATE orders SET status='SELESAI' WHERE order_id=$1",[orderId]);await client.query('UPDATE products SET stock=1 WHERE id=$1',[order.product_id]);}
 await client.query('COMMIT');return NextResponse.json({success:true,newStatus:done});
 }catch(error){await client.query('ROLLBACK');console.error(error);return NextResponse.json({success:false,message:'Pesanan gagal diperbarui.'},{status:500});}finally{client.release();}
}
