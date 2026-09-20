// The original guest key is preserved. Account caches never share that key.
const ForgeStore = (() => {
  let account = null;
  const key = id => id ? `forgeData:account:${id}` : 'forgeData';
  function envelope(id = account) {
    const raw = localStorage.getItem(key(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
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
    backup: (label, payload) => localStorage.setItem(`forgeBackup:${account || 'guest'}:${Date.now()}:${label}`, JSON.stringify(payload)),
    guest: () => envelope(null)?.payload || null,
    clearGuest: () => localStorage.removeItem('forgeData')
  };
})();
