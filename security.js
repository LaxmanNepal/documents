(() => {
  const cfg = window.VAULT_CONFIG || {};
  const url = cfg.supabaseUrl;
  const key = cfg.supabaseAnonKey;
  if (!url || !key || url.includes('YOUR_') || key.includes('YOUR_') || !window.supabase) return;

  const client = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const idleMs = Math.max(5, Number(cfg.autoLockMinutes) || 15) * 60 * 1000;
  let lastActivity = Date.now();
  let hiddenAt = null;
  let timer = null;
  let signingOut = false;

  const activity = () => {
    if (!document.hidden) lastActivity = Date.now();
  };

  const hardLock = async (reason) => {
    if (signingOut) return;
    signingOut = true;
    try { await client.auth.signOut({ scope: 'local' }); } catch (_) {}
    try { sessionStorage.setItem('vaultLockReason', reason); } catch (_) {}
    window.location.reload();
  };

  const check = () => {
    if (document.hidden) {
      if (hiddenAt && Date.now() - hiddenAt >= idleMs) hardLock('Vault session ended after inactivity.');
      return;
    }
    if (Date.now() - lastActivity >= idleMs) hardLock('Vault session ended after inactivity.');
  };

  ['pointerdown','keydown','touchstart','scroll'].forEach(type =>
    window.addEventListener(type, activity, { passive: true })
  );

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else {
      hiddenAt = null;
      lastActivity = Date.now();
      client.auth.getSession().then(({ data }) => {
        if (!data.session) window.location.reload();
      });
    }
  });

  window.addEventListener('pageshow', () => {
    lastActivity = Date.now();
    client.auth.getSession().then(({ data }) => {
      if (!data.session && document.querySelector('#appView:not(.hidden)')) window.location.reload();
    });
  });

  timer = window.setInterval(check, 1000);

  const reason = (() => {
    try { const r = sessionStorage.getItem('vaultLockReason'); sessionStorage.removeItem('vaultLockReason'); return r; } catch (_) { return null; }
  })();
  if (reason) setTimeout(() => {
    const message = document.querySelector('#authMessage');
    if (message) message.textContent = reason;
  }, 0);
})();
