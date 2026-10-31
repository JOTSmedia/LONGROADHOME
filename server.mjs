import http from 'node:http';
import {readFileSync,createReadStream,mkdirSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {isIP} from 'node:net';
const prod=process.env.NODE_ENV==='production';
const origin=process.env.APP_ORIGIN||'http://127.0.0.1:4177';
if(prod&&!origin.startsWith('https://'))throw Error('Production APP_ORIGIN must use HTTPS');
const [salt,hash]=String(process.env.PASSWORD_HASH||'').split(':');
if(!salt||!hash||hash.length!==128)throw Error('Set PASSWORD_HASH using scripts/set-password.mjs');
const root=resolve('dist'),state=resolve(process.env.STATE_DIR||'state');mkdirSync(state,{recursive:true,mode:0o700});
const db=new DatabaseSync(resolve(state,'access.sqlite'));
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, expires INTEGER); CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, count INTEGER, expires INTEGER)');
const manifest=new Set(JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8')));
const sha=s=>createHash('sha256').update(s).digest('hex');
const cookieName=prod?'__Host-lrh':'lrh';
const cookie=v=>`${cookieName}=${v}; Path=/; HttpOnly; SameSite=Strict${prod?'; Secure':''}`;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.mp4':'video/mp4','.ttf':'font/ttf','.txt':'text/plain'};
function session(req){const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const id=sha(token);return db.prepare('SELECT id FROM sessions WHERE id=? AND expires>?').get(id,Date.now())?.id;}
function headers(res){res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive, nosnippet');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');if(prod)res.setHeader('Strict-Transport-Security','max-age=31536000');}
function send(res,status,body,type='text/plain; charset=utf-8'){res.writeHead(status,{'content-type':type});res.end(body);}
function json(res,status,data){send(res,status,JSON.stringify(data),'application/json');}
async function body(req){let result='';for await(const chunk of req){result+=chunk;if(Buffer.byteLength(result)>1024)throw Error('body too large');}return new URLSearchParams(result);}
function attempt(key){return db.prepare('SELECT count FROM attempts WHERE id=? AND expires>?').get(key,Date.now())?.count||0;}
function failed(key){db.prepare('INSERT INTO attempts VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN expires>? THEN count+1 ELSE 1 END,expires=CASE WHEN expires>? THEN expires ELSE excluded.expires END').run(key,Date.now()+900000,Date.now(),Date.now());}
function file(req,res,path){if(!manifest.has(path))return send(res,404,'Not found');const full=resolve(root,'.'+path),size=statSync(full).size;let start=0,end=size-1,status=200;res.setHeader('Content-Type',mime[extname(full)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
 if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||(!match[1]&&!match[2])){res.setHeader('Content-Range',`bytes */${size}`);return send(res,416,'Invalid range');}if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}else start=Math.max(0,size-Number(match[2]));if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.setHeader('Content-Range',`bytes */${size}`);return send(res,416,'Invalid range');}status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);}
 res.setHeader('Content-Length',end-start+1);res.writeHead(status);if(req.method==='HEAD')return res.end();const stream=createReadStream(full,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}
const server=http.createServer(async(req,res)=>{headers(res);try{const url=new URL(req.url,origin),path=url.pathname;
 if(path==='/health')return send(res,200,'OK');
 if(path==='/robots.txt')return send(res,200,'User-agent: *\nDisallow: /\n');
 if(req.method==='POST'){
  if(req.headers.origin!==origin)return send(res,403,'Forbidden');
  if(path==='/logout'){const id=session(req);if(id)db.prepare('DELETE FROM sessions WHERE id=?').run(id);res.setHeader('Set-Cookie',cookie('')+'; Max-Age=0');res.setHeader('Clear-Site-Data','"cache"');res.writeHead(303,{Location:'/'});return res.end();}
  if(path!=='/login')return send(res,404,'Not found');
  const forwarded=req.headers['x-real-ip'];
  const client=process.env.TRUST_PROXY==='1'&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:req.socket.remoteAddress;
  const ip=sha(client||'unknown');
  if(attempt(ip)>=5||attempt('global')>=100){res.setHeader('Retry-After','900');return json(res,429,{error:'Too many attempts. Please try again in 15 minutes.'});}
  const form=await body(req),candidate=scryptSync(form.get('password')||'',salt,64);
  if(!timingSafeEqual(candidate,Buffer.from(hash,'hex'))){failed(ip);failed('global');return json(res,401,{error:'INCORRECT'});}
  const previous=session(req);if(previous)db.prepare('DELETE FROM sessions WHERE id=?').run(previous);
  const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES (?,?)').run(sha(token),Date.now()+4*3600000);db.prepare('DELETE FROM attempts WHERE id=?').run(ip);res.setHeader('Set-Cookie',cookie(token));return json(res,200,{ok:true});
 }
 if(!['GET','HEAD'].includes(req.method))return send(res,405,'Method not allowed');
 const authorized=session(req);
 if(path==='/session')return send(res,authorized?204:401,'');
 if(['/entrance.css','/entrance.js','/assets/fonts/plex-sans.ttf'].includes(path))return file(req,res,path);
 if(!authorized){if(path==='/')return file(req,res,'/entrance.html');return send(res,401,'Access password required.');}
 if(path==='/'||path==='/index.html')return file(req,res,'/index.html');
 if(path==='/entrance.html'||path==='/manifest.json')return send(res,404,'Not found');
 return file(req,res,path);
 }catch(error){if(!res.headersSent)send(res,400,'Unable to complete this request.');else res.destroy();}});
server.requestTimeout=15000;server.headersTimeout=10000;
const cleanup=setInterval(()=>{db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('DELETE FROM attempts WHERE expires<?').run(Date.now());},60000);cleanup.unref();
server.listen(Number(process.env.PORT||4177),process.env.HOST||(prod?'0.0.0.0':'127.0.0.1'),()=>console.log(`LONG ROAD HOME preview: ${origin}`));
