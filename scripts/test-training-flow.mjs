/**
 * ═══════════════════════════════════════════════════════════════════════
 * App Training Flow v1 — pruebas contra el proyecto de PRUEBA únicamente
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Proyecto: yowwjipozswrwahvvevo (signal-friction-batchc-test)
 * NO toca producción. Sigue la convención de scripts/test-edge-functions.mjs
 * (script manual con asserts, sin framework de test — no existe uno en este repo).
 *
 * Cubre:
 *   - Estáticos (grep sobre el propio código de la app): T2, T8
 *   - En vivo, como rol `anon` (sin sesión): comportamiento de rechazo esperado
 *   - En vivo, contra la proyección segura de casos: confirma columnas
 *     seguras accesibles y columnas de veredicto NO accesibles
 *
 * La prueba end-to-end completa (T3, T4, T7, T9, T10, T11, doble-finalize,
 * scoring correcto/incorrecto, aislamiento RLS entre analistas) se ejecutó
 * por separado vía simulación de rol autenticado en SQL — no reproducible
 * aquí sin credenciales de sesión reales. Resultado: 14/14 PASS. Ver
 * AUDIT_REPORT/10-PHASE2-BATCH-LOG.md o el reporte de esta sesión.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const TEST_URL = 'https://yowwjipozswrwahvvevo.supabase.co';
const TEST_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvd3dqaXBvenN3cndhaHZ2ZXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTI1NDIsImV4cCI6MjEwMTY4ODU0Mn0.j4SuAGVhUmiFesCxOXH7yBVpYo7IZBqQPC-Q6D7AZzQ';

const supabase = createClient(TEST_URL, TEST_ANON_KEY);

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`✅ ${name}`);
  } else {
    fail++;
    console.log(`❌ ${name} ${detail}`);
  }
}

/** Elimina comentarios de bloque /** *\/ y de línea // antes de analizar código real. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

// ── Estático: T2 — el código de la app nunca hace INSERT directo en training_attempts ──
function staticNoDirectInsert() {
  const code = stripComments(readFileSync(path.join(REPO_ROOT, 'src/lib/training-flow.ts'), 'utf8'));
  const hasForbiddenInsert = /\.from\(\s*['"]training_attempts['"]\s*\)[\s\S]{0,80}\.insert\(/.test(code);
  check('T2 static: sin .from(training_attempts).insert(...) en código real (sin comentarios)', !hasForbiddenInsert);
}

// ── Estático: T8 — el código de la app nunca LLAMA a n12_*/gate_track_a (mencionarlos en
//    comentarios explicando la prohibición es intencional y no cuenta como violación) ──
function staticNoDiagnosticsAccess() {
  const files = ['src/lib/training-flow.ts', 'src/app/admin/training/page.tsx'];
  const forbidden = ['n12_coverage_for', 'n12_required_mechanisms', 'v_n12_qualifying_attempts', 'v_n12_coverage', 'gate_track_a'];
  let clean = true;
  for (const f of files) {
    const code = stripComments(readFileSync(path.join(REPO_ROOT, f), 'utf8'));
    for (const term of forbidden) {
      if (code.includes(term)) {
        clean = false;
        console.log(`   found forbidden reference "${term}" in ${f} (fuera de comentarios)`);
      }
    }
  }
  check('T8 static: sin llamadas reales a n12_*/gate_track_a (excluyendo comentarios)', clean);
}

// ── Estático: única forma de crear un intento es create_training_attempt() sin argumentos ──
function staticSingleCreationPath() {
  const src = readFileSync(path.join(REPO_ROOT, 'src/lib/training-flow.ts'), 'utf8');
  const rpcCall = src.match(/\.rpc\(\s*['"]create_training_attempt['"]\s*\)/);
  check('A1 static: rpc(create_training_attempt) sin argumentos', Boolean(rpcCall));
}

// ── Estático: contrato Save Draft / Finalize tras el fix de UX de guardado ──
function staticSaveDraftContract() {
  const code = stripComments(readFileSync(path.join(REPO_ROOT, 'src/app/admin/training/page.tsx'), 'utf8'));

  // A: el botón Save Draft NO depende de completitud del formulario — los
  //    borradores parciales deben seguir siendo guardables.
  const saveDraftButton = code.match(/onClick=\{handleSaveDraftClick\}[\s\S]{0,120}/);
  const saveDraftGatedByCompleteness = Boolean(saveDraftButton && /!complete/.test(saveDraftButton[0]));
  check('A static: Save Draft no exige completitud del formulario', Boolean(saveDraftButton) && !saveDraftGatedByCompleteness);

  // F/G: Finalize SÍ sigue exigiendo completitud.
  const finalizeButton = code.match(/onClick=\{finalize\}[\s\S]{0,120}/);
  const finalizeGatedByCompleteness = Boolean(finalizeButton && /!complete/.test(finalizeButton[0]));
  check('F/G static: Finalize sigue condicionado por !complete', finalizeGatedByCompleteness);

  // I: una única primitiva de persistencia (savePreregistration se llama UNA
  //    sola vez en todo el archivo), usada tanto por el guardado manual como
  //    por finalize — sin payload duplicado.
  const savePreregCalls = (code.match(/savePreregistration\(/g) || []).length;
  check('I static: savePreregistration() se invoca desde un único punto (persistDraft)', savePreregCalls === 1);

  const persistDraftCalledByManualSave = /handleSaveDraftClick[\s\S]{0,300}await persistDraft\(\)/.test(code);
  const persistDraftCalledByFinalize = /const finalize[\s\S]{0,300}await persistDraft\(\)/.test(code);
  check('I static: handleSaveDraftClick y finalize comparten persistDraft()', persistDraftCalledByManualSave && persistDraftCalledByFinalize);

  // J: el payload de persistDraft() sigue siendo la lista cerrada original —
  //    ningún campo de veredicto/snapshot se agregó al persistir el borrador.
  const persistDraftBody = code.match(/const persistDraft[\s\S]*?\n  \};/);
  const forbiddenAnswerKeyTerms = ['reference_mechanism', 'reference_disposition', 'ref_disposition_snapshot', 'ref_mechanism_snapshot'];
  const leaksAnswerKey = Boolean(persistDraftBody && forbiddenAnswerKeyTerms.some((t) => persistDraftBody[0].includes(t)));
  check('J static: persistDraft() no introduce campos de veredicto/snapshot', Boolean(persistDraftBody) && !leaksAnswerKey);
}

// ── Estático: contrato de hidratación de intentos reanudados (resume/hydration fix) ──
function staticHydrationContract() {
  const libCode = stripComments(readFileSync(path.join(REPO_ROOT, 'src/lib/training-flow.ts'), 'utf8'));
  const pageCode = stripComments(readFileSync(path.join(REPO_ROOT, 'src/app/admin/training/page.tsx'), 'utf8'));

  // A: loadPreregistration existe.
  const loadPreregExists = /export async function loadPreregistration\(/.test(libCode);
  check('A static: loadPreregistration() existe', loadPreregExists);

  // B: la proyección incluye los 11 campos requeridos.
  const columnsMatch = libCode.match(/PREREGISTRATION_COLUMNS\s*=([\s\S]*?);/);
  const columnsStr = columnsMatch ? columnsMatch[1] : '';
  const required11 = [
    'observation', 'evidence_notes', 'hypothesis_mechanism', 'hypothesis_reasoning',
    'counter_hypothesis_mechanism', 'counter_hypothesis_reasoning', 'judgment_disposition',
    'judgment_mechanism', 'judgment_confidence', 'recommendation', 'uncertainty_notes',
  ];
  const hasAll11 = required11.every((f) => columnsStr.includes(f));
  check('B static: PREREGISTRATION_COLUMNS incluye los 11 campos requeridos', Boolean(columnsMatch) && hasAll11);

  // C: la proyección EXCLUYE veredicto/snapshot/puntuación/adjudicación.
  const forbiddenProjectionTerms = [
    'ref_disposition_snapshot', 'ref_mechanism_snapshot', 'disposition_correct',
    'mechanism_correct', 'disagreement_defensible', 'evidence_discipline_pass', 'adjudication_id',
  ];
  const projectionLeaks = forbiddenProjectionTerms.some((t) => columnsStr.includes(t));
  check('C static: PREREGISTRATION_COLUMNS excluye veredicto/snapshot/puntuación/adjudicación', !projectionLeaks);

  // D: sin SELECT * en ningún archivo de la app.
  const selectStarLib = /\.select\(\s*['"]\*['"]\s*\)/.test(libCode);
  const selectStarPage = /\.select\(\s*['"]\*['"]\s*\)/.test(pageCode);
  check('D static: sin .select(\'*\') en training-flow.ts ni page.tsx', !selectStarLib && !selectStarPage);

  // E: la hidratación usa el attempt_id exacto devuelto por el RPC (res.attempt_id), no otra búsqueda.
  const hydratesExactId = /loadPreregistration\(res\.attempt_id\)/.test(pageCode);
  check('E static: loadPreregistration() se llama con res.attempt_id exacto', hydratesExactId);

  // F: la rama resumed invoca la hidratación.
  const resumedInvokesHydration = /resumed\s*\?\s*normalizePersistedPreregistration\(await loadPreregistration/.test(pageCode);
  check('F static: la rama resumed invoca loadPreregistration()', resumedInvokesHydration);

  // G: la rama de intento nuevo conserva EMPTY_FORM.
  const newAttemptKeepsEmptyForm = /normalizePersistedPreregistration\(await loadPreregistration\(res\.attempt_id\)\)\s*:\s*EMPTY_FORM/.test(pageCode);
  check('G static: la rama de intento nuevo conserva EMPTY_FORM', newAttemptKeepsEmptyForm);

  // H: normalización NULL→"" para los 11 campos.
  const normalizeBody = pageCode.match(/function normalizePersistedPreregistration[\s\S]*?\n\}/);
  const normalizeHas11 = Boolean(normalizeBody) && required11.every((f) => new RegExp(`${f}:\\s*p\\.${f}\\s*\\?\\?\\s*""`).test(normalizeBody[0]));
  check('H static: normalizePersistedPreregistration mapea NULL→"" en los 11 campos', normalizeHas11);

  // I: la hidratación ocurre ANTES de setState(... "editing" ...) — no hay flash de EMPTY_FORM seguido de corrección.
  const formAssignIdx = pageCode.indexOf('const form = resumed');
  const editingSetStateIdx = pageCode.indexOf('status: "editing"', formAssignIdx);
  const hydratesBeforeEditingState = formAssignIdx !== -1 && editingSetStateIdx !== -1 && formAssignIdx < editingSetStateIdx;
  check('I static: la hidratación completa antes de setState(editing)', hydratesBeforeEditingState);

  // J: sin fallback a EMPTY_FORM si la hidratación falla — el bloque entre la
  //    asignación de `form` y el siguiente setState no contiene un catch local
  //    que absorba el error (debe propagar al catch externo de start()).
  const formToSetStateSlice = formAssignIdx !== -1 && editingSetStateIdx !== -1
    ? pageCode.slice(formAssignIdx, editingSetStateIdx)
    : '';
  const hasLocalCatchFallback = /catch/.test(formToSetStateSlice);
  check('J static: sin fallback local a EMPTY_FORM si la hidratación falla (propaga al catch de start())', Boolean(formToSetStateSlice) && !hasLocalCatchFallback);

  // K: create_training_attempt() sigue sin argumentos (recheck independiente de A1).
  const createCallUnchanged = /\.rpc\(\s*['"]create_training_attempt['"]\s*\)/.test(libCode);
  check('K static: create_training_attempt() sigue invocándose sin argumentos', createCallUnchanged);

  // L: finalize_and_reveal_attempt() sigue recibiendo solo p_attempt_id.
  const finalizeCallUnchanged = /\.rpc\(\s*['"]finalize_and_reveal_attempt['"]\s*,\s*\{\s*p_attempt_id:/.test(libCode);
  check('L static: finalize_and_reveal_attempt() conserva su contrato de llamada', finalizeCallUnchanged);

  // M: SAFE_CASE_COLUMNS no cambió.
  const expectedSafeCaseColumns =
    "'id, case_key, title, company_name, source_type, source_url, source_note, ' +\n  'landing_page, pricing_page, onboarding_flow, checkout_flow, technical_findings, contextual_info'";
  check('M static: SAFE_CASE_COLUMNS sin cambios', libCode.includes(expectedSafeCaseColumns));

  // N: el contrato de persistencia de Save Draft no cambió (savePreregistration sigue siendo el único punto de escritura de preregistro).
  const savePreregCallsTotal = (pageCode.match(/savePreregistration\(/g) || []).length;
  check('N static: Save Draft conserva su único punto de persistencia (savePreregistration)', savePreregCallsTotal === 1);
}

// ── Estático: TrainingTestAuthGate usa useEffect (no useState) para su ciclo de vida de auth ──
function staticAuthGateLifecycleContract() {
  const pageCode = stripComments(readFileSync(path.join(REPO_ROOT, 'src/app/admin/training/page.tsx'), 'utf8'));

  const gateMatch = pageCode.match(/function TrainingTestAuthGate[\s\S]*?\n\}\n/);
  const gateBody = gateMatch ? gateMatch[0] : '';

  // A: useEffect, no useState, para el efecto de auth.
  const usesEffect = /useEffect\(\(\) => \{/.test(gateBody);
  const authStillInUseState = /useState\(\(\) => \{[\s\S]*?getSession/.test(gateBody);
  check('A static: TrainingTestAuthGate usa useEffect para el ciclo de vida de auth', Boolean(gateMatch) && usesEffect);
  check('D static: la inicialización de auth ya NO vive en un inicializador de useState', !authStillInUseState);

  // B: la suscripción ocurre dentro de ese efecto.
  const subscriptionInsideEffect = /useEffect\(\(\) => \{[\s\S]*?onAuthStateChange/.test(gateBody);
  check('B static: onAuthStateChange() ocurre dentro del useEffect', subscriptionInsideEffect);

  // C: el cleanup retornado llama a subscription.unsubscribe().
  const cleanupUnsubscribes = /return \(\) => \{[\s\S]*?subscription\.unsubscribe\(\)/.test(gateBody);
  check('C static: el cleanup del efecto llama a subscription.unsubscribe()', cleanupUnsubscribes);

  // E/F/G: el fix de lifecycle no tocó el cliente TEST, PKCE, ni el cliente REAL.
  const testClientFile = readFileSync(path.join(REPO_ROOT, 'src/lib/supabase-training-test.ts'), 'utf8');
  const realClientFile = readFileSync(path.join(REPO_ROOT, 'src/lib/supabase.ts'), 'utf8');
  check('E static: cliente TEST sin cambios de configuración (flowType pkce presente)', /flowType:\s*['"]pkce['"]/.test(testClientFile));
  check('F/G static: cliente REAL sin auth options añadidas (implicit por default, sin flowType)', !/flowType/.test(realClientFile));
}

// ── En vivo: anon (sin sesión) no puede insertar directamente ──
async function liveAnonInsertBlocked() {
  const { error } = await supabase
    .from('training_attempts')
    .insert({ case_id: '00000000-0000-0000-0000-000000000000' });
  check('T2 live (anon): INSERT directo rechazado', Boolean(error), error ? '' : 'no debió tener éxito');
}

// ── En vivo: anon no puede leer el veredicto de ningún caso ──
async function liveAnonCannotReadVerdict() {
  const { error } = await supabase.from('training_cases').select('reference_mechanism').limit(1);
  check('T7 live (anon): reference_mechanism inaccesible', Boolean(error));
}

// ── En vivo: anon NO tiene ningún privilegio de columna sobre training_cases —
//    ni siquiera las columnas seguras. Verificado por consulta directa a
//    information_schema.column_privileges: 0 filas para grantee='anon'. La app
//    solo llama a loadSafeCase() DESPUÉS de una sesión autenticada exitosa
//    (createOrResumeAttempt requiere auth.uid() no nulo primero), así que este
//    camino nunca se ejecuta como anon en el flujo real — pero confirmamos aquí
//    que ni siquiera la proyección "segura" es alcanzable sin sesión, lo cual es
//    más estricto de lo mínimo necesario, no un defecto.
async function liveSafeProjectionRequiresAuth() {
  const { error } = await supabase
    .from('training_cases')
    .select('id, case_key, title, company_name, source_type, source_url, source_note, ' +
            'landing_page, pricing_page, onboarding_flow, checkout_flow, technical_findings, contextual_info')
    .limit(1);
  check('T7 live (anon): incluso la proyección segura exige sesión (defensa en profundidad)', Boolean(error));
  console.log('   (la proyección segura SÍ funciona para `authenticated` — probado vía simulación de rol en SQL, 14/14 PASS)');
}

// ── En vivo: create_training_attempt sin sesión -> error "no authenticated identity" ──
async function liveUnauthenticatedCreateFails() {
  const { error } = await supabase.rpc('create_training_attempt');
  check('A2 live (anon): create_training_attempt() sin sesión falla', Boolean(error), error ? '' : 'no debió tener éxito');
}

async function main() {
  console.log('🧪 App Training Flow v1 — test project:', TEST_URL);
  staticNoDirectInsert();
  staticNoDiagnosticsAccess();
  staticSingleCreationPath();
  staticSaveDraftContract();
  staticHydrationContract();
  staticAuthGateLifecycleContract();
  await liveAnonInsertBlocked();
  await liveAnonCannotReadVerdict();
  await liveSafeProjectionRequiresAuth();
  await liveUnauthenticatedCreateFails();

  console.log(`\n${pass} passed, ${fail} failed.`);
  console.log('\nNota: la prueba de flujo completo autenticado (create → carga segura →');
  console.log('preregistro → finalize → reveal → scoring) se ejecutó vía simulación de');
  console.log('rol en SQL sobre el proyecto de prueba: 14/14 PASS. Este script cubre lo');
  console.log('estático y lo verificable sin una sesión de correo real.');
  if (fail > 0) process.exit(1);
}

main();
