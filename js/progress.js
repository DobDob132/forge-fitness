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

function estimated1RM(weight,reps){
  const kg=Number(weight),match=String(reps??'').trim().replace(',','.').match(/^\d+(?:\.\d+)?/),count=match?Number(match[0]):NaN;
  if(!Number.isFinite(kg)||kg<=0||!Number.isFinite(count)||count<1||count>30)return null;
  return kg*(1+count/30);
}
function best1RM(logs,name){
  return logs.flatMap(log=>log.entries||[]).filter(entry=>entry.name===name).reduce((best,entry)=>Math.max(best,estimated1RM(entry.weight,entry.reps)||0),0);
}
function personalRecords(logs){
  const oneRMs=new Map(),distances=new Map();let bestPace=null;
  for(const log of logs){
    for(const entry of log.entries||[]){
      const estimate=estimated1RM(entry.weight,entry.reps);
      if(estimate)oneRMs.set(entry.name,Math.max(oneRMs.get(entry.name)||0,estimate));
    }
    const distance=Number(log.distance),minutes=Number(log.minutes);
    if(log.type==='activity'&&distance>0&&Number.isFinite(distance)){
      distances.set(log.activity||'other',Math.max(distances.get(log.activity||'other')||0,distance));
      if(log.activity==='running'&&minutes>0){const pace=minutes/distance;if(!bestPace||pace<bestPace)bestPace=pace;}
    }
  }
  return {oneRMs,distances,bestPace};
}
function countRecords(){const records=personalRecords(data.logs);return records.oneRMs.size+records.distances.size+(records.bestPace?1:0);}
function renderPersonalRecords(){
  const root=document.getElementById('personalRecords'),records=personalRecords(data.logs),items=[];
  for(const [name,oneRM] of records.oneRMs)items.push({label:name+' · 1RM',value:formatWeight(Math.round(oneRM*10)/10)});
  for(const [activity,distance] of records.distances)items.push({label:I18n.translate(activityLabels[activity]||'Freies Training')+' · '+I18n.translate('Distanz'),value:distance.toLocaleString(I18n.locale())+' km'});
  if(records.bestPace){const seconds=Math.round(records.bestPace*60);items.push({label:I18n.translate('Beste Laufpace'),value:Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' min/km'});}
  root.replaceChildren();if(!items.length){root.textContent=I18n.translate('Noch keine Rekorde.');return;}
  for(const item of items){const card=document.createElement('div'),label=document.createElement('span'),value=document.createElement('b');card.className='personal-record';label.textContent=item.label;value.textContent=item.value;card.append(label,value);root.append(card);}
}

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
  renderPersonalRecords();
  let exMap = new Set();
  const weightOption=document.querySelector('#chartBodySelect option[value="weight"]');
  if(weightOption)weightOption.textContent=`Gewicht (${weightUnit()})`;
  data.logs.flatMap(l=>l.entries||[]).forEach(e=>{if(Number(e.weight)>0)exMap.add(e.name)});
  let sel = document.getElementById("chartExSelect");
  sel.innerHTML = '<option value="">Wähle Übung...</option>' + Array.from(exMap).sort().map(e=>`<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
  
  if(Array.from(exMap).length > 0) {
      sel.value = Array.from(exMap).sort()[0];
      updateExerciseChart();
  }
  updateChartPickerLabel('exercise');
  updateBodyChart();
  updateChartPickerLabel('body');

  renderHistory();
}

function chartPickerElements(kind){
  const exercise=kind==='exercise';
  return {select:document.getElementById(exercise?'chartExSelect':'chartBodySelect'),popover:document.getElementById(exercise?'exerciseChartPicker':'bodyChartPicker'),button:document.getElementById(exercise?'exerciseChartPickerButton':'bodyChartPickerButton'),search:document.getElementById(exercise?'exerciseChartSearch':'bodyChartSearch'),options:document.getElementById(exercise?'exerciseChartOptions':'bodyChartOptions')};
}
function updateChartPickerLabel(kind){
  const {select,button}=chartPickerElements(kind);if(!select||!button)return;
  const label=select.options[select.selectedIndex]?.text|| (kind==='exercise'?'Wähle Übung':'Messwert wählen');
  const text=button.querySelector('span');if(text)text.textContent=label.replace('...','');
}
function renderChartPicker(kind,query=''){
  const {select,options}=chartPickerElements(kind);if(!select||!options)return;
  const needle=String(query||'').trim().toLocaleLowerCase();
  options.innerHTML=[...select.options].filter(option=>option.value&&option.text.toLocaleLowerCase().includes(needle)).map(option=>`<button type="button" class="${option.value===select.value?'active':''}" onclick="chooseChartOption(${escapeHtml(JSON.stringify(kind))},${escapeHtml(JSON.stringify(option.value))})"><span>${kind==='exercise'?'🏋️':'⚖️'}</span><b>${escapeHtml(option.text)}</b>${option.value===select.value?'<i>✓</i>':''}</button>`).join('')||'<div class="sub picker-empty">Keine passende Auswahl gefunden.</div>';
}
function toggleChartPicker(kind,force){
  const current=chartPickerElements(kind),other=chartPickerElements(kind==='exercise'?'body':'exercise');
  const open=force===undefined?!current.popover.classList.contains('open'):force;
  other.popover?.classList.remove('open');current.popover?.classList.toggle('open',open);current.button?.setAttribute('aria-expanded',String(open));
  if(open){current.search.value='';renderChartPicker(kind);setTimeout(()=>current.search.focus(),0);}
}
function chooseChartOption(kind,value){
  const {select}=chartPickerElements(kind);if(!select)return;select.value=value;updateChartPickerLabel(kind);toggleChartPicker(kind,false);if(kind==='exercise')updateExerciseChart();else updateBodyChart();
}

let historyPreset='all';
function localDateKey(date){const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function historyRecord(log,index){
  return `<div class="record" onclick="showHistoryDetail(${index})"><div><b>${new Date(log.date).toLocaleDateString(I18n.locale(),{day:"2-digit",month:"2-digit",year:"numeric"})} · ${escapeHtml(I18n.translate(log.plan))}</b><small style="display:block; color:var(--muted)">${log.type==='activity'?`${Math.round(log.minutes)} ${I18n.translate('Minuten')}${log.distance?` · ${escapeHtml(log.distance)} km`:''}`:`${escapeHtml(log.sets)} ${I18n.translate('Sätze')} · ${Math.round(log.minutes)} Min.`} · ${Math.round(log.calories||0)} kcal</small></div><button class="btn secondary" style="padding:4px 10px; font-size:12px;">${I18n.translate('Ansicht')}</button></div>`;
}
function renderHistory(){
  const day=document.getElementById('historyDayFilter')?.value||'',month=document.getElementById('historyMonthFilter')?.value||'';
  const last7Start=new Date();last7Start.setHours(0,0,0,0);last7Start.setDate(last7Start.getDate()-6);
  const logs=data.logs.map((log,index)=>({log,index,key:localDateKey(log.date)})).filter(item=>day?item.key===day:month?item.key.startsWith(month):historyPreset==='last7'?new Date(item.log.date)>=last7Start:true).sort((a,b)=>new Date(b.log.date)-new Date(a.log.date));
  updateHistoryFilterUI();
  if(!logs.length){document.getElementById('historyList').innerHTML="<div class='sub history-empty'>Keine Trainings für diesen Zeitraum gefunden.</div>";return;}
  const years=new Map();
  logs.forEach(item=>{const date=new Date(item.log.date),year=String(date.getFullYear()),monthKey=`${year}-${String(date.getMonth()+1).padStart(2,'0')}`;if(!years.has(year))years.set(year,new Map());const months=years.get(year);if(!months.has(monthKey))months.set(monthKey,{label:date.toLocaleDateString(I18n.locale(),{month:'long'}),items:[]});months.get(monthKey).items.push(item);});
  document.getElementById('historyList').innerHTML=[...years].map(([year,months])=>`<section class="history-year"><h3>${year}</h3>${[...months].map(([,group])=>`<details class="history-month" open><summary><span>${escapeHtml(group.label)}</span><small>${group.items.length} ${group.items.length===1?'Training':'Trainings'}</small></summary><div>${group.items.map(item=>historyRecord(item.log,item.index)).join('')}</div></details>`).join('')}</section>`).join('');
}
function toggleHistoryFilter(force){const panel=document.getElementById('historyFilterPopover'),button=document.getElementById('historyFilterButton');const open=force===undefined?!panel.classList.contains('open'):force;panel.classList.toggle('open',open);button?.setAttribute('aria-expanded',String(open));}
function currentLocalInputDate(){return localDateKey(new Date());}
function setHistoryPreset(preset){
  const day=document.getElementById('historyDayFilter'),month=document.getElementById('historyMonthFilter');historyPreset=preset;
  if(day)day.value=preset==='today'?currentLocalInputDate():'';
  if(month)month.value=preset==='month'?currentLocalInputDate().slice(0,7):'';
  renderHistory();toggleHistoryFilter(false);
}
function updateHistoryFilterUI(){
  const day=document.getElementById('historyDayFilter')?.value||'',month=document.getElementById('historyMonthFilter')?.value||'',summary=document.getElementById('historyFilterSummary'),button=document.getElementById('historyFilterButton');
  const active=!!day||!!month||historyPreset==='last7';let label='';
  if(day)label=`📅 ${new Date(`${day}T12:00:00`).toLocaleDateString(I18n.locale(),{day:'2-digit',month:'long',year:'numeric'})}`;else if(month)label=`🗓️ ${new Date(`${month}-01T12:00:00`).toLocaleDateString(I18n.locale(),{month:'long',year:'numeric'})}`;else if(historyPreset==='last7')label='📅 Letzte 7 Tage';
  summary?.classList.toggle('hidden',!active);if(summary)summary.innerHTML=active?`<span>${escapeHtml(label)}</span><button type="button" onclick="clearHistoryFilters()" aria-label="Filter entfernen">✕</button>`:'';
  button?.querySelector('.filter-dot')?.classList.toggle('hidden',!active);
  document.querySelectorAll('[data-history-preset]').forEach(item=>item.classList.toggle('active',(day&&item.dataset.historyPreset==='today')||(month&&item.dataset.historyPreset==='month')||(!day&&!month&&item.dataset.historyPreset===historyPreset)));
}
function filterHistoryByDay(value){const month=document.getElementById('historyMonthFilter');if(value&&month)month.value='';historyPreset=value?'day':'all';renderHistory();}
function filterHistoryByMonth(value){const day=document.getElementById('historyDayFilter');if(value&&day)day.value='';historyPreset=value?'customMonth':'all';renderHistory();}
function clearHistoryFilters(){const day=document.getElementById('historyDayFilter'),month=document.getElementById('historyMonthFilter');if(day)day.value='';if(month)month.value='';historyPreset='all';renderHistory();toggleHistoryFilter(false);}

function showHistoryDetail(idx){
  let l = data.logs[idx];
  let d = new Date(l.date).toLocaleDateString(I18n.locale(),{day:"2-digit",month:"2-digit",year:"numeric", hour:"2-digit", minute:"2-digit"});
  document.getElementById("histTitle").textContent = `${I18n.translate(l.plan)} (${I18n.translate(l.focus)})`;
  
  let map = {};
  (l.entries||[]).forEach(e => { if(!map[e.name]) map[e.name]=[]; map[e.name].push(e); });
  
  let html = `<div class="history-summary"><div><b>${Math.round(l.minutes)}</b><span>${I18n.translate('Minuten')}</span></div><div><b>${Math.round(l.calories||0)}</b><span>${I18n.translate('kcal geschätzt')}</span></div>${l.distance?`<div><b>${escapeHtml(l.distance)} km</b><span>${I18n.translate('Distanz')}</span></div>`:`<div><b>${escapeHtml(l.sets)}</b><span>${I18n.translate('Sätze')}</span></div>`}</div><div class="sub" style="margin:12px 0;">${I18n.translate('Absolviert am')} ${d}${l.note?`<br>📝 ${escapeHtml(l.note)}`:''}</div>`;
  html += `<div style="background:#11151d; padding:12px; border-radius:10px; border:1px solid var(--line);">`;
  
  for(let exName in map) {
      html += `<div style="margin-bottom:12px;">`;
      html += `<b style="color:var(--accent2); font-size:14px;">${escapeHtml(exName)}</b><div style="margin-top:6px;">`;
      map[exName].forEach((set, i) => {
          let vol = (set.weight > 0 && !isNaN(set.reps)) ? ` <span style="color:var(--muted); font-size:11px;">(Vol: ${toDisplayWeight(set.weight * Number(set.reps))} ${weightUnit()})</span>` : "";
          html += `<div class="history-detail-item">
              <span style="color:var(--muted); font-size:13px;">${l.type==='activity'?I18n.translate('Einheit'):`${I18n.translate('Satz')} ${i+1}`}</span>
              <span style="font-weight:bold; font-size:13px;">${set.weight > 0 ? escapeHtml(formatWeight(set.weight)) + " × " : ""}${escapeHtml(set.reps)}${vol}${set.calories!=null?` <small>· ${Math.round(set.calories)} kcal</small>`:''}</span>
          </div>`;
      });
      html += `</div></div>`;
  }
  html += `</div>`;
  
  document.getElementById("histDetails").innerHTML = html;
  document.getElementById("histActions").innerHTML = `<button class="btn secondary" style="border-color:#3a1b1c; color:#ff7272; width:100%;" onclick="deleteHistoryEntry(${idx})">🗑️ Dieses Training löschen</button>`;
  document.getElementById("historyModal").style.display="flex";
}

async function deleteHistoryEntry(idx) {
    if(confirm("Möchtest du dieses Training wirklich löschen? Die XP bleiben erhalten; Statistiken und Rekorde werden aus den verbleibenden Trainings neu berechnet.")) {
        data.logs.splice(idx, 1);
        await saveData();
        await ForgeSocial.syncProgress().catch(()=>{});
        document.getElementById("historyModal").style.display="none";
        renderProgress();
        renderHome();
        toast(I18n.translate("Training gelöscht."));
    }
}

function updateExerciseChart() {
    let name = document.getElementById("chartExSelect").value;
    if(!name) return;
    updateChartPickerLabel('exercise');
    
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
            if(m==='weight')data.settings.calorieProfile={...calorieProfile(),weight:val};
            added = true;
        }
    });
    
    if(added) {
        saveData();
        checkMilestones();
        document.getElementById("bodyModal").style.display = "none";
        toast(I18n.translate("Körperdaten gespeichert! ⚖️"));
        updateBodyChart();
    } else {
        toast(I18n.translate("Bitte mindestens einen Wert eintragen."));
    }
}

function updateBodyChart() {
    let metric = document.getElementById("chartBodySelect").value;
    updateChartPickerLabel('body');
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
