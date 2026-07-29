/**
 * Referral credit — proportional model.
 * ════════════════════════════════════════════════════════════════════════════
 * Replaces the old flat $500 Stripe coupon (SFREF500), which could exceed the
 * price of a $350 DWY phase and turn a referral into a loss. A fixed
 * percentage of what the referred person actually paid can never do that —
 * at 20%, the credit is mathematically bounded by the transaction it came
 * from. There's no separate "margin cap" to enforce on top of this; the
 * proportionality IS the cap.
 *
 * Lives under functions/ (not src/lib) because Cloudflare esbuild cannot
 * resolve cross-directory imports into src/ at function compile time (same
 * constraint documented in _scan.ts and _models.ts). src/lib/referral-credit.ts
 * is the sibling copy for app code (admin UI, future pricing page) — keep the
 * rate and REFERRALS_LIVE in sync between the two if either ever changes.
 */

// Parked post-launch (2026-07-29): the `referrals` table doesn't exist yet
// (20260729000003_referrals_table.sql is written and ready, but
// deliberately not run — no first client yet, so a referral loop is
// premature). functions/api/stripe/webhook.ts gates its referral-recording
// block on this flag instead of just letting the Supabase call fail and
// get caught — a guaranteed failure on every single payment isn't a
// "graceful degrade" to leave running, it's log spam. Flip to true once
// the migration has actually been run.
export const REFERRALS_LIVE = false;

export const REFERRAL_CREDIT_RATE = 0.20; // 20%, fixed — confirmed 2026-07-29

/** Never round a credit UP in the payer's favor. */
export function computeReferralCreditCents(referredPurchaseAmountCents: number | null | undefined): number {
  if (!referredPurchaseAmountCents || !Number.isFinite(referredPurchaseAmountCents) || referredPurchaseAmountCents <= 0) {
    return 0;
  }
  return Math.floor(referredPurchaseAmountCents * REFERRAL_CREDIT_RATE);
}
