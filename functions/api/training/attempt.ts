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

// Diagnostic Calibration System v3 — the staged attempt lifecycle.
// Action-routed (single file, four actions) rather than four files: the
// four actions share one authorization check, one row-fetch pattern, and
// one stage-gating dependency, and splitting them would just duplicate
// all three. Every write here goes through canAdvanceStage() from
// ./_shared (the byte-identical mirror of src/lib/training-workflow.ts) —
// this file is NOT a second place that decides what's allowed to advance,
// it's the one enforcement point on the Cloudflare side.
//
//   start   — create a new attempt at stage 'observation'.
//   save    — persist fields for the CURRENT stage; auto-advances to the
//             next stage IF its requirement is now satisfied, EXCEPT out
//             of 'recommendation' (-> 'verdict_revealed' requires the
//             dedicated `reveal` action, which has real side effects: an
//             AI-assisted calibration call and the actual verdict
//             reveal) and out of 'verdict_revealed' (-> 'reflection_
//             complete' requires the dedicated `reflect` action).
//   reveal  — only valid at stage 'recommendation' with its requirement
//             met. Computes mechanism_correct in code (a plain equality
//             check — never asked of the model, same principle as the
//             existing learning-socratic-tutor function), calls
//             diagnostic-calibration-tutor for the defensibility
//             assessment + 7-dimension calibration profile, and reveals
//             the case's hidden reference_* fields for the first time.
//   reflect — only valid at stage 'verdict_revealed'; requires all 7
//             REFLECTION_QUESTIONS keys answered.

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
    judgmentMechanism: (row.judgment_mechanism as AttemptInputs['judgmentMechanism']) ?? undefined,
    judgmentConfidence: (row.judgment_confidence as AttemptInputs['judgmentConfidence']) ?? undefined,
    recommendation: (row.recommendation as string) ?? undefined,
    uncertaintyNotes: (row.uncertainty_notes as string) ?? undefined,
    reflectionAnswers: (row.reflection_answers as Record<string, string>) ?? undefined,
  };
}

// camelCase field -> snake_case column, for the subset `save` may write.
const SAVE_FIELD_COLUMNS: Record<string, string> = {
  observation: 'observation',
  evidenceNotes: 'evidence_notes',
  hypothesisMechanism: 'hypothesis_mechanism',
  hypothesisReasoning: 'hypothesis_reasoning',
  counterHypothesisMechanism: 'counter_hypothesis_mechanism',
  counterHypothesisReasoning: 'counter_hypothesis_reasoning',
  socraticExchanges: 'socratic_exchanges',
  revision: 'revision',
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

export const onRequestGet = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env as Record<string, string>);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  const attemptId = new URL(request.url).searchParams.get('attemptId');
  if (!attemptId) {
    return Response.json({ error: 'attemptId query param is required' }, { status: 400, headers: CORS });
  }

  const supabase = createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: attempt, error } = await supabase.from('training_attempts').select('*').eq('id', attemptId).single();
  if (error || !attempt) {
    return Response.json({ error: 'Attempt not found' }, { status: 404, headers: CORS });
  }
  const { data: caseRow, error: caseError } = await supabase.from('training_cases').select('*').eq('id', attempt.case_id).single();
  if (caseError || !caseRow) {
    return Response.json({ error: 'Case not found for this attempt' }, { status: 404, headers: CORS });
  }

  return Response.json(
    {
      attempt: { id: attempt.id, stage: attempt.stage, inputs: rowToAttemptInputs(attempt), calibrationProfile: hasReachedStage(attempt.stage, 'verdict_revealed') ? attempt.calibration_profile : null, mechanismCorrect: hasReachedStage(attempt.stage, 'verdict_revealed') ? attempt.mechanism_correct : null },
      case: visibleCaseFields(dbRowToFullCase(caseRow), attempt.stage as TrainingStage),
    },
    { headers: CORS }
  );
};

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
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

  const supabase = createClient(getSupabaseUrl(env), getServiceRoleKey(env) ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── action: start ──
  if (payload.action === 'start') {
    const caseId = payload.caseId as string | undefined;
    if (!caseId) return Response.json({ error: 'caseId is required' }, { status: 400, headers: CORS });

    const { data: caseRow, error: caseError } = await supabase
      .from('training_cases').select('*').eq('id', caseId).eq('is_published', true).single();
    if (caseError || !caseRow) {
      return Response.json({ error: 'Published case not found' }, { status: 404, headers: CORS });
    }

    const { data: attempt, error } = await supabase
      .from('training_attempts')
      .insert({ case_id: caseId, stage: 'observation' })
      .select()
      .single();
    if (error || !attempt) {
      return Response.json({ error: error?.message ?? 'Failed to start attempt' }, { status: 500, headers: CORS });
    }

    return Response.json(
      { attempt: { id: attempt.id, stage: attempt.stage, inputs: {} }, case: visibleCaseFields(dbRowToFullCase(caseRow), 'observation') },
      { status: 201, headers: CORS }
    );
  }

  // ── action: save ──
  if (payload.action === 'save') {
    const attemptId = payload.attemptId as string | undefined;
    const fields = (payload.fields ?? {}) as Record<string, unknown>;
    if (!attemptId) return Response.json({ error: 'attemptId is required' }, { status: 400, headers: CORS });

    const { data: existing, error: fetchError } = await supabase.from('training_attempts').select('*').eq('id', attemptId).single();
    if (fetchError || !existing) return Response.json({ error: 'Attempt not found' }, { status: 404, headers: CORS });
    if (hasReachedStage(existing.stage as TrainingStage, 'verdict_revealed')) {
      return Response.json({ error: 'This attempt has already been revealed — judgment and recommendation are locked.' }, { status: 409, headers: CORS });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, column] of Object.entries(SAVE_FIELD_COLUMNS)) {
      if (key in fields) update[column] = fields[key];
    }

    const { data: updated, error: updateError } = await supabase
      .from('training_attempts').update(update).eq('id', attemptId).select().single();
    if (updateError || !updated) {
      return Response.json({ error: updateError?.message ?? 'Failed to save' }, { status: 500, headers: CORS });
    }

    const stage = updated.stage as TrainingStage;
    const advance = canAdvanceStage(stage, rowToAttemptInputs(updated));
    // 'recommendation' and 'verdict_revealed' never auto-advance via
    // `save` — see the dedicated `reveal` / `reflect` actions above.
    const eligibleForAutoAdvance = advance.canAdvance && stage !== 'recommendation' && stage !== 'verdict_revealed';
    let finalAttempt = updated;
    if (eligibleForAutoAdvance) {
      const next = nextStage(stage);
      const { data: advanced, error: advanceError } = await supabase
        .from('training_attempts').update({ stage: next, updated_at: new Date().toISOString() }).eq('id', attemptId).select().single();
      if (!advanceError && advanced) finalAttempt = advanced;
    }

    return Response.json(
      { attempt: { id: finalAttempt.id, stage: finalAttempt.stage, inputs: rowToAttemptInputs(finalAttempt) }, advanceBlockedReason: eligibleForAutoAdvance ? null : advance.reason },
      { headers: CORS }
    );
  }

  // ── action: reveal ──
  if (payload.action === 'reveal') {
    const attemptId = payload.attemptId as string | undefined;
    if (!attemptId) return Response.json({ error: 'attemptId is required' }, { status: 400, headers: CORS });

    const { data: attempt, error: fetchError } = await supabase.from('training_attempts').select('*').eq('id', attemptId).single();
    if (fetchError || !attempt) return Response.json({ error: 'Attempt not found' }, { status: 404, headers: CORS });
    if (attempt.stage !== 'recommendation') {
      return Response.json({ error: `Cannot reveal from stage '${attempt.stage}' — the attempt must reach 'recommendation' first.` }, { status: 409, headers: CORS });
    }
    const inputs = rowToAttemptInputs(attempt);
    const advance = canAdvanceStage('recommendation', inputs);
    if (!advance.canAdvance) {
      return Response.json({ error: advance.reason }, { status: 422, headers: CORS });
    }

    const { data: caseRow, error: caseError } = await supabase.from('training_cases').select('*').eq('id', attempt.case_id).single();
    if (caseError || !caseRow) return Response.json({ error: 'Case not found' }, { status: 404, headers: CORS });
    const fullCase = dbRowToFullCase(caseRow);

    const mechanismCorrect = inputs.judgmentMechanism === fullCase.referenceMechanism;

    // AI-assisted defensibility + 7-dimension calibration profile — only
    // ever called AFTER the analyst's judgment/recommendation are already
    // locked (see the stage guard above), so this cannot influence what
    // they submitted. DeepSeek is not selecting the diagnosis here; the
    // diagnosis (inputs.judgmentMechanism) and the reference
    // (fullCase.referenceMechanism) both already exist independently —
    // this call only assesses reasoning quality against them.
    let calibrationProfile: Record<string, number> = {
      evidence_evaluation: 3, hypothesis_generation: 3, uncertainty_estimation: 3,
      prioritization: 3, differential_diagnosis: 3, confidence_calibration: 3, recommendation_quality: 3,
    };
    let disagreementDefensible: boolean | null = mechanismCorrect ? null : false;
    let evidenceDisciplinePass = true;

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
          mechanismCorrect,
        }),
      });
      if (res.ok) {
        const result = (await res.json()) as {
          calibration_profile: Record<string, number>;
          disagreement_defensible: boolean | null;
          evidence_discipline_pass: boolean;
        };
        calibrationProfile = result.calibration_profile ?? calibrationProfile;
        disagreementDefensible = mechanismCorrect ? null : (result.disagreement_defensible ?? false);
        evidenceDisciplinePass = result.evidence_discipline_pass ?? true;
      }
    } catch {
      // AI calibration is an enrichment, not a gate — reveal proceeds
      // with the honest neutral defaults above rather than blocking the
      // analyst from seeing the reference verdict they've already earned.
    }

    const { data: revealed, error: revealError } = await supabase
      .from('training_attempts')
      .update({
        stage: 'verdict_revealed',
        mechanism_correct: mechanismCorrect,
        disagreement_defensible: disagreementDefensible,
        evidence_discipline_pass: evidenceDisciplinePass,
        calibration_profile: calibrationProfile,
        verdict_revealed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', attemptId)
      .select()
      .single();
    if (revealError || !revealed) {
      return Response.json({ error: revealError?.message ?? 'Failed to reveal' }, { status: 500, headers: CORS });
    }

    return Response.json(
      {
        attempt: { id: revealed.id, stage: revealed.stage, mechanismCorrect, disagreementDefensible, calibrationProfile },
        case: visibleCaseFields(fullCase, 'verdict_revealed'),
      },
      { headers: CORS }
    );
  }

  // ── action: reflect ──
  if (payload.action === 'reflect') {
    const attemptId = payload.attemptId as string | undefined;
    const reflectionAnswers = payload.reflectionAnswers as Record<string, string> | undefined;
    if (!attemptId) return Response.json({ error: 'attemptId is required' }, { status: 400, headers: CORS });

    const { data: attempt, error: fetchError } = await supabase.from('training_attempts').select('*').eq('id', attemptId).single();
    if (fetchError || !attempt) return Response.json({ error: 'Attempt not found' }, { status: 404, headers: CORS });
    if (attempt.stage !== 'verdict_revealed') {
      return Response.json({ error: `Cannot submit reflection from stage '${attempt.stage}' — the verdict must be revealed first.` }, { status: 409, headers: CORS });
    }

    const inputs = { ...rowToAttemptInputs(attempt), reflectionAnswers };
    const advance = canAdvanceStage('verdict_revealed', inputs);
    if (!advance.canAdvance) {
      return Response.json({ error: advance.reason }, { status: 422, headers: CORS });
    }

    const { data: completed, error: completeError } = await supabase
      .from('training_attempts')
      .update({ stage: 'reflection_complete', reflection_answers: reflectionAnswers, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', attemptId)
      .select()
      .single();
    if (completeError || !completed) {
      return Response.json({ error: completeError?.message ?? 'Failed to complete reflection' }, { status: 500, headers: CORS });
    }

    return Response.json({ attempt: { id: completed.id, stage: completed.stage, completedAt: completed.completed_at } }, { headers: CORS });
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
