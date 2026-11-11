// Exercises the real payment handler against isolated PostgreSQL fixtures.
const fs = require('fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { Pool } = require('pg');
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) process.loadEnvFile(file);
const pool = new Pool({ connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'trypedia_db'}` });
const prefix = `rtotest_${Date.now()}`;
const buyer = `${prefix}_b`, seller = `${prefix}_s`, product = `${prefix}_p`, order = `${prefix}_o`;
let session = { id: buyer };
const compiled = ts.transpileModule(fs.readFileSync('src/app/api/orders/rental-purchase/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const route = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === '@/lib/db') return { pool };
  if (name === '@/lib/server-auth') return { getServerSessionUser: async () => session };
  return require(name);
}, route, route.exports);
const pay = (expectedAmount = 1418000, extra = {}) => route.exports.POST(new Request('http://localhost/api/orders/rental-purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order, expectedAmount, ...extra }) }));

(async () => {
  try {
    for (const id of [buyer, seller]) await pool.query(`INSERT INTO users SELECT (jsonb_populate_record(NULL::users, to_jsonb(u) || $1::jsonb)).* FROM users u LIMIT 1`, [JSON.stringify({ id, name: id, email: `${id}@example.invalid` })]);
    await pool.query(`INSERT INTO stores SELECT (jsonb_populate_record(NULL::stores, to_jsonb(s) || $1::jsonb || jsonb_build_object('id', nextval(pg_get_serial_sequence('stores', 'id'))))).* FROM stores s LIMIT 1`, [JSON.stringify({ user_id: seller, store_name: seller })]);
    await pool.query(`INSERT INTO products SELECT (jsonb_populate_record(NULL::products, to_jsonb(p) || $1::jsonb)).* FROM products p LIMIT 1`, [JSON.stringify({ id: product, seller_id: seller, buy_price: 1500000, stock: 0 })]);
    await pool.query(`INSERT INTO orders SELECT (jsonb_populate_record(NULL::orders, to_jsonb(o) || $1::jsonb)).* FROM orders o LIMIT 1`, [JSON.stringify({ order_id: order, user_id: buyer, seller_id: seller, product_id: product, status: 'DISEWA', order_type: 'rent', seller_income: 84000, total_price: 99250, purchase_payment_status: null, purchase_amount: null, purchase_buy_price: null, purchase_rent_paid: null, purchase_service_fee: null, rental_total_price: null })]);
    await pool.query('INSERT INTO user_wallets (user_id, balance) VALUES ($1, 100), ($2, 0)', [buyer, seller]);
    session = null;
    assert.equal((await pay()).status, 401, 'requires login');
    session = { id: seller };
    assert.equal((await pay()).status, 404, 'rejects other buyer');
    session = { id: buyer };
    assert.equal((await pay(1)).status, 409, 'rejects tampered price');
    assert.equal((await pay()).status, 409, 'rejects insufficient balance');
    assert.equal((await pool.query('SELECT status FROM orders WHERE order_id=$1', [order])).rows[0].status, 'DISEWA');
    await pool.query('UPDATE user_wallets SET balance=2000000 WHERE user_id=$1', [buyer]);
    const responses = await Promise.all([pay(), pay()]);
    assert(responses.every(r => r.status === 200), 'repeat concurrent requests succeed idempotently');
    const balances = await pool.query('SELECT user_id, balance FROM user_wallets WHERE user_id=ANY($1)', [[buyer, seller]]);
    assert.equal(Number(balances.rows.find(r => r.user_id === buyer).balance), 582000, 'deducts rental fee, not admin fees; debits exactly once');
    assert.equal(Number(balances.rows.find(r => r.user_id === seller).balance), 1416000, 'credits seller once');
    assert.equal((await pool.query('SELECT status FROM orders WHERE order_id=$1', [order])).rows[0].status, 'SELESAI_DIBELI');
    assert.equal((await pool.query('SELECT count(*) FROM wallet_transactions WHERE user_id=ANY($1)', [[buyer, seller]])).rows[0].count, '2');
    const completed = (await pool.query('SELECT total_price,seller_income,purchase_service_fee FROM orders WHERE order_id=$1',[order])).rows[0];
    assert.equal(Number(completed.total_price),1517250,'total includes rental invoice and purchase payment');
    assert.equal(Number(completed.seller_income),1500000,'seller income excludes service fee');
    assert.equal(Number(completed.purchase_service_fee),2000);
    // A rental payment larger than the buy price must never produce a negative charge.
    await pool.query("DELETE FROM wallet_transactions WHERE user_id=ANY($1)", [[buyer, seller]]);
    await pool.query("UPDATE orders SET status='DISEWA', seller_income=1600000, purchase_amount=NULL, purchase_payment_status=NULL, purchase_service_fee=NULL, rental_total_price=NULL, total_price=99250 WHERE order_id=$1", [order]);
    assert.equal((await pay(2000)).status, 200);
    assert.equal((await pool.query('SELECT count(*) FROM wallet_transactions WHERE user_id=ANY($1)', [[buyer, seller]])).rows[0].count, '2');
    await pool.query("UPDATE orders SET status='DISEWA', seller_income=84000, purchase_amount=NULL, purchase_payment_status=NULL WHERE order_id=$1", [order]);
    await pool.query('DELETE FROM wallet_transactions WHERE user_id=ANY($1)', [[buyer,seller]]);
    assert.equal((await pay(1418000, {paymentMethod: 'qris'})).status, 400, 'QRIS requires proof');
    assert.equal((await pay(1418000, {paymentMethod: 'qris',proofUrl: '/api/media/proofs/test.webp'})).status, 200);
    assert.equal((await pool.query('SELECT status,purchase_payment_status FROM orders WHERE order_id=$1', [order])).rows[0].purchase_payment_status, 'PENDING');
    assert.equal((await pool.query('SELECT count(*) FROM wallet_transactions WHERE user_id=ANY($1)', [[buyer,seller]])).rows[0].count,'0','QRIS proof never auto-settles');
    const {reviewPayment}=require('./review-rental-purchase.cjs');
    await reviewPayment(pool,order,'reject');
    assert.equal((await pool.query('SELECT purchase_payment_status FROM orders WHERE order_id=$1',[order])).rows[0].purchase_payment_status,'REJECTED');
    await pay(1418000,{paymentMethod:'qris',proofUrl:'/api/media/proofs/test.webp'});
    await Promise.all([reviewPayment(pool,order,'approve'),reviewPayment(pool,order,'approve')]);
    assert.equal((await pool.query('SELECT status FROM orders WHERE order_id=$1',[order])).rows[0].status,'SELESAI_DIBELI');
    assert.equal((await pool.query('SELECT count(*) FROM wallet_transactions WHERE user_id=ANY($1)',[[buyer,seller]])).rows[0].count,'2','QRIS settles only once');
    assert.equal(Number((await pool.query('SELECT balance FROM user_wallets WHERE user_id=$1',[buyer])).rows[0].balance),580000,'QRIS never debits wallet');
    console.log('PASS: QRIS pending, rejection, resubmission, concurrent settlement, no wallet debit.');
    console.log('PASS: authentication, ownership, price validation, insufficient funds, atomic concurrent payment, rental deduction, zero remainder.');
  } finally {
    await pool.query('DELETE FROM wallet_transactions WHERE user_id=ANY($1)', [[buyer, seller]]);
    await pool.query('DELETE FROM orders WHERE order_id=$1', [order]);
    await pool.query('DELETE FROM products WHERE id=$1', [product]);
    await pool.query('DELETE FROM stores WHERE user_id=$1', [seller]);
    await pool.query('DELETE FROM user_wallets WHERE user_id=ANY($1)', [[buyer, seller]]);
    await pool.query('DELETE FROM users WHERE id=ANY($1)', [[buyer, seller]]);
    await pool.end();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
