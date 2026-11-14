/* Shared data rules: no network, DOM or browser storage dependencies. */
(function (root) {
  const currencies = ['CNY', 'IDR', 'USD'];
  const memberIds = ['p1', 'p2', 'p3', 'p4'];
  const stamp = '2026-11-14T08:00:00.000Z';
  function blank() { return { schemaVersion: 2, members: memberIds.map((id, i) => ({ id, name: ['我', '朋友2', '朋友3', '朋友4'][i], updatedAt: stamp })), events: [], expenses: [], settlements: [] }; }
  function validDate(x) { return /^\d{4}-\d{2}-\d{2}$/.test(x || '') && !isNaN(Date.parse(x)) && new Date(x).toISOString().slice(0,10) === x; }
  function validate(data) {
    if (!data || data.schemaVersion !== 2) throw Error('需要 schemaVersion: 2 的旅行数据');
    for (const key of ['members', 'events', 'expenses', 'settlements']) {
      if (!Array.isArray(data[key])) throw Error('缺少数组：' + key);
      const ids = new Set();
      for (const r of data[key]) {
        if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id) || !Number.isFinite(Date.parse(r.updatedAt))) throw Error(key + ' 的 ID 或更新时间无效/重复');
        ids.add(r.id);
        if (r.deleted) continue;
        if (key === 'members') { if (!memberIds.includes(r.id) || typeof r.name !== 'string' || !r.name.trim()) throw Error('成员需为 p1–p4，且名称不能为空'); }
        else {
          if (!validDate(r.date)) throw Error('日期格式应为 YYYY-MM-DD');
          if (key === 'events') {
            if (r.date < '2026-11-16' || r.date > '2026-12-02') throw Error('行程日期应在11月16日至12月2日');
            if (typeof r.title !== 'string' || !r.title.trim() || !['pending', 'confirmed', 'paid'].includes(r.status) || !['Asia/Makassar', 'Asia/Jakarta'].includes(r.timezone) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) && r.time !== '') throw Error('行程的名称、时间、状态或时区不正确');
          } else {
            if (!currencies.includes(r.currency) || !Number.isFinite(r.amount) || r.amount <= 0 || r.amount > 1e12) throw Error('消费/结算金额或币种无效');
            if (key === 'expenses') {
              if (typeof r.name !== 'string' || !r.name.trim()) throw Error('消费项目不能为空');
              if (r.needsReview) continue;
              if (!memberIds.includes(r.payer) || !r.shares || !Object.keys(r.shares).length || Object.keys(r.shares).some(id => !memberIds.includes(id)) || Object.values(r.shares).some(n => !Number.isFinite(n) || n <= 0 || n > 1000000)) throw Error('付款人或分摊份额无效');
            } else if (!memberIds.includes(r.from) || !memberIds.includes(r.to) || r.from === r.to) throw Error('结算双方无效');
          }
        }
      }
    }
    if (data.members.length !== 4 || data.members.some(m => m.deleted)) throw Error('需要保留4位成员');
    return data;
  }
  function merge(a, b) {
    validate(a); validate(b);
    const out = blank();
    for (const key of ['members', 'events', 'expenses', 'settlements']) {
      const map = new Map(a[key].map(r => [r.id, r]));
      for (const r of b[key]) {
        const old = map.get(r.id);
        // Equal timestamps preserve the receiving device. Tombstones prevent resurrection.
        if (!old || Date.parse(r.updatedAt) > Date.parse(old.updatedAt)) map.set(r.id, r);
      }
      out[key] = [...map.values()];
    }
    return out;
  }
  function migrate(rows) {
    const out = blank();
    out.expenses = rows.map((r, i) => {
      const payer = out.members.find(m => m.name === r.payer);
      return { ...r, id: String(r.id || 'legacy-' + i), updatedAt: stamp, name: r.name || r.item || '', date: r.date, amount: Number(r.amount), note: r.note || r.notes || '', payer: payer?.id || 'p1', shares: Object.fromEntries(memberIds.map(id => [id, 1])), needsReview: true, legacyPayer: r.payer || '', legacySplit: r.split };
    });
    return validate(out);
  }
  function units(n, currency) { return Math.round(n * (currency === 'IDR' ? 1 : 100)); }
  function ledger(data, currency) {
    const result = Object.fromEntries(memberIds.map(id => [id, { paid: 0, owed: 0, balance: 0, sent: 0, received: 0 }]));
    for (const r of data.expenses.filter(r => !r.deleted && !r.needsReview && r.currency === currency)) {
      const amount = units(r.amount, currency), shares = Object.entries(r.shares).sort();
      const sum = shares.reduce((n, [, v]) => n + v, 0);
      const portions = shares.map(([id, w]) => ({ id, n: Math.floor(amount * w / sum), fraction: amount * w / sum % 1 }));
      let remainder = amount - portions.reduce((n, p) => n + p.n, 0);
      portions.sort((a, b) => b.fraction - a.fraction || a.id.localeCompare(b.id));
      for (const p of portions) { if (remainder > 0) { p.n++; remainder--; } result[p.id].owed += p.n; }
      result[r.payer].paid += amount;
    }
    for (const r of data.settlements.filter(r => !r.deleted && r.currency === currency)) { result[r.from].sent += units(r.amount, currency); result[r.to].received += units(r.amount, currency); }
    for (const r of Object.values(result)) r.balance = r.paid - r.owed + r.sent - r.received;
    const debt = memberIds.filter(id => result[id].balance < 0).map(id => ({ id, n: -result[id].balance }));
    const credit = memberIds.filter(id => result[id].balance > 0).map(id => ({ id, n: result[id].balance }));
    const suggestions = [];
    for (const d of debt) for (const c of credit) { const amount = Math.min(d.n, c.n); if (amount) { suggestions.push({ from: d.id, to: c.id, amount: amount / (currency === 'IDR' ? 1 : 100) }); d.n -= amount; c.n -= amount; } }
    const factor = currency === 'IDR' ? 1 : 100;
    for (const row of Object.values(result)) for (const k of Object.keys(row)) row[k] /= factor;
    return { members: result, suggestions };
  }
  const api = { blank, validate, merge, migrate, ledger, currencies, memberIds };
  if (typeof module !== 'undefined') module.exports = api; else root.Trip = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
