import { files } from './files.js';
const enc=new TextEncoder();
async function signature(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
function equal(a,b){if(a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0}
function login(error=''){return new Response(LOGIN_HTML.replace('{{ERROR}}',error),{status:error?401:200,headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','x-frame-options':'DENY','x-content-type-options':'nosniff'}})}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(['/assets/fonts/league-gothic.ttf','/assets/fonts/plex-sans.ttf'].includes(url.pathname)){const font=files[url.pathname];return new Response(Uint8Array.from(atob(font.data),c=>c.charCodeAt(0)),{headers:{'content-type':'font/ttf','cache-control':'public, max-age=86400'}})}if(!env.SITE_PASSWORD)return new Response('SCREENING ROOM IS BEING CONFIGURED.',{status:503});
 if(request.method==='POST' && url.pathname==='/login'){
  if(request.headers.get('origin')!==url.origin)return new Response('FORBIDDEN',{status:403});
  const form=await request.formData();if(!equal(String(form.get('password')||''),env.SITE_PASSWORD)){await new Promise(r=>setTimeout(r,1000));return login('INCORRECT PASSWORD. PLEASE TRY AGAIN.')}
  const expiry=String(Date.now()+8*60*60*1000),token=expiry+'.'+await signature(expiry,env.SITE_PASSWORD);
  return new Response(null,{status:303,headers:{location:'/', 'set-cookie':`screening=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`,'cache-control':'no-store'}});
 }
 if(url.pathname==='/logout')return new Response(null,{status:303,headers:{location:'/', 'set-cookie':'screening=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0','cache-control':'no-store'}});
 const token=request.headers.get('cookie')?.match(/(?:^|;\s*)screening=([^;]+)/)?.[1]||'', [expiry,sig]=token.split('.');
 if(!expiry||!sig||Number(expiry)<Date.now()||!equal(sig,await signature(expiry,env.SITE_PASSWORD)))return url.pathname==='/'?login():new Response('PASSWORD REQUIRED',{status:401,headers:{'cache-control':'no-store'}});
 if(!['GET','HEAD'].includes(request.method))return new Response('METHOD NOT ALLOWED',{status:405});
 const file=files[url.pathname==='/'?'/index.html':url.pathname];if(!file)return new Response('NOT FOUND',{status:404});
 const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));const headers={'content-type':file.type,'cache-control':'private, no-store','x-content-type-options':'nosniff','accept-ranges':'bytes'};
 const range=request.headers.get('range');if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match)return new Response(null,{status:416});let start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):bytes.length-1,bytes.length-1);if(start>end||start>=bytes.length)return new Response(null,{status:416,headers:{'content-range':`bytes */${bytes.length}`}});return new Response(request.method==='HEAD'?null:bytes.slice(start,end+1),{status:206,headers:{...headers,'content-range':`bytes ${start}-${end}/${bytes.length}`,'content-length':String(end-start+1)}})}
 return new Response(request.method==='HEAD'?null:bytes,{headers:{...headers,'content-length':String(bytes.length)}});
}};
