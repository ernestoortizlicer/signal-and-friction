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
 * App-code copy (admin UI, future pricing page). functions/api/_referral-credit.ts
 * is the sibling copy for Cloudflare Functions — esbuild there can't resolve
 * cross-directory imports into src/ at compile time, so this can't just be a
 * shared import. Keep the rate in sync between the two if it ever changes.
 *
 * The actual credit is computed and persisted server-side, at the moment the
 * referred person's payment completes, by functions/api/stripe/webhook.ts —
 * that's the only place that authoritatively knows both the real purchase
 * amount and that the payment genuinely succeeded. This module exists so
 * admin UI can preview/display the same number without duplicating the math.
 */

// Parked post-launch (2026-07-29): the `referrals` table doesn't exist yet
// (supabase/migrations/20260729000003_referrals_table.sql is written and
// ready, but deliberately not run — no first client yet). Any future admin
// UI should gate referral-related panels/links on this flag rather than
// assuming the table is there. Flip to true once the migration has
// actually been run, in sync with functions/api/_referral-credit.ts.
export const REFERRALS_LIVE = false;

export const REFERRAL_CREDIT_RATE = 0.20; // 20%, fixed — confirmed 2026-07-29

/** Never round a credit UP in the payer's favor. */
export function computeReferralCreditCents(referredPurchaseAmountCents: number | null | undefined): number {
  if (!referredPurchaseAmountCents || !Number.isFinite(referredPurchaseAmountCents) || referredPurchaseAmountCents <= 0) {
    return 0;
  }
  return Math.floor(referredPurchaseAmountCents * REFERRAL_CREDIT_RATE);
}

export function computeReferralCreditUsd(referredPurchaseAmountUsd: number): number {
  return computeReferralCreditCents(Math.round(referredPurchaseAmountUsd * 100)) / 100;
}

export function formatReferralCreditUsd(referredPurchaseAmountCents: number | null | undefined): string {
  const cents = computeReferralCreditCents(referredPurchaseAmountCents);
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
