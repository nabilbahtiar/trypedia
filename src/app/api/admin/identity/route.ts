import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSuperadmin } from "@/lib/auth-session";
import { query,pool } from "@/lib/db";
export async function GET(){if(!await getSuperadmin())return NextResponse.json({},{status:403});const rows=await query(`SELECT v.user_id AS id,u.name,u.email,v.document_type AS "documentType",v.status,v.reason,v.created_at AS "createdAt" FROM identity_verifications v JOIN users u ON u.id=v.user_id ORDER BY (v.status='PENDING') DESC,v.created_at DESC LIMIT 100`);return NextResponse.json({rows},{headers:{'Cache-Control':'private,no-store'}});}
export async function POST(request:Request){
 const admin=await getSuperadmin();if(!admin)return NextResponse.json({},{status:403});const {id,decision,reason}=await request.json();if(!['APPROVED','REJECTED'].includes(decision)||(decision==='REJECTED'&&!String(reason||'').trim()))return NextResponse.json({message:'Isi keputusan dan alasan penolakan.'},{status:400});
 const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[id]);const {rows}=await client.query('SELECT status FROM identity_verifications WHERE user_id=$1 FOR UPDATE',[id]);
 if(!rows[0]||rows[0].status!=='PENDING'){await client.query('ROLLBACK');return NextResponse.json({message:'Permintaan sudah diproses.'},{status:409});}
 await client.query('UPDATE identity_verifications SET status=$2,reason=$3,reviewed_at=NOW(),reviewed_by=$4 WHERE user_id=$1',[id,decision,decision==='REJECTED'?reason.trim():null,admin.id]);await client.query('UPDATE users SET is_verified=$2 WHERE id=$1',[id,decision==='APPROVED']);await client.query('UPDATE stores SET is_verified=$2 WHERE user_id=$1',[id,decision==='APPROVED']);
 await client.query(`INSERT INTO notifications(id,user_id,title,message,href) VALUES($1,$2,'Verifikasi Identitas',$3,'/settings')`,['ntf_'+randomUUID(),id,decision==='APPROVED'?'Identitas disetujui. Akun Anda sudah dapat bertransaksi.':'Identitas ditolak: '+reason]);await client.query('COMMIT');return NextResponse.json({success:true});
 }catch{await client.query('ROLLBACK');return NextResponse.json({message:'Keputusan gagal disimpan.'},{status:500});}finally{client.release();}
}
