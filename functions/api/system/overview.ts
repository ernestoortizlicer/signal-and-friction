import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
type Env = Record<string, string>;
type Health = 'ready' | 'attention' | 'unavailable';
type ModuleSignal = { health: Health; value: number | null; label: string; detail: string; error?: string };
const good = (value:number,label:string,detail:string,health:Health='ready'):ModuleSignal => ({health,value,label,detail});
const bad = (label:string,error:unknown):ModuleSignal => ({health:'unavailable',value:null,label,detail:'Live state could not be verified.',error:error instanceof Error?error.message:String(error)});

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return Response.json(await admin.json().catch(() => ({})), { status: admin.status, headers: CORS });
  const key = getServiceRoleKey(env);
  if (!key) return Response.json({ error: 'System overview credential unavailable.' }, { status: 500, headers: CORS });
  const db = createClient(getSupabaseUrl(env), key, { auth: { persistSession:false, autoRefreshToken:false } });
  const requestedDate = new URL(request.url).searchParams.get('date');
  const date = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : new Date().toISOString().slice(0,10);
  const modules:Record<string,ModuleSignal> = {};

  await Promise.all([
    (async()=>{try{const {count,error}=await db.from('priority_tasks').select('id',{count:'exact',head:true}).in('status',['pending','in_progress']);if(error)throw error;modules.command=good(count??0,'active actions','Derived queue awaiting operator action.')}catch(e){modules.command=bad('active actions',e)}})(),
    (async()=>{try{const {data,error}=await db.from('beta_projects').select('status');if(error)throw error;const n=(data??[]).filter(r=>!['closed_completed','closed_lost'].includes(String(r.status))).length;modules.sales=good(n,'active projects','Commercial projects not yet closed.')}catch(e){modules.sales=bad('active projects',e)}})(),
    (async()=>{try{const {count,error}=await db.from('diagnostic_scaffolds').select('id',{count:'exact',head:true}).eq('status','draft');if(error)throw error;modules.delivery=good(count??0,'draft workspaces','Diagnostic workspaces still under review.')}catch(e){modules.delivery=bad('draft workspaces',e)}})(),
    (async()=>{try{const {data,error}=await db.from('learning_sessions').select('status').eq('session_date',date);if(error)throw error;const rows=data??[];const done=rows.filter(r=>r.status==='completed').length;const active=rows.filter(r=>r.status==='in_progress').length;modules.training=good(rows.length,'blocks today',`${done} validated · ${active} in progress.`,active>0?'attention':'ready')}catch(e){modules.training=bad('blocks today',e)}})(),
    (async()=>{try{const {data,error}=await db.from('finance_obligations').select('status');if(error)throw error;const n=(data??[]).filter(r=>!['filed','paid','not_applicable'].includes(String(r.status))).length;modules.finance=good(n,'open obligations','Compliance obligations not yet closed.',n>0?'attention':'ready')}catch(e){modules.finance=bad('open obligations',e)}})(),
    (async()=>{try{const {data,error}=await db.from('ai_incidents').select('severity').is('resolved_at',null);if(error)throw error;const rows=data??[];const urgent=rows.filter(r=>['high','critical'].includes(String(r.severity))).length;modules.reliability=good(rows.length,'open incidents',`${urgent} high / critical.`,urgent>0?'attention':'ready')}catch(e){modules.reliability=bad('open incidents',e)}})(),
  ]);

  return Response.json({ observedAt:new Date().toISOString(), date, actorId:admin.id, modules }, { headers:CORS });
};

export const onRequestOptions = ():Response => new Response(null,{status:204,headers:{...CORS,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}});
