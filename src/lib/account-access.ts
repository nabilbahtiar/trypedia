import { query } from "@/lib/db";
import { createHash,randomBytes,scrypt } from "crypto";
import { promisify } from "util";
export const verificationMessage='Lengkapi verifikasi KTP/KTM di profil dan tunggu persetujuan admin sebelum bertransaksi.';
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const hash=await promisify(scrypt)(password,salt,64) as Buffer;return `scrypt$${salt}$${hash.toString('hex')}`;}
export async function allowAuthAttempt(request:Request,kind:string){
 const ip=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local';
 const key=createHash('sha256').update(kind+':'+ip).digest('hex');
 const [row]=await query(`INSERT INTO auth_rate_limits(key,attempts,expires_at) VALUES($1,1,NOW()+INTERVAL '10 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.expires_at<NOW() THEN 1 ELSE auth_rate_limits.attempts+1 END,expires_at=CASE WHEN auth_rate_limits.expires_at<NOW() THEN NOW()+INTERVAL '10 minutes' ELSE auth_rate_limits.expires_at END RETURNING attempts`,[key]);return row.attempts<=30;
}
