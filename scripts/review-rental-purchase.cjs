// Operator-only: run after checking the QRIS settlement and proof outside the app.
// node scripts/review-rental-purchase.cjs ORDER_ID approve|reject
const fs = require('fs');
const { Pool } = require('pg');

async function reviewPayment(pool, orderId, decision) {
  if (!orderId || !['approve', 'reject'].includes(decision)) throw new Error('Usage: node scripts/review-rental-purchase.cjs ORDER_ID approve|reject');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT o.*, p.seller_id FROM orders o JOIN products p ON p.id=o.product_id
      WHERE o.order_id=$1 FOR UPDATE OF o,p`, [orderId]);
    const order = rows[0];
    if (order?.status === 'SELESAI_DIBELI' && order.purchase_payment_status === 'PAID') {
      await client.query('COMMIT');
      return;
    }
    if (!order || order.status !== 'DISEWA' || order.purchase_payment_status !== 'PENDING' || order.purchase_payment_method !== 'QRIS' || !order.purchase_payment_proof_url) throw new Error('No pending QRIS purchase to review.');
    if (decision === 'reject') {
      await client.query(`UPDATE orders SET purchase_payment_status='REJECTED', purchase_amount=NULL,
        purchase_buy_price=NULL, purchase_rent_paid=NULL, purchase_service_fee=NULL, purchase_payment_proof_url=NULL WHERE order_id=$1`, [orderId]);
    } else {
      const amount = Number(order.purchase_amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid payment amount.');
      const sellerAmount = Math.max(0,Number(order.seller_income)+amount-Number(order.purchase_service_fee||0)-Number(order.seller_settled_amount||0));
      await client.query(`INSERT INTO user_wallets (user_id,balance,updated_at) VALUES ($1,$2,CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET balance=user_wallets.balance+$2,updated_at=CURRENT_TIMESTAMP`, [order.seller_id,sellerAmount]);
      await client.query(`INSERT INTO wallet_transactions (id,user_id,type,amount,description,status,payment_method)
        VALUES ($1,$2,'PAYMENT',$3,$4,'SUCCESS','QRIS'),($5,$6,'income',$7,$4,'success','Rekber TryPedia')`,
      [`purchase_${orderId}`,order.user_id,amount,`Pembelian sewa-milik ${orderId}`,`purchase_income_${orderId}`,order.seller_id,sellerAmount]);
      await client.query("UPDATE orders SET status='SELESAI_DIBELI',purchase_payment_status='PAID', total_price=COALESCE(rental_total_price,total_price)+purchase_amount, seller_income=seller_income+purchase_amount-COALESCE(purchase_service_fee,0),seller_settled_amount=COALESCE(seller_settled_amount,0)+$2 WHERE order_id=$1",[orderId,sellerAmount]);
      await client.query('UPDATE products SET stock=0 WHERE id=$1',[order.product_id]);
    }
    await client.query('COMMIT');
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
module.exports = { reviewPayment };
if (require.main === module) {
  for (const file of ['.env.local','.env']) if (fs.existsSync(file)) process.loadEnvFile(file);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'trypedia_db'}` });
  reviewPayment(pool,process.argv[2],process.argv[3]).then(()=>console.log('Payment review saved.')).catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
}
