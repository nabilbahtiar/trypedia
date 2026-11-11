import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { query } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth-session";
export async function POST(){
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(token)await query('DELETE FROM auth_sessions WHERE token_hash=$1',[createHash('sha256').update(token).digest('hex')]);
 const response=NextResponse.json({success:true});response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,path:'/',maxAge:0});return response;
}
