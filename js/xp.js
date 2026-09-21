function addXP(amount, reason) {
    if(amount <= 0) return;
    data.xp += amount;
    data.xpHistory.unshift({date: new Date().toISOString(), reason, amount});
    if(data.xpHistory.length > 100) data.xpHistory.pop();
    
    // Check Level Up
    let newLevel = Math.floor(Math.pow(data.xp / 100, 0.5)) + 1;
    if(newLevel > data.level) {
        data.level = newLevel;
        toast(I18n.translate(`🎉 LEVEL UP! Du bist jetzt Level ${newLevel}!`));
    }
    saveData();
}

function renderXP() {
    document.getElementById("levelBadge").textContent = data.level;
    document.getElementById("levelText").textContent = data.level;
    document.getElementById("xpText").textContent = Math.round(data.xp);
    let nextXp = Math.pow(data.level, 2) * 100;
    let prevXp = Math.pow(data.level - 1, 2) * 100;
    document.getElementById("nextXpText").textContent = nextXp;
    
    let progress = ((data.xp - prevXp) / (nextXp - prevXp)) * 100;
    document.getElementById("xpBarFill").style.width = Math.min(100, Math.max(0, progress)) + "%";
}

function checkMilestones() {
    let vol = data.logs.reduce((sum, log) => sum + (log.entries||[]).reduce((s, e) => s + ((e.weight||0) * (e.reps||0)), 0), 0);
    let stats = {
        workouts: data.logs.length,
        streak: streak(),
        sets: data.logs.reduce((a, l) => a + (l.sets || 0), 0),
        volume: vol,
        body: data.bodyData.length
    };
    
    let earned = false;
    MILESTONES.forEach(m => {
        if (!data.claimedMilestones.includes(m.id)) {
            let current = stats[m.type] || 0;
            if (current >= m.req) {
                data.claimedMilestones.push(m.id);
                addXP(m.xp, `Meilenstein: ${m.title}`);
                toast(`${I18n.translate('🏆 Meilenstein erreicht:')} ${I18n.translate(m.title)}!`);
                earned = true;
            }
        }
    });
    if(earned) saveData();
}

function renderTrophies() {
    let vol = data.logs.reduce((sum, log) => sum + (log.entries||[]).reduce((s, e) => s + ((e.weight||0) * (e.reps||0)), 0), 0);
    let stats = { workouts: data.logs.length, streak: streak(), sets: data.logs.reduce((a, l) => a + (l.sets || 0), 0), volume: vol, body: data.bodyData.length };
    
    let html = "";
    MILESTONES.forEach(m => {
        let unlocked = data.claimedMilestones.includes(m.id);
        let current = Math.min(m.req, stats[m.type] || 0);
        let perc = (current / m.req) * 100;
        
        html += `
        <div class="ms-card ${unlocked ? 'unlocked' : ''}">
            <div class="ms-icon">${unlocked ? '🏆' : '🔒'}</div>
            <div class="ms-info">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div class="ms-title">${escapeHtml(I18n.translate(m.title))}</div>
                    <div class="ms-reward">+${m.xp} XP</div>
                </div>
                <div class="ms-desc">${escapeHtml(I18n.translate(m.desc))}</div>
                <div class="ms-progress-bg"><div class="ms-progress-fill" style="width:${perc}%"></div></div>
                <div style="font-size:10px; color:var(--muted); text-align:right; margin-top:3px;">${Math.round(current)} / ${m.req}</div>
            </div>
        </div>`;
    });
    document.getElementById("milestonesList").innerHTML = html;
    
    let histHtml = data.xpHistory.map(h => {
        let d = new Date(h.date).toLocaleDateString(I18n.locale(), {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"});
        return `<div class="record"><div><b>${escapeHtml(I18n.translate(h.reason))}</b><small style="display:block; color:var(--muted)">${d}</small></div><span class="tag" style="color:var(--gold); font-weight:bold;">+${escapeHtml(h.amount)}</span></div>`;
    }).join("");
    if(!histHtml) histHtml = `<div class='sub'>${I18n.translate('Noch keine XP gesammelt.')}</div>`;
    document.getElementById("xpHistoryList").innerHTML = histHtml;
}
