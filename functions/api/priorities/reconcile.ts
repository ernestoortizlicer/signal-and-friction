import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

type Env = Record<string, string>;

/**
 * Rebuilds the action projection from canonical source state.
 *
 * Priority tasks are not business truth. beta_projects / ai_incidents are.
 * The DB RPC is service-role only; this HTTP boundary proves the caller is an
 * allowed admin before invoking it.
 */
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  const serviceKey = getServiceRoleKey(env);
  if (!serviceKey) {
    return Response.json({ error: 'Priority reconciliation credential unavailable' }, { status: 500, headers: CORS });
  }

  const supabase = createClient(getSupabaseUrl(env), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('reconcile_priority_tasks');
  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return Response.json({ ok: true, actorId: admin.id, reconciliation: data }, { headers: CORS });
};

export const onRequestOptions = (): Response => new Response(null, {
  status: 204,
  headers: {
    ...CORS,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
});
