import fs from 'node:fs';

function read(path) { return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); }
function requireText(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`Stripe/Finance integrity: missing ${label}: ${needle}`);
}

const migration = read('supabase/migrations/20260813183200_stripe_finance_projection.sql');
const reconciliation = read('src/server/stripe-finance-posting.ts');
const endpoint = read('functions/api/finance/reconcile-stripe.ts');

requireText(migration, 'finance_external_integrations', 'explicit provider/account mapping');
requireText(migration, 'AFTER INSERT ON public.payments', 'payment-truth projection trigger');
requireText(migration, 'public.post_finance_transaction(', 'canonical Finance RPC');
requireText(migration, "'stripe_checkout_session'", 'gross-payment idempotency source');
requireText(migration, 'finance_projection_issues', 'observable failure state');
requireText(migration, 'REVOKE INSERT,UPDATE,DELETE ON public.transactions FROM anon,authenticated,service_role', 'direct transaction-write denial');
requireText(migration, 'REVOKE INSERT,UPDATE,DELETE ON public.transaction_entries FROM anon,authenticated,service_role', 'direct entry-write denial');

requireText(reconciliation, "'finance_external_integrations'", 'same canonical mapping in recovery tool');
requireText(reconciliation, "'stripe_checkout_session'", 'idempotent revenue replay');
requireText(reconciliation, "'stripe_balance_transaction_fee'", 'exact Stripe fee idempotency source');
requireText(reconciliation, "balanceTransaction.fee", 'Stripe fee ground truth');
if (/feeCents\s*=\s*\d+\s*[;\n]/.test(reconciliation) && !reconciliation.includes('feeCents = 0')) {
  throw new Error('Stripe/Finance integrity: fee must never be hardcoded or estimated.');
}

requireText(endpoint, 'requireAdmin', 'human/operator recovery boundary');
requireText(endpoint, 'postStripePaymentToFinanceBySessionId', 'canonical recovery implementation');

console.log('Stripe -> Finance projection contract: PASS');
