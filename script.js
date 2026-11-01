import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase.js";
const $ = id => document.getElementById(id);
const loginModal=$('loginModal'), loginForm=$('loginForm'), loginMessage=$('loginMessage'), profileModal=$('profileModal'), subjectModal=$('subjectModal');
function setOwnerMode(on){document.body.classList.toggle('owner-mode',on);$('loginButton').textContent=on?'Logout Pemilik':'Login Pemilik';const action=$('workspaceLoginAction');if(action)action.textContent=on?'Logout Pemilik':'Login Pemilik';}
function showModal(el){el.classList.add('active');el.setAttribute('aria-hidden','false');}
function hideModal(el){el.classList.remove('active');el.setAttribute('aria-hidden','true');}
function showLogin(){loginMessage.textContent='';showModal(loginModal);}
async function verifyOwner(){const {data:{session}}=await supabase.auth.getSession();if(!session){setOwnerMode(false);return false;}const {data,error}=await supabase.rpc('is_site_owner');if(error||data!==true){await supabase.auth.signOut();setOwnerMode(false);return false;}setOwnerMode(true);await loadProfile();return true;}
$('loginButton').addEventListener('click',async()=>{const {data:{session}}=await supabase.auth.getSession();if(session&&document.body.classList.contains('owner-mode')){await supabase.auth.signOut();setOwnerMode(false);await loadSubjects();}else showLogin();});
$('visitorButton').addEventListener('click',async()=>{await supabase.auth.signOut();setOwnerMode(false);hideModal(loginModal);await loadSubjects();window.scrollTo({top:0,behavior:'smooth'});});
$('closeLoginModal').addEventListener('click',()=>hideModal(loginModal));$('cancelLogin').addEventListener('click',()=>hideModal(loginModal));loginModal.addEventListener('click',e=>{if(e.target===loginModal)hideModal(loginModal);});
loginForm.addEventListener('submit',async e=>{e.preventDefault();const b=loginForm.querySelector('[type=submit]');b.disabled=true;loginMessage.textContent='Memeriksa akun...';const {error}=await supabase.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){loginMessage.textContent='Login gagal. Periksa email dan password.';b.disabled=false;return;}const ok=await verifyOwner();b.disabled=false;if(!ok){loginMessage.textContent='Akun ini tidak terdaftar sebagai pemilik Academic Notes.';return;}hideModal(loginModal);loginForm.reset();await loadSubjects();});
function openProfile(){$('editName').value=$('studentName').textContent.trim();$('editNim').value=$('studentNim').textContent.trim();$('editProgram').value=$('studentProgram').textContent.trim();$('editFaculty').value=$('studentFaculty').textContent.trim();$('editUniversity').value=$('studentUniversity').textContent.trim();showModal(profileModal);}
$('editProfileButton').addEventListener('click',openProfile);$('closeProfileModal').addEventListener('click',()=>hideModal(profileModal));$('cancelProfileEdit').addEventListener('click',()=>hideModal(profileModal));profileModal.addEventListener('click',e=>{if(e.target===profileModal)hideModal(profileModal);});
$('profileForm').addEventListener('submit',async e=>{e.preventDefault();if(!document.body.classList.contains('owner-mode'))return alert('Login sebagai pemilik terlebih dahulu.');const {data:{user}}=await supabase.auth.getUser();if(!user)return alert('Sesi login berakhir.');const row={id:user.id,full_name:$('editName').value.trim(),nim:$('editNim').value.trim(),study_program:$('editProgram').value.trim(),faculty:$('editFaculty').value.trim(),university:$('editUniversity').value.trim(),updated_at:new Date().toISOString()};const {error}=await supabase.from('profiles').upsert(row);if(error)return alert('Profil belum tersimpan: '+error.message);$('studentName').textContent=row.full_name;$('studentNim').textContent=row.nim;$('studentProgram').textContent=row.study_program;$('studentFaculty').textContent=row.faculty;$('studentUniversity').textContent=row.university;hideModal(profileModal);alert('Profil berhasil disimpan.');});
async function loadProfile(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data,error}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();if(error||!data)return;if(data.full_name)$('studentName').textContent=data.full_name;if(data.nim)$('studentNim').textContent=data.nim;if(data.study_program)$('studentProgram').textContent=data.study_program;if(data.faculty)$('studentFaculty').textContent=data.faculty;if(data.university)$('studentUniversity').textContent=data.university;for(const [bucket,path,img] of [['profile-images',data.avatar_path,'profilePreview'],['cover-images',data.cover_path,'coverPreview']])if(path){const {data:u}=supabase.storage.from(bucket).getPublicUrl(path);$(img).src=u.publicUrl;}}
async function uploadImage(file,bucket,previewId,column){if(!file)return;if(!document.body.classList.contains('owner-mode'))return alert('Login sebagai pemilik terlebih dahulu.');if(!['image/jpeg','image/png','image/webp'].includes(file.type))return alert('Gunakan JPG, PNG, atau WEBP.');if(file.size>5*1024*1024)return alert('Ukuran maksimal 5 MB.');const {data:{user}}=await supabase.auth.getUser();if(!user)return alert('Sesi login tidak ditemukan.');const ext=file.name.split('.').pop().toLowerCase(),path=`${user.id}/${Date.now()}.${ext}`;const {error:upErr}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type});if(upErr)return alert('Upload gagal: '+upErr.message);const {error}=await supabase.from('profiles').upsert({id:user.id,[column]:path,updated_at:new Date().toISOString()});if(error)return alert('Gambar terunggah, tetapi profil gagal diperbarui: '+error.message);const {data:u}=supabase.storage.from(bucket).getPublicUrl(path);$(previewId).src=u.publicUrl;alert('Gambar berhasil diunggah.');}
$('changeProfilePhoto').addEventListener('click',()=>$('profileUpload').click());$('profileUpload').addEventListener('change',e=>uploadImage(e.target.files[0],'profile-images','profilePreview','avatar_path'));$('changeCoverButton').addEventListener('click',()=>$('coverUpload').click());$('coverUpload').addEventListener('change',e=>uploadImage(e.target.files[0],'cover-images','coverPreview','cover_path'));
async function loadSubjects(){
  const isOwner=document.body.classList.contains('owner-mode');
  const courseTitle='Akuntansi Keuangan Lanjutan';
  let q=supabase.from('subjects').select('id,title,description,sort_order,is_public').eq('title',courseTitle).order('created_at');
  if(!isOwner)q=q.eq('is_public',true);
  let {data,error}=await q;
  if(error){$('subjectList').innerHTML='<p class="subject-loading">Ruang mata kuliah belum dapat dimuat.</p>';console.error(error);return;}
  data=data||[];
  if(isOwner&&data.length===0){
    const {data:{user}}=await supabase.auth.getUser();
    const {data:created,error:createError}=await supabase.from('subjects').insert({owner_id:user.id,title:courseTitle,description:'Tempat menyimpan catatan, materi, dan referensi perkuliahan Akuntansi Keuangan Lanjutan.',sort_order:1,is_public:true}).select().single();
    if(!createError)data=[created];else console.error(createError);
  }
  if(!data.length){$('subjectList').innerHTML='<p class="subject-loading">Ruang Akuntansi Keuangan Lanjutan belum tersedia.</p>';return;}
  const s=data[0];
  $('subjectList').innerHTML=`<article class="subject-card"><div class="subject-icon">✳</div><div class="subject-information"><span>LEARNING SPACE · 01</span><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description||'Ruang untuk catatan dan materi Akuntansi Keuangan Lanjutan.')}</p></div><button type="button" data-open-subject="${s.id}" data-subject-action="${isOwner?'add':'view'}" class="subject-link subject-action">${isOwner?'＋ Tambah Catatan':'Lihat Catatan →'}</button></article>`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
if($('addSubjectButton'))$('addSubjectButton').addEventListener('click',()=>notify('Academic Notes saat ini difokuskan pada mata kuliah Akuntansi Keuangan Lanjutan.'));$('closeSubjectModal').addEventListener('click',()=>hideModal(subjectModal));$('cancelSubject').addEventListener('click',()=>hideModal(subjectModal));subjectModal.addEventListener('click',e=>{if(e.target===subjectModal)hideModal(subjectModal);});
$('subjectForm').addEventListener('submit',e=>{e.preventDefault();notify('Website ini difokuskan pada satu mata kuliah: Akuntansi Keuangan Lanjutan.');});
supabase.auth.onAuthStateChange(async(_event,session)=>{if(!session){setOwnerMode(false);await loadSubjects();await loadGlobalToc();}else{await loadSubjects();await loadGlobalToc();}});


// ===== RUANG CATATAN (HALAMAN KEDUA DALAM WEBSITE YANG SAMA) =====
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3.2.6/+esm";
const $n=id=>document.getElementById(id);
let subjectId=null,currentReaderNoteId=null;
let isOwner=false,currentUser=null,currentNoteId=null,currentNoteStatus='draft',currentCoverPath=null,originalCoverPath=null,noticeTimer;
function notify(msg){const n=$n('notice');n.textContent=msg;n.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.classList.remove('show'),2800);}
function safeText(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setMode(owner){isOwner=owner;document.body.classList.toggle('owner-mode',owner);const accessLabel=$n('accessLabel');const addNoteButton=$n('addNoteButton');if(accessLabel)accessLabel.textContent=owner?'MODE PEMILIK':'MODE PENGUNJUNG';if(addNoteButton)addNoteButton.hidden=!owner;}
async function initNotes(id){
  subjectId=id;
  currentNoteId=null;
  $n('noteEditorPanel').hidden=true;
  $n('noteReader').hidden=true;
  $n('notesList').hidden=false;
  $n('notesListHeader')?.classList.remove('hidden');

  // Gunakan status pemilik yang sudah diverifikasi saat inisialisasi aplikasi.
  // Jangan mengulang RPC is_site_owner di sini karena dapat terjadi race
  // dengan pemulihan sesi/auth state saat workspace pertama kali dibuka.
  isOwner=document.body.classList.contains('owner-mode');
  currentUser=null;
  if(isOwner){
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user){
      isOwner=false;
      setOwnerMode(false);
    }else{
      currentUser=user;
    }
  }
  setMode(isOwner);

  const {data:subject,error}=await supabase
    .from('subjects')
    .select('id,title,description')
    .eq('id',subjectId)
    .maybeSingle();

  if(error||!subject){
    $n('subjectHeading').textContent='Mata kuliah tidak ditemukan';
    $n('subjectDescription').textContent='Mata kuliah ini belum tersedia untuk pengunjung.';
    console.error('Gagal memuat mata kuliah:',error);
    return;
  }

  $n('subjectHeading').textContent=subject.title;
  $n('subjectDescription').textContent=subject.description||'Catatan dan materi perkuliahan tersusun dalam satu tempat.';
  await loadNotes();
}
async function loadNotes(){let q=supabase.from('notes').select('id,title,excerpt,status,published_at,updated_at,created_at,cover_path').eq('subject_id',subjectId).order('updated_at',{ascending:false});if(!isOwner)q=q.eq('status','published');const {data,error}=await q;if(error){$n('notesList').innerHTML='<p class="empty-notes">Catatan belum dapat dimuat.</p>';console.error(error);return;}const notes=data||[];$n('noteCount').textContent=`${notes.length} catatan`;$n('notesList').innerHTML=notes.length?notes.map(n=>`<article class="note-card">${n.cover_path?`<img class="note-card-cover" src="${safeText(supabase.storage.from('note-images').getPublicUrl(n.cover_path).data.publicUrl)}" alt="Sampul ${safeText(n.title)}">`:''}<div class="note-card-information"><span class="note-card-meta">${n.status==='draft'?'DRAFT':'PUBLISHED'} · ${new Date(n.updated_at||n.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</span><h3>${safeText(n.title||'Tanpa judul')}</h3><p>${safeText(n.excerpt||'Buka untuk membaca catatan lengkap.')}</p></div><div class="note-card-actions"><button class="open-note" data-open="${n.id}">Buka ↗</button>${isOwner?`<button type="button" data-edit="${n.id}">Edit</button><button type="button" class="delete-note-button" data-delete-note="${n.id}">Hapus</button>`:''}</div></article>`).join(''):`<p class="empty-notes">${isOwner?'Belum ada catatan. Klik “Tambah Catatan” untuk mulai menulis.':'Belum ada catatan yang dipublikasikan.'}</p>`;}
async function deleteNote(id){if(!isOwner||!currentUser)return notify('Login pemilik diperlukan.');const confirmed=window.confirm('Hapus catatan ini? Referensi akademik akan tetap disimpan.');if(!confirmed)return;const {data:images}=await supabase.from('note_images').select('storage_path').eq('note_id',id);const imagePaths=(images||[]).map(x=>x.storage_path).filter(Boolean);if(imagePaths.length){const {error:imageError}=await supabase.storage.from('note-images').remove(imagePaths);if(imageError)console.warn('Gambar catatan belum berhasil dibersihkan:',imageError.message);}const {error}=await supabase.from('notes').delete().eq('id',id);if(error){notify('Catatan gagal dihapus: '+error.message);console.error(error);return;}if(currentNoteId===id){currentNoteId=null;$n('noteEditorPanel').hidden=true;}if(currentReaderNoteId===id){currentReaderNoteId=null;$n('noteReader').hidden=true;$n('notesList').hidden=false;$n('notesListHeader')?.classList.remove('hidden');}$n('readerOwnerActions').hidden=true;notify('Catatan berhasil dihapus.');await loadNotes();await loadGlobalToc();}
$n('notesList').addEventListener('click',e=>{const open=e.target.closest('[data-open]'),edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete-note]');if(open)openNote(open.dataset.open);else if(edit)editNote(edit.dataset.edit);else if(del)deleteNote(del.dataset.deleteNote);});
function openEditor(note=null){if(currentReaderNoteId)$n('noteReader').hidden=true;currentNoteId=note?.id||null;currentNoteStatus=note?.status||'draft';$n('editorHeading').textContent=note?'Edit Catatan':'Buat Catatan Baru';$n('noteTitle').value=note?.title||'';$n('noteContent').innerHTML=note?.content_html||'';currentCoverPath=note?.cover_path||null;originalCoverPath=currentCoverPath;$n('noteCoverInput').value='';if(currentCoverPath){$n('noteCoverPreview').src=supabase.storage.from('note-images').getPublicUrl(currentCoverPath).data.publicUrl;$n('noteCoverPreview').hidden=false;}else{$n('noteCoverPreview').removeAttribute('src');$n('noteCoverPreview').hidden=true;}$n('saveStatus').textContent=note?'Mengedit catatan tersimpan':'Catatan belum disimpan';$n('referenceForm').hidden=true;$n('noteEditorPanel').hidden=false;$n('noteEditorPanel').scrollIntoView({behavior:'smooth',block:'start'});$n('noteTitle').focus();if(currentNoteId)loadNoteReferences();else $n('noteReferencesList').innerHTML='<p class="reference-empty">Simpan draft terlebih dahulu saat menambahkan referensi.</p>';}
$n('addNoteButton').addEventListener('click',()=>{if(!isOwner)return notify('Login pemilik diperlukan.');currentReaderNoteId=null;openEditor();});$n('closeEditor').addEventListener('click',()=>{$n('noteEditorPanel').hidden=true;if(currentReaderNoteId){openNote(currentReaderNoteId);}else{$n('notesList').hidden=false;$n('notesListHeader')?.classList.remove('hidden');}});
document.querySelectorAll('[data-cmd]').forEach(b=>b.addEventListener('click',()=>{ $n('noteContent').focus();document.execCommand(b.dataset.cmd,false,null);}));$n('fontFamily').addEventListener('change',e=>{ $n('noteContent').focus();document.execCommand('fontName',false,e.target.value);});$n('fontSize').addEventListener('change',e=>{ $n('noteContent').focus();document.execCommand('fontSize',false,e.target.value);});$n('textColor').addEventListener('input',e=>{ $n('noteContent').focus();document.execCommand('foreColor',false,e.target.value);});$n('blockFormat').addEventListener('change',e=>{ $n('noteContent').focus();document.execCommand('formatBlock',false,e.target.value);});
// Pengaturan paragraf bergaya Word: inden kiri/kanan, inden baris pertama, dan spasi.
function selectedEditableBlock(){const selection=window.getSelection();if(!selection||!selection.rangeCount)return null;let node=selection.getRangeAt(0).startContainer;if(node.nodeType===Node.TEXT_NODE)node=node.parentElement;const block=node?.closest?.('p,h2,h3,h4,blockquote,li,div');return block&&$n('noteContent').contains(block)?block:$n('noteContent');}
function applyParagraphSettings(){const block=selectedEditableBlock();if(!block)return notify('Letakkan kursor pada paragraf yang ingin diatur.');const left=Number($n('indentLeft').value),first=Number($n('indentFirst').value),right=Number($n('indentRight').value),line=$n('lineSpacing').value,after=Number($n('paragraphAfter').value);block.style.marginLeft=`${left*37.8}px`;block.style.textIndent=`${first*37.8}px`;block.style.marginRight=`${right*37.8}px`;block.style.lineHeight=line;block.style.marginBottom=`${after*1.333}px`;notify('Pengaturan paragraf diterapkan.');}
[['indentLeft','indentLeftValue'],['indentFirst','indentFirstValue'],['indentRight','indentRightValue']].forEach(([id,out])=>{$n(id).addEventListener('input',e=>{$n(out).textContent=`${Number(e.target.value).toLocaleString('id-ID')} cm`;});});
$n('applyParagraphSettings').addEventListener('click',applyParagraphSettings);

$n('noteCoverInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type))return notify('Sampul harus JPG, PNG, atau WEBP.');if(file.size>5*1024*1024)return notify('Ukuran sampul maksimal 5 MB.');if(!isOwner||!currentUser)return notify('Login pemilik diperlukan.');const ext=file.name.split('.').pop().toLowerCase();const path=`${currentUser.id}/covers/${Date.now()}.${ext}`;const {error}=await supabase.storage.from('note-images').upload(path,file,{contentType:file.type,upsert:false});if(error)return notify('Sampul gagal diunggah: '+error.message);const oldPath=currentCoverPath;currentCoverPath=path;const {data}=supabase.storage.from('note-images').getPublicUrl(path);$n('noteCoverPreview').src=data.publicUrl;$n('noteCoverPreview').hidden=false;notify('Sampul materi berhasil dipilih. Simpan catatan untuk menerapkan perubahan.');});
$n('insertImageButton').addEventListener('click',()=>{if(!isOwner)return notify('Login pemilik diperlukan.');$n('noteImageInput').click();});$n('noteImageInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){notify('Gambar harus JPG, PNG, atau WEBP maksimal 5 MB.');e.target.value='';return;}const path=`${currentUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const {error}=await supabase.storage.from('note-images').upload(path,file,{contentType:file.type});if(error){notify('Upload gambar gagal: '+error.message);return;}const {data}=supabase.storage.from('note-images').getPublicUrl(path);$n('noteContent').focus();document.execCommand('insertImage',false,data.publicUrl);e.target.value='';});
function makeExcerpt(html){const d=new DOMParser().parseFromString(html,'text/html');return (d.body.textContent||'').trim().slice(0,220);}
async function saveNote(status,options={}){if(!isOwner||!currentUser)return notify('Login pemilik diperlukan.');const title=$n('noteTitle').value.trim(),raw=$n('noteContent').innerHTML.trim();if(!title)return notify('Isi judul materi terlebih dahulu.');if(!options.allowEmpty&&(!raw||raw==='<br>'))return notify('Isi materi sebelum menyimpan.');const clean=DOMPurify.sanitize(raw||'',{USE_PROFILES:{html:true},ADD_TAGS:['img'],ADD_ATTR:['style','class','src','alt','width','height']});const row={owner_id:currentUser.id,subject_id:subjectId,title,excerpt:makeExcerpt(clean),content_html:clean,content_json:null,cover_path:currentCoverPath,status,published_at:status==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()};let result;if(currentNoteId)result=await supabase.from('notes').update(row).eq('id',currentNoteId).select('id').single();else result=await supabase.from('notes').insert(row).select('id').single();if(result.error){notify('Catatan gagal disimpan: '+result.error.message);console.error(result.error);return false;}currentNoteId=result.data.id;currentNoteStatus=status;if(originalCoverPath&&originalCoverPath!==currentCoverPath){const {error:oldCoverError}=await supabase.storage.from('note-images').remove([originalCoverPath]);if(oldCoverError)console.warn('Sampul lama belum terhapus:',oldCoverError.message);}originalCoverPath=currentCoverPath;const {error:refError}=await supabase.from('academic_references').update({is_public:status==='published'}).eq('note_id',currentNoteId);if(refError)console.warn('Status publik referensi belum diperbarui:',refError);$n('saveStatus').textContent=status==='published'?'Berhasil dipublikasikan':'Draft tersimpan';if(!options.silent)notify(status==='published'?'Materi berhasil dipublikasikan.':'Draft berhasil disimpan.');await loadNotes();await loadNoteReferences();await loadGlobalToc();if(status==='published')await renderToc(clean);return true;}
$n('saveDraftButton').addEventListener('click',()=>saveNote('draft'));$n('publishNoteButton').addEventListener('click',()=>saveNote('published'));
async function editNote(id){const {data,error}=await supabase.from('notes').select('*').eq('id',id).single();if(error)return notify('Catatan tidak dapat dibuka: '+error.message);openEditor(data);}
async function openNote(id){$n('noteEditorPanel').hidden=true;const {data,error}=await supabase.from('notes').select('id,title,content_html,status,published_at,updated_at,cover_path').eq('id',id).single();if(error)return notify('Catatan tidak dapat dibuka.');if(!isOwner&&data.status!=='published')return notify('Catatan ini belum dipublikasikan.');currentReaderNoteId=id;$n('readerOwnerActions').hidden=!isOwner;$n('readerBibliographyJump').hidden=true;$n('notesList').hidden=true;$n('notesListHeader')?.classList.add('hidden');$n('noteReader').hidden=false;$n('readerMeta').textContent=`${data.status==='published'?'DIPUBLIKASIKAN':'DRAFT'} · ${new Date(data.published_at||data.updated_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}`;$n('readerTitle').textContent=data.title;if(data.cover_path){$n('readerCover').src=supabase.storage.from('note-images').getPublicUrl(data.cover_path).data.publicUrl;$n('readerCover').hidden=false;}else{$n('readerCover').hidden=true;$n('readerCover').removeAttribute('src');}$n('readerBody').innerHTML=DOMPurify.sanitize(data.content_html||'');await renderToc(data.content_html||'');await renderBibliography(id);$n('noteReader').scrollIntoView({behavior:'smooth',block:'start'});}
async function renderBibliography(noteId){
  let q=supabase.from('academic_references').select('id,title,reference_type,authors,publication,year,description,external_url,file_path,is_public').eq('note_id',noteId).order('created_at');
  if(!isOwner)q=q.eq('is_public',true);
  const {data,error}=await q;
  if(error){console.warn('Daftar pustaka tidak dapat dimuat:',error);$n('readerBibliography').hidden=true;$n('readerBibliographyJump').hidden=true;return;}
  const refs=(data||[]).sort((a,b)=>{
    const collator=new Intl.Collator('id',{sensitivity:'base',numeric:true});
    const authorA=(a.authors||'').trim()||'zzz';
    const authorB=(b.authors||'').trim()||'zzz';
    return collator.compare(authorA,authorB)||collator.compare(a.title||'',b.title||'');
  });
  if(!refs.length){$n('readerBibliography').hidden=true;$n('readerBibliographyJump').hidden=true;return;}
  $n('readerBibliography').hidden=false;$n('readerBibliographyJump').hidden=false;
  const bibliographyItems=await Promise.all(refs.map(async (r,i)=>{
    const author=safeText(r.authors||'Penulis tidak dicantumkan');
    const year=r.year?` (${safeText(r.year)})`:'';
    const publication=r.publication?`. ${safeText(r.publication)}`:'';
    const title=safeText(r.title||'Tanpa judul');
    const fileUrl=r.file_path?await documentUrl(r.file_path):null;
    const file=fileUrl?` <a href="${safeText(fileUrl)}" target="_blank" rel="noopener">Buka / unduh dokumen</a>`:'';
    const url=r.external_url?` <a href="${safeText(r.external_url)}" target="_blank" rel="noopener">Buka sumber</a>`:'';
    const detail=r.description?`<p class="bibliography-description">${safeText(r.description)}</p>`:'';
    const icon=r.file_path?referenceFileIcon(r.title):'';
    return `<li>${icon}<span class="bibliography-citation">${author}${year}. <em>${title}</em>${publication}.</span>${file}${url}${detail}</li>`;
  }));
  $n('readerBibliographyList').innerHTML=bibliographyItems.join('');
}
$n('backToNotes').addEventListener('click',()=>{currentReaderNoteId=null;$n('noteReader').hidden=true;$n('notesList').hidden=false;$n('notesListHeader')?.classList.remove('hidden');});
$n('readerEditNote').addEventListener('click',()=>{if(!isOwner||!currentReaderNoteId)return notify('Login pemilik diperlukan.');editNote(currentReaderNoteId);});
$n('readerDeleteNote').addEventListener('click',()=>{if(!currentReaderNoteId)return;deleteNote(currentReaderNoteId);});
$n('readerBibliographyJump').addEventListener('click',()=>{$n('readerBibliography').scrollIntoView({behavior:'smooth',block:'start'});});

async function renderToc(html) {
    const card = $('readerTocCard');
    const list = $('autoToc');

    // Pastikan elemen Daftar Isi tersedia.
    if (!card || !list) {
        console.warn('Elemen Daftar Isi tidak ditemukan di index.html.');
        return;
    }

    const doc = new DOMParser().parseFromString(
        html || '',
        'text/html'
    );

    const manualToc = doc.querySelector('.manual-toc');

    // Jika materi tidak memiliki Daftar Isi manual.
    if (!manualToc) {
        card.hidden = true;
        list.innerHTML = '';
        return;
    }

    const manualList = manualToc.querySelector('ol, ul');

    // Jika Daftar Isi kosong.
    if (!manualList || !manualList.children.length) {
        card.hidden = true;
        list.innerHTML = '';
        return;
    }

    // Tampilkan Daftar Isi dari materi.
    list.innerHTML = manualList.innerHTML;
    card.hidden = false;
}

// ===== REFERENSI AKADEMIK TERKAIT CATATAN =====
$n('toggleReferenceForm').addEventListener('click',async()=>{if(!isOwner)return notify('Login pemilik diperlukan.');if(!currentNoteId){const ok=await saveNote('draft',{silent:true,allowEmpty:true});if(!ok)return;} $n('referenceForm').hidden=!$n('referenceForm').hidden;});
$n('cancelReferenceForm').addEventListener('click',()=>$n('referenceForm').hidden=true);
document.querySelectorAll('input[name=referenceMode]').forEach(r=>r.addEventListener('change',()=>{const fileMode=document.querySelector('input[name=referenceMode]:checked').value==='file';$n('referenceFileFields').hidden=!fileMode;$n('referenceMetadataFields').hidden=fileMode;$n('saveReferenceButton').textContent=fileMode?'Unggah Dokumen':'Simpan Referensi';}));
async function uploadAcademicFile(path,file){
  // Standard upload is supported up to the configured project limit; use resumable TUS for larger documents.
  if(file.size<=6*1024*1024){const {error}=await supabase.storage.from('academic-documents').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});return error;}
  try{
    const tusModule=await import('https://cdn.jsdelivr.net/npm/tus-js-client@4.3.1/+esm');
    const tus=tusModule.default||tusModule;
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)return new Error('Sesi login berakhir. Silakan login kembali.');
    const endpoint=SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/upload/resumable';
    return await new Promise(resolve=>{
      const upload=new tus.Upload(file,{endpoint,chunkSize:6*1024*1024,retryDelays:[0,3000,5000,10000,20000],headers:{authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},metadata:{bucketName:'academic-documents',objectName:path,contentType:file.type||'application/octet-stream',cacheControl:'3600'},uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,onProgress:(bytesUploaded,bytesTotal)=>{$n('refFileSelection').textContent=`Mengunggah ${file.name} · ${Math.round(bytesUploaded/bytesTotal*100)}%`;},onError:error=>resolve(error),onSuccess:()=>resolve(null)});
      upload.start();
    });
  }catch(error){return error;}
}
$n('referenceForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const button=$n('saveReferenceButton');
  if(button.disabled)return;
  button.disabled=true;
  const originalLabel=button.textContent;
  try{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)throw new Error('Sesi pemilik tidak ditemukan. Silakan login kembali.');
    const {data:ownerCheck,error:ownerError}=await supabase.rpc('is_site_owner');
    if(ownerError)throw new Error('Verifikasi pemilik gagal: '+ownerError.message);
    if(ownerCheck!==true)throw new Error('Akun ini tidak memiliki hak pemilik.');
    currentUser=user;
    if(!currentNoteId)throw new Error('Simpan materi sebagai draft terlebih dahulu.');
    // Ambil relasi langsung dari database agar subject_id tidak memakai state lama/null.
    const {data:parentNote,error:noteLookupError}=await supabase
      .from('notes').select('id,owner_id,subject_id,status')
      .eq('id',currentNoteId).eq('owner_id',user.id).maybeSingle();
    if(noteLookupError)throw new Error('Catatan tidak dapat diverifikasi: '+noteLookupError.message);
    if(!parentNote)throw new Error('Catatan tidak ditemukan atau bukan milik akun pemilik. Simpan ulang catatan lalu coba lagi.');
    if(!parentNote.subject_id)throw new Error('Catatan belum terhubung ke mata kuliah. Buka dan simpan ulang catatan terlebih dahulu.');
    subjectId=parentNote.subject_id;
    currentNoteStatus=parentNote.status||currentNoteStatus;
    const mode=document.querySelector('input[name=referenceMode]:checked')?.value||'metadata';
    let row;
    if(mode==='metadata'){
      const title=$n('refTitle').value.trim();
      if(!title)throw new Error('Masukkan judul referensi.');
      const yearValue=$n('refYear').value.trim();
      if(yearValue&&(!/^\d{4}$/.test(yearValue)||Number(yearValue)<1000||Number(yearValue)>9999))throw new Error('Tahun harus diisi dengan 4 angka.');
      const externalUrl=$n('refExternalUrl').value.trim();
      if(externalUrl&&!/^https?:\/\//i.test(externalUrl))throw new Error('URL harus diawali http:// atau https://.');
      row={owner_id:user.id,subject_id:subjectId,note_id:currentNoteId,title,reference_type:$n('refType').value,authors:$n('refAuthors').value.trim()||null,year:yearValue?Number(yearValue):null,publication:$n('refPublication').value.trim()||null,description:$n('refDescription').value.trim()||null,external_url:externalUrl||null,file_path:null,is_public:currentNoteStatus==='published'};
    }else{
      const file=$n('refFile').files[0];
      if(!file)throw new Error('Pilih file PDF, Word, atau PowerPoint terlebih dahulu.');
      const ext=(file.name.split('.').pop()||'').toLowerCase();
      if(!['pdf','doc','docx','ppt','pptx'].includes(ext))throw new Error('Format file harus PDF, DOC, DOCX, PPT, atau PPTX.');
      if(file.size>50*1024*1024)throw new Error('Ukuran file melebihi batas 50 MB.');
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const filePath=`${user.id}/${currentNoteId}/${Date.now()}-${safeName}`;
      const uploadError=await uploadAcademicFile(filePath,file);
      if(uploadError)throw new Error('Upload Storage gagal: '+(uploadError.message||String(uploadError)));
      const inferredType=({pdf:'pdf',doc:'word',docx:'word',ppt:'powerpoint',pptx:'powerpoint'})[ext];
      row={owner_id:user.id,subject_id:subjectId,note_id:currentNoteId,title:file.name,reference_type:inferredType,authors:null,year:null,publication:null,description:null,external_url:null,file_path:filePath,is_public:currentNoteStatus==='published'};
    }
    const {data:saved,error}=await supabase.from('academic_references').insert(row).select('id').single();
    if(error){
      if(row.file_path){const {error:cleanupError}=await supabase.storage.from('academic-documents').remove([row.file_path]);if(cleanupError)console.error('Pembersihan file sementara gagal:',cleanupError);}
      const message=error.message||'Kesalahan database tanpa pesan.';
      if(error.code==='42501'||/row-level security|permission denied/i.test(message))throw new Error('Database menolak penyimpanan (RLS). Jalankan SQL-PERBAIKAN-REFERENSI.sql di Supabase SQL Editor. Detail: '+message);
      if(error.code==='23503')throw new Error('Relasi catatan/mata kuliah tidak cocok (foreign key). Detail: '+message);
      if(error.code==='23502')throw new Error('Ada kolom wajib database yang belum terisi. Detail: '+message);
      if(error.code==='42703'||/column .* does not exist/i.test(message))throw new Error('Nama kolom database berbeda dari yang dipakai website. Detail: '+message);
      throw new Error('Database gagal menyimpan referensi. Detail: '+message);
    }
    $n('referenceForm').reset();
    $n('refFileSelection').textContent='Belum ada file dipilih.';
    $n('referenceForm').hidden=true;
    $n('referenceMetadataFields').hidden=false;
    $n('referenceFileFields').hidden=true;
    document.querySelector('input[name=referenceMode][value=metadata]').checked=true;
    await loadNoteReferences();
    notify('Referensi berhasil ditambahkan.');
  }catch(error){
    console.error('Gagal menyimpan referensi:',error);
    notify(error.message||'Referensi gagal disimpan.');
  }finally{
    button.disabled=false;
    button.textContent=originalLabel;
  }
});
function fileKind(name){const ext=(name.split('.').pop()||'').toLowerCase();return ({pdf:['PDF','file-pdf'],doc:['WORD','file-word'],docx:['WORD','file-word'],ppt:['PPT','file-ppt'],pptx:['PPT','file-ppt']})[ext]||['FILE','file'];}
function referenceFileIcon(name){const [kind,cls]=fileKind(name||'');return `<span class="bibliography-file-icon ${cls}" aria-label="Dokumen ${kind}" title="${kind}"><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M4 1.5h10l6 6V26.5H4z" fill="currentColor" opacity=".13"/><path d="M14 1.5v6h6M7 14h10M7 18h10M7 22h7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><b>${kind}</b></span>`;}
function fileSizeLabel(bytes){if(!bytes)return 'Ukuran tidak tersedia';const units=['B','KB','MB','GB'];let n=bytes,i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}return `${n.toFixed(i?1:0)} ${units[i]}`;}
async function documentUrl(path, download=false){
  if(!path)return null;
  const options=download?{download:true}:{};
  const {data,error}=await supabase.storage.from('academic-documents').createSignedUrl(path,3600,options);
  if(error){console.error('Tautan dokumen gagal dibuat:',error.message,{path,download});return null;}
  return data?.signedUrl||null;
}
async function loadNoteReferences(){
  if(!currentNoteId){$n('noteReferencesList').innerHTML='<p class="reference-empty">Belum ada dokumen referensi untuk materi ini.</p>';return;}
  const {data,error}=await supabase.from('academic_references').select('id,title,reference_type,authors,year,publication,external_url,file_path,created_at').eq('note_id',currentNoteId).order('created_at');
  if(error){$n('noteReferencesList').innerHTML='<p class="reference-empty">Referensi belum dapat dimuat. Periksa kolom note_id dan kebijakan akses database.</p>';console.error(error);return;}
  if(!data?.length){$n('noteReferencesList').innerHTML='<p class="reference-empty">Belum ada dokumen referensi untuk materi ini.</p>';return;}
  const cards=await Promise.all(data.map(async r=>{
    const url=r.file_path?await documentUrl(r.file_path):r.external_url;
    const downloadUrl=r.file_path?await documentUrl(r.file_path,true):r.external_url;
    const [kind,kindClass]=fileKind(r.title||'dokumen');const ext=(r.title||'').split('.').pop().toUpperCase();
    return `<article class="document-reference-card"><div class="document-preview-tile ${kindClass}"><span>${kind}</span><small>${safeText(ext)}</small></div><div class="document-reference-info"><strong>${safeText(r.title||'Dokumen tanpa nama')}</strong><small>${safeText(r.reference_type||'Dokumen')} · ${r.file_path?'File tersimpan di Academic Notes':'Tautan eksternal'}</small><div class="document-reference-actions"><button type="button" data-preview-file="${r.id}">Pratinjau</button>${url?`<a href="${safeText(url)}" target="_blank" rel="noopener">Buka</a><a href="${safeText(downloadUrl||url)}" target="_blank" rel="noopener">Unduh</a>`:'<span class="reference-link-error">Tautan belum tersedia</span>'}</div></div><div class="document-more-wrap"><button type="button" class="document-more-button" aria-label="Opsi dokumen" aria-expanded="false" data-document-menu="${r.id}">⋮</button><div class="document-more-menu" data-document-menu-panel="${r.id}" hidden><button type="button" data-preview-file="${r.id}">Lihat dokumen</button>${url?`<a href="${safeText(url)}" target="_blank" rel="noopener">Buka di tab baru</a><a href="${safeText(downloadUrl||url)}" target="_blank" rel="noopener">Unduh</a>`:''}${isOwner?`<button type="button" class="danger-menu-item" data-remove-reference="${r.id}" data-file-path="${safeText(r.file_path||'')}">Hapus dari referensi</button>`:''}</div></div></article>`;
  }));
  $n('noteReferencesList').innerHTML=cards.join('');
}
async function openFilePreview(ref){const url=ref.file_path?await documentUrl(ref.file_path):ref.external_url;if(!url)return notify('Tautan dokumen tidak tersedia. Periksa kebijakan akses Storage.');const title=ref.title||'Pratinjau Dokumen';$n('filePreviewTitle').textContent=title;$n('filePreviewOpen').href=url;$n('filePreviewDownload').href=url;$n('filePreviewDownload').setAttribute('download',title);const ext=(title.split('.').pop()||'').toLowerCase();let view='';if(ext==='pdf')view=`<iframe title="Pratinjau PDF" src="${safeText(url)}#toolbar=1&navpanes=0" loading="lazy"></iframe>`;else if(['doc','docx','ppt','pptx'].includes(ext))view=`<div class="office-preview-message"><div class="document-preview-tile ${ext.startsWith('p')?'file-ppt':'file-word'}"><span>${ext.startsWith('p')?'PPT':'WORD'}</span></div><h3>${safeText(title)}</h3><p>Pratinjau langsung untuk format ini bergantung pada dukungan browser. Gunakan tombol “Buka di tab baru” atau unduh file.</p></div>`;else view='<p>Pratinjau tidak tersedia untuk jenis file ini.</p>';$n('filePreviewBody').innerHTML=view;$n('filePreviewModal').hidden=false;}

async function removeReference(id,path){if(!isOwner)return notify('Login pemilik diperlukan.');if(!confirm('Hapus dokumen ini dari daftar referensi?'))return;const {error}=await supabase.from('academic_references').delete().eq('id',id);if(error)return notify('Dokumen gagal dihapus: '+error.message);if(path){const {error:storageError}=await supabase.storage.from('academic-documents').remove([path]);if(storageError)console.warn('File Storage belum terhapus:',storageError.message);}await loadNoteReferences();notify('Dokumen dihapus dari referensi.');}
$n('noteReferencesList').addEventListener('click',async e=>{const preview=e.target.closest('[data-preview-file]');if(preview){const {data,error}=await supabase.from('academic_references').select('title,file_path,external_url').eq('id',preview.dataset.previewFile).single();if(error)return notify('Dokumen tidak dapat dibuka.');await openFilePreview(data);return;}const menu=e.target.closest('[data-document-menu]');if(menu){const panel=document.querySelector(`[data-document-menu-panel="${menu.dataset.documentMenu}"]`);document.querySelectorAll('.document-more-menu').forEach(x=>{if(x!==panel)x.hidden=true;});panel.hidden=!panel.hidden;menu.setAttribute('aria-expanded',String(!panel.hidden));return;}const del=e.target.closest('[data-remove-reference]');if(del){await removeReference(del.dataset.removeReference,del.dataset.filePath);return;}});

// ===== DAFTAR ISI GLOBAL: DIBUKA MELALUI MENU TITIK TIGA =====
async function loadGlobalToc(){
  const owner=document.body.classList.contains('owner-mode');
  const setToc=(html)=>{const modalList=$('globalTocList');const dashboardList=$('dashboardGlobalTocList');if(modalList)modalList.innerHTML=html;if(dashboardList)dashboardList.innerHTML=html;};
  setToc('<p class="subject-loading">Memuat daftar materi...</p>');
  let subjectQuery=supabase.from('subjects').select('id,title,is_public').order('title',{ascending:true});
  if(!owner)subjectQuery=subjectQuery.eq('is_public',true);
  const {data:subjects,error:subjectError}=await subjectQuery;
  if(subjectError){setToc('<p class="subject-loading">Daftar mata kuliah belum dapat dimuat.</p>');console.warn(subjectError);return;}
  if(!subjects?.length){setToc('<p class="subject-loading">Belum ada mata kuliah.</p>');return;}
  const {data:allNotes,error}=await supabase.from('notes').select('id,title,content_html,subject_id,status,published_at,created_at').order('created_at',{ascending:true});
  if(error){setToc('<p class="subject-loading">Daftar materi belum dapat dimuat.</p>');console.warn(error);return;}
  const visibleNotes=(allNotes||[]).filter(n=>owner||n.status==='published');
  const groups=subjects.map(subject=>({subject,notes:visibleNotes.filter(n=>n.subject_id===subject.id)})).filter(g=>g.notes.length);
  if(!groups.length){setToc('<p class="subject-loading">Belum ada judul materi yang dapat ditampilkan.</p>');return;}
  let html='';
  for(const group of groups){
    html+=`<section class="global-toc-group"><h4>${escapeHtml(group.subject.title)}</h4><ul>`;
    for(const n of group.notes){
      html+=`<li class="global-toc-item" data-material-search="${escapeHtml((group.subject.title+' '+(n.title||'Tanpa judul')).toLocaleLowerCase('id'))}"><span class="global-toc-item-title">${escapeHtml(n.title||'Tanpa judul')}</span>${owner&&n.status==='draft'?'<span class="global-draft-label">DRAFT</span>':''}<button type="button" class="global-toc-open" data-global-note="${n.id}" data-global-subject="${group.subject.id}" aria-label="Buka catatan ${escapeHtml(n.title||'Tanpa judul')}">Buka Catatan ↗</button></li>`;
    }
    html+='</ul></section>';
  }
  setToc(html);
  if(materialSearch){materialSearch.value='';materialSearch.dispatchEvent(new Event('input'));}
}
async function showGlobalToc(){
  const dashboardMenu=$('dashboardMenu');if(dashboardMenu)dashboardMenu.hidden=true;
  await loadGlobalToc();
  if(document.body.dataset.view==='workspace')showDashboard();
  $('dashboardGlobalToc')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function handleGlobalTocClick(e){const b=e.target.closest('[data-global-note]');if(!b)return;openSubject(b.dataset.globalSubject,b.dataset.globalNote);}
$('globalTocList')?.addEventListener('click',handleGlobalTocClick);
$('dashboardGlobalTocList')?.addEventListener('click',handleGlobalTocClick);
// Pencarian global memfilter judul materi pada dashboard secara langsung.
const materialSearch=$('globalMaterialSearch');
materialSearch?.addEventListener('input',()=>{
  const query=materialSearch.value.trim().toLocaleLowerCase('id');
  const lists=[$('dashboardGlobalTocList'),$('globalTocList')].filter(Boolean);
  lists.forEach(list=>{
    list.querySelectorAll('.global-toc-group').forEach(group=>{
      let visible=0;
      group.querySelectorAll('.global-toc-item').forEach(item=>{
        const match=!query||(item.dataset.materialSearch||item.textContent).toLocaleLowerCase('id').includes(query);
        item.hidden=!match;
        if(match)visible++;
      });
      group.hidden=visible===0;
    });
    let empty=list.querySelector('.global-toc-search-empty');
    const any=[...list.querySelectorAll('.global-toc-group')].some(group=>!group.hidden);
    if(query&&!any){if(!empty){empty=document.createElement('p');empty.className='global-toc-search-empty';empty.textContent='Materi tidak ditemukan.';list.append(empty);}}
    else empty?.remove();
  });
});
// Enter atau klik ikon akan membuka materi pertama yang paling sesuai.
async function openMaterialSearchResult(){
  const query=(materialSearch?.value||'').trim().toLocaleLowerCase('id');
  if(!query){materialSearch?.focus();return;}
  const currentQuery=query;
  await loadGlobalToc();
  if(materialSearch)materialSearch.value=currentQuery;
  materialSearch?.dispatchEvent(new Event('input'));
  const items=[...$('dashboardGlobalTocList').querySelectorAll('.global-toc-item')];
  const matches=items.filter(item=>(item.dataset.materialSearch||'').includes(currentQuery));
  if(!matches.length){notify('Materi tidak ditemukan. Coba kata kunci lain.');materialSearch?.focus();return;}
  const best=matches.find(item=>{
    const title=item.querySelector('.global-toc-note')?.textContent?.trim().toLocaleLowerCase('id')||'';
    return title===currentQuery||title.startsWith(currentQuery);
  })||matches[0];
  const button=best.querySelector('[data-global-note]');
  if(button)openSubject(button.dataset.globalSubject,button.dataset.globalNote);
}
materialSearch?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openMaterialSearchResult();}});
$('globalMaterialSearchButton')?.addEventListener('click',openMaterialSearchResult);

// Menu titik tiga: navigasi dan akses pemilik/pengunjung.
function toggleMenu(buttonId,menuId){const button=$(buttonId),menu=$(menuId);button.addEventListener('click',()=>{menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));});}
toggleMenu('dashboardMenuButton','dashboardMenu');
$('dashboardMenu').addEventListener('click',async e=>{const action=e.target.closest('[data-dashboard-action]')?.dataset.dashboardAction;if(!action)return;$('dashboardMenu').hidden=true;if(action==='home')showDashboard();if(action==='toc')await showGlobalToc();});
document.addEventListener('click',e=>{if(!e.target.closest('.workspace-menu-wrap')){['dashboardMenu'].forEach(id=>{const m=$(id);if(m)m.hidden=true;});['dashboardMenuButton'].forEach(id=>{const b=$(id);if(b)b.setAttribute('aria-expanded','false');});}if(!e.target.closest('.document-more-wrap'))document.querySelectorAll('.document-more-menu').forEach(m=>m.hidden=true);});
$('closeGlobalToc')?.addEventListener('click',()=>$('globalTocModal').hidden=true);
$('globalTocModal')?.addEventListener('click',e=>{if(e.target===$('globalTocModal'))$('globalTocModal').hidden=true;});
$n('closeFilePreview').addEventListener('click',()=>$n('filePreviewModal').hidden=true);
$n('filePreviewModal').addEventListener('click',e=>{if(e.target===$n('filePreviewModal'))$n('filePreviewModal').hidden=true;});
$n('refFile').addEventListener('change',e=>{$n('refFileSelection').textContent=e.target.files[0]?`${e.target.files[0].name} · ${fileSizeLabel(e.target.files[0].size)}`:'Belum ada file dipilih.';});

// Navigasi satu halaman: Dashboard dan Workspace ditukar tanpa memuat dokumen baru.
const dashboardMain=document.querySelector('body > main');
const dashboardFooter=document.querySelector('.main-footer');
const workspace=$('notesWorkspace');
function setView(view){
  const inWorkspace=view==='workspace';
  dashboardMain.hidden=inWorkspace;
  dashboardFooter.hidden=inWorkspace;
  workspace.hidden=!inWorkspace;
  document.body.dataset.view=view;
  window.scrollTo({top:0,behavior:'instant'});
}
$('subjectList').addEventListener('click',e=>{
  const button=e.target.closest('[data-open-subject]');
  if(button) openSubject(button.dataset.openSubject);
});
async function openSubject(id,noteId=null,updateHistory=true){
  if(updateHistory)history.pushState({view:'workspace',subject:id,note:noteId},'',`#workspace/${encodeURIComponent(id)}${noteId?'/'+encodeURIComponent(noteId):''}`);
  setView('workspace');
  await initNotes(id);
  if(noteId) await openNote(noteId);
}
function showDashboard(updateHistory=true){
  if(updateHistory)history.pushState({view:'dashboard'},'','#home');
  setView('dashboard');
}
function restoreRoute(){
  const parts=decodeURIComponent(location.hash.replace(/^#/, '')).split('/');
  if(parts[0]==='workspace'&&parts[1]) openSubject(parts[1],parts[2]||null,false);
  else setView('dashboard');
}
window.addEventListener('popstate',restoreRoute);
// Inisialisasi data dan pulihkan rute saat halaman dibuka atau dimuat ulang.
await verifyOwner();
await loadSubjects();
await loadGlobalToc();
restoreRoute();
