'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
import {LogOut,RefreshCw,Send,Inbox,MessageSquare,ArrowUpRight,Eye,Search,Save,Check,Mail,Clock,Languages,Phone,X,Flag,BarChart3,Trash2,Undo2} from 'lucide-react';
import {AdminAnalytics} from './admin-analytics';
import {messageLanguage,messageStatusNames} from '@/lib/message-labels';

type Folder='inbox'|'sent'|'urgent'|'trash';
const copyText=(raw?:string)=>{try{return (JSON.parse(raw||'[]') as string[]).join(', ');}catch{return '';}};
type Row={deletedAt:string|null;urgent:boolean;id:string;kind:'question'|'contact';reference:string;subject:string;contact:string;name:string;language:string;status:string;createdAt:string;updatedAt:string;sentAt:string|null};
type Detail={deletedAt?:string|null;urgent?:boolean;cc?:string;bcc?:string;id:string;reference:string;question:string;name?:string;email?:string;contact?:string;language:string;status:string;answer?:string;created_at:string;updated_at:string;sent_at?:string|null};
const date=(value:string)=>new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh',calendar:'gregory'}).format(new Date(value));
const editable=(status:string)=>['pending','received','draft','approved','delivery_failed'].includes(status);
const errorText=(error:unknown,fallback:string)=>error instanceof Error?error.message:fallback;
function Status({status}:{status:string}){return <span className={'admin-status admin-status-'+status}>{messageStatusNames[status]??'قيد المراجعة'}</span>;}

export function AdminWorkspace(){
 const [authenticated,setAuthenticated]=useState<boolean|null>(null);
 const [username,setUsername]=useState(''),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [view,setView]=useState<'messages'|'analytics'>('messages');
 const [cc,setCc]=useState(''),[bcc,setBcc]=useState(''),[priorityBusy,setPriorityBusy]=useState(false);
 const [folder,setFolder]=useState<Folder>('inbox'),[query,setQuery]=useState(''),[search,setSearch]=useState('');
 const [rows,setRows]=useState<Row[]>([]),[next,setNext]=useState<string|null>(null),[counts,setCounts]=useState({inbox:0,sent:0,urgent:0,trash:0}),[loading,setLoading]=useState(false);
 const [preview,setPreview]=useState<Row|null>(null),[opened,setOpened]=useState<Row|null>(null),[detail,setDetail]=useState<Detail|null>(null),[answer,setAnswer]=useState('');
 const [loadingDetail,setLoadingDetail]=useState(false),[detailError,setDetailError]=useState(''),[notice,setNotice]=useState(''),[action,setAction]=useState<'draft'|'send'|null>(null),[confirmClose,setConfirmClose]=useState(false);
 const [deleteTarget,setDeleteTarget]=useState<Row|null>(null),[trashBusy,setTrashBusy]=useState(false),[trashError,setTrashError]=useState('');
 const listSequence=useRef(0),detailSequence=useRef(0),operation=useRef(false);
 const dirty=!!detail&&!detail.deletedAt&&editable(detail.status)&&(answer!==(detail.answer??'')||cc!==copyText(detail.cc)||bcc!==copyText(detail.bcc));
 const expire=useCallback(()=>{setAuthenticated(false);setRows([]);setDetail(null);setOpened(null);},[]);
 const sessionError='تعذر إكمال الدخول. افتح الإدارة في نافذة مستقلة وحاول مجددًا.';

 const load=useCallback(async(before?:string)=>{
  const sequence=++listSequence.current;setLoading(true);setError('');
  try{
   const params=new URLSearchParams({folder,q:search});if(before)params.set('before',before);
   const r=await fetch('/api/admin/inbox?'+params,{cache:'no-store'});
   if(r.status===401){if(sequence===listSequence.current){setAuthenticated(false);setRows([]);setError('انتهت الجلسة. سجّل الدخول مجددًا.');}return;}
   const d=await r.json() as {items:Row[];next:string|null;counts:{inbox:number;sent:number;urgent:number;trash:number};error?:string};
   if(!r.ok)throw Error(d.error||'تعذر تحميل الرسائل. حاول مجددًا.');
   if(sequence!==listSequence.current)return;
   setRows(old=>before?[...old,...d.items]:d.items);setNext(d.next);setCounts(d.counts);
   if(!before)setPreview(old=>d.items.find(row=>row.id===old?.id)??d.items[0]??null);
  }catch(e){if(sequence===listSequence.current)setError(errorText(e,'تعذر تحميل الرسائل. حاول مجددًا.'));}
  finally{if(sequence===listSequence.current)setLoading(false);}
 },[folder,search]);

 useEffect(()=>{let live=true;fetch('/api/admin/session',{cache:'no-store'}).then(r=>r.json() as Promise<{authenticated:boolean}>).then(d=>{if(live)setAuthenticated(d.authenticated);}).catch(()=>{if(live)setAuthenticated(false);});return()=>{live=false;};},[]);
 useEffect(()=>{const timer=setTimeout(()=>setSearch(query.trim()),250);return()=>clearTimeout(timer);},[query]);
 useEffect(()=>{if(authenticated){setRows([]);setPreview(null);setNext(null);void load();}},[authenticated,load]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);

 async function login(){
  if(busy)return;setBusy(true);setError('');
  try{
   const r=await fetch('/api/admin/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
   const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'تعذر الدخول.');
   const verify=await fetch('/api/admin/session',{credentials:'same-origin',cache:'no-store'}),session=await verify.json() as {authenticated?:boolean};
   if(!verify.ok||!session.authenticated)throw Error(sessionError);
   setPassword('');setAuthenticated(true);
  }catch(e){setError(errorText(e,'تعذر الدخول.'));}finally{setBusy(false);}
 }
 async function logout(){
  if(busy)return;setBusy(true);
  try{const r=await fetch('/api/admin/session',{method:'DELETE',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error('تعذر تسجيل الخروج. حاول مجددًا.');listSequence.current++;detailSequence.current++;setAuthenticated(false);setRows([]);setOpened(null);setDetail(null);setPreview(null);setUsername('');setError('');}
  catch(e){setError(errorText(e,'تعذر تسجيل الخروج.'));}finally{setBusy(false);}
 }
 async function open(row:Row){
  const sequence=++detailSequence.current;setOpened(row);setDetail(null);setAnswer('');setCc('');setBcc('');setLoadingDetail(true);setDetailError('');setNotice('');
  try{
   const r=await fetch('/api/admin/questions/'+row.id+'?kind='+row.kind,{cache:'no-store'}),d=await r.json() as {item:Detail;error?:string};
   if(!r.ok)throw Error(d.error||'تعذر فتح الرسالة. حاول مجددًا.');
   if(sequence===detailSequence.current){setDetail(d.item);setAnswer(d.item.answer??'');setCc(copyText(d.item.cc));setBcc(copyText(d.item.bcc));}
  }catch(e){if(sequence===detailSequence.current)setDetailError(errorText(e,'تعذر فتح الرسالة. حاول مجددًا.'));}
  finally{if(sequence===detailSequence.current)setLoadingDetail(false);}
 }
 function close(){detailSequence.current++;setOpened(null);setDetail(null);setAnswer('');setDetailError('');setNotice('');setConfirmClose(false);}
 function requestClose(){if(operation.current||priorityBusy)return;if(dirty)setConfirmClose(true);else close();}
 async function save(kind:'draft'|'send',closeAfter=false){
  if(!detail||detail.deletedAt||!opened||operation.current||!answer.trim())return;
  operation.current=true;setAction(kind);setDetailError('');setNotice('');
  try{
   const r=await fetch('/api/admin/questions/'+detail.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answer,cc,bcc,updatedAt:detail.updated_at,action:kind})});
   const d=await r.json() as {status:string;item?:Detail;error?:string};
   if(d.item){setDetail(old=>old?{...old,...d.item}:old);setAnswer(d.item.answer??answer);setCc(copyText(d.item.cc));setBcc(copyText(d.item.bcc));}
   if(!r.ok){void load();throw Error(d.error||'تعذر إرسال الرد. حاول مجددًا.');}
   setNotice(kind==='draft'?'تم حفظ المسودة.':d.status==='sent'?'تم إرسال الرد.':'جارٍ إرسال الرد.');
   void load();if(closeAfter)close();
  }catch(e){setConfirmClose(false);setDetailError(errorText(e,kind==='draft'?'تعذر حفظ المسودة. حاول مجددًا.':'تعذر إرسال الرد. حاول مجددًا.'));}
  finally{operation.current=false;setAction(null);}
 }

 async function toggleUrgent(){
  if(!detail||detail.deletedAt||priorityBusy||operation.current)return;setPriorityBusy(true);setDetailError('');
  try{const r=await fetch('/api/admin/questions/'+detail.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'priority',urgent:!detail.urgent})});const d=await r.json() as {urgent:boolean;error?:string};if(!r.ok)throw Error(d.error||'تعذر تحديث الرسالة.');setDetail(old=>old?{...old,urgent:d.urgent}:old);void load();}
  catch(e){setDetailError(errorText(e,'تعذر تحديث الرسالة.'));}finally{setPriorityBusy(false);}
 }

 async function changeTrash(row:Row,restore=false){
  if(operation.current||trashBusy)return;operation.current=true;setTrashBusy(true);setTrashError('');setError('');
  try{
   const r=await fetch('/api/admin/questions/'+row.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:restore?'restore':'delete'})});
   if(r.status===401){expire();setDeleteTarget(null);return;}
   const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'تعذر تحديث الرسالة. حاول مجددًا.');
   setDeleteTarget(null);if(opened?.id===row.id)close();await load();
  }catch(e){const message=errorText(e,'تعذر تحديث الرسالة. حاول مجددًا.');if(restore){setError(message);setDetailError(message);}else setTrashError(message);}
  finally{operation.current=false;setTrashBusy(false);}
 }

 if(authenticated===null)return <main className="admin-login" dir="rtl"><p role="status">جارٍ فتح الإدارة…</p></main>;
 if(!authenticated)return <main className="admin-login" dir="rtl"><a href="/" className="admin-home">مدار البيان</a><h1>الإدارة</h1><form onSubmit={e=>{e.preventDefault();void login();}}><label htmlFor="admin-username">اسم المستخدم</label><Input id="admin-username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required disabled={busy}/><label htmlFor="admin-password">كلمة المرور</label><Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/><Button disabled={busy} type="submit">{busy?'جارٍ الدخول…':'الدخول'}</Button>{error&&<p role="alert" className="error-message">{error}</p>}{error===sessionError&&<a href="/admin" target="_top">فتح الإدارة في نافذة مستقلة</a>}</form></main>;

 const table=<div className="admin-inbox-layout">
  <section className="admin-table-card" aria-busy={loading}>
   <div className="admin-table-title"><h2>{search?(folder==='trash'?'نتائج البحث في المحذوفات':'نتائج البحث في جميع الرسائل'):folder==='trash'?'سلة المحذوفات':folder==='urgent'?'المسائل العاجلة':folder==='inbox'?'الرسائل الواردة':'الرسائل الصادرة'}</h2><span>الأحدث أولًا · توقيت الرياض</span></div>
   <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>رقم الرسالة</th><th>الرسالة</th><th>لغة السائل</th><th>{folder==='trash'?'تاريخ الحذف':folder==='sent'?'تاريخ الإرسال':'تاريخ الوصول'}</th><th>الحالة</th><th><span className="sr-only">إجراءات الرسالة</span></th></tr></thead>
    <tbody>{rows.map(row=><tr key={row.id} tabIndex={0} aria-label={'فتح الرسالة '+row.reference} onMouseEnter={()=>setPreview(row)} onFocus={()=>setPreview(row)} onClick={()=>void open(row)} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();void open(row);}}} className={preview?.id===row.id?'is-previewed':''}>
     <td className="admin-number"><bdi>{row.reference}</bdi><small>{!!row.urgent&&<Flag size={12} aria-label="عاجلة"/>}{row.kind==='question'?'سؤال':'تواصل'}</small></td>
     <td className="admin-subject"><span className="admin-question-preview" dir="auto">{row.subject}</span><small><bdi>{row.contact}</bdi></small></td>
     <td data-label="لغة السائل">{messageLanguage(row.language)}</td>
     <td data-label={folder==='trash'?'تاريخ الحذف':folder==='sent'?'تاريخ الإرسال':'تاريخ الوصول'}>{date(folder==='trash'?(row.deletedAt??row.updatedAt):folder==='sent'?(row.sentAt??row.updatedAt):row.createdAt)}</td>
     <td className="admin-state"><Status status={row.status}/><ArrowUpRight size={16} className="admin-row-arrow"/></td>
     <td className="admin-message-actions"><Button type="button" variant="ghost" size="sm" className={row.deletedAt?'admin-restore-button':'admin-delete-button'} disabled={trashBusy||row.status==='sending'} aria-label={(row.deletedAt?'استعادة الرسالة ':'حذف الرسالة ')+row.reference} onClick={event=>{event.stopPropagation();if(row.deletedAt)void changeTrash(row,true);else{setTrashError('');setDeleteTarget(row);}}}>{row.deletedAt?<Undo2 size={16}/>:<Trash2 size={16}/>}<span>{row.deletedAt?'استعادة':'حذف'}</span></Button></td>
    </tr>)}</tbody></table>
    {!rows.length&&<div className="admin-empty" role="status"><Inbox size={28}/><p>{loading?'جارٍ تحميل الرسائل…':search?'لا توجد رسائل مطابقة.':folder==='trash'?'سلة المحذوفات فارغة.':folder==='urgent'?'لا توجد رسائل محددة كعاجلة.':folder==='sent'?'لم تُرسل أي ردود بعد.':'لا توجد رسائل بانتظار الرد.'}</p></div>}
   </div>
   {next&&<div className="admin-more"><Button variant="ghost" disabled={loading} onClick={()=>void load(next)}>{loading?'جارٍ التحميل…':'عرض المزيد'}</Button></div>}
  </section>
  <aside className="admin-preview"><h2><Eye size={18}/> معاينة الرسالة</h2>{preview?<>
   <div className="admin-preview-top"><bdi className="admin-reference">{preview.reference}</bdi><Status status={preview.status}/></div>
   <p className="admin-preview-question" dir="auto">{preview.subject}</p>
   <div className="admin-preview-meta"><p><Languages size={16}/>{messageLanguage(preview.language)}</p><p><Mail size={16}/><bdi>{preview.contact}</bdi></p><p><Clock size={16}/>{date(preview.createdAt)}</p></div>
   <Button variant="outline" onClick={()=>void open(preview)}>{folder==='trash'?'عرض الرسالة':folder==='sent'?'عرض الرد':'فتح الرسالة والرد'}<ArrowUpRight size={16}/></Button>
  </>:<p className="admin-preview-placeholder">تظهر هنا معاينة الرسالة عند تحديدها.</p>}</aside>
 </div>;

 return <main className="admin-workspace" dir="rtl" lang="ar">
  <header className="admin-heading"><div><span className="admin-eyebrow">الإدارة</span><h1>{view==='analytics'?'التحليلات':'مركز الرسائل'}</h1></div><div className="admin-actions"><Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw size={16} className={loading?'animate-spin':''}/>تحديث</Button><Button variant="ghost" disabled={busy} onClick={()=>void logout()}><LogOut size={16}/>خروج</Button></div></header>
  <nav className="admin-section-menu" aria-label="Administration sections" lang="en" dir="ltr"><Button variant={view==='messages'?'default':'ghost'} onClick={()=>setView('messages')} aria-current={view==='messages'?'page':undefined}><Mail size={18}/>Messages</Button><Button variant={view==='analytics'?'default':'ghost'} onClick={()=>setView('analytics')} aria-current={view==='analytics'?'page':undefined}><BarChart3 size={18}/>Analytics</Button></nav>
  {view==='analytics'?<AdminAnalytics onExpired={expire}/>:<Tabs value={folder} dir="rtl" onValueChange={value=>{setFolder(value as Folder);setQuery('');setSearch('');}} className="admin-mailboxes">
   <div className="admin-toolbar"><TabsList dir="ltr" lang="en" aria-label="Mailboxes" className="admin-folder-list">
    <TabsTrigger value="inbox" className="admin-folder"><Inbox size={23}/><span>Inbox</span><strong>{counts.inbox.toLocaleString('ar-SA')}</strong></TabsTrigger>
    <TabsTrigger value="sent" className="admin-folder"><Send size={23}/><span>Sent</span><strong>{counts.sent.toLocaleString('ar-SA')}</strong></TabsTrigger>
    <TabsTrigger value="urgent" className="admin-folder"><Flag size={23}/><span>Urgent</span><strong>{counts.urgent.toLocaleString('ar-SA')}</strong></TabsTrigger>
    <TabsTrigger value="trash" className="admin-folder"><Trash2 size={23}/><span>Trash</span><strong>{counts.trash.toLocaleString('ar-SA')}</strong></TabsTrigger>
   </TabsList><div className="admin-search"><Search size={18}/><Input aria-label="البحث في جميع الرسائل برقم السؤال" placeholder="ابحث برقم السؤال أو البريد أو النص…" value={query} onChange={e=>setQuery(e.target.value)} maxLength={200}/>{query&&<button type="button" aria-label="مسح البحث" onClick={()=>setQuery('')}><X size={17}/></button>}</div></div>
   {error&&<p role="alert" className="error-message admin-feedback">{error}</p>}
   <TabsContent value="inbox">{folder==='inbox'&&table}</TabsContent><TabsContent value="sent">{folder==='sent'&&table}</TabsContent>
   <TabsContent value="urgent">{folder==='urgent'&&table}</TabsContent><TabsContent value="trash">{folder==='trash'&&table}</TabsContent>
  </Tabs>}
  <Sheet open={!!opened} onOpenChange={value=>{if(!value)requestClose();}}><SheetContent side="left" className="admin-detail" dir="rtl" lang="ar" showCloseButton={false} onEscapeKeyDown={e=>{e.preventDefault();requestClose();}} onInteractOutside={e=>{e.preventDefault();requestClose();}}>
   <SheetHeader><div className="admin-detail-heading"><div><SheetTitle>{opened?.kind==='contact'?'رسالة تواصل':'تفاصيل السؤال'}</SheetTitle><SheetDescription><bdi>{detail?.reference??opened?.reference}</bdi></SheetDescription></div><Button variant="ghost" size="icon" aria-label="إغلاق الرسالة" disabled={!!action||priorityBusy} onClick={requestClose}><X size={21}/></Button></div></SheetHeader>
   {loadingDetail?<p role="status" className="admin-empty">جارٍ تحميل الرسالة…</p>:detail&&<div className="admin-detail-body">
    <div className="admin-detail-status"><Status status={detail.status}/>{detail.deletedAt?<Button type="button" size="sm" variant="outline" disabled={trashBusy} onClick={()=>opened&&void changeTrash(opened,true)}><Undo2 size={15}/>استعادة الرسالة</Button>:<Button type="button" size="sm" variant={detail.urgent?'default':'outline'} disabled={priorityBusy||!!action} aria-pressed={!!detail.urgent} onClick={()=>void toggleUrgent()}><Flag size={15}/>{detail.urgent?'عاجلة':'نقل إلى العاجلة'}</Button>}{dirty&&<small>تعديلات غير محفوظة</small>}</div>
    <dl className="admin-message-meta">
     <div><dt>لغة السائل</dt><dd className="admin-language"><Languages size={16}/>{messageLanguage(detail.language)}</dd></div>
     <div><dt>تاريخ الوصول</dt><dd>{date(detail.created_at)}</dd></div>
     <div className="admin-wide"><dt>{detail.email?'بريد السائل':'رقم التواصل'}</dt><dd><bdi>{detail.email??detail.contact}</bdi></dd></div>
     {detail.name&&<div><dt>الاسم</dt><dd>{detail.name}</dd></div>}
     {detail.status==='sent'&&<div><dt>تاريخ الإرسال</dt><dd>{date(detail.sent_at??detail.updated_at)}</dd></div>}
    </dl>
    <section className="admin-full-question"><h3><MessageSquare size={18}/>الرسالة الواردة</h3><p dir="auto">{detail.question}</p></section>
    {detail.email?(!detail.deletedAt&&editable(detail.status)?<form className="admin-reply-form" onSubmit={e=>{e.preventDefault();void save('send');}}>
     <div className="admin-answer-label"><label htmlFor="admin-answer">الإجابة</label><span>{messageLanguage(detail.language)}</span></div>
     <Textarea id="admin-answer" dir="auto" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="اكتب الإجابة بلغة السائل…" maxLength={12000} required disabled={!!action}/>
     <p className="admin-recipient">إلى: <bdi>{detail.email}</bdi></p>
     <details className="admin-copy-options" open={cc||bcc?true:undefined}><summary>إرسال نسخة إضافية <span lang="en">Cc / Bcc</span></summary><div><label htmlFor="reply-cc">نسخة <bdi>Cc</bdi></label><Input id="reply-cc" value={cc} onChange={e=>setCc(e.target.value)} dir="ltr" inputMode="email" autoComplete="off" placeholder="name@example.com" disabled={!!action}/><label htmlFor="reply-bcc">نسخة مخفية <bdi>Bcc</bdi></label><Input id="reply-bcc" value={bcc} onChange={e=>setBcc(e.target.value)} dir="ltr" inputMode="email" autoComplete="off" placeholder="name@example.com" disabled={!!action}/><p>افصل بين عناوين البريد بفاصلة. تُرسل النسخ مع الرد.</p></div></details>
     <div className="admin-reply-actions"><Button type="submit" disabled={!!action||!answer.trim()}><Send size={17}/>{action==='send'?'جارٍ الإرسال…':'إرسال الرد'}</Button><Button type="button" variant="outline" disabled={!!action||!answer.trim()} onClick={()=>void save('draft')}><Save size={17}/>{action==='draft'?'جارٍ الحفظ…':'حفظ مسودة'}</Button></div>
    </form>:<section className="admin-saved-reply"><h3>{detail.status==='sent'?<Check size={18}/>:<Save size={18}/>} {detail.status==='sent'?'الرد المرسل':'الإجابة المحفوظة'}</h3><p dir="auto">{detail.answer}</p>{copyText(detail.cc)&&<div className="admin-copy-receipt">نسخة <bdi>Cc: {copyText(detail.cc)}</bdi></div>}{copyText(detail.bcc)&&<div className="admin-copy-receipt">نسخة مخفية <bdi>Bcc: {copyText(detail.bcc)}</bdi></div>}{detail.status==='delivery_unknown'&&!detailError&&<p className="admin-send-error" role="alert">تعذر تأكيد الإرسال. الإجابة محفوظة.</p>}{detail.status==='sending'&&<Button variant="outline" onClick={()=>opened&&void open(opened)}><RefreshCw size={16}/>تحديث الحالة</Button>}</section>):<a className="admin-phone-link" href={'tel:'+(detail.contact??'').replace(/[^+\d]/g,'')}><Phone size={18}/>التواصل عبر الهاتف</a>}
   </div>}
   {detailError&&<div className="admin-send-error" role="alert">{detailError}{!detail&&opened&&<Button variant="ghost" onClick={()=>void open(opened)}>حاول مجددًا</Button>}</div>}
   {notice&&<p role="status" className="admin-result"><Check size={18}/>{notice}</p>}
  </SheetContent></Sheet>
  <AlertDialog open={!!deleteTarget} onOpenChange={value=>{if(!value&&!trashBusy)setDeleteTarget(null);}}><AlertDialogContent dir="rtl" className="admin-close-dialog"><AlertDialogHeader><AlertDialogTitle>حذف الرسالة <bdi>{deleteTarget?.reference}</bdi>؟</AlertDialogTitle><AlertDialogDescription>ستُنقل إلى سلة المحذوفات، ويمكن استعادتها لاحقًا.</AlertDialogDescription></AlertDialogHeader>{trashError&&<p role="alert" className="error-message">{trashError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={trashBusy}>إلغاء</AlertDialogCancel><Button className="admin-confirm-delete" disabled={trashBusy} onClick={()=>deleteTarget&&void changeTrash(deleteTarget)}><Trash2 size={16}/>{trashBusy?'جارٍ الحذف…':'حذف'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}><AlertDialogContent dir="rtl" className="admin-close-dialog"><AlertDialogHeader><AlertDialogTitle>حفظ المسودة؟</AlertDialogTitle><AlertDialogDescription>لديك إجابة لم تُحفظ بعد.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={!!action}>متابعة الكتابة</AlertDialogCancel><Button variant="ghost" disabled={!!action} onClick={close}>إغلاق دون حفظ</Button><Button disabled={!!action||!answer.trim()} onClick={()=>void save('draft',true)}>{action==='draft'?'جارٍ الحفظ…':'حفظ وإغلاق'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </main>;
}
