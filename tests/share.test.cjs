const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const code='123e4567-e89b-42d3-a456-426614174000';
function setup(href='https://example.test/forge/index.html'){
  const values=new Map(),replacements=[];
  const context=vm.createContext({
    URL,URLSearchParams,setTimeout,
    location:{href},history:{state:null,replaceState:(_state,_title,url)=>replacements.push(url)},
    sessionStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},
    navigator:{},toast:()=>{},I18n:{translate:value=>value},
    document:{getElementById:()=>null,querySelectorAll:()=>[]}
  });
  vm.runInContext(fs.readFileSync(path.join(root,'js/share.js'),'utf8'),context);
  return {run:source=>vm.runInContext(source,context),values,replacements};
}

test('friend links use the app address and keep the private code in the fragment',()=>{
  const {run}=setup('https://example.test/forge/index.html?source=test');
  assert.equal(run(`ForgeShare._test.inviteUrl('${code}')`),`https://example.test/forge/index.html?source=test#freund=${code}`);
  assert.equal(run(`ForgeShare._test.validCode('${code}')`),true);
  assert.equal(run("ForgeShare._test.validCode('not-a-code')"),false);
});

test('opening an invite stores it for login and removes it from the visible address',()=>{
  const {run,values,replacements}=setup(`https://example.test/forge/index.html#freund=${code}`);
  run('ForgeShare.init()');
  assert.equal(run('ForgeShare.hasPendingInvite()'),true);
  assert.equal(values.get('forgePendingFriendInvite'),code);
  assert.equal(replacements.at(-1),'https://example.test/forge/index.html');
});

test('completing the matching request consumes the pending invitation',()=>{
  const {run}=setup(`https://example.test/forge/index.html#freund=${code}`);
  run('ForgeShare.init()');run(`ForgeShare.completeInvite('${code}')`);
  assert.equal(run('ForgeShare.hasPendingInvite()'),false);
});

test('release version and visible update information stay aligned',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const utils=fs.readFileSync(path.join(root,'js/utils.js'),'utf8');
  assert.equal(pkg.version,'1.12.0');
  assert.match(html,/FORGE 1\.12\.0 · Updateinfos/);
  assert.match(utils,/v1\.12\.0 · 14\.10\.2026/);
});
