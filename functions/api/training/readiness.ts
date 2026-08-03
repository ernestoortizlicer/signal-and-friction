import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import { computeReadiness, topConfusionPairs, DEFAULT_READINESS_CONFIG, type CompletedAttemptSummary } from './_shared-readiness';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Diagnostic Calibration System v3 — transparent readiness. Never a
// single opaque score: computeReadiness() (byte-identical mirror of
// src/lib/calibration-readiness.ts) returns a named, independently-
// thresholded criteria list, which this endpoint passes straight through.
export const onRequestGet = async ({
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

  const supabase = createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: attempts, error } = await supabase
    .from('training_attempts')
    .select('id, case_id, judgment_mechanism, judgment_confidence, disagreement_defensible, evidence_discipline_pass, calibration_profile, completed_at, training_cases(reference_mechanism)')
    .eq('stage', 'reflection_complete')
    .order('completed_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }

  const summaries: CompletedAttemptSummary[] = (attempts ?? [])
    .filter((a) => a.training_cases && a.judgment_mechanism && a.judgment_confidence && a.completed_at)
    .map((a) => {
      const profile = (a.calibration_profile ?? {}) as Record<string, number>;
      return {
        caseId: a.case_id as string,
        // Supabase's PostgREST embed returns the joined row as an object
        // here (FK, not an array) — cast reflects the actual runtime shape.
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

  const readiness = computeReadiness(summaries, DEFAULT_READINESS_CONFIG);
  const confusionPairs = topConfusionPairs(summaries, 3);

  return Response.json({ readiness, confusionPairs, totalCompletedCases: summaries.length }, { headers: CORS });
};

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  });
