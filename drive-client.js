(() => {
  const cfg = window.VAULT_CONFIG || {};
  const gateway = cfg.driveGatewayUrl || (cfg.supabaseUrl ? `${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/drive-gateway` : '');

  async function accessToken() {
    if (!window.__vaultSupabase) throw new Error('Supabase client is unavailable.');
    const { data, error } = await window.__vaultSupabase.auth.getSession();
    if (error) throw error;
    const token = data?.session?.access_token;
    if (!token) throw new Error('Your vault session has expired. Please unlock again.');
    return token;
  }

  async function request(action, body = {}, options = {}) {
    if (!gateway) throw new Error('Google Drive gateway is not configured.');
    const token = await accessToken();
    const headers = { Authorization: `Bearer ${token}` };
    let payload;
    if (options.formData) payload = options.formData;
    else { headers['Content-Type'] = 'application/json'; payload = JSON.stringify({ action, ...body }); }
    const response = await fetch(gateway, { method: options.method || 'POST', headers, body: payload });
    if (!response.ok) {
      let message = `Drive request failed (${response.status})`;
      try { const json = await response.json(); message = json.error || json.message || message; } catch (_) {}
      throw new Error(message);
    }
    return options.raw ? response : response.json();
  }

  async function status() {
    if (!gateway) throw new Error('Google Drive gateway is not configured.');
    const token = await accessToken();
    const response = await fetch(gateway, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Google Drive status check failed.');
    return response.json();
  }

  async function upload(file, folder) {
    const form = new FormData();
    form.append('action', 'upload');
    if (folder) form.append('folder', folder);
    form.append('file', file, file.name);
    return request('upload', {}, { formData: form });
  }

  async function download(fileId) { return request('download', { fileId }, { raw: true }); }

  window.DriveClient = {
    enabled: () => Boolean(gateway && cfg.storageProvider === 'google-drive'),
    gateway,
    status,
    list: (pageToken) => request('list', pageToken ? { pageToken } : {}),
    get: (fileId) => request('get', { fileId }),
    createFolder: (name, parentId) => request('folder', { name, parentId }),
    upload,
    download,
    trash: (fileId) => request('trash', { fileId }),
    remove: (fileId) => request('delete', { fileId })
  };
})();
