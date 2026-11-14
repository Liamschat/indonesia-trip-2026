'use strict';
const $ = s => document.querySelector(s), KEY = 'indonesia-trip-local-v2', PUB = 'indonesia-trip-published-v2';
let published = Trip.blank(), local = Trip.blank(), data = Trip.blank(), editing = false, cacheReady = false, networkLoaded = false;
let storageBlocked = false, lastFocus;
const labels = { pending: '待确认', confirmed: '已确认', paid: '已付款' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name = id => data.members.find(m => m.id === id)?.name || id;
const money = (n,c) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: c === 'IDR' ? 0 : 2 }).format(n);
const alive = rows => rows.filter(r => !r.deleted);
const eventOrder = r => r.time || ({'凌晨':'02:00','早上':'08:00','上午':'09:00','白天':'11:00','中午':'12:00','下午':'14:00','傍晚':'18:00','晚上':'20:00','深夜':'23:50'}[r.timeLabel] || '99:99');
const now = () => new Date().toISOString();
const id = () => globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2);
function error(e) { $('#errorBox').hidden = false; $('#errorBox').textContent = e.message || String(e); }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch(e) { storageBlocked = true; error('手机存储不可用或已满。新内容暂存在本页面，请立即导出完整备份，关闭页面前先解决。'); return false; } }
function read(key, fallback) { const text = localStorage.getItem(key); return text ? Trip.validate(JSON.parse(text)) : fallback; }
function combine() { data = Trip.merge(published, local); render(); }
function mutate(key, record) {
  const candidate = structuredClone(local); candidate[key] = candidate[key].filter(r => r.id !== record.id); candidate[key].push(record);
  Trip.validate(candidate);
  if (!write('indonesia-trip-before-change-v2', local)) return false;
  if (!write(KEY,candidate)) return false;
  local = candidate; combine(); return true;
}
function remove(key,r) { if (confirm('删除这条记录？删除标记会保留在备份中，可避免旧备份把它恢复。')) mutate(key,{...r,deleted:true,updatedAt:now()}); }
function controls(key,r) { return editing ? `<div class="row-actions"><button class="btn secondary" data-edit="${key}" data-id="${esc(r.id)}">编辑</button><button class="btn secondary" data-delete="${key}" data-id="${esc(r.id)}">删除</button></div>` : ''; }
function status() {
  $('#connection').textContent = `${navigator.onLine ? '在线' : '离线'} · ${cacheReady ? '离线缓存就绪' : '离线缓存准备中'}${storageBlocked ? ' · 本地保存异常' : ''}`;
  const changes = ['events','expenses','settlements','members'].reduce((n,key) => n + local[key].filter(r => JSON.stringify(r) !== JSON.stringify(published[key].find(p => p.id === r.id))).length,0);
  $('#dataStatus').textContent = `当前：线上快照＋本机合并数据。本机差异 ${changes} 条（含删除与称呼）；${networkLoaded ? '本次已检查线上数据' : '使用已保存快照'}。线上更新不会覆盖较新的本机修改。`;
  $('#backupStatus').textContent = '最近导出：' + (localStorage.getItem('indonesia-trip-last-export') || '尚未导出，请每天备份');
}
function render() {
  document.body.classList.toggle('editing',editing);
  const options = data.members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  const oldPayer=$('#filterPayer').value; $('#filterPayer').innerHTML='<option value="">所有付款人</option>'+options; $('#filterPayer').value=oldPayer;
  const dates=Array.from({length:17},(_,i)=>new Date(Date.UTC(2026,10,16+i)).toISOString().slice(0,10));
  const jump=$('#jumpDate').value; $('#jumpDate').innerHTML='<option value="">选择日期</option>'+dates.map(d=>`<option>${d}</option>`).join('');$('#jumpDate').value=jump;
  $('#days').innerHTML=dates.map(date=>{
    const events=alive(data.events).filter(e=>e.date===date).sort((a,b)=>eventOrder(a).localeCompare(eventOrder(b))||a.id.localeCompare(b.id));
    return `<article class="day" id="day-${date}"><div class="day-head"><div><div class="day-date">${date} · ${new Date(date+'T12:00:00').toLocaleDateString('zh-CN',{weekday:'long'})}</div><h3>${date<'2026-11-17'?'抵达巴厘岛':date<'2026-11-20'?'佩妮达与转场':date<'2026-11-22'?'东爪哇':date<'2026-11-27'?'巴厘岛慢游':'后续旅程'}</h3></div><span class="chip">${events.length} 项</span></div><div class="timeline">${events.map(e=>`<div class="event"><div class="when">${esc(e.time||e.timeLabel||'待定')}<small>${e.timezone==='Asia/Jakarta'?'UTC+7':'UTC+8'}</small></div><div class="rail"><span class="dot"></span><span class="line"></span></div><div class="event-body"><span class="chip ${e.status==='pending'?'wait':''}">${labels[e.status]}</span><strong>${esc(e.title)}</strong><p>${esc(e.note)}</p><small>${esc(e.type)}</small> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.place||e.title)}" target="_blank" rel="noopener">地图 ↗</a>${controls('events',e)}</div></div>`).join('')||'<p class="small">暂无安排，可在编辑模式添加。</p>'}</div></article>`;
  }).join('');
  const expenses=alive(data.expenses);$('#totalCount').textContent=expenses.length;
  for(const [currency,selector,prefix] of [['CNY','#cny','¥'],['IDR','#idr','Rp ']])$(selector).textContent=prefix+money(expenses.filter(e=>e.currency===currency).reduce((n,e)=>n+e.amount,0),currency);
  const rows=expenses.filter(e=>(!$('#filterDate').value||e.date===$('#filterDate').value)&&(!$('#filterPayer').value||e.payer===$('#filterPayer').value)&&(!$('#filterCategory').value||e.category===$('#filterCategory').value)).sort((a,b)=>b.date.localeCompare(a.date));
  $('#billList').innerHTML=rows.map(e=>`<div class="list-row"><div><strong>${esc(e.name)}</strong><small>${esc(e.date)} · ${esc(e.category)} · ${esc(name(e.payer))}代付</small><small>${e.needsReview?`旧账待核对：原付款人 ${esc(e.legacyPayer)} / 原分摊 ${esc(e.legacySplit)} 人；未纳入AA计算`:Object.entries(e.shares).map(([id,w])=>esc(name(id))+':'+w).join(' / ')}</small><small>${esc(e.note)}</small>${controls('expenses',e)}</div><div class="amt">${esc(e.currency)} ${money(e.amount,e.currency)}</div></div>`).join('')||'<div class="empty"><strong>暂无消费记录</strong>只记录真实消费，不预填预算或报价。</div>';
  const currency=$('#balanceCurrency').value, ledger=Trip.ledger(data,currency);
  $('#balances').innerHTML=`<div class="table-scroll"><table><thead><tr><th>成员</th><th>应付消费</th><th>已代付</th><th>已转出/收回</th><th>待结算净额</th></tr></thead><tbody>${data.members.map(m=>{const r=ledger.members[m.id];return `<tr><th>${esc(m.name)}</th><td>${money(r.owed,currency)}</td><td>${money(r.paid,currency)}</td><td>${money(r.sent,currency)} / ${money(r.received,currency)}</td><td>${r.balance>0?'+':''}${money(r.balance,currency)}</td></tr>`}).join('')}</tbody></table></div>`;
  $('#suggestions').innerHTML='<p class="small">'+(ledger.suggestions.map(r=>`${esc(name(r.from))} → ${esc(name(r.to))}：${currency} ${money(r.amount,currency)}`).join('<br>')||'此币种暂无待结算金额。')+'</p>'+(expenses.some(e=>e.needsReview)?'<p class="warning">存在待核对旧账，编辑确认付款人和参与者后才会计入AA。</p>':'');
  $('#settlements').innerHTML=alive(data.settlements).map(r=>`<div class="list-row"><div><small>${esc(r.date)} · 已转账</small>${esc(name(r.from))} → ${esc(name(r.to))}：${r.currency} ${money(r.amount,r.currency)}${controls('settlements',r)}</div></div>`).join('');
  status();
}
function field(label,key,value='',type='text',extra='') { return `<div class="field"><label for="f-${key}">${label}</label><input id="f-${key}" name="${key}" type="${type}" value="${esc(value)}" ${extra}></div>`; }
function select(label,key,items,value) { return `<div class="field"><label for="f-${key}">${label}</label><select id="f-${key}" name="${key}">${items.map(([v,t])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`; }
function openForm(key,r={}) {
 if(!editing)return;
 lastFocus=document.activeElement;
 const isEvent=key==='events',isBill=key==='expenses',isMembers=key==='members';
 let fields='';const members=data.members.map(m=>[m.id,m.name]);
 if(isMembers)fields=data.members.map(m=>field('成员称呼',m.id,m.name,'text','required maxlength="30"')).join('');
 else {
 fields=field('当地日期','date',r.date||'2026-11-17','date',isEvent?'required min="2026-11-16" max="2026-12-02"':'required');
 if(isEvent)fields+=field('时间（可留空）','time',r.time||'','time')+field('地点 / 安排（中英文）','title',r.title,'text','required maxlength="180"')+field('地图搜索名称','place',r.place||r.title,'text','maxlength="180"')+select('类型','type',['交通','住宿','餐饮','活动','提醒'].map(v=>[v,v]),r.type||'活动')+select('状态','status',Object.entries(labels),r.status||'pending')+select('当地时区','timezone',[['Asia/Makassar','巴厘岛 / 佩妮达 UTC+8'],['Asia/Jakarta','泗水 / 东爪哇 UTC+7']],r.timezone||'Asia/Makassar');
 else {
 if(isBill)fields+=field('实际消费项目','name',r.name,'text','required maxlength="120"')+select('分类','category',['交通','住宿','餐饮','门票','购物','其他'].map(v=>[v,v]),r.category||'交通');
 fields+=field('原币金额','amount',r.amount||'','number','required min="0.01" max="1000000000000" step="any"')+select('币种','currency',Trip.currencies.map(v=>[v,v]),r.currency||'IDR');
 if(isBill)fields+=select('付款人','payer',members,r.payer||'p1')+`<fieldset class="field"><legend>参与者与份额</legend><p class="small">均摊填1；不参与填0；自定义按比例填写（如2、1、1、0）。</p>${data.members.map(m=>field(m.name,'share-'+m.id,r.shares?.[m.id]??(r.id?0:1),'number','min="0" max="1000000" step="any" required')).join('')}</fieldset>`;
 else fields+=select('转出成员','from',members,r.from||'p2')+select('收款成员','to',members,r.to||'p1');
 }
 fields+=`<div class="field"><label for="f-note">备注</label><textarea id="f-note" name="note" maxlength="3000">${esc(r.note)}</textarea></div>`;
 }
 $('#editForm').innerHTML=`<h3 id="formTitle">${isMembers?'四位同行称呼':isEvent?'行程安排':isBill?'实际消费':'已发生的结算转账'}</h3>${fields}<div class="actions"><button type="button" class="btn secondary" id="cancel">取消</button><button class="btn" type="submit">保存到本机</button></div>`;
 $('#overlay').classList.add('show');$('#editForm input')?.focus();$('#cancel').onclick=closeForm;
 $('#editForm').onsubmit=e=>{
 e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
 try {
 if(isMembers){const candidate=structuredClone(local); candidate.members=data.members.map(m=>({...m,name:f[m.id].trim(),updatedAt:now()}));Trip.validate(candidate);if(!write('indonesia-trip-before-change-v2',local)||!write(KEY,candidate))return;local=candidate;combine();}
 else {
 const record={...r,...f,id:r.id||id(),updatedAt:now()};
 if(!isEvent)record.amount=Number(f.amount);
 if(isBill){record.shares={};for(const m of data.members){const weight=Number(f['share-'+m.id]);if(weight>0)record.shares[m.id]=weight;delete record['share-'+m.id];}record.needsReview=false;}
 if(isEvent)record.timeLabel='待定';
 if(!mutate(key,record))return;
 }
 closeForm();
 }catch(e){alert('未保存：'+e.message);}
 };
}
function closeForm(){$('#overlay').classList.remove('show');lastFocus?.focus();}
function download(content,filename,type='application/json') {const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function exportAll(){download(JSON.stringify({...data,exportedAt:now(),kind:'full-backup'},null,2),'indonesia-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');try{localStorage.setItem('indonesia-trip-last-export',new Date().toLocaleString('zh-CN'));}catch(e){}status();}
async function sync(){
 try {const response=await fetch('./data/published.json',{cache:'no-cache'});if(!response.ok)throw Error('HTTP '+response.status);const incoming=Trip.validate(await response.json());published=Trip.merge(published,incoming);write(PUB,published);networkLoaded=response.headers.get('X-Trip-Offline')!=='true';combine();}
 catch(e){error('无法获取线上数据，继续使用本机快照。'+e.message);combine();}
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));});
$('#editMode').onchange=e=>{editing=e.target.checked;render();};
$('#addEvent').onclick=()=>openForm('events');$('#addBill').onclick=()=>openForm('expenses');$('#members').onclick=()=>openForm('members');$('#addSettlement').onclick=()=>openForm('settlements');
document.addEventListener('click',e=>{const button=e.target.closest('[data-edit],[data-delete]');if(!button||!editing)return;const key=button.dataset.edit||button.dataset.delete;const r=data[key].find(r=>r.id===button.dataset.id);if(button.dataset.edit)openForm(key,r);else remove(key,r);});
$('#jumpDate').onchange=e=>{if(e.target.value)$('#day-'+e.target.value)?.scrollIntoView({behavior:'smooth',block:'start'});};
for(const selector of ['#filterDate','#filterCategory','#filterPayer','#balanceCurrency'])$(selector).onchange=render;
$('#clearFilters').onclick=()=>{for(const selector of ['#filterDate','#filterCategory','#filterPayer'])$(selector).value='';render();};
$('#overlay').onclick=e=>{if(e.target===$('#overlay'))closeForm();};
document.addEventListener('keydown',e=>{if(!$('#overlay').classList.contains('show'))return;if(e.key==='Escape')closeForm();if(e.key==='Tab'){const nodes=[...$('#editForm').querySelectorAll('input,select,textarea,button')];if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}}});
$('#exportAll').onclick=exportAll;
$('#publishExport').onclick=()=>{if(confirm('此文件会包含全部本机行程与账目。确认没有敏感信息后，上传到公开仓库 data/published.json；本操作只下载文件，不会自动发布。'))download(JSON.stringify(data,null,2),'published.json');};
$('#exportCsv').onclick=()=>{const rows=[['id','日期','项目','币种','金额','付款人','份额','备注'],...alive(data.expenses).map(r=>[r.id,r.date,r.name,r.currency,r.amount,name(r.payer),JSON.stringify(r.shares),r.note])];const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';download('\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'indonesia-expenses.csv','text/csv;charset=utf-8');};
$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try {
 if(file.size>10000000)throw Error('文件超过10MB');let incoming=JSON.parse(await file.text());if(incoming.version===1&&Array.isArray(incoming.expenses))incoming=Trip.migrate(incoming.expenses);Trip.validate(incoming);
 const merged=Trip.merge(local,incoming);const counts=['events','expenses','settlements'].map(k=>`${k==='events'?'行程':k==='expenses'?'消费':'结算'} ${alive(incoming[k]).length} 条`).join('，');
 if(!confirm(`导入内容：${counts}。相同ID仅保留更新时间较新者，相同时间保留本机；不同ID视为不同记录。先下载当前备份，再合并？`))return;
 exportAll();if(!write('indonesia-trip-before-import-v2',data)||!write(KEY,merged))return;local=merged;combine();alert('已合并保存到本机。不会自动发布到 GitHub。');
 }catch(e){alert('未导入，原数据保留：'+e.message);}finally{e.target.value='';}
};
$('#sync').onclick=async()=>{await sync();navigator.serviceWorker?.getRegistration().then(r=>r?.update());};
window.addEventListener('online',()=>{status();sync();});window.addEventListener('offline',status);
async function init(){
 try{published=read(PUB,Trip.blank());local=read(KEY,Trip.blank());const legacy=localStorage.getItem('indonesia-trip-expenses-v1');if(legacy&&!localStorage.getItem('indonesia-trip-legacy-migrated')){const rows=JSON.parse(legacy);if(!Array.isArray(rows))throw Error('旧账单格式无法识别，原文件保留');const migrated=Trip.migrate(rows);local=Trip.merge(local,migrated);if(write(KEY,local))localStorage.setItem('indonesia-trip-legacy-migrated','yes');}}
 catch(e){error('本地数据读取异常，未删除任何旧数据。请先导出或联系协助：'+e.message);storageBlocked=true;editing=false;$('#editMode').disabled=true;}
 combine();await sync();
 if('serviceWorker' in navigator){try{const reg=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;const worker=reg.active||navigator.serviceWorker.controller;worker?.postMessage({type:'CACHE_STATUS'});navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='CACHE_READY'){cacheReady=true;status();}});worker?.postMessage({type:'CACHE_STATUS'});if(reg.waiting)error('新版本已下载，关闭本网站的所有标签及主屏幕窗口后重新打开即可更新；本地数据会保留。');reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&reg.active)error('新版本准备就绪。备份后关闭所有网站窗口，再打开以更新。');});});}catch(e){error('离线缓存未完成，请保持联网后重试：'+e.message);}}
 else error('此浏览器不支持离线缓存，请使用 Safari 并联网首次打开。');
}
init();
