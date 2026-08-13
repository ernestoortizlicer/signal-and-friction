import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

type Env = Record<string, string>;
type Mode = 'noticing' | 'contrast';

const ANALYST_PROFILE = {
  reasoningBaseline: 'advanced_structured',
  primaryTrainingNeed: 'visual_discrimination',
  currentStage: 'noticing',
  targetVisualMinutes: 60,
  rationale: 'Prioritize perceptual discrimination before adding more generic reasoning practice.',
} as const;

function db(env: Env) {
  return createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}

function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseOutcome(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function categoryCounts(rows: Array<Record<string, unknown>>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const outcome = parseOutcome(row.outcome);
    const feedback = outcome?.coachFeedback as Record<string, unknown> | undefined;
    const reinspect = Array.isArray(feedback?.reinspect) ? feedback!.reinspect as Array<Record<string, unknown>> : [];
    for (const item of reinspect) {
      const category = typeof item.category === 'string' ? item.category : 'other';
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));
}

function metricAverage(rows: Array<Record<string, unknown>>, key: string): number | null {
  const values: number[] = [];
  for (const row of rows) {
    const outcome = parseOutcome(row.outcome);
    const feedback = outcome?.coachFeedback as Record<string, unknown> | undefined;
    const metrics = feedback?.coach_metrics as Record<string, unknown> | undefined;
    const n = Number(metrics?.[key]);
    if (Number.isFinite(n)) values.push(n);
  }
  if (!values.length) return null;
  return Math.round((values.reduce((sum, n) => sum + n, 0) / values.length) * 10) / 10;
}

async function load(env: Env, analystId: string) {
  const supabase = db(env);
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('id,session_date,planned_minutes,actual_minutes,status,outcome,evidence_ref,completed_at,created_at')
    .eq('analyst_id', analystId)
    .like('evidence_ref', 'visual:%')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const last14Cutoff = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
  const last14 = rows.filter((r) => typeof r.session_date === 'string' && r.session_date >= last14Cutoff);
  const totalMinutes14 = last14.reduce((sum, r) => sum + Number(r.actual_minutes || 0), 0);

  return {
    profile: ANALYST_PROFILE,
    summary: {
      totalSessions: rows.length,
      sessionsLast14: last14.length,
      visualMinutesLast14: totalMinutes14,
      avgVisualSpecificity: metricAverage(rows, 'visual_specificity'),
      avgObservationInterpretationSeparation: metricAverage(rows, 'observation_interpretation_separation'),
      avgSalienceCoverageEstimate: metricAverage(rows, 'salience_coverage_estimate'),
      repeatedMissCategories: categoryCounts(rows),
    },
    sessions: rows.slice(0, 12).map((row) => ({
      id: row.id,
      sessionDate: row.session_date,
      actualMinutes: row.actual_minutes,
      completedAt: row.completed_at,
      evidenceRef: row.evidence_ref,
      outcome: parseOutcome(row.outcome),
    })),
  };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }
  try {
    return Response.json(await load(env, admin.id), { headers: CORS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to load visual practice.' }, { status: 500, headers: CORS });
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

  const action = String(body.action ?? '');
  const supabase = db(env);

  try {
    if (action === 'save_session') {
      const mode = body.mode as Mode;
      if (mode !== 'noticing' && mode !== 'contrast') {
        return Response.json({ error: 'mode must be noticing or contrast' }, { status: 400, headers: CORS });
      }
      const observations = typeof body.observations === 'string' ? body.observations.trim() : '';
      if (observations.length < 20 || observations.length > 8000) {
        return Response.json({ error: 'observations must be between 20 and 8000 characters' }, { status: 400, headers: CORS });
      }
      const feedback = body.coachFeedback && typeof body.coachFeedback === 'object' ? body.coachFeedback as Record<string, unknown> : {};
      const payload = {
        version: 'visual-coach-v0.1',
        practiceOnly: true,
        mode,
        companyName: typeof body.companyName === 'string' ? body.companyName.trim().slice(0, 200) : '',
        pageUrl: safeUrl(body.pageUrl),
        pageType: typeof body.pageType === 'string' ? body.pageType.slice(0, 50) : 'other',
        observations,
        imageFingerprints: Array.isArray(body.imageFingerprints) ? body.imageFingerprints.filter((x): x is string => typeof x === 'string').slice(0, 2) : [],
        coachFeedback: feedback,
        coachModel: typeof body.coachModel === 'string' ? body.coachModel.slice(0, 120) : null,
        providerCostUSD: typeof body.providerCostUSD === 'number' ? body.providerCostUSD : null,
        secondPassText: null,
      };
      const serialized = JSON.stringify(payload);
      if (serialized.length > 35000 || /data:image/i.test(serialized)) {
        return Response.json({ error: 'Visual practice record is too large or contains raw image data.' }, { status: 400, headers: CORS });
      }

      const minutes = asInt(body.actualMinutes, 10, 1, 240);
      const fingerprint = payload.imageFingerprints[0]?.slice(0, 16) || crypto.randomUUID().slice(0, 8);
      const evidenceRef = `visual:${mode}:${fingerprint}`;
      const now = new Date().toISOString();
      const { data, error } = await supabase.from('learning_sessions').insert({
        analyst_id: admin.id,
        session_date: now.slice(0, 10),
        session_type: 'build_application',
        planned_minutes: minutes,
        actual_minutes: minutes,
        status: 'completed',
        outcome: serialized,
        evidence_ref: evidenceRef,
        retrieval_score: null,
        started_at: new Date(Date.now() - minutes * 60000).toISOString(),
        completed_at: now,
        updated_at: now,
      }).select('id').single();
      if (error || !data) throw error ?? new Error('Failed to save visual session');

      return Response.json({ sessionId: data.id, ...(await load(env, admin.id)) }, { status: 201, headers: CORS });
    }

    if (action === 'save_second_pass') {
      const id = typeof body.id === 'string' ? body.id : '';
      const secondPassText = typeof body.secondPassText === 'string' ? body.secondPassText.trim() : '';
      if (!id || secondPassText.length < 10 || secondPassText.length > 8000 || /data:image/i.test(secondPassText)) {
        return Response.json({ error: 'Valid session id and second-pass text are required.' }, { status: 400, headers: CORS });
      }
      const { data: row, error: readError } = await supabase.from('learning_sessions')
        .select('outcome,evidence_ref').eq('id', id).eq('analyst_id', admin.id).single();
      if (readError || !row || typeof row.evidence_ref !== 'string' || !row.evidence_ref.startsWith('visual:')) {
        return Response.json({ error: 'Visual session not found.' }, { status: 404, headers: CORS });
      }
      const outcome = parseOutcome(row.outcome) ?? {};
      outcome.secondPassText = secondPassText;
      const { error } = await supabase.from('learning_sessions').update({
        outcome: JSON.stringify(outcome),
        updated_at: new Date().toISOString(),
      }).eq('id', id).eq('analyst_id', admin.id);
      if (error) throw error;
      return Response.json(await load(env, admin.id), { headers: CORS });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: CORS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Visual practice action failed.' }, { status: 500, headers: CORS });
  }
};

export const onRequestOptions = (): Response => new Response(null, {
  status: 204,
  headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
});
