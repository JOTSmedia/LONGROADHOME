import fs from 'node:fs';import path from 'node:path';
const files={};const types={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'application/javascript','.jpg':'image/jpeg','.mp4':'video/mp4'};
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files['/'+path.relative('public',p)]={type:types[path.extname(p)]||'application/octet-stream',data:fs.readFileSync(p).toString('base64')};}}walk('public');
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js',`const files=${JSON.stringify(files)};\nconst LOGIN_HTML=${JSON.stringify(fs.readFileSync('worker/login.html','utf8'))};\n`+fs.readFileSync('worker/index.js','utf8').replace("import { files } from './files.js';",''));
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
