// Validate all external account data before it reaches rendering or calculations.
function normalizeForgePayload(value) {
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const invalid=label=>{throw Error(`Ungültige FORGE-Daten: ${label}.`);};
  const list=(v,label,max=100000)=>{if(!Array.isArray(v)||v.length>max)invalid(label);return v;};
  const text=(v,label,max=10000)=>{if(typeof v!=='string'||v.length>max)invalid(label);return v;};
  const num=(v,label,min=0,max=1e9,integer=false)=>{if(!['number','string'].includes(typeof v)||v==='')invalid(label);const n=Number(v);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))invalid(label);return n;};
  const date=v=>{if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))invalid('Datum');return v;};
  if(!object(value))invalid('Sicherungsdatei');
  const p=JSON.parse(JSON.stringify(value));
  p.allPlans=list(p.allPlans,'Pläne',500).map(plan=>normalizePlanStructure(plan,{id:plan?.id,archived:plan?.archived===true}));
  if(!p.allPlans.length||new Set(p.allPlans.map(x=>x.id)).size!==p.allPlans.length)invalid('Plan-IDs');
  if(!p.allPlans.some(x=>x.id===p.activePlanId))p.activePlanId=p.allPlans[0].id;
  function entries(items=[]){return list(items,'Sätze').map(e=>{
    if(!object(e))invalid('Satz');text(e.name,'Übungsname',100);e.weight=num(e.weight??0,'Gewicht',0,10000);
    if(typeof e.reps==='number')e.reps=String(e.reps);text(e.reps,'Satzergebnis',500);
    if(e.calories!=null)e.calories=num(e.calories,'Kalorien');return e;
  });}
  p.logs=list(p.logs,'Trainings').map(l=>{
    if(!object(l))invalid('Training');date(l.date);text(l.plan,'Tagname',500);text(l.focus??'','Fokus',500);
    l.entries=entries(l.entries);l.sets=num(l.sets??l.entries.length,'Sätze',0,10000,true);l.minutes=num(l.minutes??0,'Trainingsdauer',0,1e7);
    for(const key of ['calories','distance','effort'])if(l[key]!=null)l[key]=num(l[key],key);
    for(const key of ['type','activity','note'])if(l[key]!=null)text(l[key],key);
    return l;
  });
  if(p.settings!=null&&!object(p.settings))invalid('Einstellungen');
  const existingProfile=p.settings?.calorieProfile;
  if(existingProfile!=null&&!object(existingProfile))invalid('Kalorienprofil');
  p.settings={...defaultSettings,...p.settings,calorieProfile:{...defaultSettings.calorieProfile,...existingProfile}};
  const s=p.settings;
  s.pause=num(s.pause,'Pause',1,3600,true);s.weeklyGoal=num(s.weeklyGoal,'Wochenziel',1,14,true);
  s.customPauses=text(s.customPauses,'Pausenauswahl',500).split(',').map(x=>Number(x.trim())).filter(n=>Number.isInteger(n)&&n>0&&n<=3600).join(', ');
  text(s.warmupType,'Aufwärmart',500);
  for(const [key,min,max] of [['progressionWeightStep',.5,20],['progressionRepStep',1,10],['progressionSecondsStep',1,60]])s[key]=num(s[key],key,min,max);
  for(const [key,min,max] of [['weight',25,350],['height',120,230],['age',13,100]])s.calorieProfile[key]=num(s.calorieProfile[key],key,min,max);
  s.unit=s.unit==='lb'?'lb':'kg';s.language=['de','en','el'].includes(s.language)?s.language:'de';
  for(const key of ['shortcutMin','shortcutMax'])s[key]=/^[a-z]$/.test(s[key])?s[key]:defaultSettings[key];
  if(s.shortcutMin===s.shortcutMax){s.shortcutMin='d';s.shortcutMax='f';}
  p.xp=num(p.xp??0,'XP');p.level=Math.floor(Math.sqrt(p.xp/100))+1;
  p.xpHistory=list(p.xpHistory??[],'XP-Verlauf').map(h=>{if(!object(h))invalid('XP-Verlauf');date(h.date);text(h.reason,'XP-Grund');h.amount=num(h.amount,'XP-Betrag');return h;});
  p.claimedMilestones=list(p.claimedMilestones??[],'Meilensteine',1000).map(x=>text(x,'Meilenstein',100));
  p.bodyData=list(p.bodyData??[],'Körperdaten').map(d=>{
    if(!object(d))invalid('Körperdaten');date(d.date);d.metric??='weight';
    if(!['weight','bodyfat','chest','waist','arms','thighs'].includes(d.metric))invalid('Körpermaß');
    d.value=num(d.value??d.weight,'Körpermaß',0,10000);return d;
  });
  if(!existingProfile){const latest=[...p.bodyData].reverse().find(d=>d.metric==='weight');if(latest)s.calorieProfile.weight=Math.max(25,Math.min(350,latest.value));}
  p.current=entries(p.current);
  p.activityTemplates=list(p.activityTemplates??[],'Aktivitätsvorlagen',20).map(t=>{
    if(!object(t))invalid('Aktivitätsvorlage');text(t.id,'Vorlagen-ID',100);text(t.name,'Vorlagenname',100);text(t.activity,'Aktivität',100);
    t.minutes=num(t.minutes,'Dauer',1,1440);t.distance=num(t.distance??0,'Distanz',0,10000);t.effort=num(t.effort??5,'Belastung',1,10);text(t.note??'','Notiz',500);return t;
  });
  p.activeWorkout??=null;
  if(p.activeWorkout){
    const w=p.activeWorkout;if(!object(w))invalid('Gespeichertes Training');
    const day=w.day||p.allPlans.find(x=>x.id===w.planId)?.days.find(d=>d.id===w.dayId);
    if(!day||!Array.isArray(day.ex)||!day.ex.length)invalid('Gespeicherter Trainingstag');
    const snapshot=normalizePlanStructure({name:'Training',days:emptyWeek().map((d,i)=>i===0?day:d)}).days[0];snapshot.id=day.id;
    w.day=snapshot;w.exercise=num(w.exercise,'Übungsposition',0,day.ex.length,true);
    w.set=num(w.set,'Satzposition',0,w.exercise<day.ex.length?day.ex[w.exercise][1]-1:0,true);
    w.setsDone=num(w.setsDone,'Sätze',0,10000,true);w.started=num(w.started,'Trainingsstart',0,1e15);
    if(w.elapsedMs!=null)w.elapsedMs=num(w.elapsedMs,'Trainingsdauer',0,1e15);
    w.workoutXp=num(w.workoutXp??0,'Trainings-XP');
    if(w.nextWeight!=null)w.nextWeight=num(w.nextWeight,'Gewicht',0,10000);
    for(const key of ['draftWeight','draftReps'])text(w[key]??'','Satzeingabe',500);
    if(w.xpBaseline){if(!object(w.xpBaseline))invalid('XP-Sicherung');w.xpBaseline.xp=num(w.xpBaseline.xp,'XP-Sicherung');w.xpBaseline.level=num(w.xpBaseline.level,'Level',1,1e6,true);list(w.xpBaseline.xpHistory,'XP-Sicherung').forEach(h=>{if(!object(h))invalid('XP-Sicherung');date(h.date);text(h.reason,'XP-Grund');h.amount=num(h.amount,'XP-Betrag');});}
  }
  return p;
}
