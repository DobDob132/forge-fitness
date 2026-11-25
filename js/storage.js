// The original guest key is preserved. Account caches never share that key.
const ForgeStore = (() => {
  let account = null, backupSequence = 0, warning = '';
  const key = id => id ? `forgeData:account:${id}` : 'forgeData';
  function envelope(id = account) {
    const raw = localStorage.getItem(key(id));
    if (!raw) return null;
    let parsed;
    try {
      parsed = JSON.parse(raw);
      if(!parsed || typeof parsed!=='object' || Array.isArray(parsed) || (id && (!parsed.payload || !Number.isSafeInteger(parsed.version) || parsed.version<0 || typeof parsed.dirty!=='boolean')))throw Error('Ungültiger Speicherstand');
    } catch {
      // Preserve the original bytes before allowing a fresh profile to be used.
      localStorage.setItem(`forgeBackup:${id || 'guest'}:${Date.now()}:${++backupSequence}:corrupt`,raw);
      warning='Ein beschädigter lokaler Speicherstand wurde gesichert. Du kannst eine gültige Sicherung importieren.';
      return null;
    }
    return id ? parsed : {payload: parsed, version: 0, dirty: false};
  }
  return {
    account: () => account,
    select: id => { account = id || null; },
    read: () => { const e = envelope(); return e ? JSON.stringify(e.payload) : null; },
    envelope,
    write: (payload, version = 0, dirty = true) => {
      const e = {payload, version, dirty};
      localStorage.setItem(key(account), JSON.stringify(account ? e : payload));
      return e;
    },
    backup: (label, payload) => localStorage.setItem(`forgeBackup:${account || 'guest'}:${Date.now()}:${++backupSequence}:${label}`, JSON.stringify(payload)),
    warning: () => {const result=warning;warning='';return result;},
    guest: () => envelope(null)?.payload || null,
    clearGuest: () => localStorage.removeItem('forgeData')
  };
})();
