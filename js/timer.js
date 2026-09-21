let pauseAudioContext=null;
function preparePauseSignals(){
  try{const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return false;pauseAudioContext ||= new AudioContext();if(pauseAudioContext.state==='suspended')pauseAudioContext.resume().catch(()=>{});return true;}catch{return false;}
}
function playPauseTone(){
  if(!preparePauseSignals())return false;
  try{const now=pauseAudioContext.currentTime,gain=pauseAudioContext.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.16,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.55);gain.connect(pauseAudioContext.destination);[659,880].forEach((frequency,index)=>{const osc=pauseAudioContext.createOscillator();osc.type='sine';osc.frequency.value=frequency;osc.connect(gain);osc.start(now+index*.16);osc.stop(now+.55);});return true;}catch{return false;}
}
function vibratePause(){try{return !!navigator.vibrate?.([250,120,250,120,350]);}catch{return false;}}
function notifyPauseEnd(force=null){
  const vibrated=(force==='vibration'||(force===null&&data.settings.vibration!==false))?vibratePause():null;
  const sounded=(force==='sound'||(force===null&&data.settings.pauseSound===true))?playPauseTone():null;
  return {vibrated,sounded};
}
function testPauseSignal(type){
  const result=notifyPauseEnd(type),status=document.getElementById('pauseTestStatus');
  if(type==='vibration')status.textContent=result.vibrated?I18n.translate('Vibration ausgelöst.') : I18n.translate('Vibration wird von diesem Gerät oder Browser nicht unterstützt.');
  else status.textContent=result.sounded?I18n.translate('Testton abgespielt.') : I18n.translate('Ton konnte nicht abgespielt werden.');
}
function timerRemaining(){return state.paused?Math.max(0,state.timer):Math.max(0,Math.ceil((state.timerEndsAt-Date.now())/1000));}
function startPause(sec){
  document.getElementById('activePhase').classList.add('hidden');document.getElementById('pausePhase').classList.remove('hidden');
  preparePauseSignals();state.timer=Math.max(0,Number(sec)||0);state.timerMax=Math.max(1,state.timer);state.timerEndsAt=Date.now()+state.timer*1000;state.paused=false;document.getElementById('timerBtn').textContent=I18n.translate('Pause');updateTimerUI();
  clearInterval(state.interval);state.interval=setInterval(tickPauseTimer,250);tickPauseTimer();
}
function tickPauseTimer(){
  state.timer=timerRemaining();updateTimerUI();
  if(state.timer<=0){clearInterval(state.interval);notifyPauseEnd();renderWorkout();}
}
function updateTimerUI(){
  document.getElementById('pauseTime').textContent=fmt(state.timer);
  document.getElementById('timerBar').style.width=`${Math.max(0,Math.min(100,state.timer/state.timerMax*100))}%`;
}
function toggleTimer(){
  if(state.paused){state.paused=false;state.timerEndsAt=Date.now()+state.timer*1000;}else{state.timer=timerRemaining();state.paused=true;}
  document.getElementById('timerBtn').textContent=I18n.translate(state.paused?'Weiter':'Pause');updateTimerUI();
}
function adjustTimer(sec){state.timer=Math.max(0,timerRemaining()+sec);state.timerMax=Math.max(1,state.timerMax+sec);if(!state.paused)state.timerEndsAt=Date.now()+state.timer*1000;updateTimerUI();if(state.timer<=0)endPauseEarly();}
function setPauseTime(sec){state.timer=Math.max(0,Number(sec)||0);state.timerMax=Math.max(1,state.timer);if(!state.paused)state.timerEndsAt=Date.now()+state.timer*1000;updateTimerUI();}
function endPauseEarly(){clearInterval(state.interval);state.timer=0;renderWorkout();}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.timerEndsAt&&!state.paused&&!document.getElementById('pausePhase')?.classList.contains('hidden'))tickPauseTimer();});
