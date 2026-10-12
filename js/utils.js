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
  de:{label:'FORGE v1.7.0 <span>· Was ist neu?</span>',title:'FORGE · Version 1.7.0',updates:[
    ['v1.7.0 · Heute','Schneller erfassen, ruhiger steigern','Frei wählbare Minimum-/Maximum-Tasten schließen einen Satz sofort ab. Die neue doppelte Progression steigert erst Wiederholungen oder Zeit und danach kontrolliert das Gewicht.'],
    ['v1.6.0 · Heute','Training verlässlicher','Zeitübungen tragen ihr Ergebnis automatisch ein. Rückgängig, XP-Anzeige, Planprüfung, Statistiken, Rangliste und App-Aktualisierungen wurden korrigiert.'],
    ['v1.5.2 · Heute','Anmeldung repariert','Das Benutzername-Feld ist nur noch bei der Registrierung verpflichtend und blockiert die Anmeldung nicht mehr.'],
    ['v1.5.0 · Heute','Mehr Kontrolle im Training','Rückgängig ist während der Pause verfügbar. Seitenübungen sind klar als „pro Seite“ beschriftet und Zeitübungen haben einen einstellbaren Timer. Das Gewicht bleibt innerhalb einer Einheit gleich; +1 kg wird erst nach zwei stabilen Einheiten optional empfohlen.'],
    ['v1.4.0 · Heute','Automatische Gewichtssteigerung','Das vorgeschlagene Gewicht wird direkt eingesetzt und kann sich zwischen den Sätzen erhöhen.'],
    ['v1.3.0','Neues FORGE-Design','Eine ruhigere, klarere Oberfläche mit dem vertrauten dunklen Look und Orange.'],
    ['v1.2.0','Mehr Training für dich','Freie Aktivitäten inklusive Tennis, Kalorien-Schätzung, persönliche Rekorde und eigene Vorlagen.']
  ]},
  en:{label:'FORGE v1.7.0 <span>· What’s new?</span>',title:'FORGE · Version 1.7.0',updates:[
    ['v1.7.0 · Today','Faster logging, steadier progress','Custom minimum and maximum keys complete a set immediately. Double progression now increases reps or time first, then raises weight in a controlled step.'],
    ['v1.6.0 · Today','More reliable workouts','Timed exercises now enter their result automatically. Undo, XP display, plan validation, statistics, leaderboard and app updates were corrected.'],
    ['v1.5.2 · Today','Login fixed','The username field is now only required for registration and no longer blocks sign-in.'],
    ['v1.5.0 · Today','More training control','Undo is available during rests. Side exercises clearly say “per side” and timed exercises have an adjustable timer. Weight stays unchanged during a workout; an optional +1 kg is only suggested after two stable sessions.'],
    ['v1.4.0 · Today','Automatic weight progression','Suggested weight is applied directly and can increase between sets.'],
    ['v1.3.0','New FORGE design','A calmer, clearer interface with the familiar dark look and orange accent.'],
    ['v1.2.0','More ways to train','Free activities including tennis, calorie estimates, personal records and your own templates.']
  ]},
  el:{label:'FORGE v1.7.0 <span>· Τι νέο υπάρχει;</span>',title:'FORGE · Έκδοση 1.7.0',updates:[
    ['v1.7.0 · Σήμερα','Ταχύτερη καταγραφή, σταθερή πρόοδος','Προσαρμόσιμα πλήκτρα ελάχιστου και μέγιστου ολοκληρώνουν αμέσως το σετ. Η διπλή πρόοδος αυξάνει πρώτα επαναλήψεις ή χρόνο και μετά ελεγχόμενα το βάρος.'],
    ['v1.6.0 · Σήμερα','Πιο αξιόπιστες προπονήσεις','Οι ασκήσεις χρόνου καταχωρίζουν αυτόματα το αποτέλεσμα. Διορθώθηκαν η αναίρεση, τα XP, ο έλεγχος πλάνων, τα στατιστικά, η κατάταξη και οι ενημερώσεις.'],
    ['v1.5.2 · Σήμερα','Διορθώθηκε η σύνδεση','Το όνομα χρήστη απαιτείται πλέον μόνο κατά την εγγραφή και δεν εμποδίζει τη σύνδεση.'],
    ['v1.5.0 · Σήμερα','Περισσότερος έλεγχος στην προπόνηση','Η αναίρεση είναι διαθέσιμη στα διαλείμματα. Οι ασκήσεις ανά πλευρά έχουν σαφή ένδειξη και οι χρονισμένες ασκήσεις διαθέτουν ρυθμιζόμενο χρονόμετρο. Το βάρος δεν αλλάζει μέσα στην προπόνηση και η προαιρετική αύξηση +1 kg προτείνεται μόνο μετά από δύο σταθερές συνεδρίες.'],
    ['v1.4.0 · Σήμερα','Αυτόματη αύξηση βάρους','Το προτεινόμενο βάρος εφαρμόζεται απευθείας και μπορεί να αυξάνεται ανάμεσα στα σετ.'],
    ['v1.3.0','Νέο design FORGE','Μια πιο ήρεμη και καθαρή εμφάνιση με το γνώριμο σκούρο ύφος και πορτοκαλί.'],
    ['v1.2.0','Περισσότεροι τρόποι προπόνησης','Ελεύθερες δραστηριότητες με τένις, εκτίμηση θερμίδων, προσωπικά ρεκόρ και δικά σου πρότυπα.']
  ]}
};
function releaseNotesLocale(){const language=window.ForgeI18n?.language?.();return releaseNotes[language]||releaseNotes.de;}
function updateReleaseNotesLabel(){const button=document.querySelector('.app-version');if(button)button.innerHTML=releaseNotesLocale().label;}
function openReleaseNotes(){const notes=releaseNotesLocale();const items=notes.updates.map(([version,title,text])=>`<article class="release-note"><div class="release-note-version">${version}</div><b>${title}</b><p>${text}</p></article>`).join('');showInfoModal(notes.title,`<div class="release-notes">${items}</div>`);}
window.addEventListener('forge-language-change',updateReleaseNotesLabel);setTimeout(updateReleaseNotesLabel,0);
function weightUnit(){return data.settings.unit==='lb'?'lb':'kg'}
function toDisplayWeight(kg){return data.settings.unit==='lb'?Math.round(Number(kg||0)*2.2046226218*10)/10:Number(kg||0)}
function fromDisplayWeight(value){return data.settings.unit==='lb'?Math.round(Number(value||0)/2.2046226218*100)/100:Number(value||0)}
function formatWeight(kg){return `${toDisplayWeight(kg)} ${weightUnit()}`}
function weekStart(date=new Date()){const d=new Date(date);d.setHours(0,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d}
function weeklyWorkoutCount(){const start=weekStart().getTime();return data.logs.filter(l=>new Date(l.date).getTime()>=start).length}
