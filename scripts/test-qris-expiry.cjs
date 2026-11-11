const fs = require('fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { Pool } = require('pg');
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) process.loadEnvFile(file);
const pool = new Pool({ connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'trypedia_db'}` });
const prefix = `qristest_${Date.now()}`, orderId = `${prefix}_o`, productId = `${prefix}_p`;
function load(file, overrides = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => overrides[name] || require(name), mod, mod.exports);
  return mod.exports;
}
const db = { query: async (sql, params) => (await pool.query(sql, params)).rows };
const maintenance = load('src/lib/orders-maintenance.ts', { '@/lib/db': db, '@/lib/stock-locks': { releaseProductLockInMemory() {} } });
const route = load('src/app/api/orders/route.ts', {
  '@/lib/db': db,
  '@/lib/orders-maintenance': { ...maintenance, cancelExpiredQrisOrders: () => maintenance.cancelExpiredQrisOrders(orderId) },
  '@/lib/media': { persistDataUrlIfNeeded: async value => value || null },
});
const timer = load('src/lib/qris-payment.ts');
const submit = () => route.PATCH(new Request('http://localhost/api/orders', { method: 'PATCH', body: JSON.stringify({ orderId, paymentProofUrl: '/api/media/proofs/test.webp' }) }));
(async () => {
  try {
    const now = Date.now(), created = new Date(now - 60000).toISOString();
    assert.equal(timer.qrisSecondsRemaining(created, now), 540);
    assert.equal(timer.qrisSecondsRemaining(created, now + 540000), 0);
    assert.equal(timer.formatQrisCountdown(540), '09:00');
    assert.equal(timer.qrisSecondsRemaining(undefined, now), 0);
    await pool.query(`INSERT INTO products SELECT (jsonb_populate_record(NULL::products,to_jsonb(p)||$1::jsonb)).* FROM products p LIMIT 1`, [JSON.stringify({ id: productId, stock: 0 })]);
    await pool.query(`INSERT INTO orders SELECT (jsonb_populate_record(NULL::orders,to_jsonb(o)||$1::jsonb)).* FROM orders o LIMIT 1`, [JSON.stringify({ order_id: orderId, product_id: productId, payment_method: 'QRIS', status: 'BELUM_BAYAR', created_at: new Date().toISOString(), payment_proof_url: null, payment_verified: false })]);
    assert.equal((await submit()).status, 200, 'accepts on-time proof');
    await pool.query("UPDATE orders SET status='BELUM_BAYAR',created_at=NOW()-INTERVAL '11 minutes',payment_proof_url=NULL WHERE order_id=$1", [orderId]);
    assert.equal((await submit()).status, 409, 'rejects late upload');
    let order = (await pool.query('SELECT status,payment_proof_url FROM orders WHERE order_id=$1', [orderId])).rows[0];
    assert.equal(order.status, 'DIBATALKAN');
    assert.equal(order.payment_proof_url, null);
    assert.equal((await pool.query('SELECT stock FROM products WHERE id=$1', [productId])).rows[0].stock, 1);
    assert.equal((await submit()).status, 409, 'cannot revive cancelled order');
    await Promise.all([maintenance.cancelExpiredQrisOrders(orderId),maintenance.cancelExpiredQrisOrders(orderId)]);
    assert.equal((await pool.query("SELECT count(*) FROM wallet_transactions WHERE description LIKE $1", [`%${orderId}%`])).rows[0].count, '0', 'unpaid order has no refund');
    console.log('PASS: persistent 10-minute clock, boundary, on-time proof, late proof rejection, cancellation, stock release, no refund or revival.');
  } finally {
    await pool.query('DELETE FROM orders WHERE order_id=$1', [orderId]);
    await pool.query('DELETE FROM products WHERE id=$1', [productId]);
    await pool.end();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
