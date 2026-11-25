// Presentation only: derive the weekly illustration from existing logs and plans.
function renderHomeWelcome(){
  const now=new Date(),hour=now.getHours();
  const greeting=hour<11?'Guten Morgen.':hour<18?'Schön, dass du da bist.':'Zeit, durchzuatmen.';
  const setText=(id,text)=>{const element=document.getElementById(id);if(element)element.textContent=I18n.translate(text);};
  setText('homeGreeting',greeting);
  const rest=today().ex.length===0;
  setText('homeHeroMessage',rest?'Heute darf es ruhiger sein.':'Kleine Schritte. Dein Fortschritt.');
  const art=document.getElementById('homeHeroArt');
  if(art){
    art.src=rest?'assets/illustrations/recovery.svg':'assets/illustrations/training.svg';
    art.alt=I18n.translate(rest?'Illustration: eine ruhige Pause zum Durchatmen':'Illustration: entspanntes Training mit einer Kurzhantel');
  }
  const goal=Math.max(1,Number(data.settings.weeklyGoal)||3),done=weeklyWorkoutCount();
  setText('homeGoalCaption',done>=goal?'Dein Wochenziel ist geschafft. Schön, dass du dir Zeit genommen hast.':'Jede Einheit zählt. Auch in deinem Tempo.');
  const pips=document.getElementById('weekPips');
  if(!pips)return;
  const monday=new Date(now);monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-todayIndex());
  const dates=new Set(data.logs.map(log=>new Date(log.date).toDateString()));
  const days=getActiveDays();
  pips.replaceChildren();
  for(let index=0;index<7;index++){
    const date=new Date(monday);date.setDate(monday.getDate()+index);
    const completed=dates.has(date.toDateString()),isRest=!days[index].ex.length;
    const pip=document.createElement('div'),label=document.createElement('span'),dot=document.createElement('i');
    pip.className='week-pip'+(completed?' is-done':isRest?' is-rest':'')+(index===todayIndex()?' is-today':'');
    label.textContent=date.toLocaleDateString(I18n.locale(),{weekday:'short'}).replace(/\.$/,'');
    dot.textContent=completed?'✓':isRest?'–':'·';
    dot.setAttribute('aria-hidden','true');
    pip.setAttribute('aria-label',date.toLocaleDateString(I18n.locale(),{weekday:'long'})+': '+I18n.translate(completed?'Training gespeichert':isRest?'Pausentag':'Training geplant'));
    pip.append(label,dot);pips.append(pip);
  }
}
