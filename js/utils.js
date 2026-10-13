async function saveData() { await ForgeCloud.save(data); }
async function requestWakeLock(){
  try{
    if('wakeLock' in navigator&&!document.hidden&&(!wakeLock||wakeLock.released)){
      const sentinel=await navigator.wakeLock.request('screen');wakeLock=sentinel;
      sentinel.addEventListener?.('release',()=>{if(wakeLock===sentinel)wakeLock=null;});
    }
  }catch(e){}
}
function releaseWakeLock(){ if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;} }
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state?.day&&data?.settings?.keepAwake!==false)requestWakeLock();});
const todayIndex=()=>{let d=new Date().getDay();return d===0?6:d-1};
const today=()=>{ return JSON.parse(JSON.stringify(getActiveDays()[todayIndex()])); };
function fmt(sec){sec=Math.max(0,Math.round(sec));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function toast(t){let e=document.getElementById("toast");e.textContent=t;e.style.display="block";setTimeout(()=>e.style.display="none",3000)}
function escapeHtml(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function normalizeShortcutKey(value,fallback){const key=String(value||'').trim().toLowerCase();return /^[a-z]$/.test(key)?key:fallback;}
function showInfoModal(title, text){ document.getElementById('infoTitle').textContent=title; document.getElementById('infoText').innerHTML=text; document.getElementById('infoModal').style.display='flex'; }
const releaseNotes={
  de:{label:'FORGE 1.10.0 · Updateinfos',title:'FORGE · Version 1.10.0',updates:[
    ['v1.10.0 · 13.10.2026','Natürlichere Bedienung','Filter, Diagrammauswahl, Einstellungssuche und Planaktionen sind jetzt kompakter und arbeiten mit vertrauten Symbolen, Auswahlchips und Menüs. Updateinfos öffnen immer sichtbar im Vordergrund.'],
    ['v1.9.0 · 13.10.2026','Einfacher trainieren und schneller finden','Direkte Zeitbestätigung, sichtbarer Satzfortschritt in Pausen sowie eine nach Jahren und Monaten gegliederte Trainingshistorie.'],
    ['v1.8.2','Fehlerbehebungen','Kleinere Fehlerbehebungen und Verbesserungen.']
  ]},
  en:{label:'FORGE 1.10.0 · Update info',title:'FORGE · Version 1.10.0',updates:[
    ['v1.10.0 · 13 Oct 2026','More natural controls','Filters, chart choices, settings search and plan actions now use familiar icons, chips and compact menus. Update information always opens visibly in front.'],
    ['v1.9.0 · 13 Oct 2026','Simpler workouts and clearer history','Direct time confirmation, visible set progress during rests and workout history grouped by year and month.'],
    ['v1.8.2','Bug fixes','Minor bug fixes and improvements.']
  ]},
  el:{label:'FORGE 1.10.0 · Πληροφορίες ενημέρωσης',title:'FORGE · Έκδοση 1.10.0',updates:[
    ['v1.10.0 · 13.10.2026','Πιο φυσικά στοιχεία ελέγχου','Τα φίλτρα, τα γραφήματα, η αναζήτηση ρυθμίσεων και οι ενέργειες πλάνων χρησιμοποιούν πλέον γνώριμα εικονίδια και μενού. Οι πληροφορίες ενημέρωσης εμφανίζονται πάντα μπροστά.'],
    ['v1.9.0 · 13.10.2026','Πιο απλή προπόνηση και πιο καθαρό ιστορικό','Άμεση επιβεβαίωση χρόνου, ορατή πρόοδος στα διαλείμματα και ομαδοποιημένο ιστορικό.'],
    ['v1.8.2','Διορθώσεις σφαλμάτων','Μικρές διορθώσεις και βελτιώσεις.']
  ]}
};
function releaseNotesLocale(){const language=window.ForgeI18n?.language?.();return releaseNotes[language]||releaseNotes.de;}
function updateReleaseNotesLabel(){const button=document.querySelector('.settings-version-badge');if(button)button.textContent=releaseNotesLocale().label;const version=document.querySelector('.version-card strong');if(version)version.textContent='FORGE 1.10.0';}
function openReleaseNotes(){const notes=releaseNotesLocale();const items=notes.updates.map(([version,title,text])=>`<article class="release-note"><div class="release-note-version">${version}</div><b>${title}</b><p>${text}</p></article>`).join('');showInfoModal(notes.title,`<div class="release-notes">${items}</div>`);}
window.addEventListener('forge-language-change',updateReleaseNotesLabel);setTimeout(updateReleaseNotesLabel,0);
function weightUnit(){return data.settings.unit==='lb'?'lb':'kg'}
function toDisplayWeight(kg){return data.settings.unit==='lb'?Math.round(Number(kg||0)*2.2046226218*10)/10:Number(kg||0)}
function fromDisplayWeight(value){return data.settings.unit==='lb'?Math.round(Number(value||0)/2.2046226218*100)/100:Number(value||0)}
function formatWeight(kg){return `${toDisplayWeight(kg)} ${weightUnit()}`}
function weekStart(date=new Date()){const d=new Date(date);d.setHours(0,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d}
function weeklyWorkoutCount(){const start=weekStart().getTime();return data.logs.filter(l=>new Date(l.date).getTime()>=start).length}
