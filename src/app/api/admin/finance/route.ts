import { NextResponse } from "next/server";
import { getSuperadmin } from "@/lib/auth-session";
import { FinanceError,getAdminFinance,reviewFinance } from "@/lib/finance";
export async function GET(){if(!await getSuperadmin())return NextResponse.json({success:false},{status:403});return NextResponse.json({success:true,data:await getAdminFinance()});}
export async function POST(request:Request){
 const admin=await getSuperadmin();if(!admin)return NextResponse.json({success:false,message:'Akses ditolak.'},{status:403});
 try{const {kind,id,decision,reason='',reference=''}=await request.json();if(typeof id!=='string'||typeof reason!=='string'||typeof reference!=='string')return NextResponse.json({success:false},{status:400});await reviewFinance(admin.id,kind,id,decision,reason.trim(),reference.trim());return NextResponse.json({success:true});}
 catch(error){console.error('Admin finance review failed',error);return NextResponse.json({success:false,message:error instanceof FinanceError?error.message:'Keputusan gagal disimpan.'},{status:error instanceof FinanceError?error.status:500});}
}
