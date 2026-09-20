function previewCommunityPlan(idx) {
    let p = comPlansData[idx];
    let html = `<div class="sub" style="margin-bottom:15px;">${p.name} - Vorschau</div>`;
    p.days.forEach(d => {
        if(d.ex.length > 0) {
            html += `<div style="background:#11151d; padding:12px; border-radius:10px; margin-bottom:10px; border:1px solid var(--line);">
                <b style="color:var(--accent2);">${d.name}</b> <span style="font-size:12px;">(${d.focus})</span><br><div style="color:var(--muted); font-size:13px; margin-top:5px; padding-left:5px;">`;
            d.ex.forEach(e => html += `• ${e[0]} <span style="opacity:0.7">(${e[1]} Sätze, Ziel: ${e[2]})</span><br>`);
            html += `</div></div>`;
        }
    });
    html += `<button class="btn" style="width:100%;margin-top:8px" onclick="useCommunityPlan(${idx})">DIESEN PLAN AUSWÄHLEN</button>`;
    document.getElementById("previewModalBody").innerHTML = html;
    document.getElementById("previewModal").style.display = "flex";
}

function useCommunityPlan(idx) {
    const source = comPlansData[idx];
    if(!source || !Array.isArray(source.days) || source.days.length !== 7) return toast("Dieser Plan ist leider ungültig.");
    const template = emptyWeek();
    const copy = {
        id: `p_community_${Date.now()}_${idx}`,
        name: source.name,
        archived: false,
        days: source.days.map((day, dayIndex) => ({
            ...template[dayIndex],
            focus: day.focus || template[dayIndex].focus,
            ex: JSON.parse(JSON.stringify(day.ex || []))
        }))
    };
    data.allPlans.push(copy);
    data.activePlanId = copy.id;
    saveData();
    document.getElementById("previewModal").style.display = "none";
    switchPlanTab('my');
    renderPlansList();
    renderPlan();
    renderHome();
    toast(`${copy.name} ist jetzt dein aktiver Plan.`);
}
