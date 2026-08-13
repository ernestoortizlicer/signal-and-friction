import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getServiceRoleKey } from './_env';

type Env = {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

export type StripeFinancePostingResult =
  | { status: 'posted'; revenueTransactionId: string; feeTransactionId: string | null; grossCents: number; feeCents: number }
  | { status: 'skipped'; reason: 'payment_not_paid' | 'zero_amount' | 'unsupported_currency' | 'integration_unconfigured' | 'finance_profile_unavailable' };

/**
 * Recovery/reconciliation path for Stripe -> Finance.
 *
 * Automatic gross posting is driven from canonical `payments` state in
 * Postgres. This helper is deliberately idempotent and exists to reconcile a
 * Stripe Checkout Session against that projection and, when Stripe exposes a
 * balance transaction, record the exact processing fee without estimation.
 */
export async function postStripePaymentToFinanceBySessionId(
  sessionId: string,
  env: Env,
): Promise<StripeFinancePostingResult> {
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) throw new Error('Finance reconciliation unavailable: service credential missing.');
  if (!env.STRIPE_SECRET_KEY) throw new Error('Finance reconciliation unavailable: Stripe credential missing.');

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

  const { data: integration, error: integrationError } = await supabase
    .from('finance_external_integrations')
    .select('profile_id,cash_account_id,revenue_account_id,fee_account_id,is_active')
    .eq('provider', 'stripe')
    .eq('is_active', true)
    .maybeSingle();
  if (integrationError) throw integrationError;
  if (!integration) return { status: 'skipped', reason: 'integration_unconfigured' };

  const { data: profile, error: profileError } = await supabase
    .from('finance_profiles')
    .select('owner_id,base_currency')
    .eq('id', integration.profile_id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.owner_id || profile.base_currency !== 'USD') return { status: 'skipped', reason: 'finance_profile_unavailable' };

  const productName = session.line_items?.data?.[0]?.description ?? 'Signal & Friction service';
  const occurredAt = new Date(session.created * 1000).toISOString();
  const { data: revenueTransactionId, error: revenueError } = await supabase.rpc('post_finance_transaction', {
    p_actor_id: profile.owner_id,
    p_date: occurredAt,
    p_description: `Stripe payment: ${productName}`,
    p_debit_account: integration.cash_account_id,
    p_credit_account: integration.revenue_account_id,
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

  // Fee truth is Stripe's balance transaction. Never estimate it.
  if (!integration.fee_account_id || !balanceTransactionId || !Number.isFinite(feeCents) || feeCents <= 0) {
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
    p_debit_account: integration.fee_account_id,
    p_credit_account: integration.cash_account_id,
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
