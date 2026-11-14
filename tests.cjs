const assert=require('node:assert/strict'),fs=require('node:fs'),T=require('./core.js');
const stamp='2026-11-14T09:00:00Z';
const bill=(id,amount,currency='CNY',payer='p1',shares={p1:1,p2:1,p3:1,p4:1})=>({id,date:'2026-11-17',name:'test',category:'交通',amount,currency,payer,shares,updatedAt:stamp});
const d=T.blank();d.expenses=[bill('a',100)];T.validate(d);
assert.equal(T.ledger(d,'CNY').members.p1.balance,75);assert.equal(T.ledger(d,'CNY').members.p2.balance,-25);
d.settlements=[{id:'s',date:'2026-11-17',from:'p2',to:'p1',currency:'CNY',amount:25,updatedAt:stamp}];
assert.equal(T.ledger(d,'CNY').members.p2.balance,0);assert.equal(T.ledger(d,'CNY').members.p1.balance,50);
d.expenses.push(bill('b',100001,'IDR'));const rupiah=T.ledger(d,'IDR');assert.equal(Object.values(rupiah.members).reduce((n,r)=>n+r.owed,0),100001);
assert.equal(Object.values(rupiah.members).reduce((n,r)=>n+r.balance,0),0);
const custom=T.blank();custom.expenses=[bill('custom',100,'CNY','p2',{p1:3,p2:1})];assert.equal(T.ledger(custom,'CNY').members.p1.owed,75);assert.equal(T.ledger(custom,'CNY').members.p3.owed,0);
const newer=structuredClone(d);newer.expenses[0].amount=200;newer.expenses[0].updatedAt='2026-11-15T00:00:00Z';
assert.equal(T.merge(newer,d).expenses[0].amount,200);assert.equal(T.merge(d,newer).expenses[0].amount,200);
newer.expenses[0].deleted=true;assert.equal(T.merge(T.merge(d,newer),d).expenses[0].deleted,true);
assert.deepEqual(T.merge(d,d),d);assert.deepEqual(T.validate(JSON.parse(JSON.stringify(d))),d);
const migrated=T.migrate([{id:'old',date:'2026-11-16',name:'real old bill',amount:160,currency:'CNY',payer:'小张',split:2}]);assert.equal(migrated.expenses[0].legacyPayer,'小张');assert.equal(migrated.expenses[0].needsReview,true);assert.equal(T.ledger(migrated,'CNY').members.p1.paid,0);
for(const mutate of [r=>r.amount=-1,r=>r.amount=NaN,r=>r.currency='BAD',r=>r.shares={},r=>r.payer='bad']){const bad=structuredClone(d);mutate(bad.expenses[0]);assert.throws(()=>T.validate(bad));}
const duplicate=structuredClone(d);duplicate.expenses.push({...duplicate.expenses[0]});assert.throws(()=>T.validate(duplicate));
const published=T.validate(JSON.parse(fs.readFileSync('data/published.json','utf8')));assert.equal(published.expenses.length,0);assert.equal(new Set(published.events.map(e=>e.date)).size,17);assert(published.events.some(e=>e.date==='2026-11-16'&&e.note.includes('牙刷、牙膏和拖鞋')));assert(published.events.some(e=>e.title.includes('Manta')&&e.status==='pending'));
for(let n=1;n<1000;n++){const x=T.blank();x.expenses=[bill('round',n/100,'CNY','p1',{p1:2,p2:3,p4:1})];const l=T.ledger(x,'CNY');assert.equal(Math.round(Object.values(l.members).reduce((s,r)=>s+r.owed,0)*100),n);}
console.log('PASS: migration, validation, merge, deletion, JSON round-trip, equal/custom split, settlement, currencies, rounding (999 cases), 17-day itinerary, no seeded expenses.');
