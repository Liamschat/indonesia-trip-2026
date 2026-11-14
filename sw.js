const CACHE = 'indonesia-trip-shell-20261114-2';
const ASSETS = ['./','./index.html','./style.css','./core.js','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./data/published.json','./README.md'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('indonesia-trip-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='CACHE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(ASSETS.map(path=>cache.match(new URL(path,self.registration.scope))))).every(Boolean);if(ready)event.source?.postMessage({type:'CACHE_READY'});})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(url.pathname.endsWith('/data/published.json')){
  event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok){const json=await response.clone().json();if(json.schemaVersion===2)await (await caches.open(CACHE)).put(request,response.clone());return response;}throw Error('offline');}catch(e){const saved=await caches.match(request);if(!saved)return Response.error();const headers=new Headers(saved.headers);headers.set('X-Trip-Offline','true');return new Response(saved.body,{status:saved.status,headers});}})());return;
 }
 event.respondWith((async()=>{const hit=await caches.match(request);if(hit)return hit;try{return await fetch(request);}catch(e){if(request.mode==='navigate')return await caches.match(new URL('./index.html',self.registration.scope));return Response.error();}})());
});
