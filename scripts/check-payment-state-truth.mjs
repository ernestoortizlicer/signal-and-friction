import fs from 'node:fs';

const failures = [];
const migrationPath = 'supabase/migrations/20260813100000_payment_state_machine_truth.sql';
const provisioningMigrationPath = 'supabase/migrations/20260813103000_payment_scaffold_provisioning.sql';
const handlerPath = 'src/server/stripe/legacy-handler.ts';

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

if (!fs.existsSync(migrationPath)) {
  failures.push(`${migrationPath} is missing`);
} else {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  requireMatch(sql, /ALTER COLUMN protocol_stage SET DEFAULT 'pre_payment'/,
    'new clients must default to explicit pre_payment state');
  requireMatch(sql, /'pre_payment'[\s\S]*'payment_confirmed'[\s\S]*'heuristics_in_progress'/,
    'protocol state machine must order pre_payment before delivery stages');
  requireMatch(sql, /NOT EXISTS\s*\([\s\S]*FROM public\.payments p[\s\S]*p\.client_id = c\.id/,
    'legacy payment_confirmed rows may only be corrected when no canonical payment exists');
  requireMatch(sql, /DROP TRIGGER IF EXISTS trigger_project_payment_paid ON public\.beta_projects/,
    'derived payment_status must not remain a financial authority');
  requireMatch(sql, /CREATE TRIGGER trigger_guard_client_payment_stage_truth[\s\S]*BEFORE INSERT OR UPDATE OF protocol_stage ON public\.clients/,
    'DB must reject post-payment protocol stages without canonical payment evidence');
  requireMatch(sql, /client % cannot enter protocol_stage %[\s\S]*without canonical payment/,
    'client payment-stage guard must fail closed');
  requireMatch(sql, /CREATE TRIGGER trigger_guard_project_payment_status_truth[\s\S]*BEFORE INSERT OR UPDATE OF payment_status ON public\.beta_projects/,
    'DB must reject project paid state without canonical payment evidence');
  requireMatch(sql, /project for client % cannot become paid without canonical payment/,
    'project paid-state guard must fail closed');
  requireMatch(sql, /CREATE TRIGGER trigger_guard_payment_client_assignment_truth[\s\S]*BEFORE UPDATE OF client_id ON public\.payments/,
    'canonical payment client ownership must become immutable once assigned');
  requireMatch(sql, /OLD\.client_id IS NOT NULL[\s\S]*NEW\.client_id IS DISTINCT FROM OLD\.client_id[\s\S]*RAISE EXCEPTION/,
    'payment reassignment between clients must fail closed');
  requireMatch(sql, /CREATE TRIGGER trigger_payment_state_truth[\s\S]*AFTER INSERT OR UPDATE OF client_id ON public\.payments/,
    'canonical payment insert and NULL-to-client reconciliation must own workflow state transition');
  requireMatch(sql, /TG_OP = 'UPDATE'[\s\S]*OLD\.client_id IS NOT DISTINCT FROM NEW\.client_id[\s\S]*RETURN NEW/,
    'no-op payment client updates must not replay state transitions');
  requireMatch(sql, /WHEN protocol_stage = 'pre_payment' THEN 'payment_confirmed'[\s\S]*ELSE protocol_stage/,
    'payment transition must be monotonic and never regress later protocol stages');
  requireMatch(sql, /SET payment_status = 'paid'/,
    'canonical payment must mark the project paid');
  requireMatch(sql, /GET DIAGNOSTICS v_project_count = ROW_COUNT[\s\S]*v_project_count <> 1[\s\S]*RAISE EXCEPTION/,
    'missing or duplicate project state must fail closed instead of silently drifting');
  requireMatch(sql, /IF NEW\.client_id IS NULL THEN[\s\S]*RETURN NEW/,
    'unmatched economic events must remain recorded without inventing client state');
}

// The later provisioning migration intentionally replaces handle_payment_state_truth.
// Payment confirmation remains authoritative, but delivery may not claim
// diagnostic work has begun before the scaffold exists.
if (!fs.existsSync(provisioningMigrationPath)) {
  failures.push(`${provisioningMigrationPath} is missing`);
} else {
  const sql = fs.readFileSync(provisioningMigrationPath, 'utf8');
  requireMatch(sql, /CREATE OR REPLACE FUNCTION public\.handle_payment_state_truth\(\)/,
    'latest payment state function override must be explicit');
  requireMatch(sql, /SET payment_status = 'paid'[\s\S]*'awaiting_input'[\s\S]*'provisioning'/,
    'paid project must remain awaiting_input/provisioning until scaffold readiness is proven');
  if (/THEN 'diagnostic_in_progress'[\s\S]{0,400}WHERE client_id = NEW\.client_id/.test(sql)) {
    failures.push('payment trigger must not claim diagnostic_in_progress before scaffold provisioning succeeds');
  }
}

if (!fs.existsSync(handlerPath)) {
  failures.push(`${handlerPath} is missing`);
} else {
  const handler = fs.readFileSync(handlerPath, 'utf8');
  requireMatch(handler, /client_id\s*:\s*clientId/,
    'Stripe handler must write the canonical client_id into payments');
  if (/\.from\(['"]beta_projects['"]\)[\s\S]{0,300}payment_status\s*:\s*['"]paid['"]/.test(handler)) {
    failures.push('application handler must not independently own project paid state; DB payment trigger owns it');
  }
}

if (failures.length) {
  console.error('❌ Payment state truth invariant failed');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('✅ Payment state truth: money is canonical, false paid states are impossible, and delivery cannot outrun provisioning evidence');
