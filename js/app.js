function show(id,btn){
  document.querySelectorAll("section").forEach(x=>x.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  if(btn){document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));btn.classList.add("active")}
  if(id!=="workout") releaseWakeLock();
  if(id==="home") renderHome();
  if(id==="plan") renderPlan();
  if(id==="plans"){renderPlansList();ForgeSocial.refreshShares();}
  if(id==="progress") renderProgress();
  if(id==="trophies") renderTrophies();
  if(id==="friends") ForgeSocial.refreshFriendsPage();
}

function renderHome(){
    renderXP();
    let d=today(); let days = getActiveDays();
    document.getElementById("todayLabel").textContent=I18n.translate(d.name)+" · "+new Date().toLocaleDateString(I18n.locale(),{day:"2-digit",month:"2-digit",year:"numeric"});
    document.getElementById("todayTitle").textContent=I18n.translate(d.focus);
    document.getElementById("todaySub").textContent=I18n.translate(d.ex.length?`${d.ex.reduce((a,e)=>a+(Number(e[1])||1),0)} Sätze`:"Regenerationstag - Erhalte deinen Streak automatisch aufrecht!");
    document.getElementById("streak").textContent=streak();
    document.getElementById("sessions").textContent=data.logs.length;
    document.getElementById("sets").textContent=data.logs.reduce((a,l)=>a+(l.sets||0),0);
    document.getElementById("minutes").textContent=Math.round(data.logs.reduce((a,l)=>a+(l.minutes||0),0));
    document.getElementById("calories").textContent=Math.round(data.logs.reduce((a,l)=>a+(l.calories||0),0));
    document.getElementById("records").textContent=countRecords();
    const goal=Math.max(1,Number(data.settings.weeklyGoal)||3),done=weeklyWorkoutCount(),percent=Math.min(100,Math.round(done/goal*100));
    document.getElementById("weeklyGoalText").textContent=I18n.translate(`${done} von ${goal} Trainings`);
    document.getElementById("weeklyGoalPercent").textContent=`${percent}%`;
    document.getElementById("weeklyGoalBar").style.width=percent+'%';
    const resume=document.getElementById("resumeWorkoutCard");resume.classList.toggle("hidden",!data.activeWorkout);
    if(data.activeWorkout)document.getElementById("resumeWorkoutText").textContent=I18n.translate(`${data.activeWorkout.dayName} · Übung ${data.activeWorkout.exercise+1}`);
    
    document.getElementById("weekList").innerHTML=days.map((x,i)=>{const day=I18n.translate(x.name);return `<div class="day"><div class="badge ${escapeHtml(x.color)}">${escapeHtml(day.slice(0,2))}</div><div><b>${escapeHtml(I18n.translate(x.focus))}</b><small>${escapeHtml(I18n.translate(x.ex.length?` · ${x.ex.length} Übungen`:" · Pause"))}</small></div><span class="tag">${i===todayIndex()?I18n.translate("HEUTE"):escapeHtml(day)}</span></div>`}).join("");

    let lastBody = data.bodyData.length ? new Date(data.bodyData[data.bodyData.length-1].date) : new Date(0);
    let daysSince = (new Date() - lastBody) / (1000 * 60 * 60 * 24);
    if(daysSince > 3 && data.logs.length > 0) {
        setTimeout(()=>toast("⏳ Zeit für ein Körperdaten-Update!"), 1500);
    }
}

function showHome(){show("home")}

ForgeCloud.boot();
window.addEventListener('forge-language-change',()=>{renderHome();if(!document.getElementById('trophies').classList.contains('hidden'))renderTrophies();});
