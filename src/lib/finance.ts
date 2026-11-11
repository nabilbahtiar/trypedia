import { settleSeller } from "@/lib/escrow";
import { randomUUID } from "crypto";
import { pool, query } from "@/lib/db";
export interface WalletRequest { id:string;kind:'TOPUP'|'WITHDRAW';amount:number;status:string;proofUrl:string|null;bankName:string|null;accountNumber:string|null;accountName:string|null;reason:string|null;createdAt:string;expiresAt:string|null;reviewedAt:string|null;transferReference:string|null }
export interface FinanceQueueItem { id:string;kind:'ORDER'|'PURCHASE'|'TOPUP'|'WITHDRAW';name:string;title:string;amount:number;proofUrl:string|null;createdAt:string;bankName?:string;accountNumber?:string;accountName?:string;status:string;reason?:string;transferReference?:string }
export interface FinanceTransaction { transactionId:string;orderId:string;createdAt:string;kind:string;sellerId:string;sellerName:string;buyerId:string;buyerName:string;title:string;paymentMethod:string;totalPayment:number;sellerIncome:number;serviceFee:number;insuranceFee:number }
export interface AdminFinanceData { serviceIncome:number;insuranceIncome:number;totalIncome:number;daily:{date:string;service:number;insurance:number}[];transactions:FinanceTransaction[];queue:FinanceQueueItem[] }
export const validProof=(url:unknown):url is string=>typeof url==='string'&&/^\/api\/media\/proofs\/[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)$/.test(url);
export async function getWalletRequests(userId:string):Promise<WalletRequest[]>{
 await query(`WITH expired AS (
 UPDATE wallet_requests SET status='EXPIRED' WHERE user_id=$1 AND status='AWAITING_PROOF' AND expires_at<=NOW() RETURNING *
 ) INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method,created_at)
 SELECT 'tx_'||id,user_id,'TOPUP',amount,'Top up gagal: waktu pembayaran habis','FAILED','QRIS',created_at FROM expired
 ON CONFLICT(id) DO NOTHING`,[userId]);
 const rows=await query(`SELECT id,kind,amount,status,proof_url AS "proofUrl",bank_name AS "bankName",account_number AS "accountNumber",account_name AS "accountName",reason,
 created_at AS "createdAt",expires_at AS "expiresAt",reviewed_at AS "reviewedAt",transfer_reference AS "transferReference" FROM wallet_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,[userId]);
 return JSON.parse(JSON.stringify(rows.map(row=>({...row,amount:Number(row.amount)}))));
}
export async function getAdminFinance():Promise<AdminFinanceData>{
 const [earnings,orders,purchases,requests,daily,transactions]=await Promise.all([
 query(`SELECT COALESCE(SUM(COALESCE(service_fee,0)+CASE WHEN purchase_payment_status='PAID' THEN COALESCE(purchase_service_fee,0) ELSE 0 END),0) AS service,
 COALESCE(SUM(insurance_fee),0) AS insurance FROM orders WHERE payment_verified=true AND status IN ('DISEWA','SELESAI','SELESAI_DIBELI')`),
 query(`SELECT o.order_id AS id,'ORDER' AS kind,u.name,o.product_title AS title,o.total_price AS amount,o.payment_proof_url AS "proofUrl",o.created_at AS "createdAt",'PENDING' AS status
 FROM orders o JOIN users u ON u.id=o.user_id WHERE o.payment_method='QRIS' AND NOT o.payment_verified AND o.status='SEDANG_DIKEMAS' AND o.payment_proof_url IS NOT NULL`),
 query(`SELECT o.order_id AS id,'PURCHASE' AS kind,u.name,o.product_title AS title,o.purchase_amount AS amount,o.purchase_payment_proof_url AS "proofUrl",o.created_at AS "createdAt",'PENDING' AS status
 FROM orders o JOIN users u ON u.id=o.user_id WHERE o.status='DISEWA' AND o.purchase_payment_status='PENDING'`),
 query(`SELECT r.id,r.kind,u.name,CASE WHEN r.kind='TOPUP' THEN 'Top Up Saldo' ELSE 'Tarik Saldo' END AS title,r.amount,r.proof_url AS "proofUrl",r.created_at AS "createdAt",r.bank_name AS "bankName",r.account_number AS "accountNumber",r.account_name AS "accountName",r.status,r.reason,r.transfer_reference AS "transferReference"
 FROM wallet_requests r JOIN users u ON u.id=r.user_id WHERE r.status IN ('PENDING','APPROVED','REJECTED') ORDER BY r.created_at DESC LIMIT 200`),
 query(`SELECT TO_CHAR(earned_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD') AS date,SUM(service) AS service,SUM(insurance) AS insurance FROM (
 SELECT COALESCE(rent_started_at,created_at) AS earned_at,COALESCE(service_fee,0) AS service,COALESCE(insurance_fee,0) AS insurance FROM orders
 WHERE payment_verified=true AND status IN ('DISEWA','SELESAI','SELESAI_DIBELI')
 UNION ALL SELECT COALESCE(w.created_at,o.created_at),COALESCE(o.purchase_service_fee,0),0 FROM orders o
 LEFT JOIN wallet_transactions w ON w.id='purchase_'||o.order_id AND w.user_id=o.user_id
 WHERE o.payment_verified=true AND o.purchase_payment_status='PAID' AND o.status='SELESAI_DIBELI'
 ) revenue GROUP BY 1 ORDER BY 1 DESC LIMIT 30`),
 query(`SELECT * FROM (
 SELECT o.order_id AS "transactionId",o.order_id AS "orderId",o.created_at AS "createdAt",
 CASE WHEN o.order_type='buy' THEN 'Pembelian' ELSE 'Sewa' END AS kind,
 COALESCE(o.seller_id,p.seller_id) AS "sellerId",COALESCE(s.name,o.seller_name) AS "sellerName",
 o.user_id AS "buyerId",COALESCE(b.name,o.user_name) AS "buyerName",o.product_title AS title,o.payment_method AS "paymentMethod",
 COALESCE(o.rental_total_price,o.total_price) AS "totalPayment",
 o.seller_income-CASE WHEN o.purchase_payment_status='PAID' THEN o.purchase_amount-COALESCE(o.purchase_service_fee,0) ELSE 0 END AS "sellerIncome",
 COALESCE(o.service_fee,0) AS "serviceFee",COALESCE(o.insurance_fee,0) AS "insuranceFee"
 FROM orders o LEFT JOIN products p ON p.id=o.product_id LEFT JOIN users s ON s.id=COALESCE(o.seller_id,p.seller_id) LEFT JOIN users b ON b.id=o.user_id
 WHERE o.payment_verified=true AND o.status IN ('DISEWA','SELESAI','SELESAI_DIBELI')
 UNION ALL
 SELECT 'purchase_'||o.order_id,o.order_id,COALESCE(w.created_at,o.created_at),'Lanjut Beli',COALESCE(o.seller_id,p.seller_id),COALESCE(s.name,o.seller_name),o.user_id,COALESCE(b.name,o.user_name),o.product_title,o.purchase_payment_method,
 o.purchase_amount,o.purchase_amount-COALESCE(o.purchase_service_fee,0),COALESCE(o.purchase_service_fee,0),0
 FROM orders o LEFT JOIN products p ON p.id=o.product_id LEFT JOIN users s ON s.id=COALESCE(o.seller_id,p.seller_id) LEFT JOIN users b ON b.id=o.user_id
 LEFT JOIN wallet_transactions w ON w.id='purchase_'||o.order_id AND w.user_id=o.user_id
 WHERE o.payment_verified=true AND o.purchase_payment_status='PAID' AND o.status='SELESAI_DIBELI'
 ) entries ORDER BY "createdAt" DESC,"transactionId"`)]);
 const serviceIncome=Number(earnings[0].service),insuranceIncome=Number(earnings[0].insurance);
 return {serviceIncome,insuranceIncome,totalIncome:serviceIncome+insuranceIncome,transactions:JSON.parse(JSON.stringify(transactions.map(row=>({...row,totalPayment:Number(row.totalPayment),sellerIncome:Number(row.sellerIncome),serviceFee:Number(row.serviceFee),insuranceFee:Number(row.insuranceFee)})))),daily:daily.map(row=>({...row,service:Number(row.service),insurance:Number(row.insurance)})),queue:JSON.parse(JSON.stringify([...orders,...purchases,...requests].map(row=>({...row,amount:Number(row.amount)}))))};
}
export class FinanceError extends Error {constructor(message:string,public status=409){super(message);}}
export async function reviewFinance(adminId:string,kind:string,id:string,decision:string,reason:string,reference:string){
 if(!['ORDER','PURCHASE','TOPUP','WITHDRAW'].includes(kind)||!['APPROVE','REJECT'].includes(decision))throw new FinanceError('Pilihan tidak valid.',400);
 if(decision==='REJECT'&&!reason.trim())throw new FinanceError('Isi alasan penolakan.',400);
 const client=await pool.connect();
 try{await client.query('BEGIN');
 const admin=await client.query("SELECT id FROM users WHERE id=$1 AND role='SUPERADMIN'",[adminId]);if(!admin.rowCount)throw new FinanceError('Akses ditolak.',403);
 let userId:string,message:string;
 if(kind==='TOPUP'||kind==='WITHDRAW'){
  const {rows}=await client.query('SELECT * FROM wallet_requests WHERE id=$1 AND kind=$2 FOR UPDATE',[id,kind]);const req=rows[0];if(!req)throw new FinanceError('Permintaan tidak ditemukan.',404);
  const target=decision==='APPROVE'?'APPROVED':'REJECTED';
  if(req.status===target){await client.query('COMMIT');return;}
  if(req.status!=='PENDING')throw new FinanceError('Permintaan sudah diproses.');
  userId=req.user_id;
  if(kind==='TOPUP'&&decision==='APPROVE'){
   if(!req.proof_url)throw new FinanceError('Bukti pembayaran belum tersedia.');
   await client.query(`INSERT INTO user_wallets(user_id,balance) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET balance=user_wallets.balance+$2,updated_at=NOW()`,[userId,req.amount]);
   await client.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method) VALUES($1,$2,'TOPUP',$3,$4,'SUCCESS','QRIS')`,['tx_'+id,userId,req.amount,'Top up disetujui: '+id]);
  }
  if(kind==='TOPUP'&&decision==='REJECT'){
   await client.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method,created_at) VALUES($1,$2,'TOPUP',$3,$4,'FAILED','QRIS',$5)`,['tx_'+id,userId,req.amount,'Top up gagal: '+reason,req.created_at]);
  }
  if(kind==='WITHDRAW'){
   if(decision==='REJECT')await client.query('UPDATE user_wallets SET balance=balance+$2,updated_at=NOW() WHERE user_id=$1',[userId,req.amount]);
   await client.query("UPDATE wallet_transactions SET status=$2,description=$3 WHERE id=$1",['tx_'+id,decision==='APPROVE'?'SUCCESS':'FAILED',decision==='APPROVE'?'Penarikan selesai ditransfer ke '+req.bank_name:'Penarikan ditolak; saldo dikembalikan. '+reason]);
  }
  await client.query('UPDATE wallet_requests SET status=$2,reason=$3,transfer_reference=$4,reviewed_at=NOW(),reviewed_by=$5 WHERE id=$1',[id,target,reason||null,reference||null,adminId]);
  message=kind==='TOPUP'?(decision==='APPROVE'?'Top up berhasil. Saldo sudah ditambahkan.':'Top up ditolak: '+reason):(decision==='APPROVE'?'Penarikan selesai. Dana sudah ditransfer ke rekening Anda.':'Penarikan ditolak. Saldo dikembalikan. '+reason);
 }else{
  const {rows}=await client.query(`SELECT o.*,p.seller_id AS resolved_seller FROM orders o LEFT JOIN products p ON p.id=o.product_id WHERE o.order_id=$1 FOR UPDATE OF o`,[id]);const order=rows[0];if(!order)throw new FinanceError('Pesanan tidak ditemukan.',404);userId=order.user_id;
  if(kind==='ORDER'){
   if(order.payment_verified&&decision==='APPROVE'){await client.query('COMMIT');return;}
   if(order.status!=='SEDANG_DIKEMAS'||order.payment_method!=='QRIS'||order.payment_verified||!order.payment_proof_url)throw new FinanceError('Pesanan tidak menunggu verifikasi QRIS.');
   if(decision==='APPROVE')await client.query('UPDATE orders SET payment_verified=true WHERE order_id=$1',[id]);
   else{
    await client.query("UPDATE orders SET status='DIBATALKAN',cancellation_reason=$2 WHERE order_id=$1",[id,'Bukti pembayaran ditolak: '+reason]);
    await client.query(`UPDATE products SET stock=1 WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM orders WHERE product_id=$1 AND status IN ('BELUM_BAYAR','SEDANG_DIKEMAS','DIJADWALKAN_DIKIRIM','DISEWA','SELESAI_DIBELI'))`,[order.product_id]);
   }
  }else{
   if(order.purchase_payment_status==='PAID'&&decision==='APPROVE'){await client.query('COMMIT');return;}
   if(order.status!=='DISEWA'||order.purchase_payment_status!=='PENDING'||!order.purchase_payment_proof_url)throw new FinanceError('Pembelian tidak menunggu verifikasi.');
   if(decision==='REJECT')await client.query(`UPDATE orders SET purchase_payment_status='REJECTED',purchase_amount=NULL,purchase_buy_price=NULL,purchase_rent_paid=NULL,purchase_service_fee=NULL,purchase_payment_proof_url=NULL,purchase_rejection_reason=$2 WHERE order_id=$1`,[id,reason]);
   else{
    const amount=Number(order.purchase_amount),sellerAmount=amount-Number(order.purchase_service_fee||0),seller=order.resolved_seller||order.seller_id;
    if(!seller||!Number.isFinite(amount)||amount<=0||sellerAmount<0)throw new FinanceError('Nominal pembayaran tidak valid.');
    await settleSeller(client,{...order,seller_id:seller},Number(order.seller_income)+sellerAmount);
    await client.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method) VALUES($1,$2,'PAYMENT',$3,$4,'SUCCESS','QRIS')`,['purchase_'+id,userId,amount,'Pembelian sewa-milik '+id]);
    await client.query(`UPDATE orders SET status='SELESAI_DIBELI',purchase_payment_status='PAID',total_price=COALESCE(rental_total_price,total_price)+purchase_amount,seller_income=seller_income+$2 WHERE order_id=$1`,[id,sellerAmount]);
    await client.query('UPDATE products SET stock=0 WHERE id=$1',[order.product_id]);
   }
  }
  message=decision==='APPROVE'?'Pembayaran QRIS '+id+' telah disetujui.':'Bukti pembayaran '+id+' ditolak: '+reason;
 }
 await client.query('INSERT INTO admin_audit(id,admin_id,kind,target_id,decision,reason) VALUES($1,$2,$3,$4,$5,$6)',['audit_'+randomUUID(),adminId,kind,id,decision,reason||null]);
 await client.query(`INSERT INTO notifications(id,user_id,title,message,href) VALUES($1,$2,$3,$4,$5)`,['ntf_'+randomUUID(),userId,kind==='WITHDRAW'?'Status penarikan saldo':kind==='TOPUP'?'Status top up':'Status pembayaran',message,kind==='ORDER'?'/orders':kind==='PURCHASE'?'/orders/'+encodeURIComponent(id)+'/payment':'/wallet']);
 await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
