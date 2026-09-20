const fs=require('fs'),path=require('path'),crypto=require('crypto');
(async()=>{
 const root=path.resolve(__dirname,'..');process.chdir(root);
 fs.mkdirSync('vendor',{recursive:true});
 fs.writeFileSync('vendor/supabase.js',fs.readFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js','utf8')+'\nwindow.forgeSupabase=window.supabase;\n');
 fs.copyFileSync('node_modules/chart.js/dist/chart.umd.js','vendor/chart.umd.js');
 const files=['index.html','manifest.webmanifest'];
 function list(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+f.name;if(f.isDirectory())list(p);else files.push(p);}}
 for(const d of ['css','js','vendor','assets'])list(d);
 const revision=crypto.createHash('sha256').update(files.map(f=>fs.readFileSync(f)).reduce((a,b)=>Buffer.concat([a,b]),Buffer.alloc(0))).digest('hex').slice(0,16);
 fs.writeFileSync('sw.js',`const CACHE='forge-shell-${revision}';\nconst ASSETS=${JSON.stringify(files.map(f=>'./'+f))};\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('forge-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;const known=ASSETS.some(p=>new URL(p,self.location.href).pathname===new URL(e.request.url).pathname);if(e.request.mode==='navigate'){e.respondWith(caches.match('./index.html').then(hit=>hit||fetch(e.request)));return;}if(known)e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});\n`);
 fs.mkdirSync('dist',{recursive:true});
 for(const file of [...files,'sw.js']){fs.mkdirSync(path.dirname('dist/'+file),{recursive:true});fs.copyFileSync(file,'dist/'+file);}
 console.log('Built offline shell '+revision+' ('+files.length+' assets).');
})();
