(() => {
 let prompt;
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;});
 document.querySelectorAll('.install-button').forEach(button=>button.addEventListener('click',async()=>{
  if(prompt){await prompt.prompt();await prompt.userChoice;prompt=null;return;}
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
  alert(ios?'In Safari: Teilen → Zum Home-Bildschirm → Hinzufügen. Danach startet FORGE über das neue App-Symbol.':'Im Browser-Menü: App installieren oder Zum Startbildschirm hinzufügen. Nach dem ersten Online-Aufruf ist die Trainingsoberfläche auch offline verfügbar.');
 }));
 if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
