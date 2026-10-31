import {mkdir,cp,rm,readdir,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['index.html','film.css','film.js','entrance.html','entrance.css','entrance.js'])await cp(file,'dist/'+file);
await cp('assets','dist/assets',{recursive:true});
async function files(dir){let list=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;list.push(...e.isDirectory()?await files(p):[p.replace(/^dist/,'')]);}return list;}
const paths=await files('dist');
if(paths.some(p=>/\.pdf$|\.mov$|v8|screenplay|full.size/i.test(p)))throw Error('Research-only file in deployment');
await writeFile('dist/manifest.json',JSON.stringify(paths));
console.log(`Built ${paths.length} website files. Research and secrets excluded.`);
