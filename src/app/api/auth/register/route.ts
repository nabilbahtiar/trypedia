import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";
import { hashPassword,allowAuthAttempt } from "@/lib/account-access";
export async function POST(request:Request){
 if(!await allowAuthAttempt(request,'register'))return NextResponse.json({success:false,message:'Terlalu banyak percobaan. Coba lagi nanti.'},{status:429});
 const body=await request.json().catch(()=>null);
 if(!body||typeof body.name!=='string'||body.name.trim().length<2||body.name.length>100||typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||body.email.length>254||typeof body.password!=='string'||body.password.length<8||body.password.length>128)return NextResponse.json({success:false,message:'Isi nama, email valid, dan password minimal 8 karakter.'},{status:400});
 const password=await hashPassword(body.password),id='usr_'+randomUUID();const client=await pool.connect();
 try{await client.query('BEGIN');await client.query(`INSERT INTO users(id,name,email,password,phone,avatar,is_verified,role) VALUES($1,$2,$3,$4,'',$5,false,'USER')`,[id,body.name.trim(),body.email.trim().toLowerCase(),password,body.name.trim().slice(0,2).toUpperCase()]);await client.query('INSERT INTO user_wallets(user_id,balance) VALUES($1,0)',[id]);await client.query('INSERT INTO user_coins(user_id,balance) VALUES($1,10000)',[id]);await client.query(`INSERT INTO coin_transactions(id, user_id, type, amount, description, status) VALUES($1, $2, 'BONUS', 10000, 'Bonus Pengguna Baru Trypedia', 'SUCCESS') ON CONFLICT (id) DO NOTHING`,['coin_tx_'+randomUUID(), id]);await client.query('COMMIT');return NextResponse.json({success:true});}
 catch(error:any){await client.query('ROLLBACK');return NextResponse.json({success:false,message:error.code==='23505'?'Email sudah terdaftar. Silakan masuk.':'Pendaftaran gagal. Coba lagi.'},{status:error.code==='23505'?409:500});}finally{client.release();}
}
