const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..','js',file),'utf8');

function setup(){
  const elements={weightInput:{value:'20'},repInput:{value:'8'},undoBtn:{style:{}},workout:{classList:{contains:()=>false}},complete:{classList:{contains:()=>true}}};
  const context=vm.createContext({
    console,Date,Math,JSON,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},
    document:{getElementById:id=>elements[id]||(elements[id]={style:{},classList:{add(){},remove(){},contains(){return false;}}})},
    data:{current:[],logs:[],xp:0,level:1,xpHistory:[],settings:{pause:90}},
    state:{day:{ex:[['Bankdrücken',3,'8-12',20]]},exercise:0,set:0,setsDone:0,nextWeight:null,workoutXp:0,finishing:false},
    fromDisplayWeight:x=>x,estimated1RM:()=>null,best1RM:()=>0,saveData:async()=>{},toast(){},ForgeSocial:{syncProgress(){}},checkMilestones(){},releaseWakeLock(){},show(){},I18n:{translate:x=>x}
  });
  vm.runInContext(read('xp.js'),context);vm.runInContext(read('workout.js'),context);
  vm.runInContext('clearExerciseTimer=()=>{};snapshotWorkout=()=>{};renderWorkout=()=>{};preparePauseSignals=()=>{};startPause=()=>{}',context);
  return {context,elements,run:code=>vm.runInContext(code,context)};
}

test('undoing a completed set restores the set and XP state',async()=>{
  const {run}=setup();await run('finishSet()');
  assert.equal(run('data.current.length'),1);assert.equal(run('data.xp'),10);
  await run('undoLastSet()');
  assert.equal(run('data.current.length'),0);assert.equal(run('data.xp'),0);assert.equal(run('state.setsDone'),0);assert.equal(run('state.set'),0);
});

test('undoing a skipped set never removes the previously completed set',async()=>{
  const {run}=setup();await run('finishSet()');run('skipSet()');await run('undoLastSet()');
  assert.equal(run('data.current.length'),1);assert.equal(run('data.xp'),10);assert.equal(run('state.setsDone'),1);assert.equal(run('state.set'),1);
});

test('completion screen uses the XP actually earned by the workout',()=>{
  const source=read('workout.js');
  assert.match(source,/Math\.round\(state\.workoutXp\|\|0\)/);
  assert.doesNotMatch(source,/\(state\.setsDone\*10\)\+50/);
});
