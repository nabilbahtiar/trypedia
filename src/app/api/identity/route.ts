import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { pool,query } from "@/lib/db";
import { getVerifiedSessionUser } from "@/lib/auth-session";
export async function GET(){const user=await getVerifiedSessionUser();if(!user)return NextResponse.json({message:'Silakan masuk.'},{status:401});const [verification]=await query('SELECT document_type AS "documentType",status,reason,created_at AS "createdAt" FROM identity_verifications WHERE user_id=$1',[user.id]);return NextResponse.json({isVerified:user.isVerified,verification:verification||null},{headers:{'Cache-Control':'private,no-store'}});}
export async function POST(request:Request){
 const user=await getVerifiedSessionUser();if(!user||user.role==='SUPERADMIN')return NextResponse.json({message:'Silakan masuk.'},{status:401});if(user.isVerified)return NextResponse.json({message:'Akun sudah terverifikasi.'},{status:409});
 const form=await request.formData(),file=form.get('file'),kind=form.get('documentType');
 if(!(file instanceof File)||!['KTP','KTM'].includes(String(kind))||file.size>5*1024*1024||file.size===0)return NextResponse.json({message:'Pilih KTP/KTM dan gambar maksimal 5 MB.'},{status:400});
 const bytes=Buffer.from(await file.arrayBuffer());let ext='';
 if(bytes.subarray(0,3).equals(Buffer.from([255,216,255])))ext='jpg';else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')ext='webp';
 if(!ext)return NextResponse.json({message:'Gunakan foto JPG, PNG, atau WebP.'},{status:400});
 const name=randomUUID()+'.'+ext,folder=path.resolve('storage/identity');await fs.mkdir(folder,{recursive:true,mode:0o700});const client=await pool.connect();let old:string|undefined;
 try{await client.query('BEGIN');const account=await client.query('SELECT is_verified FROM users WHERE id=$1 FOR UPDATE',[user.id]);const existing=await client.query('SELECT status,storage_name FROM identity_verifications WHERE user_id=$1',[user.id]);
 if(account.rows[0].is_verified||existing.rows[0]?.status==='PENDING'){await client.query('ROLLBACK');return NextResponse.json({message:'Dokumen sedang diperiksa atau akun sudah disetujui.'},{status:409});}
 old=existing.rows[0]?.storage_name;await fs.writeFile(path.join(folder,name),bytes,{mode:0o600});
 await client.query(`INSERT INTO identity_verifications(user_id,document_type,storage_name,status) VALUES($1,$2,$3,'PENDING') ON CONFLICT(user_id) DO UPDATE SET document_type=EXCLUDED.document_type,storage_name=EXCLUDED.storage_name,status='PENDING',reason=NULL,created_at=NOW(),reviewed_at=NULL,reviewed_by=NULL`,[user.id,kind,name]);await client.query('COMMIT');if(old)await fs.unlink(path.join(folder,old)).catch(()=>{});return NextResponse.json({success:true});
 }catch(error){await client.query('ROLLBACK');await fs.unlink(path.join(folder,name)).catch(()=>{});console.error('Identity submission failed');return NextResponse.json({message:'Dokumen gagal disimpan.'},{status:500});}finally{client.release();}
}
