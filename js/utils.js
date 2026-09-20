async function saveData() { await ForgeCloud.save(data); }
async function requestWakeLock(){ try{if('wakeLock' in navigator){wakeLock=await navigator.wakeLock.request('screen');}}catch(e){} }
function releaseWakeLock(){ if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;} }
const todayIndex=()=>{let d=new Date().getDay();return d===0?6:d-1};
const today=()=>{ return JSON.parse(JSON.stringify(getActiveDays()[todayIndex()])); };
function fmt(sec){sec=Math.max(0,Math.round(sec));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function toast(t){let e=document.getElementById("toast");e.textContent=t;e.style.display="block";setTimeout(()=>e.style.display="none",3000)}
function escapeHtml(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showInfoModal(title, text){ document.getElementById('infoTitle').textContent=title; document.getElementById('infoText').innerHTML=text; document.getElementById('infoModal').style.display='flex'; }
function weightUnit(){return data.settings.unit==='lb'?'lb':'kg'}
function toDisplayWeight(kg){return data.settings.unit==='lb'?Math.round(Number(kg||0)*2.2046226218*10)/10:Number(kg||0)}
function fromDisplayWeight(value){return data.settings.unit==='lb'?Math.round(Number(value||0)/2.2046226218*100)/100:Number(value||0)}
function formatWeight(kg){return `${toDisplayWeight(kg)} ${weightUnit()}`}
function weekStart(date=new Date()){const d=new Date(date);d.setHours(0,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d}
function weeklyWorkoutCount(){const start=weekStart().getTime();return data.logs.filter(l=>new Date(l.date).getTime()>=start).length}
