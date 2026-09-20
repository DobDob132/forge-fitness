function open1RM() {
    document.getElementById("rm_weight").value = "";
    document.getElementById("rm_reps").value = "";
    document.getElementById("rmWeightLabel").textContent = `Gewicht (${weightUnit()})`;
    document.getElementById("rm_result").textContent = `0 ${weightUnit()}`;
    document.getElementById("rm_percentages").innerHTML = "";
    document.getElementById("onermModal").style.display = "flex";
}

function calc1RM() {
    let w = fromDisplayWeight(parseFloat(document.getElementById("rm_weight").value));
    let r = parseInt(document.getElementById("rm_reps").value);
    if(w > 0 && r > 0) {
        let onerm = r === 1 ? w : w * (1 + r / 30);
        document.getElementById("rm_result").textContent = formatWeight(Math.round(onerm*10)/10);
        let percs = [90, 80, 70];
        document.getElementById("rm_percentages").innerHTML = percs.map(p => `<div class="stat"><b>${toDisplayWeight(onerm*(p/100))}</b><span>${p}% · ${weightUnit()}</span></div>`).join("");
    } else {
        document.getElementById("rm_result").textContent = `0 ${weightUnit()}`;
        document.getElementById("rm_percentages").innerHTML = "";
    }
}

function streak(){
    if(!data.logs.length) return 0;
    
    let logDates = [...new Set(data.logs.map(l=>new Date(l.date).toLocaleDateString('en-CA')))].sort();
    let activePlan = getActiveDays();
    let isRestDay = (dateObj) => {
        let dayIdx = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
        return activePlan[dayIdx].ex.length === 0;
    };
    
    let s = 0;
    let d = new Date();
    d.setHours(0,0,0,0);
    
    let ptrDate = new Date(d);
    let todayStr = ptrDate.toLocaleDateString('en-CA');
    
    if(!logDates.includes(todayStr) && !isRestDay(ptrDate)) {
        ptrDate.setDate(ptrDate.getDate() - 1); 
    }
    
    while(true) {
        let dateStr = ptrDate.toLocaleDateString('en-CA');
        
        if(logDates.includes(dateStr)) {
            s++;
        } else {
            if(!isRestDay(ptrDate)) {
                break;
            }
        }
        ptrDate.setDate(ptrDate.getDate() - 1);
        if (ptrDate < new Date(logDates[0])) break;
    }
    return s;
}

function countRecords(){let m={};data.logs.flatMap(l=>l.entries||[]).forEach(x=>{m[x.name]=Math.max(m[x.name]||0,x.weight||0)});return Object.keys(m).length}

function renderSummaryChart() {
    let ctx = document.getElementById("workoutSummaryChart");
    if(summaryChartInstance) summaryChartInstance.destroy();
    
    let currentLog = data.logs[data.logs.length - 1];
    if(!currentLog || !currentLog.entries) return;
    
    let volumePerEx = {};
    currentLog.entries.forEach(e => {
        if(e.weight && !isNaN(e.reps)) {
            volumePerEx[e.name] = (volumePerEx[e.name] || 0) + (e.weight * Number(e.reps));
        } else {
            volumePerEx[e.name] = (volumePerEx[e.name] || 0) + 1; // Bodyweight/Cardio count as 1 to show up
        }
    });

    summaryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(volumePerEx).map(s => s.length > 10 ? s.substring(0,8)+'..' : s),
            datasets: [{
                label: `Volumen (${weightUnit()})`,
                data: Object.values(volumePerEx).map(v=>toDisplayWeight(v)),
                backgroundColor: "#ff6b35",
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#252c38' }, ticks: { color: '#8d96a8' } },
                x: { grid: { display: false }, ticks: { color: '#8d96a8', font: { size: 10 } } }
            }
        }
    });
}

function renderProgress(){
  let exMap = new Set();
  const weightOption=document.querySelector('#chartBodySelect option[value="weight"]');
  if(weightOption)weightOption.textContent=`Gewicht (${weightUnit()})`;
  data.logs.flatMap(l=>l.entries||[]).forEach(e=>exMap.add(e.name));
  let sel = document.getElementById("chartExSelect");
  sel.innerHTML = '<option value="">Wähle Übung...</option>' + Array.from(exMap).sort().map(e=>`<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
  
  if(Array.from(exMap).length > 0) {
      sel.value = Array.from(exMap).sort()[0];
      updateExerciseChart();
  }
  updateBodyChart();

  let html = [...data.logs].reverse().map((l,i)=>`<div class="record" onclick="showHistoryDetail(${data.logs.length-1-i})"><div><b>${new Date(l.date).toLocaleDateString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric"})} · ${escapeHtml(l.plan)}</b><small style="display:block; color:var(--muted)">${escapeHtml(l.sets)} Sätze · ${Math.round(l.minutes)} Min.</small></div><button class="btn secondary" style="padding:4px 10px; font-size:12px;">Ansicht</button></div>`).join("");
  document.getElementById("historyList").innerHTML = html || "<div class='sub'>Noch keine Trainings absolviert.</div>";
}

function showHistoryDetail(idx){
  let l = data.logs[idx];
  let d = new Date(l.date).toLocaleDateString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric", hour:"2-digit", minute:"2-digit"});
  document.getElementById("histTitle").textContent = l.plan + " (" + l.focus + ")";
  
  let map = {};
  (l.entries||[]).forEach(e => { if(!map[e.name]) map[e.name]=[]; map[e.name].push(e); });
  
  let html = `<div class="sub" style="margin-bottom:15px;">Absolviert am ${d}<br>${escapeHtml(l.sets)} Sätze in ${Math.round(l.minutes)} Minuten.</div>`;
  html += `<div style="background:#11151d; padding:12px; border-radius:10px; border:1px solid var(--line);">`;
  
  for(let exName in map) {
      html += `<div style="margin-bottom:12px;">`;
      html += `<b style="color:var(--accent2); font-size:14px;">${escapeHtml(exName)}</b><div style="margin-top:6px;">`;
      map[exName].forEach((set, i) => {
          let vol = (set.weight > 0 && !isNaN(set.reps)) ? ` <span style="color:var(--muted); font-size:11px;">(Vol: ${toDisplayWeight(set.weight * Number(set.reps))} ${weightUnit()})</span>` : "";
          html += `<div class="history-detail-item">
              <span style="color:var(--muted); font-size:13px;">Satz ${i+1}</span>
              <span style="font-weight:bold; font-size:13px;">${set.weight > 0 ? escapeHtml(formatWeight(set.weight)) + " × " : ""}${escapeHtml(set.reps)}${vol}</span>
          </div>`;
      });
      html += `</div></div>`;
  }
  html += `</div>`;
  
  document.getElementById("histDetails").innerHTML = html;
  document.getElementById("histActions").innerHTML = `<button class="btn secondary" style="border-color:#3a1b1c; color:#ff7272; width:100%;" onclick="deleteHistoryEntry(${idx})">🗑️ Dieses Training löschen</button>`;
  document.getElementById("historyModal").style.display="flex";
}

function deleteHistoryEntry(idx) {
    if(confirm("Möchtest du dieses Training wirklich löschen? XP und Statistiken bleiben erhalten, nur der Eintrag verschwindet.")) {
        data.logs.splice(idx, 1);
        saveData();
        document.getElementById("historyModal").style.display="none";
        renderProgress();
        renderHome();
        toast("Training gelöscht.");
    }
}

function updateExerciseChart() {
    let name = document.getElementById("chartExSelect").value;
    if(!name) return;
    
    let labels = [], volumes = [], maxWeights = [];
    data.logs.forEach(log => {
        let sets = (log.entries||[]).filter(e => e.name === name);
        if(sets.length > 0) {
            labels.push(new Date(log.date).toLocaleDateString("de-AT", {day:"2-digit", month:"2-digit"}));
            
            let vol = sets.reduce((sum, e) => sum + ((e.weight||0) * (!isNaN(e.reps) ? Number(e.reps) : 0)), 0);
            volumes.push(toDisplayWeight(vol));
            
            let maxW = sets.reduce((max, e) => (e.weight||0) > max ? (e.weight||0) : max, 0);
            maxWeights.push(toDisplayWeight(maxW));
        }
    });
    
    if(exChartInstance) exChartInstance.destroy();
    let ctx = document.getElementById("exChart");
    
    exChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Max Gewicht (${weightUnit()})`,
                    data: maxWeights,
                    borderColor: '#ff6b35',
                    backgroundColor: '#ff6b35',
                    yAxisID: 'y'
                },
                {
                    label: `Volumen (${weightUnit()})`,
                    data: volumes,
                    borderColor: '#58a6ff',
                    backgroundColor: 'rgba(88, 166, 255, 0.1)',
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { color: '#252c38' }, ticks: { color: '#8d96a8' } },
                y: { type: 'linear', display: true, position: 'left', grid: { color: '#252c38' }, ticks: { color: '#8d96a8' } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#8d96a8' } }
            },
            plugins: {
                legend: { labels: { color: '#f5f7fb' } }
            }
        }
    });
}

function openBodyModal() {
    let last = data.bodyData.length ? data.bodyData[data.bodyData.length-1] : null;
    let getVal = (metric) => {
        if(!last) return "";
        let found = [...data.bodyData].reverse().find(d => d.metric === metric);
        return found ? found.value : "";
    };
    
    document.getElementById("bodyWeightLabel").textContent=`Gewicht (${weightUnit()})`;
    document.getElementById("bd_weight").value = toDisplayWeight(getVal("weight"));
    document.getElementById("bd_bodyfat").value = getVal("bodyfat");
    document.getElementById("bd_chest").value = getVal("chest");
    document.getElementById("bd_waist").value = getVal("waist");
    document.getElementById("bd_arms").value = getVal("arms");
    document.getElementById("bd_thighs").value = getVal("thighs");
    
    document.getElementById("bodyModal").style.display = "flex";
}

function saveBodyData() {
    let date = new Date().toISOString();
    let metrics = ["weight", "bodyfat", "chest", "waist", "arms", "thighs"];
    let added = false;
    
    metrics.forEach(m => {
        let val = parseFloat(document.getElementById("bd_" + m).value);if(m==='weight')val=fromDisplayWeight(val);
        if(!isNaN(val) && val > 0) {
            data.bodyData.push({ date, metric: m, value: val });
            added = true;
        }
    });
    
    if(added) {
        saveData();
        checkMilestones();
        document.getElementById("bodyModal").style.display = "none";
        toast("Körperdaten gespeichert! ⚖️");
        updateBodyChart();
    } else {
        toast("Bitte mindestens einen Wert eintragen.");
    }
}

function updateBodyChart() {
    let metric = document.getElementById("chartBodySelect").value;
    let filtered = data.bodyData.filter(d => d.metric === metric);
    
    let labels = filtered.map(d => new Date(d.date).toLocaleDateString("de-AT", {day:"2-digit", month:"2-digit"}));
    let values = filtered.map(d => metric==='weight'?toDisplayWeight(d.value):d.value);
    
    if(bodyChartInstance) bodyChartInstance.destroy();
    let ctx = document.getElementById("bodyChart");
    
    bodyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: metric==='weight'?`Gewicht (${weightUnit()})`:document.getElementById("chartBodySelect").options[document.getElementById("chartBodySelect").selectedIndex].text,
                data: values,
                borderColor: "#ff6b35",
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#252c38' }, ticks: { color: '#8d96a8' } },
                y: { grid: { color: '#252c38' }, ticks: { color: '#8d96a8' } }
            }
        }
    });
}
