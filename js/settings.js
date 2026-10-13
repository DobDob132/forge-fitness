let settingsDirty=false,settingsActiveTab='general';
function openSettings(){
  document.getElementById("pauseSetting").value=data.settings.pause;
  document.getElementById("customPauses").value=data.settings.customPauses || "30, 60, 90, 120";
  document.getElementById("warmupSetting").value=data.settings.warmup || "nein";
  document.getElementById("warmupType").value=data.settings.warmupType || "Rudern";
  document.getElementById("wakeLockSetting").checked=data.settings.keepAwake!==false;
  document.getElementById("vibrationSetting").checked=data.settings.vibration!==false;
  document.getElementById("soundSetting").checked=data.settings.pauseSound===true;
  document.getElementById("vibrationPatternSetting").value=data.settings.vibrationPattern||'strong';
  document.getElementById("fallbackSoundSetting").checked=data.settings.vibrationFallbackSound!==false;
  document.getElementById("visualPauseAlertSetting").checked=data.settings.visualPauseAlert!==false;
  document.getElementById("unitSetting").value=data.settings.unit==='lb'?'lb':'kg';
  document.getElementById("weeklyGoalSetting").value=Math.max(1,Math.min(14,Number(data.settings.weeklyGoal)||3));
  document.getElementById("shortcutMinSetting").value=normalizeShortcutKey(data.settings.shortcutMin,'d').toUpperCase();
  document.getElementById("shortcutMaxSetting").value=normalizeShortcutKey(data.settings.shortcutMax,'f').toUpperCase();
  document.getElementById("progressionWeightStep").value=Math.max(.5,Number(data.settings.progressionWeightStep)||1);
  document.getElementById("progressionRepStep").value=Math.max(1,Number(data.settings.progressionRepStep)||1);
  document.getElementById("progressionSecondsStep").value=Math.max(1,Number(data.settings.progressionSecondsStep)||5);
  const profile=calorieProfile();document.getElementById('calorieAge').value=profile.age;document.getElementById('calorieHeight').value=profile.height;document.getElementById('calorieWeight').value=profile.weight;document.getElementById('calorieSex').value=profile.sex;document.getElementById('strengthIntensity').value=data.settings.strengthIntensity||'moderate';document.getElementById('pauseTestStatus').textContent='';
  document.getElementById("languageSetting").value=data.settings.language || 'de';
  document.getElementById("warmupTypeSetting").style.display = (data.settings.warmup === "ja") ? "block" : "none";
  document.getElementById('settingsSearch').value='';toggleSettingsSearch(false);settingsDirty=false;renderSettingsDirty();openSettingsTab('general',true);renderSignalDiagnostics();
  document.getElementById("settingsModal").style.display="flex";
}
function closeSettings(){if(settingsDirty&&!confirm('Es gibt noch nicht gespeicherte Änderungen. Einstellungen trotzdem schließen?'))return;document.getElementById("settingsModal").style.display="none";}
function renderSettingsDirty(){document.getElementById('settingsUnsaved')?.classList.toggle('hidden',!settingsDirty);const hint=document.getElementById('settingsSaveHint');if(hint)hint.textContent=settingsDirty?'Änderungen noch nicht gespeichert':'Alle Änderungen gespeichert';}
function markSettingsDirty(){settingsDirty=true;renderSettingsDirty();}
function toggleSettingsSearch(force){
  const wrap=document.getElementById('settingsSearchWrap'),toggle=document.getElementById('settingsSearchToggle'),input=document.getElementById('settingsSearch');if(!wrap)return;
  const open=force===undefined?wrap.classList.contains('hidden'):force;
  wrap.classList.toggle('hidden',!open);toggle?.setAttribute('aria-expanded',String(open));
  if(open)setTimeout(()=>input?.focus(),0);else{if(input)input.value='';searchSettings('');}
}
function openSettingsTab(name,silent=false){
  if(!silent&&settingsDirty&&name!==settingsActiveTab)toast('Änderungen noch nicht gespeichert');
  settingsActiveTab=name;document.querySelectorAll('[data-settings-tab]').forEach(button=>button.classList.toggle('active',button.dataset.settingsTab===name));
  document.querySelectorAll('[data-settings-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.settingsPanel!==name));
  const content=document.getElementById('settingsContent');if(content)content.scrollTop=0;
  const search=document.getElementById('settingsSearch');if(search&&search.value)search.value='';
  if(name==='signals')renderSignalDiagnostics();
}
function searchSettings(value){
  const query=String(value||'').trim().toLocaleLowerCase();
  document.querySelectorAll('[data-settings-tab]').forEach(button=>button.classList.toggle('searching',!!query));
  if(!query){openSettingsTab(settingsActiveTab,true);return;}
  document.querySelectorAll('[data-settings-panel]').forEach(panel=>panel.classList.toggle('hidden',!panel.textContent.toLocaleLowerCase().includes(query)));
}
function renderSignalDiagnostics(){
  const container=document.getElementById('signalDiagnostics');if(!container)return;
  const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/.test(ua),vibration=typeof navigator.vibrate==='function',audio=!!(window.AudioContext||window.webkitAudioContext),wake=!!navigator.wakeLock,standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  const items=[['Vibration',vibration&&!ios,ios?'Auf iPhone/iPad nicht verfügbar':vibration?'Verfügbar':'Nicht verfügbar'],['Signalton',audio,audio?'Verfügbar':'Nicht verfügbar'],['Display aktiv halten',wake,wake?'Verfügbar':'Nicht verfügbar'],['Installierter App-Modus',standalone,standalone?'Aktiv':'Im Browser geöffnet']];
  container.innerHTML=`<div class="setting-group-title">Geräte-Diagnose</div>${items.map(([name,ok,detail])=>`<div class="diagnostic-row"><span class="diagnostic-dot ${ok?'ok':'warn'}"></span><b>${name}</b><small>${detail}</small></div>`).join('')}${ios?'<p class="diagnostic-warning">iOS stellt Webseiten keine normale Vibrationsfunktion bereit. FORGE nutzt deshalb den visuellen Hinweis und auf Wunsch den Signalton.</p>':'<p class="account-note">Lautlos- oder Nicht-stören-Modus und Systemeinstellungen können Vibration trotz Browser-Unterstützung blockieren.</p>'}`;
}
function saveSettings(){
  const shortcutMin=normalizeShortcutKey(document.getElementById("shortcutMinSetting").value,'d'),shortcutMax=normalizeShortcutKey(document.getElementById("shortcutMaxSetting").value,'f');
  if(shortcutMin===shortcutMax){toast("Bitte zwei unterschiedliche Buchstaben wählen");return;}
  data.settings.pause=+document.getElementById("pauseSetting").value;
  data.settings.customPauses=document.getElementById("customPauses").value;
  data.settings.warmup=document.getElementById("warmupSetting").value;
  data.settings.warmupType=document.getElementById("warmupType").value;
  data.settings.keepAwake=document.getElementById("wakeLockSetting").checked;
  data.settings.vibration=document.getElementById("vibrationSetting").checked;
  data.settings.pauseSound=document.getElementById("soundSetting").checked;
  data.settings.vibrationPattern=document.getElementById("vibrationPatternSetting").value;
  data.settings.vibrationFallbackSound=document.getElementById("fallbackSoundSetting").checked;
  data.settings.visualPauseAlert=document.getElementById("visualPauseAlertSetting").checked;
  data.settings.unit=document.getElementById("unitSetting").value;
  data.settings.weeklyGoal=Math.max(1,Math.min(14,+document.getElementById("weeklyGoalSetting").value||3));
  data.settings.shortcutMin=shortcutMin;
  data.settings.shortcutMax=shortcutMax;
  data.settings.progressionWeightStep=Math.max(.5,Math.min(20,+document.getElementById("progressionWeightStep").value||1));
  data.settings.progressionRepStep=Math.max(1,Math.min(10,Math.round(+document.getElementById("progressionRepStep").value||1)));
  data.settings.progressionSecondsStep=Math.max(1,Math.min(60,Math.round(+document.getElementById("progressionSecondsStep").value||5)));
  data.settings.calorieProfile={age:Math.max(13,Math.min(100,+document.getElementById('calorieAge').value||30)),height:Math.max(120,Math.min(230,+document.getElementById('calorieHeight').value||175)),weight:Math.max(25,Math.min(350,+document.getElementById('calorieWeight').value||70)),sex:document.getElementById('calorieSex').value};
  data.settings.strengthIntensity=document.getElementById('strengthIntensity').value;
  data.settings.language=document.getElementById("languageSetting").value;
  I18n.setLanguage(data.settings.language);
  settingsDirty=false;renderSettingsDirty();saveData(); document.getElementById("settingsModal").style.display="none"; toast("Einstellungen gespeichert");
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
document.getElementById('settingsModal')?.addEventListener('input',event=>{if(event.target.matches('input:not(#settingsSearch),select,textarea'))markSettingsDirty();});
document.getElementById('settingsModal')?.addEventListener('change',event=>{if(event.target.matches('input:not(#settingsSearch),select,textarea'))markSettingsDirty();});
