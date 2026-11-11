import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getVerifiedSessionUser as getServerSessionUser } from "@/lib/auth-session";
import { walletPaymentId } from "@/lib/wallet-payment";
import { maybeAutoCancelExpiredOrders, cancelExpiredQrisOrders } from "@/lib/orders-maintenance";
import { persistDataUrlIfNeeded } from "@/lib/media";
import { validateCheckout } from "@/lib/checkout-validation";

export interface OrderItem {
  id?: string | number;
  orderId: string;
  userId: string;
  userName: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  sellerName?: string;
  orderType: string;
  deliveryOption: string;
  codLocation?: string;
  codDate?: string;
  codTime?: string;
  codNotes?: string;
  paymentMethod: string;
  totalPrice: number;
  status: "BELUM_BAYAR" | "SEDANG_DIKEMAS" | "DIJADWALKAN_DIKIRIM" | "SELESAI" | "DIBATALKAN";
  paymentProofUrl?: string | null;
  paymentVerified?: boolean;
  handoverPin?: string;
  rentDuration?: number;
  rentStartedAt?: string;
  rentEndAt?: string;
  createdAt?: string;
}

declare global {
  var _inMemoryOrders: OrderItem[] | undefined;
}

// Reset to empty
global._inMemoryOrders = [];

let tableChecked = true;
async function ensureOrdersTable() {
  return;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    if (!session || session.role === "SUPERADMIN") return NextResponse.json({success:false},{status:401});
    if(!session.isVerified)return NextResponse.json({success:false,message:'Lengkapi verifikasi KTP/KTM di profil terlebih dahulu.'},{status:403});
    await ensureOrdersTable();
    const body = await request.json();
    const {
      orderId = `TRY-${Date.now().toString().slice(-6)}`,
      userId = "usr_001",
      userName = "Khayru Nabiel Bahtiar",
      productId,
      productTitle,
      productImage,
      sellerName,
      orderType,
      deliveryOption,
      codLocation,
      codDate,
      codTime,
      codNotes,
      paymentMethod,
      totalPrice,
      sellerIncome,
      status = "SEDANG_DIKEMAS",
      paymentProofUrl = null,
      paymentVerified = false,
      rentDuration = 3,
    } = body;

    if (userId !== session.id) return NextResponse.json({success:false},{status:403});
    let deliveryQuote;
    try { deliveryQuote=await validateCheckout(session.id,body); }
    catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:'Jadwal tidak valid.'},{status:400});}
    const [sourceProduct] = await query("SELECT seller_id,buy_price,rent_price_daily,rent_price_3d,rent_price_7d FROM products WHERE id=$1",[productId]);
    if (!sourceProduct || sourceProduct.seller_id === session.id) return NextResponse.json({success:false,message:"Produk tidak tersedia untuk transaksi ini."},{status:400});
    const feeService=2000, feeInsurance=Math.round(Number(sourceProduct.buy_price)*0.005);
    const isVerified = paymentMethod?.toLowerCase().includes("saldo");
    if (!isVerified && paymentMethod !== "QRIS") return NextResponse.json({success:false},{status:400});
    if (isVerified) {
      const [paid] = await query("SELECT amount FROM wallet_transactions WHERE id=$1 AND user_id=$2 AND status='SUCCESS'",[walletPaymentId(session.id,orderId),session.id]);
      if (!paid || Number(paid.amount)!==Number(totalPrice)) return NextResponse.json({success:false,message:"Pembayaran saldo belum berhasil."},{status:409});
    }
    const derivedIncome=Number(orderType==='buy'?sourceProduct.buy_price:rentDuration===1?sourceProduct.rent_price_daily:rentDuration===7?sourceProduct.rent_price_7d:sourceProduct.rent_price_3d);

    const calculatedSellerIncome = derivedIncome;

    const safeProductImage = await persistDataUrlIfNeeded(productImage, "products");
    const safePaymentProofUrl = await persistDataUrlIfNeeded(paymentProofUrl, "proofs");
    if (!["BELUM_BAYAR", "SEDANG_DIKEMAS"].includes(status) || (isVerified && status !== "SEDANG_DIKEMAS") || (!isVerified && status === "SEDANG_DIKEMAS" && !safePaymentProofUrl)) return NextResponse.json({success:false,message:"Status pembayaran tidak valid."},{status:400});

    const newOrder: OrderItem = {
      orderId,
      userId,
      userName,
      productId,
      productTitle,
      productImage: safeProductImage || undefined,
      sellerName,
      orderType,
      deliveryOption,
      codLocation,
      codDate,
      codTime,
      codNotes,
      paymentMethod,
      totalPrice: Number(totalPrice),
      status,
      paymentProofUrl: safePaymentProofUrl,
      paymentVerified: isVerified,
      createdAt: new Date().toISOString(),
    };

    if (!global._inMemoryOrders) {
      global._inMemoryOrders = [];
    }
    // Remove if already exists with same orderId, then insert front
    global._inMemoryOrders = [
      newOrder,
      ...global._inMemoryOrders.filter((o) => o.orderId !== orderId),
    ];

    const handoverPin = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const savedOrders = await query(
        `INSERT INTO orders (
          order_id, user_id, user_name, product_id, product_title, product_image, seller_name,
          order_type, delivery_option, cod_location, cod_date, cod_time, cod_notes,
          payment_method, total_price, seller_income, status, payment_proof_url, payment_verified, handover_pin, rent_duration, service_fee, insurance_fee, seller_id, shipping_fee, delivery_distance_km, delivery_address_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, CURRENT_TIMESTAMP)
        ON CONFLICT (order_id) DO UPDATE SET
          status = EXCLUDED.status,
          payment_proof_url = EXCLUDED.payment_proof_url,
          payment_verified = EXCLUDED.payment_verified,
          seller_income = COALESCE(orders.seller_income, EXCLUDED.seller_income),
          handover_pin = COALESCE(orders.handover_pin, EXCLUDED.handover_pin)
        WHERE orders.status = 'BELUM_BAYAR'
          AND orders.user_id = EXCLUDED.user_id AND orders.payment_method = EXCLUDED.payment_method
          AND (orders.payment_method <> 'QRIS' OR orders.created_at > NOW() - INTERVAL '10 minutes')
        RETURNING order_id`,
        [
          orderId,
          userId,
          userName,
          productId,
          productTitle,
          safeProductImage,
          sellerName || null,
          orderType,
          deliveryOption,
          codLocation,
          codDate,
          codTime,
          codNotes,
          paymentMethod,
          totalPrice,
          calculatedSellerIncome,
          status,
          safePaymentProofUrl,
          isVerified,
          handoverPin,
          rentDuration,
          feeService, feeInsurance, sourceProduct.seller_id,
          deliveryQuote.shippingFee, deliveryOption==='delivery'?deliveryQuote.distanceKm:null,deliveryOption==='delivery'?String(body.deliveryAddressId):null,
        ]
      );
      if (!savedOrders.length) {
        await cancelExpiredQrisOrders();
        return NextResponse.json({ success: false, message: "Pesanan sudah diproses atau waktu pembayaran telah habis." }, { status: 409 });
      }
    } catch (dbErr: any) {
      console.error("Could not save order to PostgreSQL:", dbErr.message);
      return NextResponse.json({ success: false, message: "Pesanan gagal disimpan. Silakan coba lagi." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Pesanan berhasil disimpan",
      order: newOrder,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
 const viewer=await getServerSessionUser();if(!viewer)return NextResponse.json({success:false},{status:401});
 const requested=new URL(request.url).searchParams.get("userId");if(requested&&requested!==viewer.id)return NextResponse.json({success:false},{status:403});
  try {
    await ensureOrdersTable();
    await maybeAutoCancelExpiredOrders();
    const { searchParams } = new URL(request.url);
    const userId = viewer.id;

    try {
      let rows: any[] = [];
      if (userId) {
        rows = await query(
          `SELECT EXISTS (SELECT 1 FROM reviews WHERE reviews.order_id = orders.order_id) as "hasReview",
                  order_id as "orderId", user_id as "userId", user_name as "userName",
                  product_id as "productId", product_title as "productTitle", product_image as "productImage",
                  seller_name as "sellerName", order_type as "orderType", delivery_option as "deliveryOption",
                  cod_location as "codLocation", cod_date as "codDate", cod_time as "codTime", cod_notes as "codNotes",
                  payment_method as "paymentMethod", total_price as "totalPrice", status, payment_proof_url as "paymentProofUrl",
                  payment_verified as "paymentVerified", purchase_payment_status as "purchasePaymentStatus", purchase_amount as "purchaseAmount", rental_total_price as "rentalTotalPrice", purchase_service_fee as "purchaseServiceFee", cancellation_reason as "cancellationReason",
                  rent_duration as "rentDuration", rent_started_at as "rentStartedAt", rent_end_at as "rentEndAt",
                  created_at as "createdAt"
           FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
          [userId]
        );
      } else {
        rows = await query(
          `SELECT EXISTS (SELECT 1 FROM reviews WHERE reviews.order_id = orders.order_id) as "hasReview",
                  order_id as "orderId", user_id as "userId", user_name as "userName",
                  product_id as "productId", product_title as "productTitle", product_image as "productImage",
                  seller_name as "sellerName", order_type as "orderType", delivery_option as "deliveryOption",
                  cod_location as "codLocation", cod_date as "codDate", cod_time as "codTime", cod_notes as "codNotes",
                  payment_method as "paymentMethod", total_price as "totalPrice", status, payment_proof_url as "paymentProofUrl",
                  payment_verified as "paymentVerified", purchase_payment_status as "purchasePaymentStatus", purchase_amount as "purchaseAmount", rental_total_price as "rentalTotalPrice", purchase_service_fee as "purchaseServiceFee", cancellation_reason as "cancellationReason",
                  rent_duration as "rentDuration", rent_started_at as "rentStartedAt", rent_end_at as "rentEndAt",
                  created_at as "createdAt"
           FROM orders ORDER BY created_at DESC LIMIT 50`
        );
      }

      // Always return DB rows when query succeeded (even if empty [])
      global._inMemoryOrders = rows || [];
      return NextResponse.json({ success: true, orders: rows || [] });
    } catch (dbErr) {
      console.warn("DB query failed in /api/orders, fallback to memory:", dbErr);
    }

    let memoryOrders = global._inMemoryOrders || [];
    if (userId) {
      memoryOrders = memoryOrders.filter((o) => o.userId === userId);
    }
    return NextResponse.json({ success: true, orders: memoryOrders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user=await getServerSessionUser();
  if(!user||user.role==='SUPERADMIN')return NextResponse.json({success:false},{status:401});
  try{
    const {orderId,paymentProofUrl,paymentVerified}=await request.json();
    if(paymentVerified===true)return NextResponse.json({success:false,message:"Pembayaran hanya dapat diverifikasi superadmin."},{status:403});
    const proof=await persistDataUrlIfNeeded(paymentProofUrl,"proofs");
    if(!orderId||!proof)return NextResponse.json({success:false,message:"Unggah bukti pembayaran."},{status:400});
    const rows=await query(`UPDATE orders SET status='SEDANG_DIKEMAS',payment_proof_url=$3,payment_verified=false
      WHERE order_id=$1 AND user_id=$2 AND payment_method='QRIS' AND status='BELUM_BAYAR'
      AND created_at>NOW()-INTERVAL '10 minutes' RETURNING order_id`,[orderId,user.id,proof]);
    if(!rows.length){await cancelExpiredQrisOrders();return NextResponse.json({success:false,message:"Waktu pembayaran habis atau pesanan sudah diproses."},{status:409});}
    return NextResponse.json({success:true});
  }catch(error){console.error(error);return NextResponse.json({success:false,message:"Bukti gagal dikirim."},{status:500});}
}
export async function DELETE(){return NextResponse.json({success:false},{status:403});}
