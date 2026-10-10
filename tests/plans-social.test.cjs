const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');

test('plan validation accepts a usable plan and rejects broken exercises',()=>{
  const context=vm.createContext({Date,Math,JSON,data:{allPlans:[]},emptyWeek:()=>['mo','di','mi','do','fr','sa','so'].map((id,index)=>({id,name:['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][index],color:'red',focus:'Training',warm:0,ex:[]}))});
  vm.runInContext(fs.readFileSync(path.join(root,'js/plans.js'),'utf8'),context);
  const valid={name:'Plan',days:context.emptyWeek()};valid.days[0].ex=[['Kniebeugen',3,'8-12',40]];
  context.valid=valid;
  assert.equal(vm.runInContext('normalizePlanStructure(valid).days[0].ex[0][1]',context),3);
  valid.days[0].ex[0][1]=0;
  assert.throws(()=>vm.runInContext('normalizePlanStructure(valid)',context),/Satzanzahl/);
});

test('social backend implements leaderboard and validates shared plans deeply',()=>{
  const sql=fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8');
  assert.match(sql,/p_action='leaderboard'/);
  assert.match(sql,/valid_plan_payload\(p_payload\)/);
  assert.match(sql,/f\.status='accepted'/);
});

test('history deletion explains that statistics are recalculated',()=>{
  const source=fs.readFileSync(path.join(root,'js/progress.js'),'utf8');
  assert.match(source,/Statistiken und Rekorde werden aus den verbleibenden Trainings neu berechnet/);
  assert.doesNotMatch(source,/XP und Statistiken bleiben erhalten/);
});
