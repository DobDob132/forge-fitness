const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../js',f),'utf8');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function setup(){
  const values=new Map(),elements=new Map(),timers=[];let authHandler,saveRequest=null,signOutError=null,profileRequest=null;
  const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',style:{},classList:{toggle(){},add(){},remove(){},contains(){return true;}},addEventListener(){},replaceChildren(){},setAttribute(){}});return elements.get(id);};
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'A',email:'a@example.test'}}}}),onAuthStateChange:fn=>authHandler=fn,signOut:async()=>({error:signOutError})},from:table=>({select(){return this;},eq(_key,id){this.id=id;return this;},async maybeSingle(){if(table==='forge_state')return {data:{version:1,payload:JSON.parse(vm.runInContext('JSON.stringify(data)',ctx))}};if(profileRequest)return profileRequest.promise;return {data:{display_name:this.id,friend_code:this.id}};}}),rpc:async action=>action==='forge_save_state'&&saveRequest?saveRequest.promise:{data:[]}};
  const ctx=vm.createContext({Date,Math,JSON,console,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},navigator:{language:'de',onLine:true},window:{addEventListener(){}},document:{visibilityState:'visible',body:{classList:{toggle(){}}},getElementById:el,querySelector:()=>el('app'),querySelectorAll:()=>[],addEventListener(){}},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},setInterval:()=>1,clearInterval(){},forgeSupabase:{createClient:()=>client},FORGE_CONFIG:{},ForgeSocial:{init(){}},ForgeShare:{presentPendingInvite(){}},releaseWakeLock(){},clearExerciseTimer(){},show(){},toast(){},confirm:()=>true});
  for(const f of ['storage.js','data.js','plans.js','validation.js','cloud.js'])vm.runInContext(read(f),ctx);
  const run=s=>vm.runInContext(s,ctx);await run('ForgeCloud.boot()');
  return {run,ctx,values,elements,client,event:(event,session)=>authHandler(event,session),setSave:d=>saveRequest=d,setProfile:d=>profileRequest=d,setSignOutError:e=>signOutError=e,async timers(){for(const t of timers.splice(0))if(t.ms===0)t.fn();await new Promise(r=>setImmediate(r));}};
}
test('an old save response after sign-out cannot overwrite guest data or status',async()=>{
  const app=await setup(),request=deferred();app.setSave(request);app.run('ForgeCloud.save(data)');const saving=app.run('ForgeCloud.flush()');app.event('SIGNED_OUT',null);await app.timers();app.run('ForgeCloud.guest()');const before=app.elements.get('cloudStatus').textContent;request.resolve({data:{version:2}});await saving;
  assert.equal(app.run('ForgeStore.account()'),null);assert.equal(app.elements.get('cloudStatus').textContent,before);assert.equal(app.run('ForgeStore.envelope("A").dirty'),true);
});
test('a failed sign-out leaves the account usable for saving',async()=>{
  const app=await setup();app.setSignOutError({message:'offline'});await app.run('ForgeCloud.logout()');assert.equal(app.run('ForgeCloud.diagnostics().ready'),true);assert.equal(app.run('ForgeStore.account()'),'A');await app.run('ForgeCloud.save(data)');assert.equal(app.run('ForgeStore.envelope().dirty'),true);
});
test('profile results from a previous account are ignored',async()=>{
  const app=await setup(),request=deferred();app.setProfile(request);const refreshing=app.run('ForgeCloud.refreshFriends()');app.event('SIGNED_OUT',null);await app.timers();request.resolve({data:{display_name:'PRIVATE OLD NAME',friend_code:'PRIVATE'}});await refreshing;assert.notEqual(app.elements.get('profileName').value,'PRIVATE OLD NAME');
});
test('syncNow stops after a session change while a save is pending',async()=>{
  const app=await setup(),request=deferred();app.setSave(request);app.run('ForgeCloud.save(data)');const syncing=app.run('ForgeCloud.syncNow()');app.event('SIGNED_OUT',null);await app.timers();request.resolve({data:{version:2}});assert.equal(await syncing,false);
});
