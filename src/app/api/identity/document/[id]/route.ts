import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getVerifiedSessionUser } from "@/lib/auth-session";
import { query } from "@/lib/db";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getVerifiedSessionUser(),{id}=await params;
 if(!user||(user.id!==id&&user.role!=='SUPERADMIN'))return new NextResponse(null,{status:403});
 const [row]=await query('SELECT storage_name FROM identity_verifications WHERE user_id=$1',[id]);if(!row||!/^[-a-f0-9]+\.(jpg|png|webp)$/.test(row.storage_name))return new NextResponse(null,{status:404});
 try{const bytes=await fs.readFile(path.resolve('storage/identity',row.storage_name));return new NextResponse(bytes,{headers:{'Content-Type':row.storage_name.endsWith('.jpg')?'image/jpeg':row.storage_name.endsWith('.png')?'image/png':'image/webp','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});}catch{return new NextResponse(null,{status:404});}
}
