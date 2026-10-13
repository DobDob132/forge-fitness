function startWorkoutFlow(dayOverride=null) {
  if(data.activeWorkout){resumeWorkout();return;}
  preparePauseSignals();
  let d = dayOverride ? JSON.parse(JSON.stringify(dayOverride)) : today();
  if (!d.ex.length) { openRestDayWorkoutPicker(); return; }
  state = { day: d, exercise: 0, set: 0, setsDone: 0, started: Date.now(), timer: data.settings.pause, timerMax: data.settings.pause, timerEndsAt:0, interval: null, paused: false, finishing:false, nextWeight:null, exerciseTimer:0, exerciseTimerMax:0, exerciseTimerEndsAt:0, exerciseTimerInterval:null, exerciseTimerPaused:true, workoutXp:0, xpBaseline:captureXPState() };
  data.current=[];
  lastSetBackup = null;
  document.getElementById("undoBtn").style.display="none";
  show("workout");
  if(data.settings.keepAwake!==false) requestWakeLock();

  if(data.settings.warmup === "ja") {
      document.getElementById("activePhase").classList.add("hidden");
      document.getElementById("pausePhase").classList.add("hidden");
      document.getElementById("warmupPhase").classList.remove("hidden");
      document.getElementById("warmupMethodText").textContent = data.settings.warmupType;
      snapshotWorkout('warmup');
  } else {
      beginLifting();
  }
}

function closeRestDayWorkoutPicker(){document.getElementById('restDayWorkoutModal').style.display='none';}
function openRestDayWorkoutPicker(){
  if(data.activeWorkout){resumeWorkout();return;}
  const list=document.getElementById('restDayWorkouts');
  const days=getActiveDays().filter(day=>Array.isArray(day.ex)&&day.ex.length);
  list.replaceChildren();
  days.forEach(day=>{
    const button=document.createElement('button');
    button.type='button';button.className='rest-day-workout';
    const title=document.createElement('b');title.textContent=day.name;
    const detail=document.createElement('span');detail.textContent=`${day.focus} · ${day.ex.length} Übungen`;
    const action=document.createElement('small');action.textContent='Auswählen →';
    button.append(title,detail,action);
    button.onclick=()=>{closeRestDayWorkoutPicker();startWorkoutFlow(day);};
    list.append(button);
  });
  document.getElementById('restDayWorkoutModal').style.display='flex';
}

function finishWarmup() {
    document.getElementById("warmupPhase").classList.add("hidden");
    beginLifting();
}

function beginLifting() {
    document.getElementById("activePhase").classList.remove("hidden");
    document.getElementById("pausePhase").classList.add("hidden");
    let pauses = (data.settings.customPauses || "30, 60, 90, 120").split(",").map(s=>s.trim()).filter(s=>!isNaN(s)&&s!=="");
    let btnsHtml = `<button class="btn secondary" style="min-width:auto; padding:5px 8px; font-size:11px;" onclick="setPauseTime(${Number(data.settings.pause)})">Standard</button>`;
    pauses.forEach(p => { btnsHtml += `<button class="btn secondary" style="min-width:auto; padding:5px 8px; font-size:11px;" onclick="setPauseTime(${p})">${p}s</button>`; });
    document.getElementById("pauseQuickBtns").innerHTML = btnsHtml;
    renderWorkout();
    snapshotWorkout('lifting');
}

function snapshotWorkout(phase='lifting'){
  if(!state.day)return;
  data.activeWorkout={planId:data.activePlanId,dayId:state.day.id,dayName:state.day.name,focus:state.day.focus,exercise:state.exercise,set:state.set,setsDone:state.setsDone,started:state.started,phase,nextWeight:state.nextWeight,draftWeight:document.getElementById('weightInput')?.value||'',draftReps:document.getElementById('repInput')?.value||'',workoutXp:state.workoutXp||0,xpBaseline:state.xpBaseline};
  saveData();
}
function saveWorkoutDraftInputs(){snapshotWorkout('lifting')}
function resumeWorkout(){
  const saved=data.activeWorkout;if(!saved)return startWorkoutFlow();
  preparePauseSignals();
  const plan=data.allPlans.find(p=>p.id===saved.planId)||data.allPlans.find(p=>p.id===data.activePlanId),day=plan?.days.find(d=>d.id===saved.dayId);
  if(!day){discardWorkout(true);toast('Der gespeicherte Plan ist nicht mehr vorhanden.');return;}
  state={day:JSON.parse(JSON.stringify(day)),exercise:saved.exercise||0,set:saved.set||0,setsDone:saved.setsDone||0,started:saved.started||Date.now(),timer:data.settings.pause,timerMax:data.settings.pause,timerEndsAt:0,interval:null,paused:false,finishing:false,nextWeight:null,exerciseTimer:0,exerciseTimerMax:0,exerciseTimerEndsAt:0,exerciseTimerInterval:null,exerciseTimerPaused:true,workoutXp:Number(saved.workoutXp)||0,xpBaseline:saved.xpBaseline||captureXPState()};
  show('workout');if(data.settings.keepAwake!==false)requestWakeLock();
  if(saved.phase==='warmup'){document.getElementById('activePhase').classList.add('hidden');document.getElementById('pausePhase').classList.add('hidden');document.getElementById('warmupPhase').classList.remove('hidden');document.getElementById('warmupMethodText').textContent=data.settings.warmupType;}
  else{document.getElementById('warmupPhase').classList.add('hidden');beginLifting();if(saved.draftWeight!=='')document.getElementById('weightInput').value=saved.draftWeight;if(saved.draftReps)document.getElementById('repInput').value=saved.draftReps;}
  toast('Training fortgesetzt.');
}
function discardWorkout(silent=false){
  if(!silent&&!confirm('Gespeichertes Training wirklich verwerfen?'))return;
  clearInterval(state.interval);clearExerciseTimer();restoreXPState(state.xpBaseline);data.activeWorkout=null;data.current=[];state.day=null;state.finishing=false;saveData();renderHome();
}

function getSmartWeight(name, startWeight) {
    let allLogs = [...data.logs].reverse().flatMap(l=>l.entries||[]);
    let lastSet = allLogs.find(x=>x.name===name);
    return lastSet ? (lastSet.weight || startWeight) : startWeight;
}

function exerciseTargetBounds(exercise){
  const target=String(exercise?.[2]||'').trim(),range=target.match(/(\d+)\s*[-–]\s*(\d+)/),single=target.match(/^\s*(\d+)\s*(s|sek\.?|sec\.?|min(?:uten?)?)?\s*(?:pro|je)?/i);
  const isMinutes=/\bmin(?:uten?)?\b/i.test(target),isSeconds=!isMinutes&&/(?:\d)\s*(?:s|sek\.?|sec\.?)\b/i.test(target);
  if(range){const factor=isMinutes?60:1;return {min:Number(range[1])*factor,max:Number(range[2])*factor,kind:(isMinutes||isSeconds)?'seconds':'reps',isRange:true};}
  if(single){const factor=isMinutes?60:1,value=Number(single[1])*factor;return {min:value,max:value,kind:(isMinutes||isSeconds)?'seconds':'reps',isRange:false};}
  return null;
}
function setResultNumber(value){const match=String(value??'').match(/\d+(?:[.,]\d+)?/);return match?Number(match[0].replace(',','.')):null;}
function progressionStep(kg){const step=Math.max(.5,Number(data.settings.progressionWeightStep)||1);return Math.round((Number(kg)+step)*2)/2;}
function getProgressionSuggestion(exercise){
  const bounds=exerciseTargetBounds(exercise),expectedSets=Number(exercise[1]);
  if(!bounds?.isRange||!expectedSets)return null;
  const sessions=[...data.logs].reverse().map(log=>(log.entries||[]).filter(x=>x.name===exercise[0])).filter(sets=>sets.length);
  const fallbackWeight=Number(exercise[3])||0;
  if(!sessions.length)return {weight:fallbackWeight,target:bounds.min,kind:bounds.kind,text:`Sanfter Start bei ${formatProgressionTarget(bounds.min,bounds.kind)}. Danach steigert FORGE schrittweise bis ${formatProgressionTarget(bounds.max,bounds.kind)}.`};
  const lastSession=sessions[0],lastWeight=Number(lastSession[lastSession.length-1].weight)||fallbackWeight;
  const sameWeight=sets=>sets.length>=expectedSets&&sets.every(set=>Math.abs((Number(set.weight)||0)-lastWeight)<0.01);
  const reaches= (sets,target)=>sameWeight(sets)&&sets.every(set=>{const result=setResultNumber(set.reps);return result!==null&&result>=target;});
  const weighted=lastWeight>0||fallbackWeight>0,readyForWeight=weighted&&sessions.length>=2&&reaches(sessions[0],bounds.max)&&reaches(sessions[1],bounds.max);
  if(readyForWeight){const nextWeight=progressionStep(lastWeight);return {weight:nextWeight,target:bounds.min,kind:bounds.kind,text:`Oberes Ziel zweimal stabil geschafft: Gewicht auf <strong>${escapeHtml(formatWeight(nextWeight))}</strong>, ${formatProgressionTarget(bounds.min,bounds.kind)} als ruhiger Neustart.`};}
  const results=lastSession.map(set=>setResultNumber(set.reps)).filter(value=>value!==null),lastStable=results.length>=expectedSets?Math.min(...results):bounds.min;
  const step=bounds.kind==='seconds'?Math.max(1,Number(data.settings.progressionSecondsStep)||5):Math.max(1,Number(data.settings.progressionRepStep)||1);
  const target=Math.min(bounds.max,Math.max(bounds.min,lastStable+(reaches(lastSession,lastStable)?step:0)));
  const holding=target>=bounds.max&&reaches(lastSession,bounds.max);
  return {weight:lastWeight,target,kind:bounds.kind,text:holding?`Oberes Ziel erreicht. Noch eine stabile Einheit mit ${formatProgressionTarget(bounds.max,bounds.kind)}, dann darf das Gewicht steigen.`:`Gewicht bleibt bei ${escapeHtml(formatWeight(lastWeight))}; nächster ruhiger Schritt: <strong>${formatProgressionTarget(target,bounds.kind)}</strong>.`};
}
function formatProgressionTarget(value,kind){return kind==='seconds'?`${value} Sek.`:`${value} Wdh.`;}
function targetUpperReps(exercise){return exerciseTargetBounds(exercise)?.max??null;}
function currentWorkoutStepText(){
  const exercise=state.day?.ex?.[state.exercise];
  if(!exercise)return '';
  return `${I18n.translate('Übung')} ${state.exercise+1} / ${state.day.ex.length} · ${I18n.translate('Satz')} ${state.set+1} / ${exercise[1]}`;
}

function renderWorkout(){
  let d=state.day, e=d.ex[state.exercise];
  clearExerciseTimer();
  document.getElementById('setControls').appendChild(document.getElementById('undoBtn'));
  document.getElementById("workDay").textContent=I18n.translate(d.name)+" · "+I18n.translate(d.focus);
  document.getElementById("workStep").textContent=currentWorkoutStepText();
  document.getElementById("workName").textContent=e[0];
  document.getElementById("workTarget").textContent=I18n.translate('Ziel:')+" "+e[2];
  
  const progression=getProgressionSuggestion(e);
  let suggestedWeight = state.nextWeight ?? (progression ? progression.weight : getSmartWeight(e[0], e[3]));
  let isCardio = String(e[2]).toLowerCase().match(/(min|km|sec)/);
  document.getElementById("workWeight").textContent=e[3]>0?formatWeight(suggestedWeight) : (isCardio ? "Cardio / Eigene" : "Körpergewicht");
  document.getElementById("workProgress").style.width=((state.exercise+(state.set/e[1]))/d.ex.length*100)+"%";
  
  const target=String(e[2]),isPerSide=/\b(pro|je)\s+(seite|bein|arm)\b/i.test(target),targetSeconds=parseExerciseDuration(target);
  const suggestedResult=progression?.target?formatShortcutResult(progression.target,progression.kind):'';
  const minKey=normalizeShortcutKey(data.settings.shortcutMin,'d').toUpperCase(),maxKey=normalizeShortcutKey(data.settings.shortcutMax,'f').toUpperCase(),bounds=exerciseTargetBounds(e);
  const resultLabel=bounds?.kind==='seconds'?'Zeit / Ergebnis':isPerSide?'Wiederholungen pro Seite':bounds?.kind==='reps'?'Wiederholungen':'Wiederholungen / Info',resultUnit=bounds?.kind==='seconds'?'Sek.':bounds?.kind==='reps'?'Wdh.':'';
  const mobileTargets=bounds?`<div class="mobile-target-buttons" aria-label="Ziel direkt eintragen">${bounds.isRange?`<button type="button" onclick="applyWorkoutShortcut('min')"><b>${formatShortcutButton(bounds.min,bounds.kind)}</b><small>${escapeHtml(minKey)} · Satz abschließen</small></button>`:''}<button type="button" onclick="applyWorkoutShortcut('max')"><b>${formatShortcutButton(bounds.max,bounds.kind)}</b><small>${escapeHtml(maxKey)} · Satz abschließen</small></button></div>`:'';
  document.getElementById("setInputs").innerHTML=`<div class="inputs"><label class="workout-entry-field" for="weightInput"><span>Gewicht <b>${weightUnit()}</b></span><input class="input" id="weightInput" type="number" step=".5" value="${isCardio ? 0 : escapeHtml(toDisplayWeight(suggestedWeight))}" placeholder="${weightUnit()}" oninput="saveWorkoutDraftInputs()"></label><label class="workout-entry-field" for="repInput"><span>${resultLabel}${resultUnit?` <b>${resultUnit}</b>`:''}</span><input class="input" id="repInput" type="text" value="${escapeHtml(suggestedResult)}" placeholder="${isPerSide ? 'Wdh. pro Seite' : targetSeconds ? 'Ergebnis / Info' : 'Wdh. / Info'}" oninput="saveWorkoutDraftInputs()">${bounds?`<span class="workout-shortcuts" aria-label="Tastenkürzel"><span><kbd>${escapeHtml(minKey)}</kbd> Minimum &amp; Pause</span><span><kbd>${escapeHtml(maxKey)}</kbd> Maximum &amp; Pause</span></span>`:''}</label></div>${mobileTargets}`;
  resetExerciseTimerCompletionUI();
  const exerciseTimer=document.getElementById('exerciseTimer');exerciseTimer.classList.toggle('hidden',!targetSeconds);
  if(targetSeconds){state.exerciseTimer=targetSeconds;state.exerciseTimerMax=targetSeconds;state.exerciseTimerPaused=true;document.getElementById('exerciseTimerInput').value=targetSeconds;updateExerciseTimerUI();}
  const suggestionEl=document.getElementById('workSuggestion');suggestionEl.classList.toggle('hidden',!progression);suggestionEl.innerHTML=progression?`<span>↗ ${progression.text}</span>`:'';
  const note=document.getElementById('workNote');note.classList.toggle('hidden',!e[6]);note.textContent=e[6]?`📝 ${e[6]}`:'';
  
  document.getElementById("activePhase").classList.remove("hidden");
  document.getElementById("pausePhase").classList.add("hidden");
}

function formatShortcutResult(value,kind){return kind==='seconds'?`${value} Sek.`:String(value);}
function formatShortcutButton(value,kind){return kind==='seconds'?`${value} s`:`${value}`;}
let shortcutSubmitting=false;
async function applyWorkoutShortcut(which){
  if(shortcutSubmitting||!state.day||state.exercise>=state.day.ex.length)return false;
  const bounds=exerciseTargetBounds(state.day.ex[state.exercise]);
  if(!bounds){toast("Für dieses Ziel gibt es keinen Zahlenbereich");return false;}
  const input=document.getElementById('repInput');if(!input)return false;
  input.value=formatShortcutResult(which==='max'?bounds.max:bounds.min,bounds.kind);input.dispatchEvent(new Event('input',{bubbles:true}));
  shortcutSubmitting=true;try{await finishSet();}finally{shortcutSubmitting=false;}return true;
}
document.addEventListener?.('keydown',event=>{
  if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||!state.day)return;
  const workout=document.getElementById('workout'),active=document.getElementById('activePhase');
  if(!workout||workout.classList.contains('hidden')||!active||active.classList.contains('hidden')||document.querySelector('.modal[style*="display: flex"]'))return;
  const key=String(event.key||'').toLowerCase(),minimum=normalizeShortcutKey(data.settings.shortcutMin,'d'),maximum=normalizeShortcutKey(data.settings.shortcutMax,'f');
  if(key!==minimum&&key!==maximum)return;
  event.preventDefault();applyWorkoutShortcut(key===maximum?'max':'min');
});

function showExerciseInfo() {
    let e = state.day.ex[state.exercise];
    let name = e[0];
    let explanation = e[4] ? e[4] : "Keine Erklärung verfügbar. (Wenn du einen neuen KI-Plan erstellst, wird diese automatisch generiert!)";
    let equipment = e[5] ? e[5] : "Kein spezifisches Equipment hinterlegt.";
    
    let infoHtml = `<b>Ausführung:</b><br>${escapeHtml(explanation)}<br><br><b>Benötigtes Equipment:</b><br>${escapeHtml(equipment)}${e[6]?`<br><br><b>Deine Notiz:</b><br>${escapeHtml(e[6])}`:''}`;
    showInfoModal("Info: " + name, infoHtml);
}

function toggleFullscreen() {
    let btn = document.getElementById("fullscreenBtn");
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(()=>{}); btn.textContent = "Vollbildmodus beenden"; } 
    else { document.exitFullscreen().catch(()=>{}); btn.textContent = "⛶ Vollbild"; }
}

async function finishSet(){
  let e=state.day.ex[state.exercise], w=fromDisplayWeight(+document.getElementById("weightInput").value||0), r=document.getElementById("repInput").value||"";
  if(!r){toast("Bitte Ausführung eintragen");return}
  data.current=data.current||[];
  lastSetBackup={ kind:'completed', exercise:state.exercise, set:state.set, setsDone:state.setsDone, nextWeight:state.nextWeight, currentLength:data.current.length, xpState:captureXPState(), workoutXp:state.workoutXp||0 };
  const xpBefore=Number(data.xp)||0;
  
  const current1RM=estimated1RM(w,r),prevBest=best1RM(data.logs,e[0]);
  if(current1RM&&prevBest>0&&current1RM>prevBest+0.01){addXP(25,"Neuer 1RM-Rekord: "+e[0]);toast("🏆 Neuer 1RM-Rekord!");}

  clearExerciseTimer();
  data.current.push({name:e[0], weight:w, reps:r});
  addXP(10, `Satz beendet: ${e[0]}`);
  state.workoutXp=(state.workoutXp||0)+((Number(data.xp)||0)-xpBefore);
  
  state.nextWeight=null;
  state.set++; state.setsDone++;
  let isExerciseDone = false;
  if(state.set>=e[1]){state.set=0; state.exercise++; state.nextWeight=null; isExerciseDone = true;}
  
  const completed=state.exercise>=state.day.ex.length;
  if(!completed){snapshotWorkout('lifting');await saveData();}
  document.getElementById("undoBtn").style.display="inline-block";
  if(completed){ await finishWorkout(); }
  else{ preparePauseSignals();startPause(isExerciseDone ? data.settings.pause + 30 : data.settings.pause); }
}

async function undoLastSet(){
  if(!lastSetBackup){toast("Nichts zum Rückgängig machen");return}
  data.current=data.current||[];data.current.length=Math.min(data.current.length,lastSetBackup.currentLength);
  if(lastSetBackup.kind==='completed')restoreXPState(lastSetBackup.xpState);
  state.exercise=lastSetBackup.exercise; state.set=lastSetBackup.set; state.setsDone=lastSetBackup.setsDone; state.nextWeight=lastSetBackup.nextWeight??null;
  state.workoutXp=lastSetBackup.workoutXp||0;
  lastSetBackup=null;
  document.getElementById("undoBtn").style.display="none";
  renderWorkout();
  if(state.exercise<state.day.ex.length)snapshotWorkout('lifting');
}

function skipSet(){
  clearExerciseTimer();
  lastSetBackup={ kind:'skipped', exercise:state.exercise, set:state.set, setsDone:state.setsDone, nextWeight:state.nextWeight, currentLength:(data.current||[]).length, workoutXp:state.workoutXp||0 };
  state.set++;
  if(state.set>=state.day.ex[state.exercise][1]){state.set=0; state.exercise++;state.nextWeight=null;}
  if(state.exercise<state.day.ex.length)snapshotWorkout('lifting');
  document.getElementById("undoBtn").style.display="inline-block";
  if(state.exercise>=state.day.ex.length) finishWorkout(); else renderWorkout();
}

let completedWorkoutLog=null;
async function finishWorkout(){
  if(state.finishing)return;state.finishing=true;clearInterval(state.interval);clearExerciseTimer();
  completedWorkoutLog=null;
  const finishedDay=state.day,mins=Math.max(1,(Date.now()-state.started)/60000),effort=5,calories=(data.current||[]).length?estimateCalories({activity:'strength',effort,minutes:mins}):0,entries=distributeCalories(data.current||[],calories);
  data.activeWorkout=null;
  if(entries.length>0){
    completedWorkoutLog={date:new Date().toISOString(),type:'strength',plan:finishedDay.name,focus:finishedDay.focus,sets:state.setsDone,minutes:mins,calories,effort,entries};
    data.logs.push(completedWorkoutLog);
    const xpBefore=Number(data.xp)||0;addXP(50, "Training beendet!");state.workoutXp=(state.workoutXp||0)+((Number(data.xp)||0)-xpBefore);
  }
  data.current=[];await saveData();
  ForgeSocial.syncProgress();
  checkMilestones();
  releaseWakeLock();
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  
  show('complete');
  document.getElementById("completeText").textContent=`${finishedDay.name} · ${finishedDay.focus}`;
  document.getElementById('workoutEffort').value=5;document.getElementById('workoutEffortValue').textContent='5 / 10';
  document.getElementById("completeStats").innerHTML=`<div class="stat"><b>${state.setsDone}</b><span>Sätze</span></div><div class="stat"><b>${Math.round(mins)}</b><span>Minuten</span></div><div class="stat"><b>${calories}</b><span>kcal geschätzt</span></div><div class="stat"><b>+${Math.max(0,Math.round(state.workoutXp||0))}</b><span>XP</span></div>`;
  state.day=null;state.finishing=false;
  
  setTimeout(renderSummaryChart, 100);
}

async function updateWorkoutEffort(){
  if(!completedWorkoutLog||!data.logs.includes(completedWorkoutLog))return;
  const effort=Number(document.getElementById('workoutEffort').value);
  completedWorkoutLog.effort=effort;
  completedWorkoutLog.calories=estimateCalories({activity:'strength',effort,minutes:completedWorkoutLog.minutes});
  completedWorkoutLog.entries=distributeCalories(completedWorkoutLog.entries,completedWorkoutLog.calories);
  const stats=document.querySelectorAll('#completeStats .stat b');if(stats[2])stats[2].textContent=completedWorkoutLog.calories;
  await saveData();ForgeSocial.syncProgress();
}

function saveAndExit(){
  if(confirm("Training speichern und später fortsetzen?")){clearInterval(state.interval);clearExerciseTimer();snapshotWorkout('lifting');releaseWakeLock();showHome();toast('Training gespeichert.');}
}
