import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/server-auth";
import { validateCheckout } from "@/lib/checkout-validation";
export async function POST(request:Request){
  const user=await getServerSessionUser();
  if(!user||user.role==='SUPERADMIN')return NextResponse.json({success:false,message:'Silakan masuk terlebih dahulu.'},{status:401});
if(!user.isVerified)return NextResponse.json({success:false,message:'Lengkapi verifikasi KTP/KTM di profil terlebih dahulu.'},{status:403});
  try{return NextResponse.json({success:true,...await validateCheckout(user.id,await request.json())});}
  catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:'Checkout tidak valid.'},{status:400});}
}
