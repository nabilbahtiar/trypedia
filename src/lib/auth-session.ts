import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { query } from "@/lib/db";
import type { SessionUserMinimal } from "@/lib/server-auth";
export const SESSION_COOKIE="trypedia_session";
export function verifyPassword(input:string,stored:string) {
  if(!stored.startsWith('scrypt$'))return input===stored;
  const [,salt,digest]=stored.split('$');
  try{const expected=Buffer.from(digest,'hex'),actual=scryptSync(input,salt,64);return expected.length===actual.length&&timingSafeEqual(expected,actual);}catch{return false;}
}
export async function createSession(userId:string){
  const token=randomBytes(32).toString('hex');
  await query("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 days')",[createHash('sha256').update(token).digest('hex'),userId]);
  return token;
}
export const getVerifiedSessionUser=cache(async ():Promise<SessionUserMinimal|null>=>{
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!token)return null;
  const [user]=await query(`SELECT u.id,u.name,u.email,u.phone,u.avatar,u.photo_url AS "photoUrl",u.is_verified AS "isVerified",u.role
    FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()`,[createHash('sha256').update(token).digest('hex')]);
  return user||null;
});
export async function getSuperadmin(){const user=await getVerifiedSessionUser();return user?.role==='SUPERADMIN'?user:null;}
