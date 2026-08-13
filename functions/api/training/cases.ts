import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import {
  visibleCaseFields,
  CANONICAL_MECHANISMS,
  CASE_DISPOSITIONS,
  dispositionRequiresMechanism,
  type FullCaseRow,
  type CaseDisposition,
} from './_shared';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

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
    referenceDisposition: row.reference_disposition as FullCaseRow['referenceDisposition'],
    referenceMechanism: (row.reference_mechanism as FullCaseRow['referenceMechanism']) ?? null,
    referenceMechanismNote: (row.reference_mechanism_note as string) ?? null,
    referenceDiagnosis: row.reference_diagnosis as string,
    referenceRecommendation: row.reference_recommendation as string,
    referenceResult: (row.reference_result as string) ?? null,
  };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Record<string, string> }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  const supabase = createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('training_cases')
    .select('*')
    .eq('is_published', true)
    .order('case_key');
  if (error) return Response.json({ error: error.message }, { status: 500, headers: CORS });

  const { data: eligibilityRows, error: eligibilityError } = await supabase
    .from('v_case_eligibility_derived')
    .select('case_id,derived_eligible');
  if (eligibilityError) return Response.json({ error: `Eligibility lookup failed: ${eligibilityError.message}` }, { status: 500, headers: CORS });
  const eligibility = new Map((eligibilityRows ?? []).map((r) => [r.case_id as string, r.derived_eligible === true]));

  const cases = (data ?? []).map((row) => ({
    ...visibleCaseFields(dbRowToFullCase(row), null),
    trainingUse: eligibility.get(row.id) ? 'certification_eligible' : 'practice_only',
  }));

  const coverage: Record<string, number> = Object.fromEntries(CANONICAL_MECHANISMS.map((m) => [m, 0]));
  for (const row of data ?? []) {
    const m = row.reference_mechanism as string | null;
    if (m && m in coverage) coverage[m] += 1;
  }

  return Response.json({ cases, mechanismCoverage: coverage }, { headers: CORS });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Record<string, string> }): Promise<Response> => {
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

  const required = ['caseKey', 'title', 'sourceType', 'referenceDisposition', 'referenceDiagnosis', 'referenceRecommendation'];
  const missing = required.filter((k) => !payload[k] || (typeof payload[k] === 'string' && !(payload[k] as string).trim()));
  if (missing.length > 0) return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400, headers: CORS });

  const disposition = payload.referenceDisposition as CaseDisposition;
  if (!CASE_DISPOSITIONS.includes(disposition)) {
    return Response.json({ error: `referenceDisposition must be one of: ${CASE_DISPOSITIONS.join(', ')}` }, { status: 400, headers: CORS });
  }
  if (dispositionRequiresMechanism(disposition)) {
    if (!CANONICAL_MECHANISMS.includes(payload.referenceMechanism as never)) {
      return Response.json({ error: `referenceMechanism is required for ${disposition} and must be one of: ${CANONICAL_MECHANISMS.join(', ')}` }, { status: 400, headers: CORS });
    }
  } else if (payload.referenceMechanism) {
    return Response.json({ error: `referenceMechanism must be empty for abstention disposition ${disposition}` }, { status: 400, headers: CORS });
  }

  const validSourceTypes = ['primary', 'practitioner_account', 'secondary_vendor', 'internal_sf_resolved'];
  if (!validSourceTypes.includes(payload.sourceType as string)) {
    return Response.json({ error: `sourceType must be one of: ${validSourceTypes.join(', ')}` }, { status: 400, headers: CORS });
  }
  if (!payload.sourceUrl && !payload.sourceNote) {
    return Response.json({ error: 'A case needs sourceUrl or sourceNote — provenance is not optional.' }, { status: 400, headers: CORS });
  }
  const observableFields = ['landingPage', 'pricingPage', 'onboardingFlow', 'checkoutFlow', 'technicalFindings', 'contextualInfo'];
  if (!observableFields.some((k) => payload[k] && typeof payload[k] === 'string' && (payload[k] as string).trim())) {
    return Response.json({ error: 'A case needs at least one populated observable-evidence field.' }, { status: 400, headers: CORS });
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
      reference_disposition: disposition,
      reference_mechanism: dispositionRequiresMechanism(disposition) ? payload.referenceMechanism : null,
      reference_mechanism_note: payload.referenceMechanismNote ?? null,
      reference_diagnosis: payload.referenceDiagnosis,
      reference_recommendation: payload.referenceRecommendation,
      reference_result: payload.referenceResult ?? null,
      reference_source: 'operator_authored',
      gate_eligible: false,
      reference_locked: false,
      is_published: payload.isPublished === true,
    })
    .select()
    .single();

  if (error || !data) return Response.json({ error: error?.message ?? 'Failed to create case' }, { status: 500, headers: CORS });

  return Response.json({ case: dbRowToFullCase(data), trainingUse: 'practice_only' }, { status: 201, headers: CORS });
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
