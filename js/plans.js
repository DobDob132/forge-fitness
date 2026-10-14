const getActivePlan = () => data.allPlans.find(p => p.id === data.activePlanId) || data.allPlans[0];
const getActiveDays = () => getActivePlan().days;

function normalizePlanStructure(plan,{id=plan?.id,archived=plan?.archived===true}={}){
    if(!plan||typeof plan!=='object'||!Array.isArray(plan.days)||plan.days.length!==7)throw Error('Ein Trainingsplan muss genau sieben gültige Tage enthalten.');
    const name=String(plan.name||'').trim();if(!name||name.length>80)throw Error('Der Planname muss 1–80 Zeichen lang sein.');
    const template=emptyWeek();
    const days=plan.days.map((day,dayIndex)=>{
        if(!day||typeof day!=='object'||!Array.isArray(day.ex))throw Error(`Tag ${dayIndex+1} enthält keine gültige Übungsliste.`);
        const dayName=String(day.name||template[dayIndex].name).trim().slice(0,40)||template[dayIndex].name;
        const focus=String(day.focus||template[dayIndex].focus).trim().slice(0,80)||template[dayIndex].focus;
        const color=['red','blue','green','yellow'].includes(day.color)?day.color:template[dayIndex].color;
        const ex=day.ex.map((exercise,exerciseIndex)=>{
            if(!Array.isArray(exercise)||exercise.length<4)throw Error(`${dayName}: Übung ${exerciseIndex+1} ist unvollständig.`);
            const exerciseName=String(exercise[0]||'').trim(),sets=Number(exercise[1]),target=String(exercise[2]??'').trim(),weight=Number(exercise[3]);
            if(!exerciseName||exerciseName.length>100)throw Error(`${dayName}: Der Übungsname muss 1–100 Zeichen lang sein.`);
            if(!Number.isInteger(sets)||sets<1||sets>100)throw Error(`${exerciseName}: Die Satzanzahl muss zwischen 1 und 100 liegen.`);
            if(!target||target.length>50)throw Error(`${exerciseName}: Das Ziel muss 1–50 Zeichen lang sein.`);
            if(!Number.isFinite(weight)||weight<0||weight>10000)throw Error(`${exerciseName}: Das Gewicht muss zwischen 0 und 10.000 kg liegen.`);
            return [exerciseName,sets,target,weight,String(exercise[4]||'').trim().slice(0,600),String(exercise[5]||'').trim().slice(0,200),String(exercise[6]||'').trim().slice(0,300)];
        });
        return {...template[dayIndex],id:template[dayIndex].id,name:dayName,focus,color,ex};
    });
    const safeId=typeof id==='string'&&id.trim()?id.trim().slice(0,100):`p_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    return {id:safeId,name,days,archived};
}

function renderPlan(){
    let active = getActivePlan();
    document.getElementById("activePlanNameTag").textContent = active.name;
    document.getElementById("fullPlan").innerHTML=active.days.map(d=>`<div class="card" style="margin:10px 0;background:#0d1118"><div class="row between"><div><b>${escapeHtml(d.name)}</b><div class="sub">${escapeHtml(d.focus)}</div></div><span class="badge ${escapeHtml(d.color)}">${d.ex.length}</span></div>${d.ex.map(e=>`<div class="day"><div></div><div><b>${escapeHtml(e[0])}</b><small>${escapeHtml(e[1])} × ${escapeHtml(e[2])} · ${e[3]>0?escapeHtml(formatWeight(e[3])): (e[2].includes("min")||e[2].includes("km")?"Cardio":"BW")}${e[6]?` · 📝 ${escapeHtml(e[6])}`:''}</small></div><span class="tag">${e[3]>0?escapeHtml(formatWeight(e[3])):"BW"}</span></div>`).join("")}</div>`).join("")
}

function createNewPlan() {
    let name = prompt("Name für den neuen Plan:", "Mein neuer Plan");
    if(!name) return;
    let newPlan = { id: "p_"+Date.now(), name: name, days: emptyWeek(), archived: false };
    data.allPlans.push(newPlan);
    saveData();
    openPlanEditor(newPlan.id);
}

function openPlanEditor(id) {
    let p = data.allPlans.find(x => x.id === id);
    if(!p) return;
    editPlanCopy = JSON.parse(JSON.stringify(p));
    document.getElementById("editPlanName").value = editPlanCopy.name;
    document.getElementById("planEditModal").style.display = "flex";
    switchEditDay(0);
}

function closePlanEditor() {
    document.getElementById("planEditModal").style.display = "none";
    editPlanCopy = null;
}

function switchEditDay(index) {
    currentEditDayIndex = index;
    document.querySelectorAll(".edit-tab-btn").forEach((b, i) => {
        b.classList.toggle("active", i === index);
    });
    renderEditDay();
}

function renderEditDay() {
    let day = editPlanCopy.days[currentEditDayIndex];
    let html = `
        <label>Tages-Fokus (z.B. Brust, Regeneration)</label>
        <input class="input" value="${escapeHtml(day.focus)}" onchange="editPlanCopy.days[currentEditDayIndex].focus=this.value" style="margin-bottom:15px;">
        <label>Farbe des Tages</label>
        <select class="input" onchange="editPlanCopy.days[currentEditDayIndex].color=this.value" style="margin-bottom:15px;">
            <option value="red" ${day.color==='red'?'selected':''}>Rot (Kraft)</option>
            <option value="blue" ${day.color==='blue'?'selected':''}>Blau (Hypertrophie)</option>
            <option value="green" ${day.color==='green'?'selected':''}>Grün (Leicht/Ganzkörper)</option>
            <option value="yellow" ${day.color==='yellow'?'selected':''}>Gelb (Regeneration/Cardio)</option>
        </select>
        <label>Übungen & Cardio</label>
    `;
    
    if(day.ex.length === 0) {
        html += `<div class="sub">Keine Übungen für diesen Tag geplant.</div>`;
    } else {
        day.ex.forEach((ex, i) => {
            html += `
            <div class="edit-ex">
                <div class="edit-ex-drag">↕</div>
                <div style="flex-grow:1; display:grid; gap:5px;">
                    <input class="input" style="padding:6px; font-size:13px;" value="${escapeHtml(ex[0])}" placeholder="Name (z.B. Bankdrücken)" onchange="updateEditEx(${i},0,this.value)">
                    <div style="display:flex; gap:5px;">
                        <input class="input" style="padding:6px; font-size:12px; width:60px;" type="number" min="1" max="100" step="1" value="${escapeHtml(ex[1])}" placeholder="Sätze" onchange="updateEditEx(${i},1,this.value)">
                        <input class="input" style="padding:6px; font-size:12px;" value="${escapeHtml(ex[2])}" placeholder="Wdh. (z.B. 8-12 pro Seite)" onchange="updateEditEx(${i},2,this.value)">
                        <input class="input" style="padding:6px; font-size:12px; width:78px;" type="number" min="0" max="22046" step="0.5" value="${escapeHtml(toDisplayWeight(ex[3]))}" placeholder="${weightUnit()}" onchange="updateEditEx(${i},3,fromDisplayWeight(this.value))">
                    </div>
                    <textarea class="input exercise-note-input" placeholder="Eigene Notiz, z.B. Sitzposition oder Technikhinweis" onchange="updateEditEx(${i},6,this.value)">${escapeHtml(ex[6]||'')}</textarea>
                </div>
                <button class="icon" style="background:#3a1b1c; color:#ff7272;" onclick="removeEditEx(${i})">✕</button>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <button class="icon" style="padding:2px 6px; font-size:10px;" onclick="moveEditEx(${i}, -1)">▲</button>
                    <button class="icon" style="padding:2px 6px; font-size:10px;" onclick="moveEditEx(${i}, 1)">▼</button>
                </div>
            </div>`;
        });
    }
    document.getElementById("editDayContainer").innerHTML = html;
}

function updateEditEx(exIdx, fieldIdx, val) {
    if(fieldIdx === 1 || fieldIdx === 3) val = Number(val) || 0;
    editPlanCopy.days[currentEditDayIndex].ex[exIdx][fieldIdx] = val;
}
function removeEditEx(exIdx) {
    editPlanCopy.days[currentEditDayIndex].ex.splice(exIdx, 1);
    renderEditDay();
}
function moveEditEx(exIdx, dir) {
    let arr = editPlanCopy.days[currentEditDayIndex].ex;
    if(exIdx + dir < 0 || exIdx + dir >= arr.length) return;
    let temp = arr[exIdx];
    arr[exIdx] = arr[exIdx+dir];
    arr[exIdx+dir] = temp;
    renderEditDay();
}
function addExerciseToEdit() {
    editPlanCopy.days[currentEditDayIndex].ex.push(["Neue Übung/Cardio", 3, "10", 0, "", "", ""]);
    renderEditDay();
}
function savePlanEdit() {
    try{
        editPlanCopy.name = document.getElementById("editPlanName").value || "Mein Plan";
        const normalized=normalizePlanStructure(editPlanCopy,{id:editPlanCopy.id,archived:editPlanCopy.archived});
        let idx = data.allPlans.findIndex(p => p.id === editPlanCopy.id);
        if(idx > -1) data.allPlans[idx] = normalized;
        saveData();closePlanEditor();renderPlan();renderPlansList();renderHome();toast(I18n.translate("Plan erfolgreich aktualisiert! 💾"));
    }catch(error){toast(error.message||'Der Trainingsplan ist ungültig.');}
}

function renderPlansList() {
    let container = document.getElementById("plansContainer");
    const activePlans = data.allPlans.filter(p => !p.archived);
    let html = activePlans.map(p => `
        <div class="record" style="align-items:center; ${p.id === data.activePlanId ? 'background:#1a212d; border-radius:8px; padding-left:10px; border-left:3px solid var(--accent);' : ''}">
            <div>
                <b>${escapeHtml(p.name)}</b>
                <small style="display:block; color:var(--muted)">${p.days.reduce((acc, d)=>acc+(d.ex.length>0?1:0),0)} Trainingstage</small>
            </div>
            <div class="plan-actions">
                ${p.id !== data.activePlanId ? `<button class="btn secondary" onclick="activatePlan(${escapeHtml(JSON.stringify(p.id))})">Aktivieren</button>` : '<span class="tag">AKTIV</span>'}
                <button class="btn secondary plan-edit-action" onclick="openPlanEditor(${escapeHtml(JSON.stringify(p.id))})">✏️ Bearbeiten</button>
                <div class="plan-more" onclick="event.stopPropagation()"><button class="icon plan-more-trigger" type="button" aria-label="Weitere Planaktionen" aria-expanded="false" onclick="togglePlanMenu(this)">⋯</button><div class="plan-menu"><button type="button" onclick="closePlanMenus();ForgeSocial.openPublish(${escapeHtml(JSON.stringify(p.id))})"><span>🌐</span> Veröffentlichen</button><button type="button" onclick="closePlanMenus();duplicatePlan(${escapeHtml(JSON.stringify(p.id))})"><span>⎘</span> Kopieren</button>${p.id !== data.activePlanId ? `<button type="button" class="danger-option" onclick="closePlanMenus();deleteMyPlan(${escapeHtml(JSON.stringify(p.id))})"><span>🗑️</span> Löschen</button>` : ''}</div></div>
            </div>
        </div>
    `).join("");
    if (!activePlans.length) html += `<div class="sub" style="padding:15px 0;">Keine Pläne vorhanden.</div>`;
    container.innerHTML = html;
}

function closePlanMenus(){document.querySelectorAll('.plan-menu.open').forEach(menu=>{menu.classList.remove('open');menu.previousElementSibling?.setAttribute('aria-expanded','false');});}
function togglePlanMenu(button){const menu=button.nextElementSibling,open=!menu.classList.contains('open');closePlanMenus();menu.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));}
function duplicatePlan(id){
    const source=data.allPlans.find(plan=>plan.id===id);if(!source)return;
    const copy=normalizePlanStructure(JSON.parse(JSON.stringify(source)),{id:'p_copy_'+Date.now(),archived:false});copy.name=`${source.name} · Kopie`.slice(0,80);data.allPlans.push(copy);saveData();renderPlansList();toast('Plan kopiert.');
}
globalThis.document?.addEventListener?.('click',closePlanMenus);

function activatePlan(id) {
    data.activePlanId = id; saveData(); renderPlansList(); toast(I18n.translate("Plan aktiviert!"));
}

function deleteMyPlan(id) {
    if(data.allPlans.length <= 1) return toast("Du musst mindestens einen Plan behalten.");
    if(id === data.activePlanId) return toast("Der aktive Plan kann nicht gelöscht werden.");
    if(confirm("Diesen Plan wirklich dauerhaft löschen?")) {
        data.allPlans = data.allPlans.filter(p => p.id !== id);
        saveData();
        renderPlansList();
        toast(I18n.translate("Plan gelöscht 🗑️"));
    }
}

function switchPlanTab(tab) {
    document.getElementById("tabMyPlans").classList.remove("active");
    document.getElementById("tabPublished").classList.remove("active");
    document.getElementById("myPlansList").classList.add("hidden");
    document.getElementById("publishedPlansPanel").classList.add("hidden");
    
    if(tab === 'my') {
        document.getElementById("tabMyPlans").classList.add("active");
        document.getElementById("myPlansList").classList.remove("hidden");
    } else {
        document.getElementById("tabPublished").classList.add("active");
        document.getElementById("publishedPlansPanel").classList.remove("hidden");
        ForgeSocial.refreshPublishedPlans();
    }
}

function openKiModal() {
    document.getElementById("kiStep1").classList.remove("hidden");
    document.getElementById("kiStep2").classList.add("hidden");
    document.getElementById("kiModal").style.display = "flex";
}

function generateKiPrompt() {
    let q1 = document.getElementById("ki_q1").value || "Keine Angabe";
    let q2 = document.getElementById("ki_q2").value || "Keine Angabe";
    let q3 = document.getElementById("ki_q3").value || "Keine Angabe";
    let q4 = document.getElementById("ki_q4").value || "Keine Angabe";
    let q5 = document.getElementById("ki_q5").value || "Keine Angabe";
    let q6 = document.getElementById("ki_q6").value || "Keine Angabe";
    let q7 = document.getElementById("ki_q7").value || "Keine Angabe";
    let q8 = document.getElementById("ki_q8").value || "Keine Angabe";
    let q9 = document.getElementById("ki_q9").value || "Keine Angabe";
    let q10 = document.getElementById("ki_q10").value || "Keine Angabe";
    let q11 = document.getElementById("ki_q11").value || "Keine Angabe";
    let q12 = document.getElementById("ki_q12").value || "Keine Angabe";
    let q13 = document.getElementById("ki_q13").value || "Keine Angabe";
    let q14 = document.getElementById("ki_q14").value || "Keine Angabe";
    let q15 = document.getElementById("ki_q15").value || "Keine Angabe";

    let promptText = `Bitte erstelle mir einen maßgeschneiderten Trainingsplan. Hier sind meine Daten:
1. Grunddaten: ${q1}
2. Trainingsziele: ${q2}
3. Erfahrung: ${q3}
4. Equipment: ${q4}
5. Zeit & Häufigkeit: ${q5}
6. Max. Dauer pro Training: ${q6}
7. Bevorzugter Split: ${q7}
8. Einschränkungen/Verletzungen: ${q8}
9. Lieblingsübungen: ${q9}
10. Hassübungen: ${q10}
11. Fokus-Muskelgruppen: ${q11}
12. Cardio-Präferenzen: ${q12}
13. Alltag/Beruf: ${q13}
14. Schlaf/Regeneration: ${q14}
15. Ernährung: ${q15}

Gib mir ALS EINZIGE ANTWORT einen gültigen JSON-Code in genau folgendem Format zurück, den ich direkt in meine App importieren kann (kein Markdown, keine Erklärungen).
WICHTIG: Das "ex" Array jeder Übung MUSS ab sofort 6 Werte enthalten: [Name, Sätze, Wdh, Startgewicht (0 falls Körpergewicht), "Kurze Erklärung zur Ausführung", "Benötigtes Equipment"].

Beispiel Format:
{
  "name": "Dein KI Plan",
  "days": [
    { "id": "mo", "name": "Montag", "color": "red", "focus": "Brust/Trizeps", "warm": 0, "ex": [ ["Bankdrücken", 3, "8-12", 20, "Lege dich flach auf die Bank, greife die Hantel etwas breiter als schulterbreit und senke sie kontrolliert zur Brust ab. Dann kraftvoll hochdrücken.", "Langhantel, Hantelbank"], ["Liegestütze", 3, "Max", 0, "Hände schulterbreit aufstellen, Körper bildet eine gerade Linie. Brust bis kurz vor den Boden absenken und wieder hochdrücken.", "Kein Equipment"] ] },
    { "id": "di", "name": "Dienstag", "color": "blue", "focus": "Regeneration", "warm": 0, "ex": [] },
    { "id": "mi", "name": "Mittwoch", "color": "green", "focus": "Rücken/Bizeps", "warm": 0, "ex": [ ["Rudern vorgebeugt", 4, "10", 30, "Mit geradem Rücken nach vorne beugen, die Hantel Richtung Bauchnabel ziehen und Schulterblätter zusammenziehen.", "Langhantel"] ] },
    { "id": "do", "name": "Donnerstag", "color": "yellow", "focus": "Regeneration", "warm": 0, "ex": [] },
    { "id": "fr", "name": "Freitag", "color": "red", "focus": "Beine/Schultern", "warm": 0, "ex": [ ["Kniebeugen", 4, "10-12", 40, "Hantel auf dem Nacken ablegen, schulterbreiter Stand. Kontrolliert in die Hocke gehen, bis die Oberschenkel parallel zum Boden sind.", "Langhantel, Squat Rack"] ] },
    { "id": "sa", "name": "Samstag", "color": "blue", "focus": "Regeneration", "warm": 0, "ex": [] },
    { "id": "so", "name": "Sonntag", "color": "green", "focus": "Regeneration", "warm": 0, "ex": [] }
  ]
}
Stelle sicher, dass exakt 7 Tage (mo bis so) vorhanden sind. Wenn an einem Tag nicht trainiert wird, lasse das "ex" Array leer.`;

    document.getElementById("kiPromptOut").value = promptText;
    document.getElementById("kiStep1").classList.add("hidden");
    document.getElementById("kiStep2").classList.remove("hidden");
}

function copyKiPrompt() {
    let copyText = document.getElementById("kiPromptOut");
    copyText.select();
    document.execCommand("copy");
    toast("Prompt kopiert! 📋");
}

function saveKiPlan() {
    try {
        let jsonText = document.getElementById("kiJsonIn").value.trim();
        // Fallback falls KI Markdown mitsendet
        if(jsonText.startsWith("```json")) jsonText = jsonText.substring(7);
        if(jsonText.endsWith("```")) jsonText = jsonText.substring(0, jsonText.length - 3);

        let parsed = JSON.parse(jsonText);
        parsed=normalizePlanStructure(parsed,{id:"p_"+Date.now(),archived:false});
        data.allPlans.push(parsed);
        saveData();
        
        document.getElementById("kiModal").style.display = "none";
        renderPlansList();
        toast(I18n.translate("KI Plan erfolgreich importiert! 🎉"));
    } catch(e) {
        toast(e?.message||"Fehler: JSON ungültig! Stelle sicher, dass nur der Code eingefügt wurde.");
    }
}
