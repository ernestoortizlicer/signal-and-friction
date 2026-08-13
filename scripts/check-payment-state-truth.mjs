import fs from 'node:fs';

const failures = [];
const migrationPath = 'supabase/migrations/20260813100000_payment_state_machine_truth.sql';
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
  requireMatch(sql, /CREATE TRIGGER trigger_payment_state_truth[\s\S]*AFTER INSERT ON public\.payments/,
    'canonical payment insertion must own workflow state transition');
  requireMatch(sql, /WHEN protocol_stage = 'pre_payment' THEN 'payment_confirmed'[\s\S]*ELSE protocol_stage/,
    'payment transition must be monotonic and never regress later protocol stages');
  requireMatch(sql, /SET payment_status = 'paid'[\s\S]*'prospecting', 'outreach_sent', 'followup_sent'[\s\S]*'diagnostic_in_progress'/,
    'canonical payment must mark the project paid and begin diagnostic work');
  requireMatch(sql, /GET DIAGNOSTICS v_project_count = ROW_COUNT[\s\S]*v_project_count <> 1[\s\S]*RAISE EXCEPTION/,
    'missing or duplicate project state must fail closed instead of silently drifting');
  requireMatch(sql, /IF NEW\.client_id IS NULL THEN[\s\S]*RETURN NEW/,
    'unmatched economic events must remain recorded for recovery without inventing client state');
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

console.log('✅ Payment state truth: pre-payment is explicit, payment transitions are atomic/monotonic, and finance has one authority');
