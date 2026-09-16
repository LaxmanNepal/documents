(()=>{
  const $=s=>document.querySelector(s);
  const selected=new Set();
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function cardId(card){return card.querySelector('[data-trash],[data-delete],[data-restore]')?.dataset.trash||card.querySelector('[data-trash],[data-delete],[data-restore]')?.dataset.delete||card.querySelector('[data-trash],[data-delete],[data-restore]')?.dataset.restore}
  function ensure(){
    if($('#bulkBar'))return;
    const bar=document.createElement('section');bar.id='bulkBar';bar.className='bulk-bar glass';
    bar.innerHTML='<div><strong id="bulkCount">0 selected</strong><span>Choose documents to act on multiple files.</span></div><div class="bulk-actions"><button id="bulkDownload" class="ghost" type="button">Download</button><button id="bulkTrash" class="ghost" type="button">Move to Trash</button><button id="bulkClear" class="ghost" type="button">Clear</button></div>';
    const grid=$('#documentGrid');grid.insertAdjacentElement('beforebegin',bar);
    $('#bulkClear').onclick=()=>{selected.clear();renderChecks();};
    $('#bulkDownload').onclick=()=>{document.querySelectorAll('.bulk-check:checked').forEach(c=>c.closest('.doc')?.querySelector('[data-download]')?.click());};
    $('#bulkTrash').onclick=()=>{const cards=[...document.querySelectorAll('.bulk-check:checked')].map(c=>c.closest('.doc')).filter(Boolean);if(!cards.length)return;if(!confirm(`Move ${cards.length} document${cards.length===1?'':'s'} to Trash?`))return;cards.forEach(c=>c.querySelector('[data-trash]')?.click());selected.clear();};
  }
  function renderChecks(){
    ensure();
    document.querySelectorAll('#documentGrid .doc').forEach(card=>{
      let wrap=card.querySelector('.bulk-select');
      if(!wrap){wrap=document.createElement('label');wrap.className='bulk-select';wrap.innerHTML='<input class="bulk-check" type="checkbox"><span></span>';card.querySelector('.doc-top')?.appendChild(wrap);}
      const id=cardId(card);const input=wrap.querySelector('input');input.checked=!!id&&selected.has(id);input.onchange=()=>{if(!id)return;input.checked?selected.add(id):selected.delete(id);update()};
    });
    update();
  }
  function update(){const count=selected.size;const bar=$('#bulkBar');if(!bar)return;$('#bulkCount').textContent=`${count} selected`;bar.classList.toggle('has-selection',count>0);$('#bulkDownload').disabled=!count;$('#bulkTrash').disabled=!count;}
  const observer=new MutationObserver(()=>renderChecks());
  window.addEventListener('load',()=>{ensure();renderChecks();const grid=$('#documentGrid');if(grid)observer.observe(grid,{childList:true});});
})();
