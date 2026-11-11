import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth-session";
import { GeocodingError,reverseAddress,searchAddress } from "@/lib/address-geocoding";
export async function POST(request:Request){
 const user=await getVerifiedSessionUser();if(!user||user.role==='SUPERADMIN')return NextResponse.json({success:false,message:'Silakan masuk ulang untuk mengatur alamat.'},{status:401});
 try{const body=await request.json();const address=body.mode==='search'?await searchAddress(String(body.streetAddress||''),String(body.provinceCityDistrict||'')):await reverseAddress(body.latitude,body.longitude);return NextResponse.json({success:true,address});}
 catch(error){const status=error instanceof GeocodingError?error.status:500;return NextResponse.json({success:false,message:error instanceof GeocodingError?error.message:'Alamat gagal dibaca.'},{status,headers:status===429?{'Retry-After':'2'}:{}});}
}
