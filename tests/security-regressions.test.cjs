const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../js',name),'utf8');
function setup(){
  const values=new Map(),elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return true;}},appendChild(){},textContent:''});return elements.get(id);};
  const ctx=vm.createContext({console,Date,Math,JSON,Map,Set,Number,document:{addEventListener(){},querySelectorAll:()=>[],getElementById:element,querySelector:()=>null},window:{addEventListener(){}},navigator:{language:'de'},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},setTimeout:()=>0,clearTimeout(){},setInterval:()=>1,clearInterval(){},Chart:function(_el,options){this.options=options;this.destroy=()=>{};},I18n:{translate:x=>x,locale:()=>"de-AT"},toast(){},saveData:async()=>{}});
  for(const f of ['storage.js','data.js','plans.js','validation.js','calories.js','progress.js','xp.js'])vm.runInContext(read(f),ctx);
  const run=s=>vm.runInContext(s,ctx);
  run(`data.settings={...defaultSettings};payload=JSON.parse(JSON.stringify(data));`);
  return {run,ctx,values,elements};
}
test('payload validation rejects malformed logs, body data, XP and infinite settings',()=>{
  for(const change of ["payload.logs=[null]","payload.logs=[{date:'bad'}]","payload.bodyData={}","payload.xp='not-a-number'","payload.settings.pause='Infinity'","payload.settings.weeklyGoal=1.5","payload.allPlans.push(payload.allPlans[0])","payload.activeWorkout={exercise:100}"]){
    const {run}=setup();run(change);assert.throws(()=>run('normalizeForgePayload(payload)'));
  }
});
test('payload validation migrates legacy body weights and preserves newer activity fields',()=>{
  const {run}=setup();run("payload.bodyData=[{date:'2026-11-25',weight:59}];payload.logs=[{date:'2026-11-25',plan:'Joggen',focus:'Cardio',minutes:30,sets:0,type:'activity',activity:'running',distance:5,calories:200,entries:[]}];result=normalizeForgePayload(payload)");
  assert.equal(run('result.bodyData[0].value'),59);assert.equal(run('result.logs[0].distance'),5);assert.equal(run('result.logs[0].type'),'activity');
});
test('custom pause values become finite numeric literals',()=>{
  const {run}=setup();run("payload.settings.customPauses='60, 1e2, Infinity, 0x20, 0, -5, alert(1)';result=normalizeForgePayload(payload)");assert.equal(run('result.settings.customPauses'),'60, 100, 32');
});
test('prototype property names work in history and summary charts',()=>{
  const {run,ctx}=setup();ctx.formatWeight=w=>`${w} kg`;ctx.toDisplayWeight=w=>w;ctx.weightUnit=()=> 'kg';ctx.escapeHtml=String;
  run("data.logs=[{date:'2026-11-25',plan:'Test',focus:'Test',sets:3,minutes:5,entries:['__proto__','constructor','toString'].map(name=>({name,weight:10,reps:'10'}))}];showHistoryDetail(0);renderSummaryChart()");
  assert.equal(run('summaryChartInstance.options.data.labels.length'),3);
});
test('calorie distribution never becomes negative and preserves the total',()=>{
  const {run}=setup();for(let n=1;n<40;n++)for(let total=0;total<40;total++){const result=run(`distributeCalories(Array.from({length:${n}},()=>({})),${total})`);assert.equal(result.reduce((a,e)=>a+e.calories,0),total);assert.ok(result.every(e=>e.calories>=0));}
});
test('1RM treats a single repetition as its actual weight and ignores timed exercises',()=>{
  const {run}=setup();assert.equal(run("estimated1RM(100,'1')"),100);assert.equal(run("estimated1RM(20,'20 Sek.')"),null);assert.equal(run("estimated1RM(20,'8 pro Seite')"),20*(1+8/30));
});
test('mixed numeric and cardio results do not poison milestone volume',()=>{
  const {run,ctx}=setup();ctx.streak=()=>0;ctx.countRecords=()=>0;ctx.bodyMeasurementSessions=()=>0;
  run("data.logs=[{sets:2,minutes:1,entries:[{weight:1000,reps:'10'},{weight:0,reps:'20 Sek.'}]}];checkMilestones()");assert.equal(run("data.claimedMilestones.includes('vol10k')"),true);
});
