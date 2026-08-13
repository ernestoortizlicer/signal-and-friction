import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
type Env = Record<string, string>;

const ROLES = new Set([
  'business_registration', 'tax_residency', 'vat_gst', 'payroll_social',
  'personal_residency', 'banking', 'work_authorization',
  'permanent_establishment_review', 'other',
]);

function db(env: Env) {
  return createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOwnedProfile(supabase: ReturnType<typeof db>, analystId: string, profileId: string) {
  const { data, error } = await supabase.from('finance_profiles')
    .select('id,name,scope,base_currency')
    .eq('id', profileId).eq('owner_id', analystId).single();
  if (error || !data) throw new Error('Finance profile not found or not owned by caller');
  return data;
}

async function payload(env: Env, analystId: string, requestedProfileId?: string | null) {
  const supabase = db(env);
  const { data: profiles, error: profilesError } = await supabase.from('finance_profiles')
    .select('id,name,scope,base_currency').eq('owner_id', analystId).order('created_at');
  if (profilesError) throw profilesError;
  const profile = (profiles ?? []).find((p) => p.id === requestedProfileId) ?? profiles?.[0] ?? null;
  if (!profile) return { profiles: [], profile: null, assignments: [], packs: [], sourceCoverage: [] };

  const { data: assignments, error: assignmentsError } = await supabase.from('finance_profile_jurisdictions')
    .select('*').eq('profile_id', profile.id).order('effective_from', { ascending: false });
  if (assignmentsError) throw assignmentsError;

  const codes = [...new Set((assignments ?? []).map((a) => a.jurisdiction_code))];
  const packsQuery = supabase.from('finance_jurisdiction_packs').select('*').order('display_name');
  const sourcesQuery = codes.length
    ? supabase.from('finance_compliance_sources')
        .select('jurisdiction_code,verification_status,checked_at,verified_at')
        .in('jurisdiction_code', codes)
    : null;
  const [{ data: packs, error: packsError }, sourcesRes] = await Promise.all([
    packsQuery,
    sourcesQuery ?? Promise.resolve({ data: [], error: null }),
  ]);
  if (packsError || sourcesRes.error) throw packsError ?? sourcesRes.error;

  const sourceCoverage = codes.map((code) => {
    const rows = (sourcesRes.data ?? []).filter((s) => s.jurisdiction_code === code);
    const verified = rows.filter((s) => s.verification_status === 'verified');
    const newest = verified.map((s) => s.verified_at ?? s.checked_at).filter(Boolean).sort().at(-1) ?? null;
    return { jurisdiction_code: code, recorded_sources: rows.length, verified_sources: verified.length, latest_verified_at: newest };
  });

  return { profiles: profiles ?? [], profile, assignments: assignments ?? [], packs: packs ?? [], sourceCoverage };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }
  try {
    const profileId = new URL(request.url).searchParams.get('profileId');
    return Response.json(await payload(env, admin.id, profileId), { headers: CORS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to load jurisdiction stack.' }, { status: 500, headers: CORS });
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
  const profileId = typeof body.profileId === 'string' ? body.profileId : '';
  if (!profileId) return Response.json({ error: 'profileId is required' }, { status: 400, headers: CORS });

  const supabase = db(env);
  try {
    await requireOwnedProfile(supabase, admin.id, profileId);

    if (action === 'save_assignment') {
      const code = String(body.jurisdictionCode ?? '').trim().toUpperCase();
      const role = String(body.role ?? '').trim();
      const status = String(body.status ?? 'self_reported').trim();
      const effectiveFrom = String(body.effectiveFrom ?? '').trim() || new Date().toISOString().slice(0, 10);
      const effectiveTo = String(body.effectiveTo ?? '').trim() || null;
      if (!/^[A-Z0-9-]{2,8}$/.test(code)) return Response.json({ error: 'jurisdictionCode must be a short uppercase jurisdiction code' }, { status: 400, headers: CORS });
      if (!ROLES.has(role)) return Response.json({ error: 'Unsupported jurisdiction role' }, { status: 400, headers: CORS });
      // Browser-authored assertions can only be unknown/self-reported. Verified
      // legal/tax states need a distinct evidence/professional verification flow.
      if (!['unknown','self_reported'].includes(status)) return Response.json({ error: 'Verified jurisdiction status cannot be self-assigned' }, { status: 400, headers: CORS });
      if (effectiveTo && effectiveTo < effectiveFrom) return Response.json({ error: 'effectiveTo cannot precede effectiveFrom' }, { status: 400, headers: CORS });

      const row = {
        profile_id: profileId,
        jurisdiction_code: code,
        role,
        status,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        source_id: null,
        evidence_ref: null,
        requires_professional_review: body.requiresProfessionalReview !== false,
        notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        updated_at: new Date().toISOString(),
      };
      const id = typeof body.id === 'string' ? body.id : null;
      if (id) {
        const { error } = await supabase.from('finance_profile_jurisdictions')
          .update(row).eq('id', id).eq('profile_id', profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('finance_profile_jurisdictions').insert(row);
        if (error) throw error;
      }
    } else if (action === 'remove_assignment') {
      const id = String(body.id ?? '');
      if (!id) return Response.json({ error: 'assignment id is required' }, { status: 400, headers: CORS });
      const { error } = await supabase.from('finance_profile_jurisdictions')
        .delete().eq('id', id).eq('profile_id', profileId);
      if (error) throw error;
    } else {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: CORS });
    }

    return Response.json(await payload(env, admin.id, profileId), { headers: CORS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Jurisdiction action failed.' }, { status: 500, headers: CORS });
  }
};

export const onRequestOptions = (): Response => new Response(null, {
  status: 204,
  headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
});
