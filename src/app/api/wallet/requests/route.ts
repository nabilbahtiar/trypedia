import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getVerifiedSessionUser } from "@/lib/auth-session";
import { pool, query } from "@/lib/db";
import { getWalletRequests, validProof } from "@/lib/finance";
export async function GET(){const user=await getVerifiedSessionUser();if(!user||user.role==='SUPERADMIN')return NextResponse.json({success:false,message:'Silakan masuk ulang untuk melanjutkan.'},{status:401});return NextResponse.json({success:true,requests:await getWalletRequests(user.id)});}
export async function POST(request:Request){
 const user=await getVerifiedSessionUser();if(!user||user.role==='SUPERADMIN')return NextResponse.json({success:false,message:'Silakan masuk ulang untuk melanjutkan.'},{status:401});
 const {kind,amount,bankName,accountNumber,accountName,idempotencyKey}=await request.json();
 if(!['TOPUP','WITHDRAW'].includes(kind)||!Number.isSafeInteger(amount)||amount<=0||amount>999999999999||typeof idempotencyKey!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(idempotencyKey))return NextResponse.json({success:false,message:'Data permintaan tidak valid.'},{status:400});
 if(kind==='TOPUP'&&amount<10000)return NextResponse.json({success:false,message:'Minimal top up Rp10.000.'},{status:400});
 if(kind==='WITHDRAW'&&(!bankName?.trim()||!/^\d{5,30}$/.test(accountNumber||'')||!accountName?.trim()))return NextResponse.json({success:false,message:'Isi bank, nomor rekening, dan nama pemilik rekening.'},{status:400});
 const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
 const existing=await client.query('SELECT id,kind,amount FROM wallet_requests WHERE user_id=$1 AND idempotency_key=$2',[user.id,idempotencyKey]);
 if(existing.rowCount){if(existing.rows[0].kind!==kind||Number(existing.rows[0].amount)!==amount)throw new Error('Permintaan berbeda memakai ID yang sama.');await client.query('COMMIT');return NextResponse.json({success:true,id:existing.rows[0].id});}
 const id='wr_'+randomUUID();
 if(kind==='WITHDRAW'){const debit=await client.query('UPDATE user_wallets SET balance=balance-$2,updated_at=NOW() WHERE user_id=$1 AND balance>=$2 RETURNING user_id',[user.id,amount]);if(!debit.rowCount){await client.query('ROLLBACK');return NextResponse.json({success:false,message:'Saldo belum cukup.'},{status:409});}}
 await client.query(`INSERT INTO wallet_requests(id,user_id,kind,amount,status,bank_name,account_number,account_name,idempotency_key,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $3='TOPUP' THEN NOW()+INTERVAL '10 minutes' ELSE NULL END)`,[id,user.id,kind,amount,kind==='TOPUP'?'AWAITING_PROOF':'PENDING',bankName?.trim()||null,accountNumber||null,accountName?.trim()||null,idempotencyKey]);
 if(kind==='WITHDRAW'){
 await client.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method) VALUES($1,$2,'WITHDRAW',$3,$4,'PENDING',$5)`,['tx_'+id,user.id,amount,'Penarikan menunggu transfer admin',bankName]);
 await client.query(`INSERT INTO notifications(id,user_id,title,message,href) SELECT 'ntf_'||md5(random()::text||clock_timestamp()::text),id,'Permintaan tarik saldo',$1,'/admin?tab=withdrawals' FROM users WHERE role='SUPERADMIN'`,[(user.name||'Pengguna')+' mengajukan penarikan saldo.']);}
 await client.query('COMMIT');return NextResponse.json({success:true,id});
 }catch(error){await client.query('ROLLBACK');console.error('Wallet request failed',error);return NextResponse.json({success:false,message:'Permintaan gagal disimpan.'},{status:500});}finally{client.release();}
}
export async function PATCH(request:Request){
 const user=await getVerifiedSessionUser();if(!user||user.role==='SUPERADMIN')return NextResponse.json({success:false,message:'Silakan masuk ulang untuk melanjutkan.'},{status:401});
 const {id,proofUrl}=await request.json();if(typeof id!=='string'||!validProof(proofUrl))return NextResponse.json({success:false,message:'Unggah bukti pembayaran.'},{status:400});
 const client=await pool.connect();try{await client.query('BEGIN');
 const rows=await client.query(`UPDATE wallet_requests SET proof_url=$3,status='PENDING' WHERE id=$1 AND user_id=$2 AND kind='TOPUP' AND status='AWAITING_PROOF' AND expires_at>NOW() RETURNING id`,[id,user.id,proofUrl]);
 if(!rows.rowCount){await client.query('ROLLBACK');return NextResponse.json({success:false,message:'Waktu pembayaran habis atau bukti sudah dikirim.'},{status:409});}
 await client.query(`INSERT INTO notifications(id,user_id,title,message,href) SELECT 'ntf_'||md5(random()::text||clock_timestamp()::text),id,'Bukti top up baru',$1,'/admin?tab=topups' FROM users WHERE role='SUPERADMIN'`,[(user.name||'Pengguna')+' mengirim bukti top up QRIS.']);
 await client.query('COMMIT');return NextResponse.json({success:true});
 }catch(error){await client.query('ROLLBACK');console.error(error);return NextResponse.json({success:false,message:'Bukti gagal disimpan.'},{status:500});}finally{client.release();}
}
