/**
 * Signal & Friction — private client-introduction credit policy.
 *
 * Commercial rule (2026-08-13): an existing qualifying client who introduces
 * a genuinely new client earns 20% of that new client's first retained,
 * qualifying service fee as non-cash credit toward a future eligible
 * engagement. The referred client pays the normal price.
 *
 * Runtime persistence and Stripe event handling live in
 * functions/api/stripe/_referrals.ts.
 */

/**
 * The pre-2026-08-13 compatibility write path inside legacy-handler.ts stays
 * off. It targeted the old schema and lacked eligibility, new-client, expiry
 * and revocation controls. Keep this false until that block is deleted.
 */
export const REFERRALS_LIVE = false;

/** The policy-complete referral subsystem is live. */
export const REFERRAL_SYSTEM_LIVE = true;

export const REFERRAL_CREDIT_RATE = 0.20;
export const REFERRAL_QUALIFYING_MINIMUM_CENTS = 100_000; // $1,000
export const REFERRAL_CREDIT_CAP_CENTS = 100_000; // $1,000 per referral
export const REFERRAL_CREDIT_TTL_DAYS = 180;

/**
 * Credit is computed from retained service fees excluding tax/shipping.
 * Never round up. Below-threshold purchases produce no credit.
 */
export function computeReferralCreditCents(
  qualifyingAmountCents: number | null | undefined,
): number {
  if (
    !qualifyingAmountCents ||
    !Number.isFinite(qualifyingAmountCents) ||
    qualifyingAmountCents < REFERRAL_QUALIFYING_MINIMUM_CENTS
  ) {
    return 0;
  }

  return Math.min(
    Math.floor(qualifyingAmountCents * REFERRAL_CREDIT_RATE),
    REFERRAL_CREDIT_CAP_CENTS,
  );
}
