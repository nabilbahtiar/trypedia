import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSessionUser } from "@/lib/server-auth";
import { getCartItems } from "@/lib/queries/account-activity";
import { getActiveProductLock } from "@/lib/stock-locks";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({success:false},{status:401});
  return NextResponse.json({success:true,items:await getCartItems(user.id)});
}
export async function POST(request: Request) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({success:false,message:"Silakan masuk terlebih dahulu."},{status:401});
  const { productId, mode="rent", duration=3 } = await request.json();
  if (!['rent','buy'].includes(mode)||![1,3,7].includes(duration)) return NextResponse.json({success:false,message:"Pilihan transaksi tidak valid."},{status:400});
  const products = await query(`SELECT id,seller_id,stock FROM products WHERE id=$1`,[productId]);
  const product = products[0];
  if (!product) return NextResponse.json({success:false,message:"Produk tidak ditemukan."},{status:404});
  if (product.seller_id===user.id) return NextResponse.json({success:false,message:"Produk milik sendiri tidak dapat dimasukkan ke keranjang."},{status:403});
  const active = await query(`SELECT order_id FROM orders WHERE product_id=$1 AND status IN ('BELUM_BAYAR','SEDANG_DIKEMAS','DIJADWALKAN_DIKIRIM','DISEWA') LIMIT 1`,[productId]);
  if (product.stock<=0||active.length||getActiveProductLock(productId)) return NextResponse.json({success:false,message:"Produk sedang tidak tersedia."},{status:409});
  await query(`INSERT INTO cart_items(user_id,product_id,mode,duration) VALUES($1,$2,$3,$4)
    ON CONFLICT(user_id,product_id) DO UPDATE SET mode=EXCLUDED.mode,duration=EXCLUDED.duration`,[user.id,productId,mode,duration]);
  return NextResponse.json({success:true});
}
export async function DELETE(request: Request) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({success:false},{status:401});
  const productId = new URL(request.url).searchParams.get('productId');
  if (!productId) return NextResponse.json({success:false,message:"Pilih produk yang akan dihapus."},{status:400});
  await query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2',[user.id,productId]);
  return NextResponse.json({success:true});
}
