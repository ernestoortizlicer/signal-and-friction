import { supabaseTrainingTest } from './supabase-training-test';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * APP TRAINING FLOW v1 — capa de llamadas puras
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Contrato (ver AUDIT_REPORT):
 *   create_training_attempt() → cargar caso seguro → preregistrar
 *   → finalize_and_reveal_attempt(attempt_id) → revelar
 *
 * Reglas duras de este archivo, verificadas contra la base de datos real
 * (proyecto de prueba yowwjipozswrwahvvevo) antes de escribirse:
 *
 *   1. NUNCA `.from('training_attempts').insert(...)`.
 *      La DB no concede INSERT a `authenticated` en esa tabla —
 *      solo create_training_attempt() (SECURITY DEFINER) puede insertar.
 *   2. NUNCA `.select('*')` sobre training_cases.
 *      Postgres deniega la expansión completa de fila para `authenticated`
 *      (verificado empíricamente: falla con insufficient_privilege).
 *      SAFE_CASE_COLUMNS es la ÚNICA proyección permitida antes de revelar.
 *   3. NUNCA llamar n12_coverage_for, n12_required_mechanisms,
 *      v_n12_qualifying_attempts, v_n12_coverage, gate_track_a desde el cliente.
 *      Esas funciones responden "¿cuándo se gradúa el analista?" — pregunta
 *      que esta app NO responde en v1.
 *   4. El payload de actualización de un intento es una lista cerrada de
 *      campos (ver PreregistrationPayload). TypeScript impide añadir un
 *      campo no autorizado en tiempo de compilación.
 */

// ─────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────

export const MECHANISMS = [
  'cognitive_load',
  'trust_deficit',
  'commitment_anxiety',
  'ordering_error',
  'identity_friction',
  'value_uncertainty',
] as const;
export type Mechanism = (typeof MECHANISMS)[number];

export const DISPOSITIONS = [
  'behavioral_diagnosis',
  'technical_blocker',
  'mixed_condition',
  'insufficient_evidence',
  'scope_change_required',
] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

// Nota: el CHECK de la DB usa 'low' | 'moderate' | 'high' (no 'medium').
export const CONFIDENCE_LEVELS = ['low', 'moderate', 'high'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export type ReasonCode = 'attempt_in_progress' | 'training_environment_not_ready' | 'environment_deficiency';

export interface CreateAttemptResult {
  attempt_id: string | null;
  chosen_case_id: string | null;
  environment_deficiency: boolean;
  reason_code: ReasonCode | null;
}

/** Única proyección seleccionable antes de finalizar. Sin campos de veredicto. */
export const SAFE_CASE_COLUMNS =
  'id, case_key, title, company_name, source_type, source_url, source_note, ' +
  'landing_page, pricing_page, onboarding_flow, checkout_flow, technical_findings, contextual_info';

export interface SafeCase {
  id: string;
  case_key: string;
  title: string;
  company_name: string | null;
  source_type: string;
  source_url: string | null;
  source_note: string | null;
  landing_page: string | null;
  pricing_page: string | null;
  onboarding_flow: string | null;
  checkout_flow: string | null;
  technical_findings: string | null;
  contextual_info: string | null;
}

/**
 * Lista CERRADA de campos preregistrables. Coincide exactamente con el
 * GRANT UPDATE por columna verificado en la base de datos. Añadir aquí una
 * clave que la DB no conceda hará que el UPDATE falle con
 * insufficient_privilege — visible de inmediato, nunca silencioso.
 */
export interface PreregistrationPayload {
  stage?:
    | 'observation'
    | 'evidence_review'
    | 'hypothesis'
    | 'counter_hypothesis'
    | 'socratic_challenge'
    | 'revision'
    | 'judgment'
    | 'recommendation'
    | 'reflection_complete';
  observation?: string;
  evidence_notes?: string;
  hypothesis_mechanism?: Mechanism;
  hypothesis_reasoning?: string;
  counter_hypothesis_mechanism?: Mechanism;
  counter_hypothesis_reasoning?: string;
  socratic_exchanges?: unknown[];
  revision?: string;
  judgment_disposition?: Disposition;
  judgment_mechanism?: Mechanism | null; // null obligatorio si disposition no es behavioral/mixed
  judgment_confidence?: ConfidenceLevel;
  recommendation?: string;
  uncertainty_notes?: string;
  reflection_answers?: Record<string, unknown>;
}

export interface FinalizeResult {
  reference_disposition: Disposition;
  reference_mechanism: Mechanism | null;
  disposition_correct: boolean;
  mechanism_correct: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Llamadas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Único punto de creación/reanudación de un intento.
 * Contrato obligatorio: CERO argumentos. El servidor elige el caso.
 */
export async function createOrResumeAttempt(): Promise<CreateAttemptResult> {
  const { data, error } = await supabaseTrainingTest.rpc('create_training_attempt');
  if (error) throw error;
  // La función retorna TABLE(...) → PostgREST lo entrega como array de 1 fila.
  const row = Array.isArray(data) ? data[0] : data;
  return {
    attempt_id: row?.attempt_id ?? null,
    chosen_case_id: row?.chosen_case_id ?? null,
    environment_deficiency: Boolean(row?.environment_deficiency),
    reason_code: row?.reason_code ?? null,
  };
}

/** Carga SOLO material seguro del caso. Nunca el veredicto. */
export async function loadSafeCase(caseId: string): Promise<SafeCase> {
  const { data, error } = await supabaseTrainingTest
    .from('training_cases')
    .select(SAFE_CASE_COLUMNS)
    .eq('id', caseId)
    .single();
  if (error) throw error;
  return data as unknown as SafeCase;
}

/**
 * Proyección CERRADA para hidratar un intento reanudado. Únicamente los 11
 * campos de razonamiento autorados por el analista — nunca veredicto,
 * snapshots congelados, puntuación, ni adjudicación. NUNCA `select('*')`.
 */
export const PREREGISTRATION_COLUMNS =
  'observation, evidence_notes, hypothesis_mechanism, hypothesis_reasoning, ' +
  'counter_hypothesis_mechanism, counter_hypothesis_reasoning, judgment_disposition, ' +
  'judgment_mechanism, judgment_confidence, recommendation, uncertainty_notes';

/** Representación fiel de lo persistido — nullable, tal como vive en la DB. */
export interface PersistedPreregistration {
  observation: string | null;
  evidence_notes: string | null;
  hypothesis_mechanism: Mechanism | null;
  hypothesis_reasoning: string | null;
  counter_hypothesis_mechanism: Mechanism | null;
  counter_hypothesis_reasoning: string | null;
  judgment_disposition: Disposition | null;
  judgment_mechanism: Mechanism | null;
  judgment_confidence: ConfidenceLevel | null;
  recommendation: string | null;
  uncertainty_notes: string | null;
}

/**
 * Carga el borrador ya persistido de UN intento propio, por id exacto — el
 * mismo id que create_training_attempt() ya resolvió como el intento abierto
 * del analista. Protegido por RLS (analyst_id = auth.uid()), no por este
 * código; la proyección explícita es higiene de mínimo privilegio, no el
 * único límite de seguridad.
 */
export async function loadPreregistration(attemptId: string): Promise<PersistedPreregistration> {
  const { data, error } = await supabaseTrainingTest
    .from('training_attempts')
    .select(PREREGISTRATION_COLUMNS)
    .eq('id', attemptId)
    .single();
  if (error) throw error;
  return data as unknown as PersistedPreregistration;
}

/** Guarda campos de razonamiento preregistrados. Nunca case_id/analyst_id/campos de puntuación. */
export async function savePreregistration(
  attemptId: string,
  payload: PreregistrationPayload
): Promise<void> {
  const { error } = await supabaseTrainingTest
    .from('training_attempts')
    .update(payload)
    .eq('id', attemptId);
  if (error) throw error;
}

/** Finaliza y revela. El veredicto solo llega al cliente después de esta llamada. */
export async function finalizeAndReveal(attemptId: string): Promise<FinalizeResult> {
  const { data, error } = await supabaseTrainingTest.rpc('finalize_and_reveal_attempt', {
    p_attempt_id: attemptId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as FinalizeResult;
}

/** Estado de sesión propia del proyecto de prueba (independiente del admin principal). */
export async function getTrainingTestSession() {
  const { data } = await supabaseTrainingTest.auth.getSession();
  return data.session;
}
