const form=document.querySelector('form'),password=document.querySelector('#password'),button=form.querySelector('button'),error=document.querySelector('#error');let urls=[];
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
form.addEventListener('submit',async event=>{
 event.preventDefault();button.disabled=true;button.textContent='OPENING SCREENING…';error.textContent='';
 try{
  if(!crypto.subtle)throw new Error('OPEN THIS PAGE THROUGH YOUR HTTPS GITHUB PAGES ADDRESS.');
  const response=await fetch('./screening.bin');if(!response.ok)throw new Error('THE SCREENING FILE COULD NOT LOAD. PLEASE REFRESH AND TRY AGAIN.');
  const packed=new Uint8Array(await response.arrayBuffer());
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password.value),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:packed.slice(0,16),iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  let plain;try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:packed.slice(16,28)},key,packed.slice(28))}catch{throw new Error('INCORRECT PASSWORD. PLEASE TRY AGAIN.')}
  const files=JSON.parse(new TextDecoder().decode(plain));const map={};
  for(const [name,file] of Object.entries(files)){if(name==='index.html'||name==='style.css')continue;map[name]=URL.createObjectURL(new Blob([decode(file.data)],{type:file.type}));urls.push(map[name]);}
  let css=new TextDecoder().decode(decode(files['style.css'].data));for(const [name,url]of Object.entries(map))css=css.replaceAll(name,url);
  map['style.css']=URL.createObjectURL(new Blob([css],{type:'text/css'}));urls.push(map['style.css']);
  let html=new TextDecoder().decode(decode(files['index.html'].data));for(const [name,url]of Object.entries(map))html=html.replaceAll(name,url);
  html=html.replace('href="/logout"','href="#" id="lock-screening"').replace('</body>','<script>document.querySelector("#lock-screening").onclick=e=>{e.preventDefault();parent.postMessage("lock-screening","*")};<\/script></body>');
  const frame=document.createElement('iframe');frame.title='LONG ROAD HOME SCREENING';frame.allow='fullscreen';frame.setAttribute('allowfullscreen','');frame.srcdoc=html;frame.id='film';frame.style='position:fixed;inset:0;width:100%;height:100%;border:0;background:#111512';document.body.append(frame);document.querySelector('main').hidden=true;password.value='';frame.focus();
 }catch(e){error.textContent=e.message||'COULD NOT OPEN THE SCREENING. PLEASE TRY AGAIN.';password.focus()}finally{button.disabled=false;button.textContent='ENTER SCREENING'}
});
window.addEventListener('message',event=>{const frame=document.querySelector('#film');if(event.source===frame?.contentWindow&&event.data==='lock-screening'){frame.remove();urls.forEach(URL.revokeObjectURL);urls=[];document.querySelector('main').hidden=false;password.focus()}});
