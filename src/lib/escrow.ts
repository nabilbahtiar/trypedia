import { createHash } from "crypto";
import type { PoolClient } from "pg";
export async function settleSeller(client:PoolClient,order:{order_id:string;seller_id:string;seller_income:string|number;seller_settled_amount?:string|number},target:number){
 const paid=Number(order.seller_settled_amount||0),amount=Math.max(0,target-paid);
 if(amount>0){
  await client.query(`INSERT INTO user_wallets(user_id,balance) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET balance=user_wallets.balance+$2,updated_at=NOW()`,[order.seller_id,amount]);
  await client.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method) VALUES($1,$2,'INCOME',$3,$4,'SUCCESS','Rekber TryPedia')`,['settle_'+createHash('sha256').update(order.order_id+':'+target).digest('hex').slice(0,32),order.seller_id,amount,'Hasil produk pesanan '+order.order_id]);
 }
 await client.query('UPDATE orders SET seller_settled_amount=$2 WHERE order_id=$1',[order.order_id,Math.max(paid,target)]);
 return amount;
}
