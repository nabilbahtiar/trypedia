import { query } from "@/lib/db";
import { deliveryPrice,scheduleError } from "@/lib/checkout-rules";

export async function validateCheckout(userId:string,body:{productId:string;deliveryOption:string;deliveryAddressId?:string|number;codDate:string;codTime:string;shippingFee?:number}) {
  const error=scheduleError(body.codDate,body.codTime);
  if(error)throw new Error(error);
  if(!['pickup','cod','delivery'].includes(body.deliveryOption))throw new Error('Pilih metode serah-terima.');
  let quote={distanceKm:0,shippingFee:0};
  if(body.deliveryOption==='delivery'){
    const [row]=await query(`SELECT a.latitude AS lat,a.longitude AS lng,d.latitude AS "toLat",d.longitude AS "toLng"
    FROM products p JOIN LATERAL (SELECT latitude,longitude FROM user_addresses WHERE user_id=p.seller_id
    AND (is_shop_address=true OR is_primary=true) ORDER BY is_shop_address DESC,is_primary DESC,updated_at DESC LIMIT 1) a ON true
    JOIN user_addresses d ON d.id::text=$2 AND d.user_id=$3 WHERE p.id=$1`,[body.productId,String(body.deliveryAddressId||''),userId]);
    const calculated=row&&deliveryPrice(row.lat,row.lng,row.toLat,row.toLng);
    if(!calculated)throw new Error('Lengkapi pin lokasi alamat toko dan alamat pengantaran terlebih dahulu.');
    quote=calculated;
  }
  if(body.shippingFee!==quote.shippingFee)throw new Error('Ongkir berubah. Muat ulang checkout sebelum membayar.');
  return quote;
}
