const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../js/workout.js'),'utf8');

function setup(logs=[]){
  const repInput={value:'',dispatchEvent(){}};
  const elements={repInput,workout:{classList:{contains:()=>false}},activePhase:{classList:{contains:()=>false}}};
  const context=vm.createContext({
    console,Date,Math,JSON,Event:class{},setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},
    document:{getElementById:id=>elements[id]||(elements[id]={style:{},classList:{add(){},remove(){},contains(){return false;}}}),querySelector:()=>null,addEventListener(){}},
    data:{logs,settings:{shortcutMin:'d',shortcutMax:'f',progressionWeightStep:1,progressionRepStep:1,progressionSecondsStep:5}},
    state:{day:{ex:[['Bankdrücken',3,'8-12',20]]},exercise:0,set:0,setsDone:0},
    normalizeShortcutKey:(value,fallback)=>/^[a-z]$/i.test(value||'')?String(value).toLowerCase():fallback,
    escapeHtml:value=>String(value),formatWeight:value=>`${value} kg`,toast(){},
    fromDisplayWeight:value=>value,estimated1RM:()=>null,best1RM:()=>0,addXP(){},captureXPState:()=>({}),clearExerciseTimer(){},saveData:async()=>{},ForgeSocial:{syncProgress(){}},checkMilestones(){},releaseWakeLock(){},show(){},I18n:{translate:value=>value}
  });
  vm.runInContext(source,context);
  return {context,repInput,run:code=>vm.runInContext(code,context)};
}

test('target bounds understand repetition and time ranges',()=>{
  const {run}=setup();
  assert.deepEqual({...run("exerciseTargetBounds(['Plank',3,'30-60s',0])")},{min:30,max:60,kind:'seconds',isRange:true});
  assert.deepEqual({...run("exerciseTargetBounds(['Curls',3,'12–15 pro Seite',0])")},{min:12,max:15,kind:'reps',isRange:true});
});

test('double progression raises reps first and weight only after two stable sessions',()=>{
  const session=(date,reps)=>({date,entries:Array.from({length:3},()=>({name:'Bankdrücken',weight:20,reps:String(reps)}))});
  let setupResult=setup([session('2026-10-01',8)]);
  assert.equal(setupResult.run("getProgressionSuggestion(['Bankdrücken',3,'8-12',20]).target"),9);
  setupResult=setup([session('2026-10-01',12),session('2026-10-08',12)]);
  const suggestion=setupResult.run("getProgressionSuggestion(['Bankdrücken',3,'8-12',20])");
  assert.equal(suggestion.weight,21);assert.equal(suggestion.target,8);
});

test('maximum shortcut fills the upper target and completes the set',async()=>{
  const {context,repInput,run}=setup();
  let completed=0;context.finishSet=async()=>{completed++;};
  await run("applyWorkoutShortcut('max')");
  assert.equal(repInput.value,'12');assert.equal(completed,1);
});

test('release version is consistent in app metadata',()=>{
  const root=path.join(__dirname,'..'),pkg=require('../package.json'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),utils=fs.readFileSync(path.join(root,'js/utils.js'),'utf8');
  assert.equal(pkg.version,'1.8.0');assert.match(html,/FORGE 1\.8\.0/);assert.match(utils,/Version 1\.8\.0/);
});

test('settings keep every control while organizing them into searchable tabs',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const tab of ['general','training','progression','signals','data'])assert.match(html,new RegExp(`data-settings-panel="${tab}"`));
  for(const id of ['languageSetting','unitSetting','weeklyGoalSetting','pauseSetting','customPauses','warmupSetting','warmupType','wakeLockSetting','vibrationSetting','soundSetting','shortcutMinSetting','shortcutMaxSetting','progressionWeightStep','progressionRepStep','progressionSecondsStep'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/id="settingsSearch"/);assert.match(html,/id="signalDiagnostics"/);
});

test('mobile target buttons show changing exercise values instead of min and max labels',()=>{
  assert.match(source,/formatShortcutButton\(bounds\.min,bounds\.kind\)/);
  assert.match(source,/formatShortcutButton\(bounds\.max,bounds\.kind\)/);
  assert.doesNotMatch(source,/mobile-target-buttons[^`]*>Minimum</);
});
