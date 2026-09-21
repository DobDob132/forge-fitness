let selectedActivity='running';
const activityLabels={running:'Joggen',walking:'Gehen',cycling:'Radfahren',hiking:'Wandern',swimming:'Schwimmen',rowing:'Rudern',other:'Freies Training'};
function activityValues(){const raw=Number(document.getElementById('activityMinutes').value),minutes=Number.isFinite(raw)&&raw>=1&&raw<=1440?raw:0,distance=Math.max(0,Number(document.getElementById('activityDistance').value)||0),intensity=document.getElementById('activityIntensity').value,profile=calorieProfile();return {minutes,distance,intensity,profile,calories:estimateCalories({activity:selectedActivity,intensity,minutes,profile})};}
function updateActivityCalories(){
  const values=activityValues();document.getElementById('activityCalories').textContent=`${values.calories} kcal`;
  document.getElementById('activityProfileHint').textContent=`${I18n.translate('Berechnet mit')} ${values.profile.weight} kg, ${values.profile.age} ${I18n.translate('Jahren und')} ${values.profile.height} cm.`;
}
function openActivityModal(){
  document.getElementById('activityMinutes').value=30;document.getElementById('activityDistance').value='';document.getElementById('activityNote').value='';document.getElementById('activityModal').style.display='flex';updateActivityCalories();
}
function closeActivityModal(){document.getElementById('activityModal').style.display='none';}
async function saveFreeActivity(){
  const {minutes,distance,intensity,calories}=activityValues(),name=activityLabels[selectedActivity],note=document.getElementById('activityNote').value.trim();
  if(!minutes){toast(I18n.translate('Bitte gib eine Dauer ein.'));return;}
  const detail=distance?`${distance.toLocaleString(I18n.locale())} km`:I18n.translate(intensity==='light'?'Locker':intensity==='intense'?'Intensiv':'Mittel');
  data.logs.push({date:new Date().toISOString(),type:'activity',activity:selectedActivity,plan:name,focus:I18n.translate('Freies Training'),sets:0,minutes,calories,distance,note,entries:[{name,weight:0,reps:detail,calories}]});
  addXP(50,'Training beendet!');await saveData();ForgeSocial.syncProgress();checkMilestones();closeActivityModal();renderHome();toast(I18n.translate('Freies Training gespeichert.'));
}
document.querySelectorAll('#activityTypes button').forEach(button=>button.addEventListener('click',()=>{selectedActivity=button.dataset.activity;document.querySelectorAll('#activityTypes button').forEach(item=>item.classList.toggle('active',item===button));updateActivityCalories();}));
for(const id of ['activityMinutes','activityDistance','activityIntensity'])document.getElementById(id).addEventListener('input',updateActivityCalories);
window.addEventListener('forge-language-change',()=>{if(document.getElementById('activityModal').style.display==='flex')updateActivityCalories();});
