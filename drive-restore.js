(() => {
  const wired = new WeakSet();

  async function restore(id, button) {
    const supabase = window.__vaultSupabase;
    const drive = window.DriveClient;
    if (!supabase || !drive?.enabled?.()) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Restoring…';
    try {
      const { data, error } = await supabase.from('documents').select('id,storage_provider,drive_file_id').eq('id', id).single();
      if (error) throw error;
      if (data?.storage_provider === 'google-drive' && data.drive_file_id) {
        await drive.restore(data.drive_file_id);
      }
      const update = await supabase.from('documents').update({ deleted_at: null }).eq('id', id);
      if (update.error) throw update.error;
      button.textContent = 'Restored';
      setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent = error?.message || 'Restore failed.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2600);
      }
    }
  }

  function wire() {
    document.querySelectorAll('[data-restore]').forEach(button => {
      if (wired.has(button)) return;
      wired.add(button);
      const id = button.dataset.restore;
      button.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        restore(id, button);
      };
    });
  }

  new MutationObserver(wire).observe(document.body, { childList: true, subtree: true });
  wire();
})();
