import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getServiceRoleKey } from './_env';

type Env = {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

type FinanceAccount = {
  id: string;
  name: string;
  profile_id: string | null;
  currency: string;
};

export type StripeFinancePostingResult =
  | { status: 'posted'; revenueTransactionId: string; feeTransactionId: string | null; grossCents: number; feeCents: number }
  | { status: 'skipped'; reason: 'payment_not_paid' | 'zero_amount' | 'unsupported_currency' | 'finance_accounts_unavailable' | 'finance_profile_unavailable' | 'fee_evidence_unavailable' };

/**
 * Canonical Stripe → Finance bridge.
 *
 * `payments` remains payment truth. Finance truth is posted only through the
 * hardened `post_finance_transaction` RPC: profile-scoped, currency-checked,
 * actor-scoped and idempotent on external_source + external_id.
 *
 * Gross revenue and Stripe processing fee are separate journal transactions:
 *   Dr Checking / Cr Consulting Revenue = gross amount
 *   Dr Stripe Fees Expense / Cr Checking = Stripe fee
 * This keeps cash at net settlement while preserving gross revenue and fees.
 */
export async function postStripePaymentToFinanceBySessionId(
  sessionId: string,
  env: Env,
): Promise<StripeFinancePostingResult> {
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) throw new Error('Finance posting unavailable: service credential missing.');
  if (!env.STRIPE_SECRET_KEY) throw new Error('Finance posting unavailable: Stripe credential missing.');

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-05-27.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });
  const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price', 'payment_intent.latest_charge.balance_transaction'],
  });

  if (session.payment_status !== 'paid') return { status: 'skipped', reason: 'payment_not_paid' };
  const grossCents = Number(session.amount_total ?? 0);
  if (!Number.isFinite(grossCents) || grossCents <= 0) return { status: 'skipped', reason: 'zero_amount' };
  if ((session.currency ?? '').toLowerCase() !== 'usd') return { status: 'skipped', reason: 'unsupported_currency' };

  const requiredNames = ['Signal & Friction Checking', 'Consulting Revenue', 'Stripe Fees Expense'];
  const { data: accountRows, error: accountError } = await supabase
    .from('accounts')
    .select('id,name,profile_id,currency')
    .in('name', requiredNames)
    .eq('is_active', true);
  if (accountError) throw accountError;

  const accounts = (accountRows ?? []) as FinanceAccount[];
  const candidates = new Map<string, Map<string, FinanceAccount>>();
  for (const account of accounts) {
    if (!account.profile_id || account.currency !== 'USD') continue;
    const byName = candidates.get(account.profile_id) ?? new Map<string, FinanceAccount>();
    byName.set(account.name, account);
    candidates.set(account.profile_id, byName);
  }
  const matchingProfiles = [...candidates.entries()].filter(([, byName]) => requiredNames.every((name) => byName.has(name)));
  if (matchingProfiles.length !== 1) return { status: 'skipped', reason: 'finance_accounts_unavailable' };

  const [profileId, byName] = matchingProfiles[0];
  const checking = byName.get('Signal & Friction Checking')!;
  const revenue = byName.get('Consulting Revenue')!;
  const feesExpense = byName.get('Stripe Fees Expense')!;

  const { data: profile, error: profileError } = await supabase
    .from('finance_profiles')
    .select('id,owner_id,base_currency')
    .eq('id', profileId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.owner_id || profile.base_currency !== 'USD') return { status: 'skipped', reason: 'finance_profile_unavailable' };

  const productName = session.line_items?.data?.[0]?.description ?? 'Signal & Friction service';
  const occurredAt = new Date(session.created * 1000).toISOString();
  const { data: revenueTransactionId, error: revenueError } = await supabase.rpc('post_finance_transaction', {
    p_actor_id: profile.owner_id,
    p_date: occurredAt,
    p_description: `Stripe payment: ${productName}`,
    p_debit_account: checking.id,
    p_credit_account: revenue.id,
    p_amount_cents: grossCents,
    p_external_source: 'stripe_checkout_session',
    p_external_id: session.id,
  });
  if (revenueError) throw revenueError;

  let feeCents = 0;
  let balanceTransactionId: string | null = null;
  const paymentIntent = typeof session.payment_intent === 'string' ? null : session.payment_intent;
  const latestCharge = paymentIntent && typeof paymentIntent.latest_charge !== 'string' ? paymentIntent.latest_charge : null;
  const balanceTransaction = latestCharge && typeof latestCharge.balance_transaction !== 'string' ? latestCharge.balance_transaction : null;
  if (balanceTransaction) {
    feeCents = Number(balanceTransaction.fee ?? 0);
    balanceTransactionId = balanceTransaction.id;
  }

  // Never estimate fees. If Stripe has not exposed the balance transaction yet,
  // gross revenue is still canonical but the fee remains explicitly unposted.
  if (!balanceTransactionId || !Number.isFinite(feeCents) || feeCents <= 0) {
    return {
      status: 'posted',
      revenueTransactionId: String(revenueTransactionId),
      feeTransactionId: null,
      grossCents,
      feeCents: 0,
    };
  }

  const { data: feeTransactionId, error: feeError } = await supabase.rpc('post_finance_transaction', {
    p_actor_id: profile.owner_id,
    p_date: occurredAt,
    p_description: `Stripe processing fee: ${productName}`,
    p_debit_account: feesExpense.id,
    p_credit_account: checking.id,
    p_amount_cents: feeCents,
    p_external_source: 'stripe_balance_transaction_fee',
    p_external_id: balanceTransactionId,
  });
  if (feeError) throw feeError;

  return {
    status: 'posted',
    revenueTransactionId: String(revenueTransactionId),
    feeTransactionId: String(feeTransactionId),
    grossCents,
    feeCents,
  };
}
