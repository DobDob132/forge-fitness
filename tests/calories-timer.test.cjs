const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..','js',file),'utf8');

test('calorie estimate scales with activity duration and intensity',()=>{
  const context=vm.createContext({data:{settings:{calorieProfile:{weight:70,height:175,age:30,sex:'neutral'}},bodyData:[]}});
  vm.runInContext(read('calories.js'),context);
  assert.equal(vm.runInContext("estimateCalories({activity:'running',intensity:'moderate',minutes:60})",context),639);
  assert.equal(vm.runInContext("estimateCalories({activity:'running',intensity:'moderate',minutes:30})",context),320);
  assert.ok(vm.runInContext("estimateCalories({activity:'running',intensity:'intense',minutes:30})",context)>320);
  assert.equal(vm.runInContext("distributeCalories([{name:'A'},{name:'B'},{name:'C'}],100).reduce((sum,entry)=>sum+entry.calories,0)",context),100);
});

test('rest timer uses wall time after background throttling and alerts once',()=>{
  let now=100000,notified=0,rendered=0;
  const nodes=new Map();const element=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',style:{},classList:{add(){},remove(){},contains(){return false;}}});return nodes.get(id)};
  const FakeDate=class extends Date{static now(){return now}};
  const context=vm.createContext({Date:FakeDate,document:{getElementById:element,addEventListener(){}},window:{},navigator:{vibrate(){notified++;return true}},data:{settings:{vibration:true,pauseSound:false}},state:{timer:0,timerMax:0,paused:false,interval:null},I18n:{translate:x=>x},fmt:x=>String(x),renderWorkout(){rendered++},setInterval(){return 1},clearInterval(){}});
  vm.runInContext(read('timer.js'),context);
  vm.runInContext('startPause(90)',context);
  now+=90000;vm.runInContext('tickPauseTimer()',context);
  assert.equal(element('pauseTime').textContent,'0');
  assert.equal(notified,1);
  assert.equal(rendered,1);
});

test('exercise timer uses wall time and writes the completed duration into the set',()=>{
  let now=200000,notified=0,saved=0,message='';
  const nodes=new Map();const element=id=>{if(!nodes.has(id)){const classes=new Set();nodes.set(id,{value:'',textContent:'',style:{},classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},dispatchEvent(){saved++;},focus(){this.focused=true;}});}return nodes.get(id)};
  const FakeDate=class extends Date{static now(){return now}};
  const context=vm.createContext({Date:FakeDate,Event:class{},document:{getElementById:element,addEventListener(){}},window:{},navigator:{vibrate(){notified++;return true}},data:{settings:{vibration:true,pauseSound:false}},state:{exerciseTimer:0,exerciseTimerMax:0,exerciseTimerEndsAt:0,exerciseTimerInterval:null,exerciseTimerPaused:true},I18n:{translate:x=>x},fmt:x=>String(x),toast:x=>{message=x},setInterval:()=>1,clearInterval(){}});
  vm.runInContext(read('timer.js'),context);
  vm.runInContext('setExerciseTimer(45);toggleExerciseTimer()',context);now+=5000;vm.runInContext('toggleExerciseTimer()',context);
  assert.equal(vm.runInContext('state.exerciseTimer',context),40);
  vm.runInContext('toggleExerciseTimer()',context);now+=40000;vm.runInContext('tickExerciseTimer()',context);
  assert.equal(element('repInput').value,'45 Sek.');assert.equal(saved,1);assert.equal(notified,1);assert.match(message,/Zeit übernommen/);
  assert.equal(element('exerciseTimer').classList.contains('exercise-timer-complete'),true);
  assert.equal(element('exerciseTimerConfirm').classList.contains('hidden'),false);
  assert.equal(element('setControls').classList.contains('hidden'),true);
  assert.equal(element('exerciseTimerConfirm').focused,true);
});
