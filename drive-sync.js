(() => {
  const cfg = window.VAULT_CONFIG || {};
  const bucket = cfg.bucket || 'documents';
  const $ = (s) => document.querySelector(s);

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2800);
  }

  function ensureButton() {
    if (!window.DriveClient?.enabled?.() || $('#syncDriveBtn')) return;
    const heroActions = $('.hero .upload-hero')?.parentElement;
    if (!heroActions) return;
    const button = document.createElement('button');
    button.id = 'syncDriveBtn';
    button.className = 'ghost upload-hero';
    button.type = 'button';
    button.textContent = '↗ Sync existing files';
    button.onclick = syncExisting;
    heroActions.appendChild(button);
  }

  async function syncExisting() {
    const supabase = window.__vaultSupabase;
    if (!supabase || !window.DriveClient?.enabled?.()) return;

    const button = $('#syncDriveBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Syncing…';
    }

    try {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('id,name,storage_path,storage_provider,drive_file_id,mime_type,size_bytes,folder,deleted_at')
        .is('deleted_at', null)
        .or('storage_provider.is.null,storage_provider.neq.google-drive')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!docs?.length) {
        toast('Everything is already synced to Google Drive.');
        return;
      }

      let synced = 0;
      let failed = 0;
      for (const doc of docs) {
        try {
          if (!doc.storage_path) throw new Error('Missing storage path');
          const download = await supabase.storage.from(bucket).download(doc.storage_path);
          if (download.error) throw download.error;

          const file = new File([download.data], doc.name, {
            type: doc.mime_type || download.data.type || 'application/octet-stream'
          });
          const result = await window.DriveClient.upload(file, doc.folder || 'Home');
          const driveFile = result?.file;
          if (!driveFile?.id) throw new Error('Drive upload returned no file ID');

          const update = await supabase.from('documents').update({
            storage_provider: 'google-drive',
            drive_file_id: driveFile.id,
            storage_path: `drive:${driveFile.id}`,
            mime_type: driveFile.mimeType || doc.mime_type,
            size_bytes: Number(driveFile.size || doc.size_bytes || file.size)
          }).eq('id', doc.id);
          if (update.error) {
            await window.DriveClient.remove(driveFile.id).catch(() => {});
            throw update.error;
          }
          synced++;
          if (button) button.textContent = `Syncing ${synced}/${docs.length}…`;
        } catch (err) {
          failed++;
          console.error('Drive sync failed', doc.name, err);
        }
      }

      toast(`Drive sync complete: ${synced} synced${failed ? ` · ${failed} failed` : ''}.`);
      if (typeof window.loadVaultDocs === 'function') window.loadVaultDocs();
      else window.location.reload();
    } catch (err) {
      toast(`Drive sync: ${err.message}`);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = '↗ Sync existing files';
      }
    }
  }

  window.DriveSync = { syncExisting };
  const init = () => ensureButton();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(ensureButton, 900);
})();
