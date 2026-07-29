import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../../_env';
import { normalizeUrl, isValidUrl } from '../../_scan';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

interface PatchPayload {
  url?: unknown;
  company_name?: unknown;
  status?: unknown;
}

function domainFromUrl(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

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

  let payload: PatchPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }

  // This endpoint is only ever allowed to reset a candidate to 'new' — not
  // to set 'promoted' (that's promoteCandidate()'s job, which also creates
  // the linked clients row) or any other status directly.
  if (payload.status !== undefined && payload.status !== 'new') {
    return Response.json(
      { error: "status can only be reset to 'new' via this endpoint" },
      { status: 400, headers: CORS }
    );
  }

  const supabaseUrl = getSupabaseUrl(env);
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return Response.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500, headers: CORS });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const update: Record<string, unknown> = {};

  if (payload.company_name !== undefined) {
    if (typeof payload.company_name !== 'string') {
      return Response.json({ error: 'company_name must be a string' }, { status: 400, headers: CORS });
    }
    const trimmed = payload.company_name.trim();
    update.company_name = trimmed || null;
  }

  if (payload.url !== undefined) {
    if (typeof payload.url !== 'string' || !payload.url.trim()) {
      return Response.json({ error: 'url is required when provided' }, { status: 400, headers: CORS });
    }
    const normalized = normalizeUrl(payload.url);
    if (!isValidUrl(normalized)) {
      return Response.json({ error: 'Invalid URL' }, { status: 422, headers: CORS });
    }
    const domain = domainFromUrl(normalized);

    const { data: existing, error: fetchError } = await supabase
      .from('prospect_candidates')
      .select('id, url, domain')
      .eq('id', id)
      .single();
    if (fetchError || !existing) {
      return Response.json({ error: 'Candidate not found' }, { status: 404, headers: CORS });
    }

    // Only reset the scan state if the URL actually changed — an edit that
    // resolves to the same normalized URL/domain (e.g. re-saving unchanged
    // text) shouldn't wipe a perfectly good existing scan.
    if (normalized !== existing.url || domain !== existing.domain) {
      update.url = normalized;
      update.domain = domain;
      update.status = 'new';
      update.technical_signals = null;
      update.technical_score = null;
      update.score_breakdown = null;
      update.scan_error = null;
      update.scanned_at = null;
    }
  } else if (payload.status === 'new') {
    update.status = 'new';
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'No changes to apply' }, { status: 400, headers: CORS });
  }

  const { data: updated, error: updateError } = await supabase
    .from('prospect_candidates')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    // Postgres unique_violation on the domain column — another candidate
    // already has the domain this edit would produce.
    const message = updateError?.code === '23505'
      ? `Another candidate already uses domain "${update.domain}"`
      : (updateError?.message ?? 'Update failed');
    return Response.json({ error: message }, { status: 409, headers: CORS });
  }

  return Response.json(updated, { headers: CORS });
};

export const onRequestDelete = async ({
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

  const supabaseUrl = getSupabaseUrl(env);
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return Response.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500, headers: CORS });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Hard delete. promoted_client_id → clients is ON DELETE SET NULL on the
  // candidate side (see the migration) — deleting this tracking row never
  // cascades to, or deletes, the actual client relationship it produced.
  const { error } = await supabase.from('prospect_candidates').delete().eq('id', id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return Response.json({ ok: true, id }, { headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
