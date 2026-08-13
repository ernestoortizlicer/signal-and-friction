import fs from 'node:fs';

const failures = [];
const files = {
  migration: 'supabase/migrations/20260813103000_payment_scaffold_provisioning.sql',
  retentionMigration: 'supabase/migrations/20260813103100_payment_client_retention_truth.sql',
  intake: 'functions/api/leads/submit.ts',
  targetPolicy: 'functions/api/_target-url.ts',
  route: 'functions/api/stripe/payments-webhook.ts',
  provisioner: 'functions/api/scaffolds/_provision-payment.ts',
  retry: 'functions/api/scaffolds/provision-payment.ts',
  generator: 'functions/api/scaffolds/generate.ts',
};

function read(path) {
  if (!fs.existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }
  return fs.readFileSync(path, 'utf8');
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

const migration = read(files.migration);
requireMatch(migration, /HAVING count\(DISTINCT target_url\) = 1/,
  'legacy client target_url backfill source must require one unambiguous scaffold target');
requireMatch(migration, /UPDATE public\.clients[\s\S]*SET target_url = s\.target_url[\s\S]*WHERE c\.id = s\.client_id/,
  'legacy client target_url backfill must write only the selected canonical scaffold target');
requireMatch(migration, /clients_target_url_http_check[\s\S]*\^https\?\:\/\//,
  'database must reject malformed canonical client target URLs');
requireMatch(migration, /CREATE UNIQUE INDEX IF NOT EXISTS diagnostic_scaffolds_one_per_client_idx[\s\S]*WHERE client_id IS NOT NULL/,
  'one client-backed scaffold must be enforced by the database');
requireMatch(migration, /CREATE TABLE IF NOT EXISTS public\.scaffold_provisioning_jobs[\s\S]*payment_id UUID NOT NULL UNIQUE/,
  'provisioning must use a durable one-job-per-payment outbox');
requireMatch(migration, /status IN \('pending', 'running', 'succeeded', 'needs_input', 'retryable'\)/,
  'provisioning job states must distinguish retryable from human-input failures');
requireMatch(migration, /CREATE TRIGGER trigger_enqueue_scaffold_provisioning_job[\s\S]*AFTER INSERT OR UPDATE OF client_id ON public\.payments/,
  'canonical payment linkage must atomically emit provisioning intent');
requireMatch(migration, /CREATE OR REPLACE FUNCTION public\.claim_scaffold_provisioning_job[\s\S]*status IN \('pending', 'retryable'\)/,
  'provisioning job claim must be atomic and retry-safe');
requireMatch(migration, /status = 'running'[\s\S]*started_at < now\(\) - interval '10 minutes'/,
  'interrupted running jobs must have a bounded reclaim lease');
requireMatch(migration, /CREATE OR REPLACE FUNCTION public\.finish_scaffold_provisioning_job/,
  'job completion must have a dedicated atomic database boundary');
requireMatch(migration, /p_status = 'succeeded'[\s\S]*diagnostic_in_progress[\s\S]*UPDATE public\.scaffold_provisioning_jobs/,
  'scaffold success and project readiness must commit in the same DB function');
requireMatch(migration, /successful provisioning requires scaffold owned by client/,
  'success must prove scaffold ownership before advancing delivery');
requireMatch(migration, /'provisioning'[\s\S]*'awaiting_input'[\s\S]*'diagnostic_in_progress'/,
  'project state machine must model provisioning and missing-input states explicitly');

const retentionMigration = read(files.retentionMigration);
requireMatch(retentionMigration, /DROP CONSTRAINT IF EXISTS payments_client_id_fkey/,
  'payment client FK must be deliberately replaced rather than drift');
requireMatch(retentionMigration, /FOREIGN KEY \(client_id\)[\s\S]*REFERENCES public\.clients\(id\)[\s\S]*ON DELETE RESTRICT/,
  'immutable payment ownership must not contradict an ON DELETE SET NULL foreign key');

const targetPolicy = read(files.targetPolicy);
requireMatch(targetPolicy, /credentials_forbidden/,
  'automatic target policy must reject credential-bearing URLs');
requireMatch(targetPolicy, /looksLikeIpLiteral/,
  'automatic target policy must reject literal IP destinations');
requireMatch(targetPolicy, /localhost[\s\S]*\.local[\s\S]*\.internal/,
  'automatic target policy must reject obvious local/private hostnames');
requireMatch(targetPolicy, /nonstandard_port/,
  'automatic target policy must reject nonstandard ports');

const intake = read(files.intake);
requireMatch(intake, /canonicalizePublicTargetUrl\(body\.url\)/,
  'public intake must canonicalize the future scan target before persistence');
requireMatch(intake, /target_url:\s*targetUrl/,
  'public intake must persist clients.target_url');
requireMatch(intake, /target_url_conflict_requires_review/,
  'email-only intake must not silently retarget an existing client');

const route = read(files.route);
requireMatch(route, /const provisioningRequest = context\.request\.clone\(\)/,
  'payment route must preserve the signed event for post-ack provisioning');
requireMatch(route, /response\.status === 200[\s\S]*context\.waitUntil/,
  'background provisioning may only be scheduled after successful payment acknowledgement');
requireMatch(route, /event\.type !== 'checkout\.session\.completed'/,
  'unrelated signed Stripe events must never launch provisioning');

const provisioner = read(files.provisioner);
requireMatch(provisioner, /rpc\('claim_scaffold_provisioning_job'/,
  'provisioner must atomically claim the durable job');
requireMatch(provisioner, /rpc\('finish_scaffold_provisioning_job'/,
  'provisioner must finish job/project state through the atomic DB boundary');
if (/\.from\('beta_projects'\)[\s\S]{0,500}\.update\(/.test(provisioner)) {
  failures.push('provisioner must not independently update project delivery state outside the atomic finish RPC');
}
requireMatch(provisioner, /canonicalizePublicTargetUrl\(rawTargetUrl\)/,
  'automatic provisioner must revalidate the stored target before external fetch');
requireMatch(provisioner, /\.from\('diagnostic_scaffolds'\)[\s\S]*\.eq\('client_id', payment\.client_id\)/,
  'provisioner must reuse an existing client scaffold idempotently');
requireMatch(provisioner, /runScan\(canonicalTarget\.url, env\)/,
  'provisioner must use the canonical shared scan engine rather than duplicate scan logic');
requireMatch(provisioner, /insertError\?\.code === '23505'/,
  'concurrent scaffold creation must converge through the database uniqueness invariant');

const retry = read(files.retry);
requireMatch(retry, /requireAdmin/,
  'operator retry endpoint must require admin authorization');
requireMatch(retry, /allowNeedsInput:\s*true/,
  'only explicit operator retry may re-attempt needs_input jobs');

const generator = read(files.generator);
requireMatch(generator, /\.select\('id, target_url'\)/,
  'manual client scaffold generation must use canonical clients.target_url');
requireMatch(generator, /client_scaffold_exists/,
  'manual generation must detect duplicate client scaffold identity before creating another row');

if (failures.length) {
  console.error('❌ Scaffold provisioning truth invariant failed');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('✅ Scaffold provisioning truth: canonical target, durable outbox, leased claims, atomic finish, retention-aligned payment ownership, async recovery, SSRF guardrails, idempotent scaffold identity, and evidence-gated delivery state');
