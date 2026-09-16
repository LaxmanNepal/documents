(()=>{
  const key='laxman-vault-view-mode';
  const grid=()=>document.querySelector('#documentGrid');
  const toolbar=()=>document.querySelector('.toolbar');
  const get=()=>localStorage.getItem(key)||'grid';
  function apply(mode){const g=grid();if(!g)return;g.dataset.viewMode=mode;document.querySelectorAll('[data-view-mode]').forEach(b=>{const on=b.dataset.viewMode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false')});localStorage.setItem(key,mode)}
  function mount(){if(document.querySelector('#viewModeToggle'))return;const t=toolbar();if(!t)return;const wrap=document.createElement('div');wrap.id='viewModeToggle';wrap.className='view-mode-toggle';wrap.innerHTML='<span class="view-mode-label">View</span><button type="button" class="view-mode-btn" data-view-mode="grid" aria-label="Grid view" title="Grid view">▦</button><button type="button" class="view-mode-btn" data-view-mode="list" aria-label="List view" title="List view">☷</button>';t.appendChild(wrap);wrap.addEventListener('click',e=>{const b=e.target.closest('[data-view-mode]');if(b)apply(b.dataset.viewMode)});apply(get())}
  const boot=()=>{mount();apply(get())};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  new MutationObserver(()=>{mount();apply(get())}).observe(document.body,{childList:true,subtree:true});
})();
