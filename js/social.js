const ForgeSocial=(()=>{
  let friends=[],sharingPlanId=null;
  const $=id=>document.getElementById(id);
  async function loadFriends(){
    if(!ForgeCloud.isSignedIn()){friends=[];return friends;}
    friends=await ForgeCloud.social('friends');
    for(const select of [$('shareFriendSelect'),$('challengeFriend')]){
      const chosen=select.value;select.replaceChildren();
      if(!friends.length){const o=document.createElement('option');o.textContent='Noch keine Freunde';o.value='';select.append(o);continue;}
      for(const f of friends){const o=document.createElement('option');o.value=f.user_id;o.textContent=f.display_name;select.append(o);}if(friends.some(f=>f.user_id===chosen))select.value=chosen;
    }
    return friends;
  }
  async function openShare(planId){
    if(!ForgeCloud.isSignedIn()){toast('Melde dich an, um Pläne zu teilen.');return;}
    const plan=data.allPlans.find(p=>p.id===planId);if(!plan)return;
    try{await loadFriends();if(!friends.length){toast('Füge zuerst einen Freund hinzu.');return;}sharingPlanId=planId;$('sharePlanName').textContent=plan.name;$('sharePlanModal').style.display='flex';}catch(error){toast(error.message);}
  }
  function closeShare(){$('sharePlanModal').style.display='none';sharingPlanId=null;}
  async function sendShare(){
    const plan=data.allPlans.find(p=>p.id===sharingPlanId),friend=$('shareFriendSelect').value;if(!plan||!friend)return;
    $('sharePlanSend').disabled=true;try{await ForgeCloud.social('share_plan',{friend,payload:plan});closeShare();toast('Plan gesendet.');}catch(error){toast(error.message);}finally{$('sharePlanSend').disabled=false;}
  }
  async function refreshShares(){
    const list=$('sharedPlansList');if(!list)return;
    if(!ForgeCloud.isSignedIn()){list.innerHTML='<div class="sub">Melde dich an, um geteilte Pläne zu sehen.</div>';return;}
    try{const shares=await ForgeCloud.social('plan_shares');list.replaceChildren();if(!shares.length){list.innerHTML='<div class="sub">Noch keine geteilten Pläne.</div>';return;}
      for(const share of shares){const row=document.createElement('div');row.className='record';const text=document.createElement('div'),title=document.createElement('b'),sub=document.createElement('small');title.textContent=share.plan.name||'Trainingsplan';sub.textContent=`Von ${share.sender_name}`;sub.className='sub';text.append(title,sub);const actions=document.createElement('div');actions.className='plan-actions';for(const [label,fn] of [['Übernehmen',()=>takeShare(share.id,share.sender_name)],['Ablehnen',()=>dismissShare(share.id)]]){const b=document.createElement('button');b.className='btn secondary';b.textContent=label;b.onclick=fn;actions.append(b);}row.append(text,actions);list.append(row);}
    }catch(error){list.textContent=error.message;}
  }
  async function takeShare(id,sender){
    try{const plan=await ForgeCloud.social('take_plan',{id});if(!plan||!Array.isArray(plan.days)||plan.days.length!==7)throw Error('Der geteilte Plan ist ungültig.');const copy=JSON.parse(JSON.stringify(plan));copy.id='p_shared_'+Date.now();copy.name=`${copy.name||'Trainingsplan'} · ${sender}`;copy.archived=false;data.allPlans.push(copy);await saveData();renderPlansList();await refreshShares();toast('Plan als eigene Kopie übernommen.');}catch(error){toast(error.message);}
  }
  async function dismissShare(id){try{await ForgeCloud.social('dismiss_share',{id});await refreshShares();}catch(error){toast(error.message);}}
  async function createChallenge(){const friend=$('challengeFriend').value,target=Math.max(1,Math.min(14,+$('challengeTarget').value||3));if(!friend){toast('Wähle zuerst einen Freund.');return;}try{await ForgeCloud.social('create_challenge',{friend,value:target});await refreshChallenges();toast('Challenge gesendet.');}catch(error){toast(error.message.includes('duplicate')?'Für diese Woche gibt es mit diesem Freund bereits eine Challenge.':error.message);}}
  async function syncProgress(){if(!ForgeCloud.isSignedIn())return;try{await ForgeCloud.social('sync_progress',{value:Math.min(14,weeklyWorkoutCount())});}catch(error){} }
  async function refreshChallenges(){
    const list=$('challengesList');if(!list||!ForgeCloud.isSignedIn())return;
    try{await syncProgress();const challenges=await ForgeCloud.social('challenges');list.replaceChildren();if(!challenges.length){list.innerHTML='<div class="sub">Noch keine Challenge in dieser Woche.</div>';return;}
      for(const c of challenges){const card=document.createElement('div');card.className='challenge-card';const names=document.createElement('b');names.textContent=`${c.creator_name} vs. ${c.opponent_name}`;card.append(names);
        if(c.status==='pending'){const sub=document.createElement('div');sub.className='sub';sub.textContent=c.incoming?`Anfrage: ${c.target} Trainings diese Woche`:`Gesendet · Ziel ${c.target} Trainings`;card.append(sub);const actions=document.createElement('div');actions.className='account-buttons';if(c.incoming){const accept=document.createElement('button');accept.className='btn';accept.textContent='Annehmen';accept.onclick=()=>challengeAction('accept_challenge',c.id);actions.append(accept);}const remove=document.createElement('button');remove.className='btn secondary';remove.textContent=c.incoming?'Ablehnen':'Zurückziehen';remove.onclick=()=>challengeAction('remove_challenge',c.id);actions.append(remove);card.append(actions);
        }else{for(const [name,value] of [[c.creator_name,c.creator_progress],[c.opponent_name,c.opponent_progress]]){const row=document.createElement('div');row.className='challenge-progress';row.innerHTML=`<span>${escapeHtml(name)}</span><b>${value}/${c.target}</b><i style="width:${Math.min(100,value/c.target*100)}%"></i>`;card.append(row);}const remove=document.createElement('button');remove.className='btn secondary';remove.textContent='Challenge beenden';remove.onclick=()=>challengeAction('remove_challenge',c.id);card.append(remove);}
        list.append(card);}
    }catch(error){list.textContent=error.message;}
  }
  async function challengeAction(action,id){try{await ForgeCloud.social(action,{id});await refreshChallenges();}catch(error){toast(error.message);}}
  async function refreshAccount(){if(!ForgeCloud.isSignedIn())return;await loadFriends();await refreshChallenges();}
  function init(){$('sharePlanSend').onclick=sendShare;$('challengeCreate').onclick=createChallenge;}
  return {init,openShare,closeShare,refreshShares,refreshAccount,refreshChallenges,syncProgress};
})();
