import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { visibleCaseFields, CANONICAL_MECHANISMS, type FullCaseRow } from './_shared';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Diagnostic Calibration System v3. Two responsibilities:
//   GET  — list published cases, OBSERVABLE FIELDS ONLY (attemptStage is
//          always null here — case *browsing* happens before any attempt
//          exists, the strictest pre-reveal state per visibleCaseFields()).
//   POST — admin case authoring/import. Validation here intentionally
//          mirrors the migration's CHECK constraints (provenance,
//          observable-evidence) so a bad case is rejected with a clear
//          message rather than bouncing off a raw Postgres constraint
//          error — "case may be used for reference calibration only when
//          its source material genuinely contains" the required parts.

function dbRowToFullCase(row: Record<string, unknown>): FullCaseRow {
  return {
    id: row.id as string,
    caseKey: row.case_key as string,
    title: row.title as string,
    companyName: (row.company_name as string) ?? null,
    sourceType: row.source_type as FullCaseRow['sourceType'],
    sourceUrl: (row.source_url as string) ?? null,
    sourceNote: (row.source_note as string) ?? null,
    landingPage: (row.landing_page as string) ?? null,
    pricingPage: (row.pricing_page as string) ?? null,
    onboardingFlow: (row.onboarding_flow as string) ?? null,
    checkoutFlow: (row.checkout_flow as string) ?? null,
    technicalFindings: (row.technical_findings as string) ?? null,
    contextualInfo: (row.contextual_info as string) ?? null,
    referenceMechanism: row.reference_mechanism as FullCaseRow['referenceMechanism'],
    referenceMechanismNote: (row.reference_mechanism_note as string) ?? null,
    referenceDiagnosis: row.reference_diagnosis as string,
    referenceRecommendation: row.reference_recommendation as string,
    referenceResult: (row.reference_result as string) ?? null,
  };
}

export const onRequestGet = async ({
  env,
}: {
  env: Record<string, string>;
}): Promise<Response> => {
  const supabase = createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('training_cases')
    .select('*')
    .eq('is_published', true)
    .order('case_key');

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }

  const cases = (data ?? []).map((row) => visibleCaseFields(dbRowToFullCase(row), null));

  // Explicit, honest per-mechanism coverage — the empty state the spec
  // requires ("an explicit empty state explaining that verified cases
  // must be added") is computed here, not left for the client to guess.
  const coverage: Record<string, number> = Object.fromEntries(CANONICAL_MECHANISMS.map((m) => [m, 0]));
  for (const row of data ?? []) {
    const m = row.reference_mechanism as string;
    if (m in coverage) coverage[m] += 1;
  }

  return Response.json({ cases, mechanismCoverage: coverage }, { headers: CORS });
};

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

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }

  const required = ['caseKey', 'title', 'sourceType', 'referenceMechanism', 'referenceDiagnosis', 'referenceRecommendation'];
  const missing = required.filter((k) => !payload[k] || (typeof payload[k] === 'string' && !(payload[k] as string).trim()));
  if (missing.length > 0) {
    return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400, headers: CORS });
  }
  if (!CANONICAL_MECHANISMS.includes(payload.referenceMechanism as never)) {
    return Response.json({ error: `referenceMechanism must be one of: ${CANONICAL_MECHANISMS.join(', ')}` }, { status: 400, headers: CORS });
  }
  const validSourceTypes = ['primary', 'practitioner_account', 'secondary_vendor', 'internal_sf_resolved'];
  if (!validSourceTypes.includes(payload.sourceType as string)) {
    return Response.json({ error: `sourceType must be one of: ${validSourceTypes.join(', ')}` }, { status: 400, headers: CORS });
  }
  // "Enough provenance to identify the source" — enforced here, not just at the DB.
  if (!payload.sourceUrl && !payload.sourceNote) {
    return Response.json({ error: 'A case needs sourceUrl or sourceNote — provenance is not optional.' }, { status: 400, headers: CORS });
  }
  const observableFields = ['landingPage', 'pricingPage', 'onboardingFlow', 'checkoutFlow', 'technicalFindings', 'contextualInfo'];
  if (!observableFields.some((k) => payload[k] && (payload[k] as string).trim())) {
    return Response.json({ error: 'A case needs at least one populated observable-evidence field (landingPage, pricingPage, onboardingFlow, checkoutFlow, technicalFindings, or contextualInfo).' }, { status: 400, headers: CORS });
  }

  const supabase = createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('training_cases')
    .insert({
      case_key: payload.caseKey,
      title: payload.title,
      company_name: payload.companyName ?? null,
      source_type: payload.sourceType,
      source_url: payload.sourceUrl ?? null,
      source_note: payload.sourceNote ?? null,
      landing_page: payload.landingPage ?? null,
      pricing_page: payload.pricingPage ?? null,
      onboarding_flow: payload.onboardingFlow ?? null,
      checkout_flow: payload.checkoutFlow ?? null,
      technical_findings: payload.technicalFindings ?? null,
      contextual_info: payload.contextualInfo ?? null,
      reference_mechanism: payload.referenceMechanism,
      reference_mechanism_note: payload.referenceMechanismNote ?? null,
      reference_diagnosis: payload.referenceDiagnosis,
      reference_recommendation: payload.referenceRecommendation,
      reference_result: payload.referenceResult ?? null,
      // Draft by default — an admin-authored/imported case never reaches
      // the trainee-facing pool until deliberately published.
      is_published: payload.isPublished === true,
    })
    .select()
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? 'Failed to create case' }, { status: 500, headers: CORS });
  }

  return Response.json({ case: dbRowToFullCase(data) }, { status: 201, headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
