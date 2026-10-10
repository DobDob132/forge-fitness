const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');

test('pause screen has exactly one finish button',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const pause=html.match(/<div id="pausePhase"[\s\S]*?<div class="row workout-exit"/);
  assert.ok(pause);
  assert.equal((pause[0].match(/onclick="endPauseEarly\(\)"/g)||[]).length,1);
});

test('inline controls reference existing app functions',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts=fs.readdirSync(path.join(root,'js')).filter(file=>file.endsWith('.js')).map(file=>fs.readFileSync(path.join(root,'js',file),'utf8')).join('\n');
  const handlers=[...html.matchAll(/\bon(?:click|change|input|submit)="([A-Za-z_$][\w$]*)\s*\(/g)].map(match=>match[1]);
  const missing=[...new Set(handlers)].filter(name=>!new RegExp(`(?:function\\s+|(?:const|let|var)\\s+|window\\.)${name}\\b`).test(scripts));
  assert.deepEqual(missing,[]);
});

test('install prompt can be dismissed and the next click shows usable instructions',async()=>{
  const events={},buttons=[{addEventListener(name,handler){this[name]=handler;}}];
  const elements={installModal:{style:{}},installSteps:{innerHTML:'',children:[],append(child){this.children.push(child);}},installClose:{},installDone:{},installCopyLink:{}};
  let copied='',promptCalls=0;
  const navigator={userAgent:'Mozilla/5.0 Chrome/120',platform:'Win32',maxTouchPoints:0,clipboard:{writeText:async value=>{copied=value;}}};
  const window={navigator,matchMedia:()=>({matches:false}),addEventListener:(name,handler)=>{events[name]=handler;}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'js/install.js'),'utf8'),{
    window,document:{getElementById:id=>elements[id],querySelectorAll:()=>buttons,createElement:()=>({})},
    navigator,location:{href:'https://example.com/forge-fitness/index.html?from=share',protocol:'https:'},URL,toast:()=>{}
  });
  events.beforeinstallprompt({preventDefault(){},prompt:async()=>{promptCalls++;},userChoice:Promise.resolve({outcome:'dismissed'})});
  await buttons[0].click();
  assert.equal(promptCalls,1);
  assert.equal(elements.installModal.style.display,'flex');
  assert.match(elements.installSteps.innerHTML,/eingebetteten Browsern/);
  assert.equal(elements.installSteps.children[0].textContent,'https://example.com/forge-fitness/');
  elements.installModal.style.display='none';
  await buttons[0].click();
  assert.equal(promptCalls,1);
  assert.equal(elements.installModal.style.display,'flex');
  await elements.installCopyLink.onclick();
  assert.equal(copied,'https://example.com/forge-fitness/');
});

test('update notice blocks reload during a workout',()=>{
  const workerEvents={};
  let active=false,reloads=0,notice,observeChange;
  const workout={classList:{contains:()=>!active}};
  const elements={installModal:{style:{}},installSteps:{},installClose:{},installDone:{},installCopyLink:{},workout};
  const serviceWorker={controller:{},addEventListener:(name,handler)=>{workerEvents[name]=handler;},register:async()=>({update:async()=>{}})};
  const navigator={serviceWorker};
  const window={navigator,matchMedia:()=>({matches:false}),addEventListener:()=>{}};
  const document={
    getElementById:id=>elements[id],querySelectorAll:()=>[],createElement:()=>({append(...children){this.children=children;},setAttribute(){}}),
    body:{append(element){notice=element;element.isConnected=true;}}
  };
  class MutationObserver{constructor(handler){observeChange=handler;}observe(){}}
  vm.runInNewContext(fs.readFileSync(path.join(root,'js/install.js'),'utf8'),{
    window,document,navigator,location:{href:'https://example.com/forge-fitness/',protocol:'https:',reload:()=>{reloads++;}},
    URL,MutationObserver,I18n:{language:()=> 'de'},toast:()=>{}
  });
  workerEvents.controllerchange();
  assert.equal(notice.children[1].disabled,false);
  active=true;observeChange();
  assert.equal(notice.children[1].disabled,true);
  assert.match(notice.children[0].textContent,/Nach dem Training/);
  active=false;observeChange();
  notice.children[1].onclick();
  assert.equal(reloads,1);
});

test('service worker fetches current page before using the offline copy',async()=>{
  const handlers={},waits=[],puts=[];
  const live={ok:true,clone:()=>({copy:true})};
  let online=true,fetchOptions;
  const cache={put:async (key,response)=>{puts.push([key,response]);}};
  const caches={open:async()=>cache,match:async()=>({offline:true})};
  const self={location:{origin:'https://example.com',href:'https://example.com/forge-fitness/sw.js'},addEventListener:(name,handler)=>{handlers[name]=handler;}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{
    self,caches,URL,Request,fetch:async (_request,options)=>{fetchOptions=options;if(!online)throw Error('offline');return live;}
  });
  const request={method:'GET',mode:'navigate',url:'https://example.com/forge-fitness/'};
  const dispatch=async()=>{
    let response;
    handlers.fetch({request,respondWith:promise=>{response=promise;},waitUntil:promise=>{waits.push(promise);}});
    return response;
  };
  assert.equal(await dispatch(),live);
  await Promise.all(waits);
  assert.equal(fetchOptions.cache,'no-store');
  assert.equal(puts.length,1);
  assert.equal(puts[0][0],'./index.html');
  online=false;
  assert.deepEqual(await dispatch(),{offline:true});
});
