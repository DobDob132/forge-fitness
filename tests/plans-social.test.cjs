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

test('social backend implements leaderboard and validates published plans deeply',()=>{
  const sql=fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8');
  assert.match(sql,/p_action='leaderboard'/);
  assert.match(sql,/valid_plan_payload\(p_payload\)/);
  assert.match(sql,/f\.status='accepted'/);
  assert.match(sql,/forge_published_plans/);
  assert.match(sql,/forge_public_plans/);
  assert.match(sql,/forge_friend_milestones/);
});

test('history deletion explains that statistics are recalculated',()=>{
  const source=fs.readFileSync(path.join(root,'js/progress.js'),'utf8');
  assert.match(source,/Statistiken und Rekorde werden aus den verbleibenden Trainings neu berechnet/);
  assert.doesNotMatch(source,/XP und Statistiken bleiben erhalten/);
});

test('plan list keeps edit visible and moves secondary actions into a menu',()=>{
  const source=fs.readFileSync(path.join(root,'js/plans.js'),'utf8');
  assert.match(source,/plan-edit-action/);
  assert.match(source,/plan-more-trigger/);
  assert.match(source,/Veröffentlichen[\s\S]*Kopieren[\s\S]*Löschen/);
});

test('published plans replace shared plans and provide scalable filters',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const social=fs.readFileSync(path.join(root,'js/social.js'),'utf8');
  assert.match(html,/id="tabPublished"/);assert.doesNotMatch(html,/id="tabShared"/);
  for(const id of ['publishedQuery','publishedCategory','publishedDifficulty','publishedDays','publishedSort'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(social,/function refreshPublishedPlans/);assert.match(social,/function publishPlan/);
});
