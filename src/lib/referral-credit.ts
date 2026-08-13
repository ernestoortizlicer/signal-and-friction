/** Signal & Friction private client-introduction credit policy. */

// Compatibility flag for the retired referral write path in legacy-handler.ts.
export const REFERRALS_LIVE = false;
export const REFERRAL_SYSTEM_LIVE = true;

export const REFERRAL_CREDIT_RATE = 0.20;
export const REFERRAL_QUALIFYING_MINIMUM_CENTS = 100_000;
export const REFERRAL_CREDIT_CAP_CENTS = 100_000;
export const REFERRAL_CREDIT_TTL_DAYS = 180;

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

export function computeReferralCreditUsd(qualifyingAmountUsd: number): number {
  return computeReferralCreditCents(Math.round(qualifyingAmountUsd * 100)) / 100;
}

export function formatReferralCreditUsd(qualifyingAmountCents: number | null | undefined): string {
  const cents = computeReferralCreditCents(qualifyingAmountCents);
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
