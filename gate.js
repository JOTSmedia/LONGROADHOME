(() => {
  'use strict';
  const base = new URL('./', location.href);
  const storeName = 'lrh-private-preview:' + base.pathname;
  const form = document.querySelector('form');
  const password = document.querySelector('#password');
  const show = document.querySelector('#show');
  const error = document.querySelector('#error');
  const enter = form.querySelector('[type=submit]');
  const urls = new Map();
  const pending = new Map();
  let key, content, expiryTimer;
  const encode = bytes => btoa(String.fromCharCode(...bytes));
  const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const storage = {get(){try{return JSON.parse(sessionStorage.getItem(storeName));}catch{return null;}},set(value){try{sessionStorage.setItem(storeName,JSON.stringify(value));}catch{}},clear(){try{sessionStorage.removeItem(storeName);}catch{}}};
  async function bytes(path){const response=await fetch(new URL(path,base),{cache:'no-store'});if(!response.ok)throw new Error('Network');return new Uint8Array(await response.arrayBuffer());}
  async function decrypt(data){return crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(0,12)},key,data.slice(12));}
  function makeURL(data,type){return URL.createObjectURL(new Blob([data],{type}));}
  async function asset(path){
    if(urls.has(path))return urls.get(path);
    if(pending.has(path))return pending.get(path);
    const entry=content.assets[path];if(!entry)throw new Error('Missing asset');
    const task=(async()=>{const result=await decrypt(await bytes(entry.file));const url=makeURL(result,entry.type);urls.set(path,url);return url;})();
    pending.set(path,task);try{return await task;}finally{pending.delete(path);}
  }
  function lock(){storage.clear();key=null;content=null;clearTimeout(expiryTimer);document.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();location.replace(base.href);}
  function replaceAssets(text){for(const [path,url] of urls)text=text.split(path).join(url);return text;}
  async function reveal(expires){
    enter.firstChild.textContent='OPENING ';
    await Promise.all(Object.keys(content.assets).filter(path=>!path.endsWith('/official-trailer.mp4')).map(asset));
    const page=new DOMParser().parseFromString(replaceAssets(content.html),'text/html');
    page.querySelectorAll('script,link[rel="stylesheet"],noscript').forEach(el=>el.remove());
    const styleURL=makeURL(replaceAssets(content.css),'text/css');urls.set('stylesheet',styleURL);
    const style=document.createElement('link');style.rel='stylesheet';style.href=styleURL;
    const loaded=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=reject;});
    document.head.append(style);await loaded;
    document.querySelector('link[href="entrance.css"]')?.remove();
    document.body.replaceWith(document.importNode(page.body,true));
    window.privatePreview={asset,lock};
    const scriptURL=makeURL(replaceAssets(content.js),'text/javascript');urls.set('script',scriptURL);
    const script=document.createElement('script');script.type='module';script.src=scriptURL;document.body.append(script);
    expiryTimer=setTimeout(lock,Math.max(0,expires-Date.now()));
    window.scrollTo(0,0);
    addEventListener('pagehide',()=>{document.body.style.visibility='hidden';document.querySelectorAll('video').forEach(v=>v.pause());});
    addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  }
  async function unlock(value,saved){
    if(!crypto.subtle)throw new Error('HTTPS');
    const data=await bytes('presentation.bin');
    if(saved){key=await crypto.subtle.importKey('raw',decode(saved.key),'AES-GCM',true,['decrypt']);}
    else{const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveKey']);key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:data.slice(0,32),iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},true,['decrypt']);}
    content=JSON.parse(new TextDecoder().decode(await decrypt(data.slice(32))));
    password.value='';const expires=saved?.expires||Date.now()+4*3600000;
    storage.set({key:encode(new Uint8Array(await crypto.subtle.exportKey('raw',key))),expires});
    await reveal(expires);
  }
  show.addEventListener('click',()=>{const visible=password.type==='password';password.type=visible?'text':'password';show.textContent=visible?'HIDE':'SHOW';show.setAttribute('aria-label',visible?'Hide password':'Show password');show.setAttribute('aria-pressed',String(visible));});
  form.addEventListener('submit',async event=>{event.preventDefault();error.textContent='';enter.disabled=true;enter.firstChild.textContent='ENTERING ';try{await unlock(password.value);}catch(reason){storage.clear();error.textContent=reason.name==='OperationError'?'INCORRECT':reason.message==='HTTPS'?'Please open this preview over HTTPS.':'Unable to load the preview. Please check your connection and try again.';password.setAttribute('aria-invalid','true');password.focus();password.select();}finally{enter.disabled=false;enter.firstChild.textContent='ENTER ';}});
  password.addEventListener('input',()=>password.removeAttribute('aria-invalid'));
  const saved=storage.get();if(saved&&saved.expires>Date.now()){enter.disabled=true;enter.firstChild.textContent='OPENING ';unlock(null,saved).catch(()=>{storage.clear();enter.disabled=false;enter.firstChild.textContent='ENTER ';error.textContent='Please enter your access password.';});}else storage.clear();
})();
