function startPause(sec){
  document.getElementById("activePhase").classList.add("hidden");
  document.getElementById("pausePhase").classList.remove("hidden");
  state.timer=sec; state.timerMax=sec; state.paused=false; document.getElementById("timerBtn").textContent="Pause";
  updateTimerUI();
  clearInterval(state.interval);
  state.interval=setInterval(()=>{
    if(state.paused) return;
    state.timer--;
    updateTimerUI();
    if(state.timer<=0){ endPauseEarly(); notifyPauseEnd(); }
  },1000);
}
function updateTimerUI(){
  document.getElementById("pauseTime").textContent=fmt(state.timer);
  document.getElementById("timerBar").style.width=(state.timer/state.timerMax*100)+"%";
}
function toggleTimer(){state.paused=!state.paused; document.getElementById("timerBtn").textContent=state.paused?"Weiter":"Pause";}
function adjustTimer(sec){state.timer+=sec; state.timerMax+=sec; if(state.timer<0)state.timer=0; updateTimerUI();}
function setPauseTime(sec){state.timer=sec; state.timerMax=sec; updateTimerUI();}
function endPauseEarly(){clearInterval(state.interval); renderWorkout();}

function notifyPauseEnd(){
  if(data.settings.vibration!==false && "vibrate" in navigator) navigator.vibrate([200,100,200]);
  if(data.settings.pauseSound===true){
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)return;
      const audio=new AudioContext(),osc=audio.createOscillator(),gain=audio.createGain();
      osc.frequency.value=740;gain.gain.setValueAtTime(.08,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.22);
      osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.22);osc.onended=()=>audio.close();
    }catch(error){}
  }
}
