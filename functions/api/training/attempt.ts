import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth';
import { getSupabaseUrl, getServiceRoleKey } from '../_env';
import {
  visibleCaseFields, canAdvanceStage, nextStage, hasReachedStage,
  type AttemptInputs, type FullCaseRow, type TrainingStage,
} from './_shared';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

/**
 * Diagnostic Calibration — hardened attempt lifecycle.
 *
 * The application owns progressive disclosure and analyst-authored stage
 * persistence. The DATABASE owns final scoring/reveal through
 * `finalize_and_reveal_attempt`, which binds the attempt to auth.uid(),
 * snapshots the hidden reference, computes deterministic correctness and
 * decides first-attempt gate eligibility.
 *
 * AI calibration runs only AFTER database finalization. It may produce a
 * calibration profile and a provisional defensibility opinion, but it does
 * NOT write `disagreement_defensible=true`. A rescued disagreement requires
 * the separate adjudication contract in the database; model agreement alone
 * is not certification ground truth.
 */

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

function rowToAttemptInputs(row: Record<string, unknown>): AttemptInputs {
  return {
    observation: (row.observation as string) ?? undefined,
    evidenceNotes: (row.evidence_notes as string) ?? undefined,
    hypothesisMechanism: (row.hypothesis_mechanism as AttemptInputs['hypothesisMechanism']) ?? undefined,
    hypothesisReasoning: (row.hypothesis_reasoning as string) ?? undefined,
    counterHypothesisMechanism: (row.counter_hypothesis_mechanism as AttemptInputs['counterHypothesisMechanism']) ?? undefined,
    counterHypothesisReasoning: (row.counter_hypothesis_reasoning as string) ?? undefined,
    socraticExchanges: (row.socratic_exchanges as AttemptInputs['socraticExchanges']) ?? [],
    revision: (row.revision as string) ?? undefined,
    judgmentDisposition: (row.judgment_disposition as AttemptInputs['judgmentDisposition']) ?? undefined,
    judgmentMechanism: (row.judgment_mechanism as AttemptInputs['judgmentMechanism']) ?? undefined,
    judgmentConfidence: (row.judgment_confidence as AttemptInputs['judgmentConfidence']) ?? undefined,
    recommendation: (row.recommendation as string) ?? undefined,
    uncertaintyNotes: (row.uncertainty_notes as string) ?? undefined,
    reflectionAnswers: (row.reflection_answers as Record<string, string>) ?? undefined,
  };
}

const SAVE_FIELD_COLUMNS: Record<string, string> = {
  observation: 'observation',
  evidenceNotes: 'evidence_notes',
  hypothesisMechanism: 'hypothesis_mechanism',
  hypothesisReasoning: 'hypothesis_reasoning',
  counterHypothesisMechanism: 'counter_hypothesis_mechanism',
  counterHypothesisReasoning: 'counter_hypothesis_reasoning',
  socraticExchanges: 'socratic_exchanges',
  revision: 'revision',
  judgmentDisposition: 'judgment_disposition',
  judgmentMechanism: 'judgment_mechanism',
  judgmentConfidence: 'judgment_confidence',
  recommendation: 'recommendation',
  uncertaintyNotes: 'uncertainty_notes',
};

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  [key: string]: string | undefined;
}

function serverClient(env: Env) {
  return createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function finalizeAsCaller(request: Request, env: Env, attemptId: string): Promise<{
  reference_disposition: string;
  reference_mechanism: string | null;
  disposition_correct: boolean;
  mechanism_correct: boolean;
}> {
  const auth = request.headers.get('Authorization');
  const apikey = getServiceRoleKey(env);
  if (!auth?.startsWith('Bearer ') || !apikey) throw new Error('Verified caller credentials unavailable');

  const res = await fetch(`${getSupabaseUrl(env)}/rest/v1/rpc/finalize_and_reveal_attempt`, {
    method: 'POST',
    headers: {
      apikey,
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_attempt_id: attemptId }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Finalize failed (${res.status}): ${raw.slice(0, 500)}`);
  const parsed = JSON.parse(raw) as Array<{
    reference_disposition: string;
    reference_mechanism: string | null;
    disposition_correct: boolean;
    mechanism_correct: boolean;
  }>;
  if (!Array.isArray(parsed) || !parsed[0]) throw new Error('Finalize returned no result row');
  return parsed[0];
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env as Record<string, string>);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  const attemptId = new URL(request.url).searchParams.get('attemptId');
  if (!attemptId) return Response.json({ error: 'attemptId query param is required' }, { status: 400, headers: CORS });

  const supabase = serverClient(env);
  const { data: attempt, error } = await supabase
    .from('training_attempts').select('*').eq('id', attemptId).eq('analyst_id', admin.id).single();
  if (error || !attempt) return Response.json({ error: 'Attempt not found' }, { status: 404, headers: CORS });

  const { data: caseRow, error: caseError } = await supabase.from('training_cases').select('*').eq('id', attempt.case_id).single();
  if (caseError || !caseRow) return Response.json({ error: 'Case not found for this attempt' }, { status: 404, headers: CORS });

  const revealed = hasReachedStage(attempt.stage as TrainingStage, 'verdict_revealed');
  return Response.json({
    attempt: {
      id: attempt.id,
      stage: attempt.stage,
      inputs: rowToAttemptInputs(attempt),
      calibrationProfile: revealed ? attempt.calibration_profile : null,
      dispositionCorrect: revealed ? attempt.disposition_correct : null,
      mechanismCorrect: revealed ? attempt.mechanism_correct : null,
      disagreementDefensible: revealed ? attempt.disagreement_defensible : null,
      gateEligible: revealed ? attempt.is_gate_eligible : false,
    },
    case: visibleCaseFields(dbRowToFullCase(caseRow), attempt.stage as TrainingStage),
  }, { headers: CORS });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const admin = await requireAdmin(request, env as Record<string, string>);
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

  const supabase = serverClient(env);

  if (payload.action === 'start') {
    const caseId = payload.caseId as string | undefined;
    if (!caseId) return Response.json({ error: 'caseId is required' }, { status: 400, headers: CORS });

    const { data: caseRow, error: caseError } = await supabase
      .from('training_cases').select('*').eq('id', caseId).eq('is_published', true).single();
    if (caseError || !caseRow) return Response.json({ error: 'Published case not found' }, { status: 404, headers: CORS });

    const { data: attempt, error } = await supabase
      .from('training_attempts')
      .insert({ case_id: caseId, analyst_id: admin.id, stage: 'observation' })
      .select()
      .single();
    if (error || !attempt) return Response.json({ error: error?.message ?? 'Failed to start attempt' }, { status: 500, headers: CORS });

    return Response.json({
      attempt: { id: attempt.id, stage: attempt.stage, inputs: {}, gateEligible: false },
      case: visibleCaseFields(dbRowToFullCase(caseRow), 'observation'),
    }, { status: 201, headers: CORS });
  }

  if (payload.action === 'save') {
    const attemptId = payload.attemptId as string | undefined;
    const fields = (payload.fields ?? {}) as Record<string, unknown>;
    if (!attemptId) return Response.json({ error: 'attemptId is required' }, { status: 400, headers: CORS });

    const { data: existing, error: fetchError } = await supabase
      .from('training_attempts').select('*').eq('id', attemptId).eq('analyst_id', admin.id).single();
    if (fetchError || !existing) return Response.json({ error: 'Attempt not found' }, { status: 404, headers: CORS });
    if (hasReachedStage(existing.stage as TrainingStage, 'verdict_revealed')) {
      return Response.json({ error: 'This attempt has already been revealed — preregistered reasoning is locked.' }, { status: 409, headers: CORS });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, column] of Object.entries(SAVE_FIELD_COLUMNS)) {
      if (key in fields) update[column] = fields[key];
    }

    // Abstention is explicit: selecting a non-behavioral disposition clears
    // any mechanism left in client state so DB constraints cannot be bypassed
    // by a stale UI value.
    if ('judgmentDisposition' in fields) {
      const d = fields.judgmentDisposition;
      if (d !== 'behavioral_diagnosis' && d !== 'mixed_condition') update.judgment_mechanism = null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('training_attempts').update(update).eq('id', attemptId).eq('analyst_id', admin.id).select().single();
    if (updateError || !updated) return Response.json({ error: updateError?.message ?? 'Failed to save' }, { status: 500, headers: CORS });

    const stage = updated.stage as TrainingStage;
    const advance = canAdvanceStage(stage, rowToAttemptInputs(updated));
    const eligibleForAutoAdvance = advance.canAdvance && stage !== 'recommendation' && stage !== 'verdict_revealed';
    let finalAttempt = updated;
    if (eligibleForAutoAdvance) {
      const next = nextStage(stage);
      const { data: advanced, error: advanceError } = await supabase
        .from('training_attempts')
        .update({ stage: next, updated_at: new Date().toISOString() })
        .eq('id', attemptId).eq('analyst_id', admin.id).select().single();
      if (!advanceError && advanced) finalAttempt = advanced;
    }

    return Response.json({
      attempt: { id: finalAttempt.id, stage: finalAttempt.stage, inputs: rowToAttemptInputs(finalAttempt) },
      advanceBlockedReason: eligibleForAutoAdvance ? null : advance.reason,
    }, { headers: CORS });
  }

  if (payload.action === 'reveal') {
    const attemptId = payload.attemptId as string | undefined;
    if (!attemptId) return Response.json({ error: 'attemptId is required' }, { status: 400, headers: CORS });

    const { data: before, error: fetchError } = await supabase
      .from('training_attempts').select('*').eq('id', attemptId).eq('analyst_id', admin.id).single();
    if (fetchError || !before) return Response.json({ error: 'Attempt not found' }, { status: 404, headers: CORS });
    if (before.stage !== 'recommendation') {
      return Response.json({ error: `Cannot reveal from stage '${before.stage}' — the attempt must reach 'recommendation' first.` }, { status: 409, headers: CORS });
    }
    const inputs = rowToAttemptInputs(before);
    const advance = canAdvanceStage('recommendation', inputs);
    if (!advance.canAdvance) return Response.json({ error: advance.reason }, { status: 422, headers: CORS });

    let finalized: Awaited<ReturnType<typeof finalizeAsCaller>>;
    try {
      finalized = await finalizeAsCaller(request, env, attemptId);
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : 'Failed to finalize attempt' }, { status: 422, headers: CORS });
    }

    const { data: caseRow, error: caseError } = await supabase.from('training_cases').select('*').eq('id', before.case_id).single();
    if (caseError || !caseRow) return Response.json({ error: 'Case not found' }, { status: 404, headers: CORS });
    const fullCase = dbRowToFullCase(caseRow);

    let calibrationProfile: Record<string, number> = {
      evidence_evaluation: 3,
      hypothesis_generation: 3,
      uncertainty_estimation: 3,
      prioritization: 3,
      differential_diagnosis: 3,
      confidence_calibration: 3,
      recommendation_quality: 3,
    };
    let evidenceDisciplinePass: boolean | null = null;
    let aiDisagreementAssessment: boolean | null = null;
    let calibrationFeedback: string | null = null;

    // Current tutor calibration requires a behavioral reference mechanism.
    // Abstention cases still reveal deterministically; richer abstention
    // calibration is a separate tutor contract and must not be fabricated.
    if (fullCase.referenceMechanism) {
      try {
        const tutorUrl = `${getSupabaseUrl(env)}/functions/v1/diagnostic-calibration-tutor`;
        const res = await fetch(tutorUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getServiceRoleKey(env)}` },
          body: JSON.stringify({
            step: 'calibrate',
            observableCase: visibleCaseFields(fullCase, 'observation'),
            referenceMechanism: fullCase.referenceMechanism,
            referenceMechanismNote: fullCase.referenceMechanismNote,
            referenceDiagnosis: fullCase.referenceDiagnosis,
            referenceRecommendation: fullCase.referenceRecommendation,
            inputs,
            mechanismCorrect: finalized.mechanism_correct,
          }),
        });
        if (res.ok) {
          const result = (await res.json()) as {
            calibration_profile?: Record<string, number>;
            disagreement_defensible?: boolean | null;
            evidence_discipline_pass?: boolean;
            feedback?: string;
          };
          calibrationProfile = result.calibration_profile ?? calibrationProfile;
          evidenceDisciplinePass = result.evidence_discipline_pass ?? null;
          aiDisagreementAssessment = finalized.mechanism_correct ? null : (result.disagreement_defensible ?? null);
          calibrationFeedback = result.feedback ?? null;
        }
      } catch {
        // AI calibration is enrichment. Deterministic reveal must survive an
        // unavailable model, but the absence is represented honestly below.
      }
    }

    const { data: enriched, error: enrichError } = await supabase
      .from('training_attempts')
      .update({
        calibration_profile: calibrationProfile,
        evidence_discipline_pass: evidenceDisciplinePass,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attemptId).eq('analyst_id', admin.id).select().single();
    if (enrichError || !enriched) {
      return Response.json({ error: enrichError?.message ?? 'Verdict revealed but calibration enrichment could not be stored' }, { status: 500, headers: CORS });
    }

    return Response.json({
      attempt: {
        id: enriched.id,
        stage: enriched.stage,
        dispositionCorrect: finalized.disposition_correct,
        mechanismCorrect: finalized.mechanism_correct,
        disagreementDefensible: enriched.disagreement_defensible,
        aiDisagreementAssessment,
        adjudicationStatus: enriched.adjudication_id ? 'adjudicated' : 'not_adjudicated',
        calibrationProfile,
        calibrationFeedback,
        gateEligible: enriched.is_gate_eligible,
      },
      case: visibleCaseFields(fullCase, 'verdict_revealed'),
    }, { headers: CORS });
  }

  if (payload.action === 'reflect') {
    const attemptId = payload.attemptId as string | undefined;
    const reflectionAnswers = payload.reflectionAnswers as Record<string, string> | undefined;
    if (!attemptId) return Response.json({ error: 'attemptId is required' }, { status: 400, headers: CORS });

    const { data: attempt, error: fetchError } = await supabase
      .from('training_attempts').select('*').eq('id', attemptId).eq('analyst_id', admin.id).single();
    if (fetchError || !attempt) return Response.json({ error: 'Attempt not found' }, { status: 404, headers: CORS });
    if (attempt.stage !== 'verdict_revealed') {
      return Response.json({ error: `Cannot submit reflection from stage '${attempt.stage}' — the verdict must be revealed first.` }, { status: 409, headers: CORS });
    }

    const inputs = { ...rowToAttemptInputs(attempt), reflectionAnswers };
    const advance = canAdvanceStage('verdict_revealed', inputs);
    if (!advance.canAdvance) return Response.json({ error: advance.reason }, { status: 422, headers: CORS });

    const { data: completed, error: completeError } = await supabase
      .from('training_attempts')
      .update({
        stage: 'reflection_complete',
        reflection_answers: reflectionAnswers,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', attemptId).eq('analyst_id', admin.id).select().single();
    if (completeError || !completed) return Response.json({ error: completeError?.message ?? 'Failed to complete reflection' }, { status: 500, headers: CORS });

    return Response.json({
      attempt: { id: completed.id, stage: completed.stage, completedAt: completed.completed_at, gateEligible: completed.is_gate_eligible },
    }, { headers: CORS });
  }

  return Response.json({ error: `Unknown action: ${String(payload.action)}` }, { status: 400, headers: CORS });
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
