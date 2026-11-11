import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { pool,query } from "@/lib/db";
import { getVerifiedSessionUser } from "@/lib/auth-session";
import { persistDataUrlIfNeeded } from "@/lib/media";
import { GeocodingError,reverseAddress,sameAddress,validCoordinates } from "@/lib/address-geocoding";

const unauthorized=()=>NextResponse.json({success:false,message:'Silakan masuk ulang untuk mengatur alamat.'},{status:401});
async function syncStore(client:PoolClient,userId:string){
 await client.query(`UPDATE stores s SET address=a.street_address||', '||a.province_city_district,
 district=split_part(a.province_city_district,',',1),front_photo_url=COALESCE(a.front_photo_url,s.front_photo_url)
 FROM (SELECT street_address,province_city_district,front_photo_url FROM user_addresses
 WHERE user_id=$1 AND (is_shop_address OR is_primary) ORDER BY is_shop_address DESC,is_primary DESC,updated_at DESC LIMIT 1) a WHERE s.user_id=$1`,[userId]);
}
export async function GET(request:Request){
 const user=await getVerifiedSessionUser();if(!user||user.role==='SUPERADMIN')return unauthorized();
 const requested=new URL(request.url).searchParams.get('userId');if(requested&&requested!==user.id)return NextResponse.json({success:false},{status:403});
 try{const addresses=await query(`SELECT id,user_id AS "userId",recipient_name AS "recipientName",phone,province_city_district AS "provinceCityDistrict",street_address AS "streetAddress",address_notes AS "addressNotes",latitude,longitude,label,is_primary AS "isPrimary",is_shop_address AS "isShopAddress",is_return_address AS "isReturnAddress",front_photo_url AS "frontPhotoUrl",created_at AS "createdAt" FROM user_addresses WHERE user_id=$1 ORDER BY is_primary DESC,is_shop_address DESC,created_at DESC`,[user.id]);return NextResponse.json({success:true,addresses});}
 catch(error){console.error('Address read failed',error);return NextResponse.json({success:false,message:'Alamat gagal dimuat.'},{status:503});}
}
export async function POST(request:Request){
 const user=await getVerifiedSessionUser();if(!user||user.role==='SUPERADMIN')return unauthorized();
 try{
 const body=await request.json();if(body.userId&&body.userId!==user.id)return NextResponse.json({success:false},{status:403});
 const {id,latitude,longitude,recipientName,phone,streetAddress,provinceCityDistrict,addressNotes='',label='Rumah',isPrimary=false,isShopAddress=false,isReturnAddress=false,frontPhotoUrl=null}=body;
 if(typeof recipientName!=='string'||!recipientName.trim()||typeof phone!=='string'||!phone.trim()||typeof streetAddress!=='string'||!streetAddress.trim()||typeof provinceCityDistrict!=='string'||!provinceCityDistrict.trim()||!['Rumah','Kantor','Kos'].includes(label)||!validCoordinates(latitude,longitude))return NextResponse.json({success:false,message:'Lengkapi nama, telepon, alamat, dan titik lokasi yang valid.'},{status:400});
 if(id){const [owner]=await query('SELECT user_id FROM user_addresses WHERE id=$1',[id]);if(!owner||owner.user_id!==user.id)return NextResponse.json({success:false,message:'Alamat tidak ditemukan.'},{status:403});}
 const resolved=await reverseAddress(latitude,longitude);
 if(!sameAddress(streetAddress,resolved.streetAddress)||!sameAddress(provinceCityDistrict,resolved.provinceCityDistrict))return NextResponse.json({success:false,message:'Alamat dan pin belum sesuai. Gunakan GPS, pilih pin, atau cari kembali dari alamat.'},{status:409});
 const safePhoto=await persistDataUrlIfNeeded(frontPhotoUrl,'addresses');
 const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
 if(isPrimary)await client.query('UPDATE user_addresses SET is_primary=false WHERE user_id=$1',[user.id]);
 if(isShopAddress)await client.query('UPDATE user_addresses SET is_shop_address=false,is_return_address=false WHERE user_id=$1',[user.id]);
 const addressId=id||'addr_'+randomUUID();
 const saved=await client.query(`INSERT INTO user_addresses(id,user_id,recipient_name,phone,province_city_district,street_address,address_notes,latitude,longitude,label,is_primary,is_shop_address,is_return_address,front_photo_url,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
 ON CONFLICT(id) DO UPDATE SET recipient_name=EXCLUDED.recipient_name,phone=EXCLUDED.phone,province_city_district=EXCLUDED.province_city_district,street_address=EXCLUDED.street_address,address_notes=EXCLUDED.address_notes,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,label=EXCLUDED.label,is_primary=EXCLUDED.is_primary,is_shop_address=EXCLUDED.is_shop_address,is_return_address=EXCLUDED.is_return_address,front_photo_url=EXCLUDED.front_photo_url,updated_at=NOW()
 WHERE user_addresses.user_id=EXCLUDED.user_id RETURNING id`,[addressId,user.id,recipientName.trim(),phone.trim(),resolved.provinceCityDistrict,resolved.streetAddress,String(addressNotes).trim(),latitude,longitude,label,Boolean(isPrimary),Boolean(isShopAddress),Boolean(isReturnAddress||isShopAddress),safePhoto]);
 if(!saved.rowCount)throw new Error('Address ownership changed');
 await syncStore(client,user.id);await client.query('COMMIT');return NextResponse.json({success:true,addressId,latitude,longitude});
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }catch(error){if(error instanceof GeocodingError)return NextResponse.json({success:false,message:error.message},{status:error.status});console.error('Address save failed',error);return NextResponse.json({success:false,message:'Alamat gagal disimpan. Silakan coba lagi.'},{status:500});}
}
export async function PUT(request:Request){
 const user=await getVerifiedSessionUser();if(!user||user.role==='SUPERADMIN')return unauthorized();
 const body=await request.json();if(body.userId&&body.userId!==user.id)return NextResponse.json({success:false},{status:403});
 if(!body.id||!['set_primary','set_shop'].includes(body.action))return NextResponse.json({success:false},{status:400});
 const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);const owned=await client.query('SELECT id FROM user_addresses WHERE id=$1 AND user_id=$2',[body.id,user.id]);if(!owned.rowCount){await client.query('ROLLBACK');return NextResponse.json({success:false},{status:404});}
 if(body.action==='set_shop')await client.query('UPDATE user_addresses SET is_shop_address=(id=$1),is_return_address=(id=$1) WHERE user_id=$2',[body.id,user.id]);
 else await client.query('UPDATE user_addresses SET is_primary=(id=$1) WHERE user_id=$2',[body.id,user.id]);
 await syncStore(client,user.id);await client.query('COMMIT');return NextResponse.json({success:true});
 }catch(error){await client.query('ROLLBACK');console.error(error);return NextResponse.json({success:false,message:'Alamat gagal diperbarui.'},{status:500});}finally{client.release();}
}
export async function DELETE(request:Request){
 const user=await getVerifiedSessionUser();if(!user||user.role==='SUPERADMIN')return unauthorized();const params=new URL(request.url).searchParams;
 if(params.get('userId')&&params.get('userId')!==user.id)return NextResponse.json({success:false},{status:403});
 if(!params.get('id'))return NextResponse.json({success:false},{status:400});
 const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);const removed=await client.query('DELETE FROM user_addresses WHERE id=$1 AND user_id=$2 RETURNING id',[params.get('id'),user.id]);if(!removed.rowCount){await client.query('ROLLBACK');return NextResponse.json({success:false},{status:404});}await syncStore(client,user.id);await client.query('COMMIT');return NextResponse.json({success:true});}catch(error){await client.query('ROLLBACK');console.error(error);return NextResponse.json({success:false,message:'Alamat gagal dihapus.'},{status:500});}finally{client.release();}
}
