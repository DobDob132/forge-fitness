function openSettings(){
  document.getElementById("pauseSetting").value=data.settings.pause;
  document.getElementById("customPauses").value=data.settings.customPauses || "30, 60, 90, 120";
  document.getElementById("warmupSetting").value=data.settings.warmup || "nein";
  document.getElementById("warmupType").value=data.settings.warmupType || "Rudern";
  document.getElementById("wakeLockSetting").checked=data.settings.keepAwake!==false;
  document.getElementById("vibrationSetting").checked=data.settings.vibration!==false;
  document.getElementById("soundSetting").checked=data.settings.pauseSound===true;
  document.getElementById("unitSetting").value=data.settings.unit==='lb'?'lb':'kg';
  document.getElementById("weeklyGoalSetting").value=Math.max(1,Math.min(14,Number(data.settings.weeklyGoal)||3));
  const profile=calorieProfile();document.getElementById('calorieAge').value=profile.age;document.getElementById('calorieHeight').value=profile.height;document.getElementById('calorieWeight').value=profile.weight;document.getElementById('calorieSex').value=profile.sex;document.getElementById('strengthIntensity').value=data.settings.strengthIntensity||'moderate';document.getElementById('pauseTestStatus').textContent='';
  document.getElementById("languageSetting").value=data.settings.language || 'de';
  document.getElementById("warmupTypeSetting").style.display = (data.settings.warmup === "ja") ? "block" : "none";
  document.getElementById("settingsModal").style.display="flex";
}
function closeSettings(){document.getElementById("settingsModal").style.display="none"}
function saveSettings(){
  data.settings.pause=+document.getElementById("pauseSetting").value;
  data.settings.customPauses=document.getElementById("customPauses").value;
  data.settings.warmup=document.getElementById("warmupSetting").value;
  data.settings.warmupType=document.getElementById("warmupType").value;
  data.settings.keepAwake=document.getElementById("wakeLockSetting").checked;
  data.settings.vibration=document.getElementById("vibrationSetting").checked;
  data.settings.pauseSound=document.getElementById("soundSetting").checked;
  data.settings.unit=document.getElementById("unitSetting").value;
  data.settings.weeklyGoal=Math.max(1,Math.min(14,+document.getElementById("weeklyGoalSetting").value||3));
  data.settings.calorieProfile={age:Math.max(13,Math.min(100,+document.getElementById('calorieAge').value||30)),height:Math.max(120,Math.min(230,+document.getElementById('calorieHeight').value||175)),weight:Math.max(25,Math.min(350,+document.getElementById('calorieWeight').value||70)),sex:document.getElementById('calorieSex').value};
  data.settings.strengthIntensity=document.getElementById('strengthIntensity').value;
  data.settings.language=document.getElementById("languageSetting").value;
  I18n.setLanguage(data.settings.language);
  saveData(); closeSettings(); toast("Einstellungen gespeichert");
}
function exportData(){
  let b=new Blob([JSON.stringify(data)],{type:"application/json"});
  let a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="forge_backup.json";a.click();
}
function importData(){
  let i=document.createElement('input');i.type='file';i.accept='.json';
  i.onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>5*1024*1024)throw Error('Die Sicherung darf höchstens 5 MB groß sein.');
      const payload=JSON.parse(await file.text());
      ForgeCloud.normalize(payload);
      if(confirm('Diese Sicherung übernehmen und den aktuellen Trainingsstand ersetzen? Eine lokale Sicherung wird angelegt.')){await ForgeCloud.importPayload(payload);toast('Sicherung übernommen.');}
    }catch(error){toast(error.message || 'Fehler beim Import');}
  };i.click();
}
function resetData(){ForgeCloud.reset().catch(error=>toast(error.message));}
