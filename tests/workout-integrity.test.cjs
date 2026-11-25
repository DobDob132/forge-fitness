const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..','js',file),'utf8');

function setup(preserveSnapshot=false){
  const elements={weightInput:{value:'20'},repInput:{value:'8'},undoBtn:{style:{}},workout:{classList:{contains:()=>false}},complete:{classList:{contains:()=>true}}};
  const context=vm.createContext({
    console,Date,Math,JSON,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},
    document:{getElementById:id=>elements[id]||(elements[id]={style:{},classList:{add(){},remove(){},contains(){return false;}}})},
    data:{current:[],logs:[],xp:0,level:1,xpHistory:[],settings:{pause:90}},
    state:{day:{ex:[['Bankdrücken',3,'8-12',20]]},exercise:0,set:0,setsDone:0,nextWeight:null,workoutXp:0,finishing:false},
    fromDisplayWeight:x=>x,estimated1RM:()=>null,best1RM:()=>0,saveData:async()=>{},toast(){},ForgeSocial:{syncProgress(){}},checkMilestones(){},releaseWakeLock(){},show(){},I18n:{translate:x=>x}
  });
  vm.runInContext(read('xp.js'),context);vm.runInContext(read('workout.js'),context);
  vm.runInContext('clearExerciseTimer=()=>{};renderWorkout=()=>{};preparePauseSignals=()=>{};startPause=()=>{}',context);if(!preserveSnapshot)vm.runInContext('snapshotWorkout=()=>{}',context);
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

test('double clicking a set while storage is pending records it only once',async()=>{
  const {run,context}=setup();let release;const waiting=new Promise(r=>release=r);context.saveData=()=>waiting;
  const first=run('finishSet()'),second=run('finishSet()');release();await Promise.all([first,second]);assert.equal(run('data.current.length'),1);assert.equal(run('data.xp'),10);
});
test('undoing during rest stops the old pause timer',async()=>{
  const {run,context}=setup();const cleared=[];context.clearInterval=id=>cleared.push(id);await run('finishSet()');run('state.interval=42;state.timerEndsAt=1000');await run('undoLastSet()');assert.ok(cleared.includes(42));assert.equal(run('state.timerEndsAt'),0);
});
test('resuming uses the saved day and excludes time spent outside the workout',()=>{
  const {run}=setup(true);run("state.day.id='mo';state.day.name='Montag';state.day.focus='Kraft';state.started=Date.now()-60000;data.activePlanId='plan';data.allPlans=[];data.settings.keepAwake=false;snapshotWorkout();data.activeWorkout.started=Date.now()-86400000;resumeWorkout()");assert.equal(run('state.day.ex[0][0]'),'Bankdrücken');assert.ok(run('Date.now()-state.started')<65000);assert.equal(run('data.activeWorkout.day.ex.length'),1);
});
