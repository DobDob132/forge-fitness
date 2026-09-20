function startWorkoutFlow() {
  if(data.activeWorkout){resumeWorkout();return;}
  let d = today();
  if (!d.ex.length) { toast("Heute ist Regeneration 💛"); return; }
  state = { day: d, exercise: 0, set: 0, setsDone: 0, started: Date.now(), timer: data.settings.pause, timerMax: data.settings.pause, interval: null, paused: false };
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
  data.activeWorkout={planId:data.activePlanId,dayId:state.day.id,dayName:state.day.name,focus:state.day.focus,exercise:state.exercise,set:state.set,setsDone:state.setsDone,started:state.started,phase,draftWeight:document.getElementById('weightInput')?.value||'',draftReps:document.getElementById('repInput')?.value||''};
  saveData();
}
function saveWorkoutDraftInputs(){snapshotWorkout('lifting')}
function resumeWorkout(){
  const saved=data.activeWorkout;if(!saved)return startWorkoutFlow();
  const plan=data.allPlans.find(p=>p.id===saved.planId)||data.allPlans.find(p=>p.id===data.activePlanId),day=plan?.days.find(d=>d.id===saved.dayId);
  if(!day){discardWorkout(true);toast('Der gespeicherte Plan ist nicht mehr vorhanden.');return;}
  state={day:JSON.parse(JSON.stringify(day)),exercise:saved.exercise||0,set:saved.set||0,setsDone:saved.setsDone||0,started:saved.started||Date.now(),timer:data.settings.pause,timerMax:data.settings.pause,interval:null,paused:false};
  show('workout');if(data.settings.keepAwake!==false)requestWakeLock();
  if(saved.phase==='warmup'){document.getElementById('activePhase').classList.add('hidden');document.getElementById('pausePhase').classList.add('hidden');document.getElementById('warmupPhase').classList.remove('hidden');document.getElementById('warmupMethodText').textContent=data.settings.warmupType;}
  else{document.getElementById('warmupPhase').classList.add('hidden');beginLifting();if(saved.draftWeight!=='')document.getElementById('weightInput').value=saved.draftWeight;if(saved.draftReps)document.getElementById('repInput').value=saved.draftReps;}
  toast('Training fortgesetzt.');
}
function discardWorkout(silent=false){
  if(!silent&&!confirm('Gespeichertes Training wirklich verwerfen?'))return;
  clearInterval(state.interval);data.activeWorkout=null;data.current=[];state.day=null;saveData();renderHome();
}

function getSmartWeight(name, startWeight) {
    let allLogs = [...data.logs].reverse().flatMap(l=>l.entries||[]);
    let lastSet = allLogs.find(x=>x.name===name);
    return lastSet ? (lastSet.weight || startWeight) : startWeight;
}

function getProgressionSuggestion(exercise){
  const previous=[...data.logs].reverse().find(l=>(l.entries||[]).some(x=>x.name===exercise[0]));
  if(!previous)return null;
  const sets=(previous.entries||[]).filter(x=>x.name===exercise[0]&&x.weight>0),range=String(exercise[2]).match(/(\d+)\s*-\s*(\d+)/);
  if(!sets.length||!range)return null;
  const upper=Number(range[2]),allReached=sets.every(x=>Number(x.reps)>=upper),lastWeight=Math.max(...sets.map(x=>Number(x.weight)||0));
  if(allReached)return {weight:Math.round((lastWeight+2.5)*2)/2,text:`Alle Sätze mit mindestens ${upper} Wdh geschafft · nächster Schritt ${formatWeight(Math.round((lastWeight+2.5)*2)/2)}`};
  return {weight:lastWeight,text:`Letzte Einheit: ${formatWeight(lastWeight)} · Gewicht beibehalten und Wiederholungen steigern`};
}
function applySuggestedWeight(kg){document.getElementById('weightInput').value=toDisplayWeight(kg);saveWorkoutDraftInputs();toast('Vorschlag übernommen.');}

function renderWorkout(){
  let d=state.day, e=d.ex[state.exercise];
  document.getElementById("workDay").textContent=d.name+" · "+d.focus;
  document.getElementById("workStep").textContent=`Übung ${state.exercise+1} / ${d.ex.length} · Satz ${state.set+1} / ${e[1]}`;
  document.getElementById("workName").textContent=e[0];
  document.getElementById("workTarget").textContent="Ziel: "+e[2];
  
  let suggestedWeight = getSmartWeight(e[0], e[3]);
  let isCardio = String(e[2]).toLowerCase().match(/(min|km|sec)/);
  document.getElementById("workWeight").textContent=e[3]>0?formatWeight(suggestedWeight) : (isCardio ? "Cardio / Eigene" : "Körpergewicht");
  document.getElementById("workProgress").style.width=((state.exercise+(state.set/e[1]))/d.ex.length*100)+"%";
  
  document.getElementById("setInputs").innerHTML=`<div class="inputs"><input class="input" id="weightInput" type="number" step=".5" value="${isCardio ? 0 : escapeHtml(toDisplayWeight(suggestedWeight))}" placeholder="${weightUnit()}" oninput="saveWorkoutDraftInputs()"><input class="input" id="repInput" type="text" placeholder="Wdh / Info" oninput="saveWorkoutDraftInputs()"></div>`;
  const suggestion=getProgressionSuggestion(e),suggestionEl=document.getElementById('workSuggestion');suggestionEl.classList.toggle('hidden',!suggestion);suggestionEl.innerHTML=suggestion?`<span>↗ ${escapeHtml(suggestion.text)}</span><button class="btn secondary" onclick="applySuggestedWeight(${suggestion.weight})">Übernehmen</button>`:'';
  const note=document.getElementById('workNote');note.classList.toggle('hidden',!e[6]);note.textContent=e[6]?`📝 ${e[6]}`:'';
  
  document.getElementById("activePhase").classList.remove("hidden");
  document.getElementById("pausePhase").classList.add("hidden");
}

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
  lastSetBackup={ exercise: state.exercise, set: state.set, setsDone: state.setsDone };
  data.current=data.current||[];
  
  let isRecord = false;
  let prevBest = data.logs.flatMap(l=>l.entries||[]).filter(x=>x.name===e[0]).reduce((max, cur) => cur.weight > max ? cur.weight : max, 0);
  if(w > prevBest && prevBest > 0) { isRecord = true; addXP(25, "Neuer Rekord: "+e[0]); toast("🏆 Neuer Gewichts-Rekord!"); }

  data.current.push({name:e[0], weight:w, reps:r});
  addXP(10, `Satz beendet: ${e[0]}`);
  
  state.set++; state.setsDone++;
  let isExerciseDone = false;
  if(state.set>=e[1]){state.set=0; state.exercise++; isExerciseDone = true;}
  
  snapshotWorkout('lifting');await saveData();
  document.getElementById("undoBtn").style.display="inline-block";
  if(state.exercise>=state.day.ex.length){ finishWorkout(); }
  else{ startPause(isExerciseDone ? data.settings.pause + 30 : data.settings.pause); }
}

async function undoLastSet(){
  if(!lastSetBackup){toast("Nichts zum Rückgängig machen");return}
  data.current.pop();
  state.exercise=lastSetBackup.exercise; state.set=lastSetBackup.set; state.setsDone=lastSetBackup.setsDone;
  lastSetBackup=null;
  document.getElementById("undoBtn").style.display="none";
  renderWorkout();
  snapshotWorkout('lifting');
}

function skipSet(){
  lastSetBackup={ exercise: state.exercise, set: state.set, setsDone: state.setsDone };
  state.set++;
  if(state.set>=state.day.ex[state.exercise][1]){state.set=0; state.exercise++;}
  snapshotWorkout('lifting');
  document.getElementById("undoBtn").style.display="inline-block";
  if(state.exercise>=state.day.ex.length) finishWorkout(); else renderWorkout();
}

async function finishWorkout(){
  let mins=(Date.now()-state.started)/60000;
  if(data.current && data.current.length>0){
    data.logs.push({date:new Date().toISOString(), plan:state.day.name, focus:state.day.focus, sets:state.setsDone, minutes:mins, entries:data.current});
    addXP(50, "Training beendet!");
  }
  data.current=[];data.activeWorkout=null; await saveData();
  ForgeSocial.syncProgress();
  checkMilestones();
  releaseWakeLock();
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  
  document.getElementById("activePhase").classList.add("hidden");
  document.getElementById("complete").classList.remove("hidden");
  document.getElementById("completeText").textContent=`${state.day.name} · ${state.day.focus}`;
  document.getElementById("completeStats").innerHTML=`<div class="stat"><b>${state.setsDone}</b><span>Sätze</span></div><div class="stat"><b>${Math.round(mins)}</b><span>Minuten</span></div><div class="stat"><b>+${(state.setsDone*10)+50}</b><span>XP</span></div>`;
  
  setTimeout(renderSummaryChart, 100);
}

function saveAndExit(){
  if(confirm("Training speichern und später fortsetzen?")){clearInterval(state.interval);snapshotWorkout('lifting');releaseWakeLock();showHome();toast('Training gespeichert.');}
}
