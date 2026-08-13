import { createClient } from '@supabase/supabase-js';
import {
  computeReferralCreditCents,
  REFERRAL_CREDIT_CAP_CENTS,
  REFERRAL_CREDIT_TTL_DAYS,
  REFERRAL_QUALIFYING_MINIMUM_CENTS,
  REFERRAL_SYSTEM_LIVE,
} from '../_referral-credit';
import { getServiceRoleKey, getSupabaseUrl } from '../../../src/server/_env';

type ReferralEnv = {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY?: string;
};

type StripeEventLike = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

type ReferralDbClient = ReturnType<typeof createClient<any>>;

const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizedEmail(value: unknown): string | null {
  const valueAsText = asString(value)?.trim().toLowerCase() ?? null;
  return valueAsText && valueAsText.includes('@') ? valueAsText : null;
}

function randomReferralCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let body = '';
  for (const byte of bytes) body += REFERRAL_CODE_ALPHABET[byte % REFERRAL_CODE_ALPHABET.length];
  return `SF${body}`;
}

function expiresAtIso(): string {
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + REFERRAL_CREDIT_TTL_DAYS);
  return expires.toISOString();
}

function checkoutEmail(session: Record<string, unknown>): string | null {
  const details = session.customer_details as Record<string, unknown> | undefined;
  return normalizedEmail(details?.email ?? session.customer_email);
}

function checkoutQualifyingAmount(session: Record<string, unknown>): number {
  const total = asNumber(session.amount_total);
  const details = (session.total_details as Record<string, unknown> | undefined) ?? {};
  return Math.max(0, total - asNumber(details.amount_tax) - asNumber(details.amount_shipping));
}

async function hasPriorPaidRelationship(
  supabase: ReferralDbClient,
  email: string,
  customerId: string | null,
  currentSessionId: string,
): Promise<boolean> {
  const byEmail = await supabase.from('payments').select('id').ilike('email', email)
    .neq('stripe_session_id', currentSessionId).limit(1);
  if (byEmail.error) throw byEmail.error;
  if ((byEmail.data?.length ?? 0) > 0) return true;
  if (!customerId) return false;
  const byCustomer = await supabase.from('payments').select('id').eq('stripe_customer_id', customerId)
    .neq('stripe_session_id', currentSessionId).limit(1);
  if (byCustomer.error) throw byCustomer.error;
  return (byCustomer.data?.length ?? 0) > 0;
}

async function ensurePrivateReferralCode(
  supabase: ReferralDbClient,
  email: string,
  stripeCustomerId: string | null,
): Promise<{ code: string; created: boolean }> {
  const existing = await supabase.from('referral_codes').select('code')
    .ilike('referrer_email', email).eq('active', true).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.code) return { code: existing.data.code, created: false };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomReferralCode();
    const insert = await supabase.from('referral_codes').insert({
      code,
      referrer_email: email,
      referrer_stripe_customer_id: stripeCustomerId,
      active: true,
    });
    if (!insert.error) return { code, created: true };
    if (insert.error.code !== '23505') throw insert.error;
  }
  throw new Error('Could not allocate a unique referral code after 5 attempts');
}

async function sendReferralLinkEmail(apiKey: string, email: string, code: string): Promise<void> {
  const referralUrl = `https://signal-and-friction.com/?ref=${encodeURIComponent(code)}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Signal & Friction <hello@signal-and-friction.com>',
      to: email,
      subject: 'Your private Signal & Friction introduction link',
      html: `<p>Your private client-introduction link:</p><p><a href="${referralUrl}">${referralUrl}</a></p><p>A genuinely new client who completes a qualifying $1,000+ engagement earns you 20% of their first retained qualifying service fee as non-cash credit, capped at $1,000 and valid for 180 days.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend referral-link email failed: ${response.status}`);
}

async function handleCheckoutCompleted(
  session: Record<string, unknown>,
  supabase: ReferralDbClient,
  env: ReferralEnv,
): Promise<void> {
  if (session.payment_status !== 'paid') return;
  const sessionId = asString(session.id);
  const email = checkoutEmail(session);
  if (!sessionId || !email) return;

  const customerId = asString(session.customer);
  const paymentIntentId = asString(session.payment_intent);
  const qualifyingAmount = checkoutQualifyingAmount(session);

  if (qualifyingAmount >= REFERRAL_QUALIFYING_MINIMUM_CENTS) {
    const privateCode = await ensurePrivateReferralCode(supabase, email, customerId);
    if (privateCode.created && env.RESEND_API_KEY) {
      try { await sendReferralLinkEmail(env.RESEND_API_KEY, email, privateCode.code); }
      catch (err) { console.warn(`Referral link email failed: ${err instanceof Error ? err.message : 'unknown error'}`); }
    }
  }

  const metadata = (session.metadata as Record<string, unknown> | undefined) ?? {};
  const referralCode = asString(session.client_reference_id) ?? asString(metadata.sf_referral_ref) ?? asString(metadata.referral_code);
  if (!referralCode) return;

  const codeResult = await supabase.from('referral_codes').select('code, referrer_email')
    .eq('code', referralCode).eq('active', true).maybeSingle();
  if (codeResult.error) throw codeResult.error;
  const referrerEmail = normalizedEmail(codeResult.data?.referrer_email);
  if (!codeResult.data?.code || !referrerEmail || referrerEmail === email) return;

  const creditOwed = computeReferralCreditCents(qualifyingAmount);
  if (creditOwed <= 0) return;
  if (await hasPriorPaidRelationship(supabase, email, customerId, sessionId)) return;

  const insert = await supabase.from('referrals').upsert({
    ref_code: referralCode,
    referrer_email: referrerEmail,
    referred_email: email,
    referred_product: asString(metadata.offer_key) ?? 'qualifying_engagement',
    referred_amount_cents: asNumber(session.amount_total),
    qualifying_amount_cents: qualifyingAmount,
    credit_owed_cents: creditOwed,
    qualifying_minimum_cents: REFERRAL_QUALIFYING_MINIMUM_CENTS,
    credit_cap_cents: REFERRAL_CREDIT_CAP_CENTS,
    source_stripe_session_id: sessionId,
    source_stripe_payment_intent: paymentIntentId,
    source_stripe_customer_id: customerId,
    status: 'pending',
    expires_at: expiresAtIso(),
  }, { onConflict: 'source_stripe_session_id', ignoreDuplicates: true });
  if (insert.error) throw insert.error;
}

async function revokeByPaymentIntent(
  supabase: ReferralDbClient,
  paymentIntentId: string | null,
  reason: 'refund' | 'dispute',
): Promise<void> {
  if (!paymentIntentId) return;
  const update = await supabase.from('referrals').update({
    status: 'revoked',
    revoked_at: new Date().toISOString(),
    revocation_reason: reason,
    notes: `${reason} received on source payment; related client-introduction credit revoked.`,
  }).eq('source_stripe_payment_intent', paymentIntentId).in('status', ['pending', 'credit_issued']);
  if (update.error) throw update.error;
}

async function resolveDisputePaymentIntent(dispute: Record<string, unknown>, env: ReferralEnv): Promise<string | null> {
  const direct = asString(dispute.payment_intent);
  if (direct) return direct;
  const chargeId = asString(dispute.charge);
  if (!chargeId || !env.STRIPE_SECRET_KEY) return null;
  const response = await fetch(`https://api.stripe.com/v1/charges/${encodeURIComponent(chargeId)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!response.ok) return null;
  const charge = await response.json() as Record<string, unknown>;
  return asString(charge.payment_intent);
}

export async function handleReferralStripeEvent(event: StripeEventLike, env: ReferralEnv): Promise<void> {
  if (!REFERRAL_SYSTEM_LIVE || !event.type || !event.data?.object) return;
  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) throw new Error('Referral subsystem missing Supabase service-role credentials');
  const supabase = createClient<any>(getSupabaseUrl(env), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(event.data.object, supabase, env);
  } else if (event.type === 'refund.created') {
    await revokeByPaymentIntent(supabase, asString(event.data.object.payment_intent), 'refund');
  } else if (event.type === 'charge.dispute.created') {
    await revokeByPaymentIntent(supabase, await resolveDisputePaymentIntent(event.data.object, env), 'dispute');
  }
}
