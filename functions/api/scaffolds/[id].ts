import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Only these 7 judgment fields are writable through this endpoint —
// evidence, technical_signals, target_url, domain, scanned_at, client_id,
// and prospect_candidate_id are set once at generation and are immutable
// here. Regenerate to refresh measured data; never hand-edit it.
const EDITABLE_FIELDS = [
  'friction_mechanism',
  'specific_friction_point',
  'why_blocks_conversion',
  'projected_impact',
  'the_decision',
  'what_to_avoid',
  'confidence_and_why',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

export const onRequestPatch = async ({
  params,
  request,
  env,
}: {
  params: { id: string };
  request: Request;
  env: Record<string, string>;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  const { id } = params;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }

  const disallowedKeys = Object.keys(payload).filter((k) => !EDITABLE_FIELDS.includes(k as EditableField));
  if (disallowedKeys.length > 0) {
    return Response.json(
      { error: `Not editable via this endpoint: ${disallowedKeys.join(', ')}. Only the 7 judgment fields can be saved here.` },
      { status: 400, headers: CORS }
    );
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of EDITABLE_FIELDS) {
    if (payload[field] !== undefined) {
      if (typeof payload[field] !== 'string') {
        return Response.json({ error: `${field} must be a string` }, { status: 400, headers: CORS });
      }
      update[field] = payload[field];
    }
  }

  if (Object.keys(update).length === 1) {
    // Only updated_at present — nothing real to save.
    return Response.json({ error: 'No fields to update' }, { status: 400, headers: CORS });
  }

  const supabaseUrl = getSupabaseUrl(env);
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return Response.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500, headers: CORS });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: updated, error } = await supabase
    .from('diagnostic_scaffolds')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    return Response.json({ error: error?.message ?? 'Scaffold not found' }, { status: 404, headers: CORS });
  }

  return Response.json(updated, { headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
