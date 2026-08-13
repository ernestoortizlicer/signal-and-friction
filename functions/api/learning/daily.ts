import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

type Env = Record<string, string>;

function db(env: Env) {
  return createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}

async function loadPayload(env: Env, analystId: string, date: string) {
  const supabase = db(env);
  const [settingsRes, resourcesRes, sessionsRes, attemptsRes] = await Promise.all([
    supabase.from('learning_daily_settings').select('*').eq('analyst_id', analystId).maybeSingle(),
    supabase.from('v_learning_resource_progress').select('*').eq('analyst_id', analystId).neq('status', 'archived').order('priority', { ascending: false }).order('title'),
    supabase.from('learning_sessions').select('*').eq('analyst_id', analystId).gte('session_date', new Date(Date.parse(`${date}T00:00:00Z`) - 13 * 86400000).toISOString().slice(0, 10)).lte('session_date', date).order('session_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('training_attempts').select('id,completed_at,judgment_mechanism,judgment_disposition,mechanism_correct,disposition_correct,ref_mechanism_snapshot,ref_disposition_snapshot').eq('analyst_id', analystId).not('verdict_revealed_at', 'is', null).order('verdict_revealed_at', { ascending: false }).limit(20),
  ]);

  const firstError = settingsRes.error || resourcesRes.error || sessionsRes.error || attemptsRes.error;
  if (firstError) throw new Error(firstError.message);

  const sessions = sessionsRes.data ?? [];
  const completed7 = sessions.filter((s) => s.status === 'completed' && s.actual_minutes != null);
  const distinctDays = new Set(completed7.map((s) => s.session_date));
  const actualMinutes7 = completed7.reduce((sum, s) => sum + Number(s.actual_minutes || 0), 0);

  const confusion = new Map<string, number>();
  for (const a of attemptsRes.data ?? []) {
    if (a.disposition_correct === false) {
      const key = `disposition:${String(a.ref_disposition_snapshot ?? 'unknown')}`;
      confusion.set(key, (confusion.get(key) ?? 0) + 2);
    }
    if (a.mechanism_correct === false && a.ref_mechanism_snapshot) {
      const key = String(a.ref_mechanism_snapshot);
      confusion.set(key, (confusion.get(key) ?? 0) + 1);
    }
  }
  const focus = [...confusion.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    date,
    settings: settingsRes.data,
    resources: resourcesRes.data ?? [],
    sessions,
    today: sessions.filter((s) => s.session_date === date),
    adherence: {
      activeDaysLast14: distinctDays.size,
      actualMinutesLast14: actualMinutes7,
      completedBlocksLast14: completed7.length,
    },
    calibrationFocus: focus,
  };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  const requested = new URL(request.url).searchParams.get('date');
  const date = validDate(requested) ? requested : new Date().toISOString().slice(0, 10);
  try {
    return Response.json(await loadPayload(env, admin.id, date), { headers: CORS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to load Learning OS.' }, { status: 500, headers: CORS });
  }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS }); }

  const supabase = db(env);
  const action = String(body.action ?? '');
  const date = validDate(body.date) ? body.date : new Date().toISOString().slice(0, 10);

  try {
    if (action === 'save_settings') {
      const row = {
        analyst_id: admin.id,
        course_study_target_min: asInt(body.courseStudyTargetMin, 45, 0, 480),
        diagnostic_practice_target_min: asInt(body.diagnosticPracticeTargetMin, 30, 0, 240),
        active_recall_target_min: asInt(body.activeRecallTargetMin, 15, 0, 120),
        build_application_target_min: asInt(body.buildApplicationTargetMin, 30, 0, 240),
        timezone: typeof body.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : 'Europe/Madrid',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('learning_daily_settings').upsert(row, { onConflict: 'analyst_id' });
      if (error) throw error;
    } else if (action === 'add_resource') {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const provider = typeof body.provider === 'string' ? body.provider.trim() : '';
      if (!title || !provider) return Response.json({ error: 'provider and title are required' }, { status: 400, headers: CORS });
      const { error } = await supabase.from('learning_resources').insert({
        analyst_id: admin.id,
        provider,
        title,
        source_url: typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null,
        status: 'active',
        priority: asInt(body.priority, 3, 1, 5),
        estimated_total_minutes: body.estimatedTotalMinutes == null ? null : asInt(body.estimatedTotalMinutes, 60, 1, 100000),
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
    } else if (action === 'update_resource') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return Response.json({ error: 'resource id is required' }, { status: 400, headers: CORS });
      const status = typeof body.status === 'string' ? body.status : undefined;
      const allowed = ['planned','active','paused','completed','archived'];
      if (status && !allowed.includes(status)) return Response.json({ error: 'invalid resource status' }, { status: 400, headers: CORS });
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (status) {
        patch.status = status;
        if (status === 'completed') patch.completed_at = new Date().toISOString();
      }
      if (body.priority != null) patch.priority = asInt(body.priority, 3, 1, 5);
      const { error } = await supabase.from('learning_resources').update(patch).eq('id', id).eq('analyst_id', admin.id);
      if (error) throw error;
    } else if (action === 'ensure_plan') {
      const { data: settings, error: settingsError } = await supabase.from('learning_daily_settings').select('*').eq('analyst_id', admin.id).single();
      if (settingsError || !settings) throw settingsError ?? new Error('Learning settings missing');
      const { data: resource } = await supabase.from('learning_resources').select('id').eq('analyst_id', admin.id).eq('status', 'active').order('priority', { ascending: false }).limit(1).maybeSingle();
      const blocks = [
        { key: 'course', type: 'course_study', minutes: settings.course_study_target_min, resource_id: resource?.id ?? null },
        { key: 'diagnostic', type: 'diagnostic_case', minutes: settings.diagnostic_practice_target_min, resource_id: null },
        { key: 'recall', type: 'active_recall', minutes: settings.active_recall_target_min, resource_id: null },
        { key: 'build', type: 'build_application', minutes: settings.build_application_target_min, resource_id: null },
      ].filter((b) => b.minutes > 0);
      for (const block of blocks) {
        const planKey = `daily:${block.key}`;
        const { data: existing } = await supabase.from('learning_sessions').select('id,status').eq('analyst_id', admin.id).eq('session_date', date).eq('plan_key', planKey).maybeSingle();
        if (!existing) {
          const { error } = await supabase.from('learning_sessions').insert({
            analyst_id: admin.id, session_date: date, session_type: block.type,
            plan_key: planKey, resource_id: block.resource_id, planned_minutes: block.minutes,
          });
          if (error) throw error;
        } else if (existing.status === 'planned') {
          const { error } = await supabase.from('learning_sessions').update({ planned_minutes: block.minutes, resource_id: block.resource_id, updated_at: new Date().toISOString() }).eq('id', existing.id).eq('analyst_id', admin.id);
          if (error) throw error;
        }
      }
    } else if (action === 'complete_session') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return Response.json({ error: 'session id is required' }, { status: 400, headers: CORS });
      const actualMinutes = asInt(body.actualMinutes, 0, 1, 720);
      const { error } = await supabase.from('learning_sessions').update({
        status: 'completed',
        actual_minutes: actualMinutes,
        outcome: typeof body.outcome === 'string' && body.outcome.trim() ? body.outcome.trim() : null,
        evidence_ref: typeof body.evidenceRef === 'string' && body.evidenceRef.trim() ? body.evidenceRef.trim() : null,
        retrieval_score: body.retrievalScore == null ? null : asInt(body.retrievalScore, 0, 0, 100),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', id).eq('analyst_id', admin.id);
      if (error) throw error;
    } else if (action === 'skip_session') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) return Response.json({ error: 'session id is required' }, { status: 400, headers: CORS });
      const { error } = await supabase.from('learning_sessions').update({ status: 'skipped', outcome: typeof body.reason === 'string' ? body.reason.trim() : null, updated_at: new Date().toISOString() }).eq('id', id).eq('analyst_id', admin.id);
      if (error) throw error;
    } else {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: CORS });
    }

    return Response.json(await loadPayload(env, admin.id, date), { headers: CORS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Learning OS action failed.' }, { status: 500, headers: CORS });
  }
};

export const onRequestOptions = (): Response => new Response(null, {
  status: 204,
  headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
});
