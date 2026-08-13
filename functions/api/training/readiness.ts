import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { computeReadiness, topConfusionPairs, DEFAULT_READINESS_CONFIG, type CompletedAttemptSummary } from './_shared-readiness';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

async function gateTrackAsCaller(request: Request, env: Record<string, string>) {
  const auth = request.headers.get('Authorization');
  const apikey = getServiceRoleKey(env);
  if (!auth?.startsWith('Bearer ') || !apikey) return null;
  const res = await fetch(`${getSupabaseUrl(env)}/rest/v1/rpc/gate_track_a`, {
    method: 'POST',
    headers: { apikey, Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_window: 40 }),
  });
  if (!res.ok) return null;
  const rows = await res.json() as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

/**
 * Readiness has two deliberately separate meanings:
 *
 * 1) practiceCalibration — learning feedback over completed practice. It is
 *    useful for calibration/confusion tracking but NEVER authorizes premium
 *    client work.
 * 2) premiumReadiness — certification evidence. It can only become available
 *    when the independently sourced/rights-verified case bank itself satisfies
 *    v_bank_readiness and the analyst has gate-eligible attempts.
 *
 * Until the certification bank exists, this endpoint must say NOT AVAILABLE,
 * not convert practice repetition into a premium-readiness claim.
 */
export const onRequestGet = async ({ request, env }: { request: Request; env: Record<string, string> }): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  const supabase = createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: attempts, error: attemptsError }, { data: bankRows, error: bankError }, gateTrack] = await Promise.all([
    supabase
      .from('training_attempts')
      .select('id, case_id, judgment_mechanism, judgment_confidence, disagreement_defensible, evidence_discipline_pass, calibration_profile, completed_at, training_cases(reference_mechanism)')
      .eq('analyst_id', admin.id)
      .eq('stage', 'reflection_complete')
      .order('completed_at', { ascending: false }),
    supabase.from('v_bank_readiness').select('*').limit(1),
    gateTrackAsCaller(request, env),
  ]);

  if (attemptsError) return Response.json({ error: attemptsError.message }, { status: 500, headers: CORS });
  if (bankError) return Response.json({ error: `Certification-bank lookup failed: ${bankError.message}` }, { status: 500, headers: CORS });

  const summaries: CompletedAttemptSummary[] = (attempts ?? [])
    .filter((a) => a.training_cases && a.judgment_mechanism && a.judgment_confidence && a.completed_at)
    .map((a) => {
      const profile = (a.calibration_profile ?? {}) as Record<string, number>;
      return {
        caseId: a.case_id as string,
        referenceMechanism: (a.training_cases as unknown as { reference_mechanism: CompletedAttemptSummary['referenceMechanism'] }).reference_mechanism,
        judgmentMechanism: a.judgment_mechanism as CompletedAttemptSummary['judgmentMechanism'],
        judgmentConfidence: a.judgment_confidence as CompletedAttemptSummary['judgmentConfidence'],
        disagreementDefensible: a.disagreement_defensible as boolean | null,
        evidenceDisciplinePass: a.evidence_discipline_pass === true,
        differentialDiagnosisQuality: profile.differential_diagnosis ?? 3,
        uncertaintyHandling: profile.uncertainty_estimation ?? 3,
        recommendationCoherence: profile.recommendation_quality ?? 3,
        completedAt: a.completed_at as string,
      };
    });

  const practiceCalibration = computeReadiness(summaries, DEFAULT_READINESS_CONFIG);
  const confusionPairs = topConfusionPairs(summaries, 3);

  const bank = (bankRows?.[0] ?? {}) as Record<string, unknown>;
  const bankReady = [
    'cases_ok', 'six_mechanisms_ok', 'per_mechanism_ok', 'abstention_ok',
    'provenance_allowed', 'rights_ok', 'independence_ok',
  ].every((k) => bank[k] === true);

  // Personal premium thresholds beyond the DB Track-A integrity controls are
  // intentionally NOT invented here. Even if the bank eventually becomes
  // ready, a separate approved premium authorization contract must define
  // the final human-performance threshold before `ready` can become true.
  const premiumReadiness = {
    available: false,
    ready: false,
    status: bankReady ? 'personal_threshold_contract_not_yet_frozen' : 'blocked_by_certification_bank',
    bankReady,
    bank: {
      eligibleCases: Number(bank.eligible_cases ?? 0),
      mechanismsCovered: Number(bank.mechanisms_covered ?? 0),
      minPerMechanism: Number(bank.min_per_mechanism ?? 0),
      eligibleAbstentionCases: Number(bank.eligible_abstention_cases ?? 0),
      provenanceAllowed: bank.provenance_allowed === true,
      rightsOk: bank.rights_ok === true,
      independenceOk: bank.independence_ok === true,
      casesOk: bank.cases_ok === true,
      sixMechanismsOk: bank.six_mechanisms_ok === true,
      perMechanismOk: bank.per_mechanism_ok === true,
      abstentionOk: bank.abstention_ok === true,
    },
    gateTrack,
    explanation: bankReady
      ? 'The certification bank is structurally ready, but the final premium authorization threshold has not yet been frozen; no readiness claim is allowed yet.'
      : 'Practice is available, but the independent/rights-verified certification bank is not yet sufficient. Practice attempts cannot authorize premium client work.',
  };

  return Response.json({
    practiceCalibration: { ...practiceCalibration, certificationAuthority: false },
    premiumReadiness,
    confusionPairs,
    totalCompletedPracticeCases: summaries.length,
  }, { headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  });
