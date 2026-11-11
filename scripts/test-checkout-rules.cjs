const fs=require('fs'),ts=require('typescript'),vm=require('vm'),assert=require('node:assert/strict');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>name==='@/lib/geo'?load('src/lib/geo.ts'):require(name),Date,Math,Number});return exports;}
const {scheduleError,jakartaDate,deliveryPrice}=load('src/lib/checkout-rules.ts');
const now=new Date('2026-11-11T16:00:00+07:00');
assert(scheduleError('2026-11-11','15:59',now));assert(scheduleError('2026-11-11','16:00',now));assert.equal(scheduleError('2026-11-11','16:01',now),'');
assert.equal(scheduleError('2026-11-12','00:00',now),'');assert.equal(scheduleError('2026-11-13','23:59',now),'');
assert(scheduleError('2026-11-14','00:00',now));assert(scheduleError('2026-11-10','23:59',now));assert(scheduleError('2026-11-12','24:00',now));assert(scheduleError('2026-11-12','',now));
assert.equal(jakartaDate(new Date('2026-11-11T18:00:00Z')),'2026-11-12');
assert.equal(jakartaDate(new Date('2026-12-31T23:00:00+07:00'),2),'2027-01-02');
assert.equal(deliveryPrice(-8.16,113.71,-8.16,113.71).shippingFee,6000);
assert.equal(deliveryPrice(-8.16,113.71,-8.17,113.71).shippingFee,6000);
const far=deliveryPrice(-8.16,113.71,-8.21,113.71);assert(far.distanceKm>5);assert.equal(far.shippingFee,Math.round(far.distanceKm*2000));
assert.equal(deliveryPrice(null,113.71,-8.16,113.71),null);
console.log('PASS: Jakarta dates, today future-only times, tomorrow/day-after bounds, year rollover, delivery minimum and per-km rate, missing coordinates.');
