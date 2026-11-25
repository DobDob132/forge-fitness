const ForgeCloud = (() => {
  const $ = id => document.getElementById(id);
  let client, user = null, version = 0, ready = false, syncing = false;
  let syncTimer, generation = 0, connecting = null, conflict = null;
  const status = message => { $('cloudStatus').textContent = message; };
  function message(text, error = false) {
    $('accountMessage').textContent = text;
    $('accountMessage').classList.toggle('error', error);
  }
  function explain(error) {
    const raw = error?.message || String(error);
    if (/Invalid login credentials/i.test(raw)) return 'E-Mail oder Passwort stimmt nicht.';
    if (/Email not confirmed/i.test(raw)) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
    if (/USERNAME_TAKEN|forge_profiles_display_name_unique|duplicate key/i.test(raw)) return 'Dieser Benutzername ist bereits vergeben.';
    if (/USERNAME_INVALID/i.test(raw)) return 'Bitte gib einen Benutzernamen mit 1–40 Zeichen ein.';
    if (/Database error saving new user/i.test(raw)) return 'Dieser Benutzername ist möglicherweise bereits vergeben. Bitte wähle einen anderen.';
    if (/token.*expired|invalid.*token|token.*invalid/i.test(raw)) return 'Der Code ist falsch oder abgelaufen. Bitte fordere einen neuen Code an.';
    if (/rate|too many/i.test(raw)) return 'Zu viele Versuche. Bitte warte etwas und versuche es erneut.';
    if (/email.*not.*authorized|sending confirmation email|sending recovery email/i.test(raw)) return 'Der Mailversand ist noch nicht eingerichtet. Bitte informiere den App-Betreiber.';
    if (/fetch|network|offline|timeout/i.test(raw)) return 'Keine Verbindung. Deine lokal gespeicherten Trainingsdaten bleiben erhalten.';
    return raw;
  }
  function defaults() {
    const days = emptyWeek();
    days[0].ex = [['Bankdrücken', 3, '8-12', 20], ['Liegestütze', 3, 'Max', 0]];
    return {allPlans:[{id:'p_default',name:'Mein erster Plan',days,archived:false}],activePlanId:'p_default',logs:[],settings:{...defaultSettings},xp:0,level:1,xpHistory:[],claimedMilestones:[],bodyData:[],activeWorkout:null,activityTemplates:[]};
  }
  function normalize(value) { return normalizeForgePayload(value); }
  function readCached(id) {
    const cached=ForgeStore.envelope(id);if(!cached)return null;
    try{cached.payload=normalize(cached.payload);return cached;}
    catch(error){ForgeStore.backup('ungueltiger-speicherstand',cached.payload);toast(error.message+' Der ursprüngliche Stand wurde gesichert.');return null;}
  }
  const guestPayload=()=>readCached(null)?.payload||defaults();
  function renderData(payload) {
    data = normalize(payload);
    clearInterval(state.interval);clearExerciseTimer();releaseWakeLock();
    state={day:null,exercise:0,set:0,setsDone:0,started:0,paused:false,timer:90,timerMax:90,timerEndsAt:0,interval:null,finishing:false,exerciseTimer:0,exerciseTimerMax:0,exerciseTimerEndsAt:0,exerciseTimerInterval:null,exerciseTimerPaused:true,workoutXp:0,xpBaseline:null};
    lastSetBackup=null;editPlanCopy=null;
    for(const chart of [exChartInstance,bodyChartInstance,summaryChartInstance])chart?.destroy();
    exChartInstance=bodyChartInstance=summaryChartInstance=null;
    document.querySelectorAll('.modal').forEach(e=>e.style.display='none');
    show('home',document.querySelector('#nav button'));
  }
  function gate(visible) {
    $('accountGate').classList.toggle('hidden',!visible);
    document.body.classList.toggle('auth-locked',visible);
    document.querySelector('.app').inert=visible;
  }
  function activeWorkout() {
    return !!state.day && !$('workout').classList.contains('hidden') && $('complete').classList.contains('hidden');
  }
  function schedule() {clearTimeout(syncTimer);syncTimer=setTimeout(()=>flush(),700);}
  function save(payload) {
    if(user && !ready) throw Error('Das Konto wird noch geladen.');
    if(ForgeStore.account()!==(user?.id||null))throw Error('Das Konto wurde gewechselt. Bitte erneut öffnen.');
    try{ForgeStore.write(payload,version,!!user);}catch(error){status('Speichern fehlgeschlagen – bitte Daten exportieren');toast('Die Daten konnten nicht auf diesem Gerät gespeichert werden. Bitte exportiere eine Sicherung.');throw error;}
    if(user){status('Lokal gespeichert · Synchronisieren …');schedule();}
    else status('Nur auf diesem Gerät');
    return Promise.resolve();
  }
  async function fetchRemote() {
    const response=await client.from('forge_state').select('payload,version').eq('user_id',user.id).maybeSingle();
    if(response.error)throw response.error;
    if(response.data)response.data.payload=normalize(response.data.payload);
    return response.data;
  }
  async function flush() {
    if(!user || !ready || syncing || conflict || !navigator.onLine)return false;
    const pending=ForgeStore.envelope();
    if(!pending?.dirty)return true;
    const id=user.id, epoch=generation, snapshot=JSON.stringify(pending.payload);
    const operation={};syncing=operation;status('Synchronisieren …');
    try {
      const response=await client.rpc('forge_save_state',{p_payload:pending.payload,p_expected_version:pending.version});
      if(epoch!==generation || id!==user?.id)return false;
      if(response.error) {
        if(response.error.code==='PT409' || response.error.code==='40001') {
          const remote=await fetchRemote();
          if(epoch!==generation)return false;
          conflict=remote;showConflict();status('Versionskonflikt · Auswahl nötig');return false;
        }
        throw response.error;
      }
      version=Number(response.data.version);
      const newest=ForgeStore.envelope();
      const more=JSON.stringify(newest.payload)!==snapshot;
      ForgeStore.write(newest.payload,version,more);
      status(more?'Weitere Änderungen werden gespeichert …':'In der Cloud gespeichert');
      if(more)schedule();
      return !more;
    } catch(error) {if(epoch===generation)status('Lokal gespeichert · Cloud nicht erreichbar');return false;}
    finally{if(syncing===operation)syncing=false;}
  }
  async function syncNow() {
    if(!user || !ready)return false;
    const epoch=generation;
    await flush();
    if(epoch!==generation||!user||!ready)return false;
    if(conflict || syncing || ForgeStore.envelope()?.dirty)return false;
    if(activeWorkout())return true;
    try {
      const remote=await fetchRemote();
      if(epoch!==generation || ForgeStore.envelope()?.dirty)return false;
      if(remote && Number(remote.version)!==version){
        ForgeStore.backup('vor-cloud-aktualisierung',data);
        version=Number(remote.version);ForgeStore.write(remote.payload,version,false);renderData(remote.payload);
      }
      status('In der Cloud gespeichert');return true;
    }catch{if(epoch===generation)status('Lokal gespeichert · Cloud nicht erreichbar');return false;}
  }
  function showConflict() {
    $('syncConflict').classList.remove('hidden');
    if(!activeWorkout())$('accountModal').style.display='flex';
  }
  async function resolveConflict(useLocal) {
    if(!conflict)return;
    if(activeWorkout()){toast('Bitte beende zuerst dein Training.');return;}
    if(useLocal && !confirm('Diesen Gerätestand bewusst als aktuellen Cloud-Stand speichern? Der bisherige Cloud-Stand wird lokal gesichert.'))return;
    const local=ForgeStore.envelope();
    ForgeStore.backup('vor-konflikt-lokal',local.payload);
    ForgeStore.backup('vor-konflikt-cloud',conflict.payload);
    version=Number(conflict.version);
    const payload=useLocal?local.payload:conflict.payload;
    ForgeStore.write(payload,version,useLocal);
    conflict=null;$('syncConflict').classList.add('hidden');renderData(payload);
    if(useLocal)await flush();else status('Cloud-Stand übernommen');
  }
  async function profile() {
    const epoch=generation,id=user?.id;if(!id)return;
    let r=await client.from('forge_profiles').select('display_name,friend_code').eq('user_id',id).maybeSingle();
    if(epoch!==generation)return;
    if(r.error)throw r.error;
    if(!r.data){
      const name=String(user.user_metadata?.display_name || 'FORGE Athlet').trim().slice(0,40) || 'FORGE Athlet';
      const created=await client.from('forge_profiles').insert({user_id:user.id,display_name:name});
      if(epoch!==generation)return;
      if(created.error && created.error.code!=='23505')throw created.error;
      r=await client.from('forge_profiles').select('display_name,friend_code').eq('user_id',user.id).single();
      if(epoch!==generation)return;
      if(r.error)throw r.error;
    }
    $('profileName').value=r.data.display_name;$('friendCode').textContent=r.data.friend_code;
  }
  async function connect(session) {
    if(connecting?.id===session.user.id)return connecting.promise;
    const connection={id:session.user.id};connecting=connection;
    connection.promise=(async()=>{
      const epoch=++generation;
      clearTimeout(syncTimer);syncing=false;
      user=session.user;ForgeStore.select(user.id);ready=false;version=0;conflict=null;
      $('syncConflict').classList.add('hidden');
      gate(true);message('Deine Trainingsdaten werden geladen …');
      const cached=readCached(user.id);
      try{
        const remote=await fetchRemote();
        if(epoch!==generation)return;
        if(cached?.dirty) {
          version=cached.version;renderData(cached.payload);
          if(remote && Number(remote.version)!==cached.version)conflict=remote;
        } else {
          version=Number(remote?.version || 0);
          const payload=remote?.payload || cached?.payload || defaults();
          renderData(payload);ForgeStore.write(data,version,!remote);
        }
        ready=true;gate(false);status('In der Cloud gespeichert');
        if(conflict)showConflict();else await flush();
        if(epoch!==generation)return;
        try{await profile();}catch(error){$('accountDetailsMessage').textContent=explain(error);}
        if(epoch!==generation)return;
        ForgeShare.presentPendingInvite();
      } catch(error){
        if(epoch!==generation)return;
        if(cached){version=cached.version;renderData(cached.payload);ready=true;gate(false);status('Offline · lokaler Kontostand');}
        else {ready=false;message(explain(error)+' Bitte erneut anmelden oder lokal fortfahren.',true);}
      }
      $('accountEmail').textContent=user?.email || '';
      $('accountSignedIn').classList.toggle('hidden',!ready);
    })().finally(()=>{if(connecting===connection)connecting=null;});
    return connection.promise;
  }
  async function guest() {
    if(user) {
      if(!confirm('Vom Konto abmelden und nur die lokalen Gastdaten öffnen?'))return;
      await logout();return;
    }
    generation++;ForgeStore.select(null);ready=true;conflict=null;
    renderData(guestPayload());gate(false);status('Nur auf diesem Gerät');
    const warning=ForgeStore.warning();if(warning)toast(warning);
  }
  async function logout() {
    if(activeWorkout()){toast('Bitte beende oder speichere zuerst dein Training.');return;}
    await flush();
    if(ForgeStore.envelope()?.dirty && !confirm('Es gibt noch nicht synchronisierte Änderungen. Sie bleiben auf diesem Gerät gespeichert. Trotzdem abmelden?'))return;
    const epoch=generation;
    const result=await client.auth.signOut({scope:'local'});
    if(result.error){message(explain(result.error),true);return;}
    if(user&&epoch!==generation)return;
    generation++;clearTimeout(syncTimer);ready=false;syncing=false;connecting=null;
    user=null;ForgeStore.select(null);conflict=null;
    renderData(guestPayload());gate(true);mode('login');
    $('accountSignedIn').classList.add('hidden');status('Abgemeldet');
  }
  function mode(name) {
    if(name!=='login'&&name!=='signup')name='login';
    $('authMode').value=name;
    $('signupNameWrap').classList.toggle('hidden',name!=='signup');
    $('authName').required=name==='signup';
    $('authPasswordWrap').classList.remove('hidden');
    $('authEmailWrap').classList.remove('hidden');
    $('authEmail').required=true;$('authPassword').required=true;
    $('authPassword').minLength=name==='login'?1:8;
    $('authPassword').autocomplete=name==='login'?'current-password':'new-password';
    $('authSubmit').textContent={login:'ANMELDEN',signup:'KONTO ERSTELLEN'}[name];
    $('authTitle').textContent={login:'Willkommen bei FORGE',signup:'Dein FORGE-Konto'}[name];
    document.querySelectorAll('[data-auth-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.authMode===name)));
    message('');
  }
  async function submit(event) {
    event.preventDefault();$('authSubmit').disabled=true;
    const email=$('authEmail').value.trim(),password=$('authPassword').value,name=$('authMode').value;
    try {
      if(!email||!password)throw Error('Bitte gib E-Mail-Adresse und Passwort ein.');
      message('Bitte warten …');let response;
      if(name==='login') {
        response=await client.auth.signInWithPassword({email,password});
        if(response.error)throw response.error;await connect(response.data.session);
      } else if(name==='signup') {
        const displayName=$('authName').value.trim().slice(0,40);
        if(!displayName)throw Error('Bitte gib einen Benutzernamen mit 1–40 Zeichen ein.');
        const available=await client.functions.invoke('username-available',{body:{displayName}});
        if(available.error)throw available.error;
        if(!available.data?.available)throw Error('Dieser Benutzername ist bereits vergeben.');
        response=await client.auth.signUp({email,password,options:{data:{display_name:displayName}}});
        if(response.error)throw response.error;
        if(response.data.session)await connect(response.data.session);
        else throw Error('Das Konto konnte nicht direkt geöffnet werden. Bitte versuche es erneut.');
      }
      $('authPassword').value='';
    } catch(error){message(explain(error),true);}
    finally{$('authSubmit').disabled=false;}
  }
  async function open() {
    if(activeWorkout()){toast('Bitte beende oder speichere zuerst dein Training.');return;}
    if(!user || !ready){gate(true);mode('login');return;}
    $('accountModal').style.display='flex';$('accountDetailsMessage').textContent='';
    try{await profile();await friends();await ForgeSocial.refreshAccount();}catch(error){$('accountDetailsMessage').textContent=explain(error);}
  }
  async function friends() {
    if(!user||!ready)return;
    const epoch=generation;
    const r=await client.rpc('forge_friends',{p_action:'list'});if(r.error)throw r.error;
    if(epoch!==generation)return;
    const list=$('friendsList');list.replaceChildren();
    if(!r.data.length){list.innerHTML=`<div class="social-empty"><span>👥</span><b>${I18n.translate('Noch keine Freunde')}</b><small>${I18n.translate('Tausche deinen Freundescode aus, um jemanden einzuladen.')}</small></div>`;return;}
    for(const f of r.data){
      const row=document.createElement('div');row.className='friend-row';
      const avatar=document.createElement('span');avatar.className='friend-avatar';avatar.textContent=f.display_name.slice(0,1).toUpperCase();
      const text=document.createElement('div'),name=document.createElement('b'),sub=document.createElement('div');
      name.textContent=f.display_name;sub.className='sub';sub.textContent=I18n.translate(f.status==='accepted'?'Befreundet':f.incoming?'Anfrage erhalten':'Anfrage gesendet');text.append(name,sub);row.append(avatar,text);
      const actions=document.createElement('div');actions.className='account-buttons';
      if(f.status==='accepted'){const challenge=document.createElement('button');challenge.className='btn';challenge.textContent=I18n.translate('⚔️ Herausfordern');challenge.onclick=()=>ForgeSocial.challengeFriendName(f.display_name);actions.append(challenge);}
      for(const [action,label] of [...(f.status==='pending'&&f.incoming?[['accept','Annehmen']]:[]),['remove',f.status==='accepted'?'Entfernen':f.incoming?'Ablehnen':'Zurückziehen']]){
        const b=document.createElement('button');b.className='btn secondary';b.textContent=I18n.translate(label);b.onclick=()=>friendAction(action,f.id);actions.append(b);
      }
      row.append(actions);list.append(row);
    }
  }
  async function friendAction(action,id=null) {
    const epoch=generation;
    try{
      if(action==='remove'&&!confirm('Diesen Kontakt oder diese Anfrage entfernen?'))return;
      const requestedCode=action==='request'?$('friendInput').value.trim():null;
      const r=await client.rpc('forge_friends',{p_action:action,p_id:id,p_code:requestedCode});
      if(epoch!==generation)return;
      if(epoch!==generation)return;
      if(r.error)throw r.error;ForgeShare.completeInvite(requestedCode);$('friendInput').value='';await friends();await ForgeSocial.refreshFriendsPage();$('accountDetailsMessage').textContent=action==='request'?'Freundschaftsanfrage gesendet.':'Gespeichert.';toast(action==='request'?'Freundschaftsanfrage gesendet.':'Gespeichert.');
    }catch(error){$('accountDetailsMessage').textContent=explain(error);toast(explain(error));}
  }
  async function importPayload(payload) {
    if(user&&!ready)throw Error('Bitte warte, bis dein Konto geladen ist.');
    const next=normalize(payload);ForgeStore.backup('vor-import',data);
    renderData(next);await save(data);await flush();
  }
  async function importGuest() {
    if(!user)return;
    const guestData=ForgeStore.guest();if(!guestData){toast('Keine lokalen Gastdaten vorhanden. Nutze den JSON-Import für deine bisherige App.');return;}
    if(confirm('Die lokalen Gastdaten in dieses Konto übernehmen und dessen aktuellen Stand ersetzen? Eine lokale Sicherung wird angelegt.'))await importPayload(guestData);
  }
  async function reset() {
    if(!confirm('ACHTUNG: ALLE Trainingsdaten dieses Kontos bzw. lokalen Gastprofils werden gelöscht! Sicher?'))return;
    ForgeStore.backup('vor-reset',data);renderData(defaults());await save(data);await flush();
  }
  async function deleteAccount() {
    if(!user||!ready)return;
    const oldId=user.id;
    if(activeWorkout()){toast('Bitte beende oder speichere zuerst dein Training.');return;}
    const typed=prompt(I18n.deletionPrompt());
    if(typed!==I18n.deleteWord())return;
    if(!confirm('Konto jetzt endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.'))return;
    const button=$('deleteAccountButton');button.disabled=true;
    $('accountDetailsMessage').textContent='Konto wird gelöscht …';
    try{
      const result=await client.functions.invoke('delete-account',{body:{confirmation:'delete'}});
      if(result.error)throw result.error;
      for(const key of Object.keys(localStorage))if(key===`forgeData:account:${oldId}`||key.startsWith(`forgeBackup:${oldId}:`))localStorage.removeItem(key);
      if(user?.id!==oldId)return;
      generation++;clearTimeout(syncTimer);syncing=false;connecting=null;user=null;ready=false;conflict=null;
      await client.auth.signOut({scope:'local'}).catch(()=>{});
      localStorage.removeItem(`forgeData:account:${oldId}`);
      ForgeStore.select(null);renderData(guestPayload());
      $('accountModal').style.display='none';$('accountSignedIn').classList.add('hidden');
      gate(true);mode('signup');status('Konto gelöscht');message('Dein Konto und die gespeicherten Daten wurden gelöscht.');
    }catch(error){$('accountDetailsMessage').textContent=explain(error);button.disabled=false;}
  }
  async function social(action,{id=null,friend=null,payload=null,value=null}={}){
    if(!user||!ready)throw Error('Bitte melde dich zuerst an.');
    const epoch=generation;
    const response=await client.rpc('forge_social',{p_action:action,p_id:id,p_friend:friend,p_payload:payload,p_value:value});
    if(epoch!==generation)throw Error('Das Konto wurde gewechselt. Bitte erneut öffnen.');
    if(response.error)throw response.error;return response.data;
  }
  async function publicPlans(action,{id=null,plan=null,metadata=null,query=null,category=null,difficulty=null,days=null,sort='newest',limit=50,offset=0}={}){
    if((action==='publish'||action==='unpublish')&&(!user||!ready))throw Error('Bitte melde dich zuerst an.');
    const epoch=generation;
    const response=await client.rpc('forge_public_plans',{p_action:action,p_id:id,p_plan:plan,p_metadata:metadata,p_query:query||null,p_category:category||null,p_difficulty:difficulty||null,p_days:days,p_sort:sort,p_limit:limit,p_offset:offset});
    if(epoch!==generation)throw Error('Das Konto wurde gewechselt. Bitte erneut öffnen.');
    if(response.error)throw response.error;return response.data;
  }
  async function friendMilestones(){if(!user||!ready)return[];const epoch=generation;const response=await client.rpc('forge_friend_milestones');if(epoch!==generation)throw Error('Das Konto wurde gewechselt.');if(response.error)throw response.error;return response.data||[];}
  async function boot() {
    client=forgeSupabase.createClient(FORGE_CONFIG.supabaseUrl,FORGE_CONFIG.supabaseKey,{auth:{storageKey:'forgeAuth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal || AbortSignal.timeout(15000)})}});
    $('authForm').addEventListener('submit',submit);
    document.querySelectorAll('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>mode(b.dataset.authMode)));
    $('guestButton').onclick=guest;$('accountButton').onclick=open;
    $('accountClose').onclick=()=>$('accountModal').style.display='none';
    $('logoutButton').onclick=logout;$('syncButton').onclick=async()=>{if(await syncNow())toast('Synchronisiert.');else toast('Noch nicht synchronisiert. Prüfe Verbindung oder Versionskonflikt.');};
    $('deleteAccountButton').onclick=deleteAccount;
    $('importGuestButton').onclick=()=>importGuest().catch(e=>toast(explain(e)));
    $('friendAdd').onclick=()=>friendAction('request');
    $('friendRefresh').onclick=()=>friends().catch(e=>$('accountDetailsMessage').textContent=explain(e));
    $('saveProfile').onclick=async()=>{const epoch=generation,id=user?.id;try{if(!id||!ready)return;const name=$('profileName').value.trim();if(!name||name.length>40)throw Error('Bitte einen Benutzernamen mit 1–40 Zeichen eingeben.');const available=await client.functions.invoke('username-available',{body:{displayName:name}});if(epoch!==generation)return;if(available.error)throw available.error;if(!available.data?.available)throw Error('Dieser Benutzername ist bereits vergeben.');const r=await client.from('forge_profiles').update({display_name:name}).eq('user_id',id);if(epoch!==generation)return;if(r.error)throw r.error;toast('Benutzername gespeichert.');}catch(e){$('accountDetailsMessage').textContent=explain(e);}};
    $('useCloud').onclick=()=>resolveConflict(false);$('useLocal').onclick=()=>resolveConflict(true);
    $('copyFriendCode').onclick=async()=>{try{await navigator.clipboard.writeText($('friendCode').textContent);toast('Freundescode kopiert.');}catch{toast('Halte den Code gedrückt, um ihn zu kopieren.');}};
    ForgeSocial.init();
    client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'&&user){const epoch=++generation;clearTimeout(syncTimer);syncing=false;user=null;ready=false;conflict=null;ForgeStore.select(null);setTimeout(()=>{if(epoch!==generation)return;renderData(guestPayload());gate(true);mode('login');},0);}
      if(event==='SIGNED_IN'&&session&&session.user.id!==user?.id){const epoch=generation;setTimeout(()=>{if(epoch===generation)connect(session);},0);}
    });
    try{
      const r=await client.auth.getSession();if(r.error)throw r.error;
      if(r.data.session)await connect(r.data.session);
      else{mode('login');gate(true);status('Lokal · ohne Konto');}
    }catch(error){gate(true);message(explain(error),true);}
    window.addEventListener('online',()=>syncNow());
    window.addEventListener('offline',()=>status(user?'Offline · lokal gespeichert':'Nur auf diesem Gerät'));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncNow();});
    window.addEventListener('focus',()=>syncNow());
    setInterval(()=>{if(document.visibilityState==='visible')syncNow();else flush();},60000);
  }
  return {boot,save,flush,syncNow,open,guest,logout,importPayload,reset,normalize,defaults,resolveConflict,social,publicPlans,friendMilestones,refreshFriends:async()=>{await profile();await friends();},isSignedIn:()=>!!user&&ready,
    diagnostics:()=>({userId:user?.id || null,ready,version,syncing:!!syncing,conflict:!!conflict})};
})();
