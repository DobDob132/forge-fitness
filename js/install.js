(() => {
 let prompt;
 const modal=document.getElementById('installModal'),steps=document.getElementById('installSteps');
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
 const installUrl=new URL('./',location.href).href;
 const close=()=>{modal.style.display='none';};
 const help=()=>{
  const ua=navigator.userAgent,ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/i.test(ua),safari=/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS/i.test(ua);
  let title='Im Browser installieren',body='Öffne das Browser-Menü und wähle <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>.';
  if(ios) {title='Auf iPhone oder iPad';body=safari?'Tippe in <b>Safari</b> auf <b>Teilen</b> und dann auf <b>Zum Home-Bildschirm</b>.':'Kopiere den FORGE-Link und öffne ihn in <b>Safari</b>. Tippe dort auf <b>Teilen</b> und dann auf <b>Zum Home-Bildschirm</b>.';}
  else if(android) {title='Auf Android';body='Kopiere den FORGE-Link und öffne ihn in <b>Chrome</b>. Tippe auf <b>⋮</b> und wähle <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>.';}
  else body='Öffne den FORGE-Link in <b>Edge</b> oder <b>Chrome</b>. Wähle im Browser-Menü <b>Apps → FORGE installieren</b>.';
  steps.innerHTML=`<h3>${title}</h3><p>${body}</p><p class="account-note">In eingebetteten Browsern, zum Beispiel in ChatGPT, ist die Installation nicht möglich. Kopiere den Link unten und öffne ihn direkt im Browser.</p>`;
  const address=document.createElement('p');address.className='account-note install-url';address.textContent=installUrl;steps.append(address);
  modal.style.display='flex';
 };
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;});
 document.querySelectorAll('.install-button').forEach(button=>button.addEventListener('click',async()=>{
  if(standalone()){toast('FORGE ist bereits als App geöffnet.');return;}
  if(prompt){const currentPrompt=prompt;prompt=null;try{await currentPrompt.prompt();const choice=await currentPrompt.userChoice;if(choice.outcome!=='accepted')help();}catch{help();}return;}
  help();
 }));
 document.getElementById('installClose').onclick=close;
 document.getElementById('installDone').onclick=close;
 document.getElementById('installCopyLink').onclick=async()=>{try{await navigator.clipboard.writeText(installUrl);toast('FORGE-Link kopiert. Öffne ihn jetzt im normalen Browser.');}catch{help();toast('Kopiere den angezeigten FORGE-Link.');}};
 window.addEventListener('appinstalled',()=>{prompt=null;close();toast('FORGE wurde installiert.');});
 if('serviceWorker' in navigator && location.protocol!=='file:'){
  if(navigator.serviceWorker.controller){
   const notice=document.createElement('div'),message=document.createElement('span'),update=document.createElement('button'),workout=document.getElementById('workout');
   notice.className='app-update';notice.setAttribute('role','status');update.type='button';update.className='btn secondary';notice.append(message,update);
   const renderNotice=()=>{
    const active=!workout.classList.contains('hidden'),lang=I18n.language();
    const words=lang==='en'?['A new version is ready.','Update after your workout.','Update now']:lang==='el'?['Υπάρχει νέα έκδοση.','Ενημέρωσε μετά την προπόνηση.','Ενημέρωση τώρα']:['Eine neue Version ist verfügbar.','Nach dem Training aktualisieren.','Jetzt aktualisieren'];
    message.textContent=active?words[1]:words[0];update.textContent=words[2];update.disabled=active;
   };
   navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!notice.isConnected)document.body.append(notice);renderNotice();});
   new MutationObserver(()=>{if(notice.isConnected)renderNotice();}).observe(workout,{attributes:true,attributeFilter:['class']});
   window.addEventListener('forge-language-change',()=>{if(notice.isConnected)renderNotice();});
   update.onclick=()=>location.reload();
  }
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(registration=>{
   const check=()=>registration.update().catch(()=>{});check();window.addEventListener('focus',check);window.setInterval?.(check,60*60*1000);
  }).catch(()=>{});
 }
})();
