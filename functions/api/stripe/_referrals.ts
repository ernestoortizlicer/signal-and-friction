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

type SupabaseClient = ReturnType<typeof createClient>;

const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizedEmail(value: unknown): string | null {
  const email = asString(value)?.trim().toLowerCase() ?? null;
  return email && email.includes('@') ? email : null;
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
  // Actual retained checkout value excluding tax and shipping. Any discount
  // is already reflected in amount_total, so credit cannot be earned on value
  // the referred buyer did not pay.
  const total = asNumber(session.amount_total);
  const details = (session.total_details as Record<string, unknown> | undefined) ?? {};
  const tax = asNumber(details.amount_tax);
  const shipping = asNumber(details.amount_shipping);
  return Math.max(0, total - tax - shipping);
}

async function hasPriorPaidRelationship(
  supabase: SupabaseClient,
  email: string,
  customerId: string | null,
  currentSessionId: string,
): Promise<boolean> {
  const byEmail = await supabase
    .from('payments')
    .select('id')
    .ilike('email', email)
    .neq('stripe_session_id', currentSessionId)
    .limit(1);
  if (byEmail.error) throw byEmail.error;
  if ((byEmail.data?.length ?? 0) > 0) return true;

  if (!customerId) return false;
  const byCustomer = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .neq('stripe_session_id', currentSessionId)
    .limit(1);
  if (byCustomer.error) throw byCustomer.error;
  return (byCustomer.data?.length ?? 0) > 0;
}

async function ensurePrivateReferralCode(
  supabase: SupabaseClient,
  email: string,
  stripeCustomerId: string | null,
): Promise<{ code: string; created: boolean }> {
  const existing = await supabase
    .from('referral_codes')
    .select('code')
    .ilike('referrer_email', email)
    .eq('active', true)
    .maybeSingle();
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
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Signal & Friction <hello@signal-and-friction.com>',
      to: email,
      subject: 'Your private Signal & Friction introduction link',
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;color:#17130f;line-height:1.6">
          <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8b6c31">Signal &amp; Friction · Client Introduction Credit</p>
          <h1 style="font-size:24px;line-height:1.25">A private link for people you trust.</h1>
          <p>If you introduce a genuinely new client who completes a qualifying $1,000+ engagement, you earn credit equal to 20% of their first retained qualifying service fee, capped at $1,000.</p>
          <p>The referred client pays the normal price. Your credit is non-cash, non-transferable, valid for 180 days, and applies to a future qualifying $1,000+ engagement.</p>
          <p><a href="${referralUrl}" style="display:inline-block;padding:12px 18px;background:#0A0908;color:#D4A853;text-decoration:none;border-radius:6px">Open your private introduction link</a></p>
          <p style="font-size:12px;color:#756b61">Refunds or disputes on the referred engagement revoke the related credit. Full terms: https://signal-and-friction.com/legal/referrals/</p>
        </div>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend referral-link email failed: ${response.status}`);
}

async function handleCheckoutCompleted(
  session: Record<string, unknown>,
  supabase: SupabaseClient,
  env: ReferralEnv,
): Promise<void> {
  if (session.payment_status !== 'paid') return;
  const sessionId = asString(session.id);
  const email = checkoutEmail(session);
  if (!sessionId || !email) return;

  const customerId = asString(session.customer);
  const paymentIntentId = asString(session.payment_intent);
  const qualifyingAmount = checkoutQualifyingAmount(session);

  // A client only earns the right to introduce once they themselves complete
  // a qualifying engagement. This keeps the program client-led, not affiliate-led.
  if (qualifyingAmount >= REFERRAL_QUALIFYING_MINIMUM_CENTS) {
    const privateCode = await ensurePrivateReferralCode(supabase, email, customerId);
    if (privateCode.created && env.RESEND_API_KEY) {
      try {
        await sendReferralLinkEmail(env.RESEND_API_KEY, email, privateCode.code);
      } catch (err) {
        console.warn(`Referral link email failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }
  }

  const referralCode =
    asString(session.client_reference_id) ??
    asString((session.metadata as Record<string, unknown> | undefined)?.sf_referral_ref) ??
    asString((session.metadata as Record<string, unknown> | undefined)?.referral_code);
  if (!referralCode) return;

  const codeResult = await supabase
    .from('referral_codes')
    .select('code, referrer_email')
    .eq('code', referralCode)
    .eq('active', true)
    .maybeSingle();
  if (codeResult.error) throw codeResult.error;
  const referrerEmail = normalizedEmail(codeResult.data?.referrer_email);
  if (!codeResult.data?.code || !referrerEmail) return;

  // No self-referrals.
  if (referrerEmail === email) return;

  const creditOwed = computeReferralCreditCents(qualifyingAmount);
  if (creditOwed <= 0) return;

  // The referral applies only to the referred person's first paid relationship.
  if (await hasPriorPaidRelationship(supabase, email, customerId, sessionId)) return;

  const lineItemsLabel = asString((session.metadata as Record<string, unknown> | undefined)?.offer_key) ?? 'qualifying_engagement';
  const insert = await supabase.from('referrals').upsert({
    ref_code: referralCode,
    referrer_email: referrerEmail,
    referred_email: email,
    referred_product: lineItemsLabel,
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

  console.log(`Referral earned: ${referralCode} → $${(creditOwed / 100).toFixed(2)} pending credit`);
}

async function revokeByPaymentIntent(
  supabase: SupabaseClient,
  paymentIntentId: string | null,
  reason: 'refund' | 'dispute',
): Promise<void> {
  if (!paymentIntentId) return;
  const now = new Date().toISOString();
  const update = await supabase
    .from('referrals')
    .update({
      status: 'revoked',
      revoked_at: now,
      revocation_reason: reason,
      notes: `${reason} received on source payment; related client-introduction credit revoked.`,
    })
    .eq('source_stripe_payment_intent', paymentIntentId)
    .in('status', ['pending', 'credit_issued']);
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

  const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(event.data.object, supabase, env);
    return;
  }

  if (event.type === 'refund.created') {
    await revokeByPaymentIntent(supabase, asString(event.data.object.payment_intent), 'refund');
    return;
  }

  if (event.type === 'charge.dispute.created') {
    await revokeByPaymentIntent(supabase, await resolveDisputePaymentIntent(event.data.object, env), 'dispute');
  }
}
