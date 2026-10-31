import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';

const root=resolve(import.meta.dirname,'..');
const password=randomBytes(16).toString('hex');
const salt=randomBytes(16).toString('hex');
const passwordHash=salt+':'+scryptSync(password,salt,64).toString('hex');
async function freePort(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const port=s.address().port;await new Promise(r=>s.close(r));return port;}
async function launch(t,{state,production=false}={}){
 const ownedState=!state;state ||= await mkdtemp(join(tmpdir(),'lrh-security-'));
 const port=await freePort();const base=`http://127.0.0.1:${port}`;const origin=production?'https://preview.example.test':base;
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,NODE_ENV:production?'production':'test',PASSWORD_HASH:passwordHash,APP_ORIGIN:origin,STATE_DIR:state,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 const stop=async()=>{if(child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit');}};
 t.after(async()=>{await stop();if(ownedState)await rm(state,{recursive:true,force:true});});
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(output);try{if((await fetch(base+'/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,25));if(i===99)throw Error('Server failed to start: '+output);}
 const request=(path,options={})=>fetch(base+path,{redirect:'manual',...options});
 const login=(value=password,extra={})=>request('/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded',...extra},body:new URLSearchParams({password:value})});
 return {request,login,origin,state,stop};
}
const token=res=>res.headers.get('set-cookie').split(';')[0];

test('unauthenticated entrance reveals only public branding and rejects protected pages and media',async t=>{
 const app=await launch(t);const gate=await app.request('/');assert.equal(gate.status,200);const html=await gate.text();
 assert.match(html,/Please enter your access password/);assert.match(html,/type="password"/);assert.doesNotMatch(html,/official-trailer|Joe Shovak|Anthony Picone|film\.js|film\.css|road-1920|<video/i);
 assert.match(gate.headers.get('cache-control'),/no-store/);assert.match(gate.headers.get('x-robots-tag'),/noindex/);assert.equal(gate.headers.get('vary'),'Cookie');
 for(const path of ['/index.html','/film.css','/film.js','/assets/road-1920.webp','/assets/official-trailer.mp4','/assets/road-motion.mp4','/internal/research.md','/manifest.json']){
  for(const method of ['GET','HEAD']){const res=await app.request(path,{method,headers:{Range:'bytes=0-255'}});assert.equal(res.status,401,`${method} ${path}`);assert.match(res.headers.get('cache-control'),/no-store/);if(method==='GET')assert.equal(await res.text(),'Access password required.');}
 }
 assert.equal((await app.request('/session')).status,401);
 assert.equal((await app.request('/entrance.css')).status,200);
 assert.match(await (await app.request('/robots.txt')).text(),/Disallow: \//);
});

test('login rejects incorrect password and cross-origin submissions; successful access is session-only',async t=>{
 const app=await launch(t,{production:true});
 for(const origin of ['https://attacker.example','null',''])assert.equal((await app.login(password,{origin})).status,403);
 const bad=await app.login('incorrect');assert.equal(bad.status,401);assert.deepEqual(await bad.json(),{error:'INCORRECT'});assert.equal(bad.headers.get('set-cookie'),null);
 const good=await app.login();assert.equal(good.status,200);const setCookie=good.headers.get('set-cookie');
 assert.match(setCookie,/^__Host-lrh=[a-f0-9]{64};/);for(const attr of ['HttpOnly','SameSite=Strict','Secure','Path=/'])assert.ok(setCookie.includes(attr));assert.doesNotMatch(setCookie,/Max-Age|Expires|Domain=/i);
 const headers={cookie:token(good)};const page=await app.request('/',{headers});assert.equal(page.status,200);assert.match(await page.text(),/WATCH TRAILER/);assert.equal((await app.request('/session',{headers})).status,204);
 assert.match(page.headers.get('strict-transport-security'),/max-age=/);
 assert.equal((await app.request('/',{headers:{cookie:'__Host-lrh='+randomBytes(32).toString('hex')}})).status,200);
 assert.match(await (await app.request('/',{headers:{cookie:'__Host-lrh='+randomBytes(32).toString('hex')}})).text(),/access password/);
});

test('authorized byte-range video delivery preserves source bytes and rejects invalid ranges',async t=>{
 const app=await launch(t);const headers={cookie:token(await app.login())};const source=await readFile(join(root,'dist/assets/official-trailer.mp4'));
 const range=await app.request('/assets/official-trailer.mp4',{headers:{...headers,Range:'bytes=0-127'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),`bytes 0-127/${source.length}`);assert.equal(range.headers.get('content-type'),'video/mp4');assert.deepEqual(Buffer.from(await range.arrayBuffer()),source.subarray(0,128));
 const suffix=await app.request('/assets/official-trailer.mp4',{headers:{...headers,Range:'bytes=-32'}});assert.equal(suffix.status,206);assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),source.subarray(-32));
 const head=await app.request('/assets/official-trailer.mp4',{method:'HEAD',headers});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),source.length);assert.equal((await head.arrayBuffer()).byteLength,0);
 for(const Range of [`bytes=${source.length}-`,'bytes=20-10','bytes=abc','bytes=0-1,4-5','bytes=-0'])assert.equal((await app.request('/assets/official-trailer.mp4',{headers:{...headers,Range}})).status,416,Range);
});

test('logout revokes token server-side and blocks cross-origin logout',async t=>{
 const app=await launch(t);const headers={cookie:token(await app.login())};
 assert.equal((await app.request('/logout',{method:'POST',headers:{...headers,origin:'https://attacker.example'}})).status,403);
 assert.equal((await app.request('/session',{headers})).status,204);
 const out=await app.request('/logout',{method:'POST',headers:{...headers,origin:app.origin}});assert.equal(out.status,303);assert.equal(out.headers.get('location'),'/');assert.match(out.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal((await app.request('/session',{headers})).status,401);assert.equal((await app.request('/assets/official-trailer.mp4',{headers})).status,401);assert.match(await (await app.request('/',{headers})).text(),/access password/);
});

test('allowlisted delivery denies internal files, secrets, source and encoded traversal after login',async t=>{
 const app=await launch(t);const headers={cookie:token(await app.login())};
 for(const path of ['/manifest.json','/internal/research.md','/server.mjs','/.env','/package.json','/state/access.sqlite','/%2e%2e%2finternal/research.md','/assets/%2e%2e%2f%2e%2e%2fserver.mjs','/assets/../../server.mjs'])assert.equal((await app.request(path,{headers})).status,404,path);
 assert.equal((await app.request('/assets/road-1920.webp',{headers})).status,200);
 const manifest=JSON.parse(await readFile(join(root,'dist/manifest.json'),'utf8'));assert.ok(manifest.length>0);assert.equal(manifest.some(p=>/\.pdf$|\.mov$|screenplay|full.size|\/internal\/|v8|\.env/i.test(p)),false);
});

test('five failures trigger durable throttling, including correct password and spoofed forwarding headers',async t=>{
 const state=await mkdtemp(join(tmpdir(),'lrh-rate-'));t.after(()=>rm(state,{recursive:true,force:true}));
 let app=await launch(t,{state});for(let i=0;i<5;i++)assert.equal((await app.login('incorrect')).status,401);
 let limited=await app.login();assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'900');assert.equal(limited.headers.get('set-cookie'),null);
 assert.equal((await app.login(password,{'x-forwarded-for':'198.51.100.7'})).status,429);
 await app.stop();app=await launch(t,{state});assert.equal((await app.login()).status,429);
});
