(() => {
 let prompt;
 const modal=document.getElementById('installModal'),steps=document.getElementById('installSteps');
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
 const close=()=>{modal.style.display='none';};
 const help=()=>{
  const ua=navigator.userAgent,ios=/iPad|iPhone|iPod/.test(ua),android=/Android/i.test(ua),safari=/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS/i.test(ua);
  let title='Im Browser installieren',body='Öffne das Browser-Menü und wähle <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>.';
  if(ios) {title='Auf iPhone oder iPad';body=safari?'Tippe unten auf <b>Teilen</b> und danach auf <b>Zum Home-Bildschirm</b>.':'Öffne den kopierten Link in <b>Safari</b>. Tippe dort auf <b>Teilen</b> und anschließend auf <b>Zum Home-Bildschirm</b>.';}
  else if(android) {title='Auf Android';body='Öffne den kopierten Link in <b>Chrome</b>. Tippe oben rechts auf <b>⋮</b> und wähle <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>.';}
  else body='Öffne den kopierten Link in <b>Edge</b> oder <b>Chrome</b>. Wähle im Browser-Menü <b>Apps → FORGE installieren</b>.';
  steps.innerHTML=`<h3>${title}</h3><p>${body}</p><p class="account-note">Eingebettete Browser, zum Beispiel in ChatGPT oder anderen Apps, können den Installationsdialog nicht selbst öffnen.</p>`;
  modal.style.display='flex';
 };
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;});
 document.querySelectorAll('.install-button').forEach(button=>button.addEventListener('click',async()=>{
  if(standalone()){toast('FORGE ist bereits als App geöffnet.');return;}
  if(prompt){await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')prompt=null;return;}
  help();
 }));
 document.getElementById('installClose').onclick=close;
 document.getElementById('installDone').onclick=close;
 document.getElementById('installCopyLink').onclick=async()=>{try{await navigator.clipboard.writeText(location.href.split('#')[0]);toast('FORGE-Link kopiert. Öffne ihn jetzt im normalen Browser.');}catch{toast('Kopiere die Adresse oben aus dem Browser.');}};
 window.addEventListener('appinstalled',()=>{prompt=null;close();toast('FORGE wurde installiert.');});
 if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
