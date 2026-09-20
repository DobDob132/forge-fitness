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
    document.getElementById("previewModalBody").innerHTML = html;
    document.getElementById("previewModal").style.display = "flex";
}

