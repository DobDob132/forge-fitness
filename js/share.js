const ForgeShare=(()=>{
  const INVITE_KEY='forgePendingFriendInvite',PARAM='freund';
  const $=id=>document.getElementById(id),tr=text=>typeof I18n==='undefined'?text:I18n.translate(text);
  const validCode=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value||'');
  function cleanAppUrl(){const url=new URL(location.href);url.searchParams.delete(PARAM);url.hash='';return url.href;}
  function inviteUrl(code){const url=new URL(cleanAppUrl());url.hash=new URLSearchParams({[PARAM]:code}).toString();return url.href;}
  function pending(){const code=sessionStorage.getItem(INVITE_KEY)||'';return validCode(code)?code:'';}
  function captureInvite(){
    const url=new URL(location.href),hash=new URLSearchParams(url.hash.replace(/^#/,'')),code=hash.get(PARAM)||url.searchParams.get(PARAM)||'';
    if(!validCode(code))return;
    sessionStorage.setItem(INVITE_KEY,code);url.searchParams.delete(PARAM);if(hash.has(PARAM))url.hash='';history.replaceState(history.state,'',url.href);
  }
  async function copy(text){
    if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return;}catch{} }
    const field=document.createElement('textarea');field.value=text;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();const ok=document.execCommand('copy');field.remove();if(!ok)throw Error('Kopieren nicht möglich');
  }
  async function share({title,text,url},copiedMessage){
    if(navigator.share){try{await navigator.share({title,text,url});return true;}catch(error){if(error?.name==='AbortError')return false;}}
    try{await copy(url);toast(tr(copiedMessage));return true;}catch{toast(tr('Der Link konnte nicht automatisch kopiert werden.'));return false;}
  }
  function shareApp(){return share({title:'FORGE – Build. Train. Progress.',text:tr('Trainiere mit FORGE und behalte deine Fortschritte im Blick.'),url:cleanAppUrl()},'App-Link kopiert.');}
  function shareFriend(){
    const code=$('friendCode')?.textContent.trim();if(!validCode(code)){toast(tr('Deine Freundschaftseinladung ist noch nicht geladen.'));return;}
    return share({title:tr('Freundschaftseinladung zu FORGE'),text:tr('Füge mich bei FORGE als Freund hinzu.'),url:inviteUrl(code)},'Einladungslink kopiert.');
  }
  function updateInviteUi(){const code=pending();$('friendInviteGate')?.classList.toggle('hidden',!code);return code;}
  function presentPendingInvite(){
    const code=updateInviteUi(),input=$('friendInput');if(!code||!input)return false;
    input.value=code;$('friendInviteNotice')?.classList.remove('hidden');
    const navButton=[...document.querySelectorAll('#nav button')].find(button=>button.getAttribute('onclick')?.includes("'friends'"));
    show('friends',navButton);ForgeSocial.switchView('people');toast(tr('Einladung bereit. Tippe auf „Anfragen“, um sie zu senden.'));
    setTimeout(()=>{$('friendInviteNotice')?.scrollIntoView({behavior:'smooth',block:'center'});},50);return true;
  }
  function completeInvite(code){if(code&&code===pending())sessionStorage.removeItem(INVITE_KEY);$('friendInviteNotice')?.classList.add('hidden');updateInviteUi();}
  function init(){captureInvite();updateInviteUi();document.querySelectorAll('[data-share-app]').forEach(button=>button.addEventListener('click',shareApp));$('shareFriendLink')?.addEventListener('click',shareFriend);}
  return {init,shareApp,shareFriend,presentPendingInvite,completeInvite,hasPendingInvite:()=>!!pending(),_test:{cleanAppUrl,inviteUrl,validCode}};
})();
