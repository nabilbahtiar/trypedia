import {NextResponse} from "next/server";
export async function POST(){return NextResponse.json({success:false,message:"Gunakan Top Up Saldo dengan unggah bukti QRIS untuk diperiksa admin."},{status:410});}
