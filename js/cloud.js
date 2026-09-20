const ForgeCloud = (() => {
  const $ = id => document.getElementById(id);
  let client, user = null, version = 0, ready = false, syncing = false;
  let syncTimer, generation = 0, connecting = null, conflict = null;
  const clone = value => JSON.parse(JSON.stringify(value));
  const status = message => { $('cloudStatus').textContent = message; };
  function message(text, error = false) {
    $('accountMessage').textContent = text;
    $('accountMessage').classList.toggle('error', error);
  }
  function explain(error) {
    const raw = error?.message || String(error);
    if (/Invalid login credentials/i.test(raw)) return 'E-Mail oder Passwort stimmt nicht.';
    if (/Email not confirmed/i.test(raw)) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
    if (/token.*expired|invalid.*token|token.*invalid/i.test(raw)) return 'Der Code ist falsch oder abgelaufen. Bitte fordere einen neuen Code an.';
    if (/rate|too many/i.test(raw)) return 'Zu viele Versuche. Bitte warte etwas und versuche es erneut.';
    if (/email.*not.*authorized|sending confirmation email|sending recovery email/i.test(raw)) return 'Der Mailversand ist noch nicht eingerichtet. Bitte informiere den App-Betreiber.';
    if (/fetch|network|offline|timeout/i.test(raw)) return 'Keine Verbindung. Deine lokal gespeicherten Trainingsdaten bleiben erhalten.';
    return raw;
  }
  function defaults() {
    const days = emptyWeek();
    days[0].ex = [['Bankdrücken', 3, '8-12', 20], ['Liegestütze', 3, 'Max', 0]];
    return {allPlans:[{id:'p_default',name:'Mein erster Plan',days,archived:false}],activePlanId:'p_default',logs:[],settings:{...defaultSettings},xp:0,level:1,xpHistory:[],claimedMilestones:[],bodyData:[],activeWorkout:null};
  }
  function normalize(value) {
    if (!value || !Array.isArray(value.allPlans) || !value.allPlans.length || !Array.isArray(value.logs)) throw Error('Ungültige FORGE-Sicherungsdatei.');
    const p = clone(value);
    for (const plan of p.allPlans) {
      if (typeof plan.id !== 'string' || typeof plan.name !== 'string' || !Array.isArray(plan.days) || plan.days.length !== 7) throw Error('Ungültiger Trainingsplan.');
      for(const day of plan.days) {
        if(typeof day.name !== 'string' || typeof day.focus !== 'string' || !Array.isArray(day.ex)) throw Error('Ungültiger Trainingstag.');
        for(const ex of day.ex) if(!Array.isArray(ex) || typeof ex[0] !== 'string' || !Number.isFinite(Number(ex[1])) || typeof ex[2] !== 'string') throw Error('Ungültige Übung.');
      }
    }
    p.settings = {...defaultSettings,...p.settings};
    if(!p.xp) {p.xp=0;p.level=1;p.xpHistory=[];}
    p.claimedMilestones ||= [];
    p.bodyData = (p.bodyData || []).map(d=>typeof d.metric==='undefined'?{date:d.date,metric:'weight',value:d.weight||d.value}:d);
    if(!Array.isArray(p.xpHistory) || !Array.isArray(p.claimedMilestones)) throw Error('Ungültige Fortschrittsdaten.');
    return p;
  }
  function renderData(payload) {
    data = normalize(payload);
    clearInterval(state.interval);releaseWakeLock();
    state={day:null,exercise:0,set:0,setsDone:0,started:0,paused:false,timer:90,timerMax:90,interval:null};
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
    ForgeStore.write(payload,version,!!user);
    if(user){status('Lokal gespeichert · Synchronisieren …');schedule();}
    else status('Nur auf diesem Gerät');
    return Promise.resolve();
  }
  async function fetchRemote() {
    const response=await client.from('forge_state').select('payload,version').eq('user_id',user.id).maybeSingle();
    if(response.error)throw response.error;
    return response.data;
  }
  async function flush() {
    if(!user || !ready || syncing || conflict || !navigator.onLine)return false;
    const pending=ForgeStore.envelope();
    if(!pending?.dirty)return true;
    const id=user.id, epoch=generation, snapshot=JSON.stringify(pending.payload);
    syncing=true;status('Synchronisieren …');
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
    } catch(error) {status('Lokal gespeichert · Cloud nicht erreichbar');return false;}
    finally{syncing=false;}
  }
  async function syncNow() {
    if(!user || !ready)return false;
    await flush();
    if(conflict || syncing || ForgeStore.envelope()?.dirty)return false;
    if(activeWorkout())return true;
    const epoch=generation;
    try {
      const remote=await fetchRemote();
      if(epoch!==generation || ForgeStore.envelope()?.dirty)return false;
      if(remote && Number(remote.version)!==version){
        ForgeStore.backup('vor-cloud-aktualisierung',data);
        version=Number(remote.version);ForgeStore.write(remote.payload,version,false);renderData(remote.payload);
      }
      status('In der Cloud gespeichert');return true;
    }catch{status('Lokal gespeichert · Cloud nicht erreichbar');return false;}
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
    let r=await client.from('forge_profiles').select('display_name,friend_code').eq('user_id',user.id).maybeSingle();
    if(r.error)throw r.error;
    if(!r.data){
      const name=(user.user_metadata?.display_name || 'FORGE Athlet').trim().slice(0,40) || 'FORGE Athlet';
      const created=await client.from('forge_profiles').insert({user_id:user.id,display_name:name});
      if(created.error && created.error.code!=='23505')throw created.error;
      r=await client.from('forge_profiles').select('display_name,friend_code').eq('user_id',user.id).single();
      if(r.error)throw r.error;
    }
    $('profileName').value=r.data.display_name;$('friendCode').textContent=r.data.friend_code;
  }
  async function connect(session) {
    if(connecting)return connecting;
    connecting=(async()=>{
      const epoch=++generation;
      user=session.user;ForgeStore.select(user.id);ready=false;version=0;conflict=null;
      $('syncConflict').classList.add('hidden');
      gate(true);message('Deine Trainingsdaten werden geladen …');
      const cached=ForgeStore.envelope();
      try{
        const remote=await fetchRemote();
        if(epoch!==generation)return;
        if(cached?.dirty) {
          version=cached.version;renderData(cached.payload);
          if(remote && Number(remote.version)!==cached.version)conflict=remote;
        } else {
          version=Number(remote?.version || 0);
          const payload=remote?.payload || cached?.payload || defaults();
          renderData(payload);ForgeStore.write(payload,version,false);
        }
        ready=true;gate(false);status('In der Cloud gespeichert');
        if(conflict)showConflict();else await flush();
        try{await profile();}catch(error){$('accountDetailsMessage').textContent=explain(error);}
      } catch(error){
        if(epoch!==generation)return;
        if(cached){version=cached.version;renderData(cached.payload);ready=true;gate(false);status('Offline · lokaler Kontostand');}
        else {ready=false;message(explain(error)+' Bitte erneut anmelden oder lokal fortfahren.',true);}
      }
      $('accountEmail').textContent=user?.email || '';
      $('accountSignedIn').classList.toggle('hidden',!ready);
    })().finally(()=>{connecting=null;});
    return connecting;
  }
  async function guest() {
    if(user) {
      if(!confirm('Vom Konto abmelden und nur die lokalen Gastdaten öffnen?'))return;
      await logout();return;
    }
    generation++;ForgeStore.select(null);ready=true;conflict=null;
    renderData(ForgeStore.guest() || defaults());gate(false);status('Nur auf diesem Gerät');
  }
  async function logout() {
    if(activeWorkout()){toast('Bitte beende oder speichere zuerst dein Training.');return;}
    await flush();
    if(ForgeStore.envelope()?.dirty && !confirm('Es gibt noch nicht synchronisierte Änderungen. Sie bleiben auf diesem Gerät gespeichert. Trotzdem abmelden?'))return;
    generation++;clearTimeout(syncTimer);ready=false;
    const result=await client.auth.signOut({scope:'local'});
    if(result.error){message(explain(result.error),true);return;}
    user=null;ForgeStore.select(null);conflict=null;
    renderData(ForgeStore.guest() || defaults());gate(true);mode('login');
    $('accountSignedIn').classList.add('hidden');status('Abgemeldet');
  }
  function mode(name) {
    if(name!=='login'&&name!=='signup')name='login';
    $('authMode').value=name;
    $('signupNameWrap').classList.toggle('hidden',name!=='signup');
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
      message('Bitte warten …');let response;
      if(name==='login') {
        response=await client.auth.signInWithPassword({email,password});
        if(response.error)throw response.error;await connect(response.data.session);
      } else if(name==='signup') {
        response=await client.auth.signUp({email,password,options:{data:{display_name:$('authName').value.trim().slice(0,40)||'FORGE Athlet'}}});
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
    const r=await client.rpc('forge_friends',{p_action:'list'});if(r.error)throw r.error;
    const list=$('friendsList');list.replaceChildren();
    if(!r.data.length){list.textContent='Noch keine Kontakte. Tausche deinen Freundescode persönlich aus.';return;}
    for(const f of r.data){
      const row=document.createElement('div');row.className='friend-row';
      const text=document.createElement('div'),name=document.createElement('b'),sub=document.createElement('div');
      name.textContent=f.display_name;sub.className='sub';sub.textContent=f.status==='accepted'?'Befreundet':f.incoming?'Anfrage erhalten':'Anfrage gesendet';text.append(name,sub);row.append(text);
      const actions=document.createElement('div');actions.className='account-buttons';
      for(const [action,label] of [...(f.status==='pending'&&f.incoming?[['accept','Annehmen']]:[]),['remove',f.status==='accepted'?'Entfernen':f.incoming?'Ablehnen':'Zurückziehen']]){
        const b=document.createElement('button');b.className='btn secondary';b.textContent=label;b.onclick=()=>friendAction(action,f.id);actions.append(b);
      }
      row.append(actions);list.append(row);
    }
  }
  async function friendAction(action,id=null) {
    try{
      if(action==='remove'&&!confirm('Diesen Kontakt oder diese Anfrage entfernen?'))return;
      const r=await client.rpc('forge_friends',{p_action:action,p_id:id,p_code:action==='request'?$('friendInput').value.trim():null});
      if(r.error)throw r.error;$('friendInput').value='';await friends();$('accountDetailsMessage').textContent='Gespeichert.';
    }catch(error){$('accountDetailsMessage').textContent=explain(error);}
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
  async function social(action,{id=null,friend=null,payload=null,value=null}={}){
    if(!user||!ready)throw Error('Bitte melde dich zuerst an.');
    const response=await client.rpc('forge_social',{p_action:action,p_id:id,p_friend:friend,p_payload:payload,p_value:value});
    if(response.error)throw response.error;return response.data;
  }
  async function boot() {
    client=forgeSupabase.createClient(FORGE_CONFIG.supabaseUrl,FORGE_CONFIG.supabaseKey,{auth:{storageKey:'forgeAuth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal || AbortSignal.timeout(15000)})}});
    $('authForm').addEventListener('submit',submit);
    document.querySelectorAll('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>mode(b.dataset.authMode)));
    $('guestButton').onclick=guest;$('accountButton').onclick=open;
    $('accountClose').onclick=()=>$('accountModal').style.display='none';
    $('logoutButton').onclick=logout;$('syncButton').onclick=async()=>{if(await syncNow())toast('Synchronisiert.');else toast('Noch nicht synchronisiert. Prüfe Verbindung oder Versionskonflikt.');};
    $('importGuestButton').onclick=()=>importGuest().catch(e=>toast(explain(e)));
    $('friendAdd').onclick=()=>friendAction('request');
    $('friendRefresh').onclick=()=>friends().catch(e=>$('accountDetailsMessage').textContent=explain(e));
    $('saveProfile').onclick=async()=>{try{const name=$('profileName').value.trim();if(!name||name.length>40)throw Error('Bitte einen Namen mit 1–40 Zeichen eingeben.');const r=await client.from('forge_profiles').update({display_name:name}).eq('user_id',user.id);if(r.error)throw r.error;toast('Name gespeichert.');}catch(e){$('accountDetailsMessage').textContent=explain(e);}};
    $('useCloud').onclick=()=>resolveConflict(false);$('useLocal').onclick=()=>resolveConflict(true);
    $('copyFriendCode').onclick=async()=>{try{await navigator.clipboard.writeText($('friendCode').textContent);toast('Freundescode kopiert.');}catch{toast('Halte den Code gedrückt, um ihn zu kopieren.');}};
    ForgeSocial.init();
    client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'&&user){generation++;user=null;ready=false;ForgeStore.select(null);setTimeout(()=>{renderData(ForgeStore.guest()||defaults());gate(true);mode('login');},0);}
      if(event==='SIGNED_IN'&&session&&!connecting&&session.user.id!==user?.id)setTimeout(()=>connect(session),0);
    });
    try{
      const r=await client.auth.getSession();if(r.error)throw r.error;
      if(r.data.session)await connect(r.data.session);
      else{mode('login');gate(true);status('Lokal · ohne Konto');}
    }catch(error){gate(true);message(explain(error),true);}
    window.addEventListener('online',()=>flush());
    window.addEventListener('offline',()=>status(user?'Offline · lokal gespeichert':'Nur auf diesem Gerät'));
    setInterval(()=>flush(),30000);
  }
  return {boot,save,flush,syncNow,open,guest,logout,importPayload,reset,normalize,defaults,resolveConflict,social,isSignedIn:()=>!!user&&ready,
    diagnostics:()=>({userId:user?.id || null,ready,version,syncing,conflict:!!conflict})};
})();
