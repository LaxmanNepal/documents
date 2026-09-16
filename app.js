const cfg = window.VAULT_CONFIG || {};
const configured = cfg.supabaseUrl && !cfg.supabaseUrl.includes('YOUR_') && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.includes('YOUR_');
const supabase = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const bucket = cfg.bucket || 'documents';
const maxBytes = (Number(cfg.maxFileSizeMB) || 50) * 1024 * 1024;
let docs = [], activeCategory = 'All', activePreview = null;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmtSize = n => { if (!n) return '0 B'; const u=['B','KB','MB','GB']; const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),u.length-1); return `${(n/1024**i).toFixed(i?1:0)} ${u[i]}`; };
const iconFor = mime => mime?.includes('pdf') ? 'PDF' : mime?.startsWith('image/') ? 'IMG' : mime?.includes('word') ? 'DOC' : mime?.includes('sheet') ? 'XLS' : 'FILE';
const toast = msg => { const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); };
const authMsg = (msg, error=false) => { $('#authMessage').textContent=msg; $('#authMessage').style.color=error?'#ffb6b6':''; };

function showApp(session){
  $('#authView').classList.add('hidden'); $('#appView').classList.remove('hidden');
  $('#userEmail').textContent=session.user.email || 'Authenticated'; loadDocs();
}
function showAuth(){ $('#appView').classList.add('hidden'); $('#authView').classList.remove('hidden'); }

$('#loginForm').addEventListener('submit', async e=>{
  e.preventDefault();
  if(!supabase){ authMsg('Setup required: create config.js from config.example.js.', true); return; }
  authMsg('Unlocking…');
  const {error}=await supabase.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
  if(error) authMsg(error.message,true); else authMsg('');
});
$('#logoutBtn').onclick=async()=>{ if(supabase) await supabase.auth.signOut(); showAuth(); };

async function loadDocs(){
  if(!supabase) return;
  const {data,error}=await supabase.from('documents').select('*').order('created_at',{ascending:false});
  if(error){toast(error.message);return;} docs=data||[]; render();
}
function render(){
  const q=$('#search').value.trim().toLowerCase();
  const filtered=docs.filter(d=>(activeCategory==='All'||d.category===activeCategory)&&(!q||`${d.name} ${d.notes||''} ${d.category}`.toLowerCase().includes(q)));
  $('#statDocs').textContent=docs.length;
  $('#statSize').textContent=fmtSize(docs.reduce((a,d)=>a+(Number(d.size_bytes)||0),0));
  $('#statFav').textContent=docs.filter(d=>d.favorite).length;
  $('#emptyState').classList.toggle('hidden',docs.length>0);
  $('#documentGrid').innerHTML=filtered.map(doc=>`<article class="doc glass">
    <div class="doc-top"><div class="file-icon">${iconFor(doc.mime_type)}</div><button class="fav ${doc.favorite?'active':''}" data-fav="${doc.id}" title="Favorite">★</button></div>
    <h4 title="${esc(doc.name)}">${esc(doc.name)}</h4><div class="doc-meta">${esc(doc.category)} · ${fmtSize(Number(doc.size_bytes))} · ${new Date(doc.created_at).toLocaleDateString()}</div>
    <p class="doc-note">${esc(doc.notes||'No notes added.')}</p>
    <div class="doc-actions"><button data-preview="${doc.id}">Preview</button><button data-download="${doc.id}">Download</button></div>
  </article>`).join('');
  $('#emptyState').classList.toggle('hidden',filtered.length!==0 || docs.length===0 ? docs.length!==0 : false);
  if(docs.length>0 && filtered.length===0) $('#documentGrid').innerHTML='<div class="empty glass" style="grid-column:1/-1"><div>⌕</div><h3>No matching documents</h3><p class="muted">Try another search or category.</p></div>';
  document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.fav));
  document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>previewDoc(b.dataset.preview));
  document.querySelectorAll('[data-download]').forEach(b=>b.onclick=()=>downloadDoc(b.dataset.download));
}
$('#search').addEventListener('input',render);
$('#filters').addEventListener('click',e=>{const b=e.target.closest('.filter');if(!b)return;activeCategory=b.dataset.category;document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');render();});

async function toggleFavorite(id){
  const d=docs.find(x=>x.id===id); if(!d)return;
  const {error}=await supabase.from('documents').update({favorite:!d.favorite}).eq('id',id);
  if(error)toast(error.message);else{d.favorite=!d.favorite;render();}
}
function openDialog(id){$(id).showModal();}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('#uploadBtn').onclick=()=>{ $('#uploadForm').reset(); $('#uploadMessage').textContent=''; $('#uploadProgress').classList.add('hidden'); openDialog('uploadDialog'); };
$('#emptyUpload').onclick=()=>$('#uploadBtn').click();

$('#uploadForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const file=$('#fileInput').files[0]; if(!file)return;
  if(file.size>maxBytes){$('#uploadMessage').textContent=`File is larger than ${cfg.maxFileSizeMB||50} MB.`;return;}
  const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
  $('#uploadProgress').classList.remove('hidden'); $('#uploadProgress span').style.width='20%'; $('#uploadMessage').textContent='Uploading securely…';
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const path=`${user.id}/${crypto.randomUUID()}-${safe}`;
  const up=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
  if(up.error){$('#uploadMessage').textContent=up.error.message;$('#uploadProgress').classList.add('hidden');return;}
  $('#uploadProgress span').style.width='75%';
  const ins=await supabase.from('documents').insert({user_id:user.id,name:file.name,storage_path:path,mime_type:file.type||'application/octet-stream',size_bytes:file.size,category:$('#categoryInput').value,notes:$('#notesInput').value.trim()});
  if(ins.error){await supabase.storage.from(bucket).remove([path]);$('#uploadMessage').textContent=ins.error.message;return;}
  $('#uploadProgress span').style.width='100%'; $('#uploadMessage').textContent='Uploaded.'; setTimeout(()=>{$('#uploadDialog').close();loadDocs();toast('Document added to your vault.');},350);
});

async function signedUrl(d){
  const {data,error}=await supabase.storage.from(bucket).createSignedUrl(d.storage_path,300);
  if(error)throw error; return data.signedUrl;
}
async function previewDoc(id){
  const d=docs.find(x=>x.id===id);if(!d)return;activePreview=d;
  $('#previewTitle').textContent=d.name;$('#previewBody').innerHTML='<span class="muted">Preparing secure preview…</span>';openDialog('previewDialog');
  try{const url=await signedUrl(d); if(d.mime_type==='application/pdf') $('#previewBody').innerHTML=`<iframe src="${url}" title="${esc(d.name)}"></iframe>`; else if(d.mime_type.startsWith('image/')) $('#previewBody').innerHTML=`<img src="${url}" alt="${esc(d.name)}">`; else $('#previewBody').innerHTML='<span class="muted">This file type cannot be previewed in the browser. Use Download.</span>'; $('#previewDownload').onclick=()=>downloadDoc(d.id,url);}catch(err){$('#previewBody').textContent=err.message;}
}
async function downloadDoc(id,knownUrl){
  const d=docs.find(x=>x.id===id);if(!d)return;
  try{const url=knownUrl||await signedUrl(d);const a=document.createElement('a');a.href=url;a.download=d.name;a.target='_blank';document.body.appendChild(a);a.click();a.remove();toast('Secure download opened.');}catch(err){toast(err.message);}
}
$('#previewDownload').onclick=()=>activePreview&&downloadDoc(activePreview.id);

(async()=>{
  if(!supabase){authMsg('Create config.js from config.example.js to connect your private vault.',true);return;}
  const {data:{session}}=await supabase.auth.getSession(); if(session)showApp(session); else showAuth();
  supabase.auth.onAuthStateChange((_event,s)=>s?showApp(s):showAuth());
})();
