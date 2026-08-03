import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Phase 6.3 — the Monitoring launch-state fix. Freezes the scaffold's
// CURRENT technical_signals into baseline_technical_signals, once,
// deliberately, on an explicit analyst action — never automatic, never
// inferred, never re-captured silently on a later Rescan. The analyst
// triggers this exactly once, at the moment they've confirmed the
// diagnosed fix is actually live — before that moment there is nothing
// honest to freeze yet.
export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  let payload: { scaffoldId?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }
  if (!payload.scaffoldId) {
    return Response.json({ error: 'scaffoldId is required' }, { status: 400, headers: CORS });
  }

  const supabaseUrl = getSupabaseUrl(env);
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return Response.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500, headers: CORS });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: scaffold, error: fetchError } = await supabase
    .from('diagnostic_scaffolds')
    .select('id, technical_signals')
    .eq('id', payload.scaffoldId)
    .single();

  if (fetchError || !scaffold) {
    return Response.json({ error: 'Scaffold not found' }, { status: 404, headers: CORS });
  }
  if (!scaffold.technical_signals) {
    return Response.json(
      { error: 'No technical signals on this scaffold yet — scan or rescan it before capturing a baseline.' },
      { status: 422, headers: CORS }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from('diagnostic_scaffolds')
    .update({
      baseline_technical_signals: scaffold.technical_signals,
      baseline_captured_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.scaffoldId)
    .select()
    .single();

  if (updateError || !updated) {
    return Response.json({ error: updateError?.message ?? 'Failed to capture baseline' }, { status: 500, headers: CORS });
  }

  return Response.json(updated, { headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
