/**
 * Signal & Friction — offer architecture, single source of truth.
 * ════════════════════════════════════════════════════════════════════════════
 * Pricing, billing type, and deliverable scope for every phase in both
 * ladders live here and ONLY here. Nothing else in the app should hardcode
 * a phase name, price, or scope description — read from this file (the
 * pricing page is the next task to wire up against it).
 *
 * `priceId` is the exact `price_id` value used in the live `stripe_payment_links`
 * Supabase table (verified against production 2026-07-29) — join against it
 * directly, no separate mapping layer.
 *
 * `priceUsd` is always the CURRENT LIVE price: what the Stripe payment link
 * behind `priceId` actually charges right now. Where a price change has been
 * business-approved but not yet made live in Stripe, it is recorded in
 * PENDING_PRICE_CHANGES instead of overwriting priceUsd — a stale number
 * here would make a future pricing page advertise a price its own payment
 * link doesn't actually charge. See PENDING_PRICE_CHANGES for what's queued
 * and functions/api/stripe/webhook.ts / the Stripe change plan for what has
 * to happen before a pending change can move into priceUsd.
 */

export type BillingType = 'one_time' | 'monthly';
export type OfferSegment = 'dwy' | 'dfy' | 'certified';

export interface OfferPhase {
  /** Exact match for stripe_payment_links.price_id. */
  priceId: string;
  order: 1 | 2 | 3 | 4 | 5;
  name: string;
  segment: OfferSegment;
  /** Current LIVE price in USD — matches what priceId's payment link actually charges. */
  priceUsd: number;
  billing: BillingType;
  scope: string;
}

export interface PendingPriceChange {
  priceId: string;
  fromUsd: number;
  toUsd: number;
  approvedAt: string;
  status: 'awaiting_stripe_update';
  note: string;
}

// ── DWY (Done-With-You) — founder executes, S&F diagnoses and guides ──
export const DWY_LADDER: OfferPhase[] = [
  {
    priceId: 'price_dwy_beta_diagnostic', order: 1, name: 'Beta Diagnostic', segment: 'dwy',
    priceUsd: 350, billing: 'one_time',
    scope: 'Full diagnosis of ONE dominant friction: evidence tiered measured/modeled/pending, why it blocks conversion, and the recommended decision. Delivered as a web page plus a short Loom walkthrough.',
  },
  {
    priceId: 'price_dwy_intervention', order: 2, name: 'Intervention', segment: 'dwy',
    priceUsd: 750, billing: 'one_time',
    scope: 'Step-by-step implementation plan for the diagnosed fix, guiding the founder to execute it themselves, with expected before/after.',
  },
  {
    priceId: 'price_dwy_monitoring', order: 3, name: 'Monitoring', segment: 'dwy',
    priceUsd: 500, billing: 'monthly',
    scope: "Monthly: measure the fix's effect, report signal movement, and surface the next friction point.",
  },
  {
    priceId: 'price_dwy_expansion', order: 4, name: 'Expansion', segment: 'dwy',
    priceUsd: 350, billing: 'one_time', // LIVE price. Approved change to $500 not yet in Stripe — see PENDING_PRICE_CHANGES.
    scope: 'The diagnostic repeated on another funnel area.',
  },
  {
    priceId: 'price_dwy_autonomy', order: 5, name: 'Autonomy Kit', segment: 'dwy',
    priceUsd: 1500, billing: 'one_time',
    scope: 'The method packaged — framework, checklist, and templates — so the founder can run future diagnostics solo.',
  },
];

// ── DFY (Done-For-You) — same 5 scopes, S&F executes everything ──
export const DFY_LADDER: OfferPhase[] = [
  {
    priceId: 'price_dfy_beta_diagnostic', order: 1, name: 'Beta Diagnostic', segment: 'dfy',
    priceUsd: 2000, billing: 'one_time',
    scope: 'Full diagnosis of ONE dominant friction: evidence tiered measured/modeled/pending, why it blocks conversion, and the recommended decision. Delivered as a web page plus a short Loom walkthrough.',
  },
  {
    priceId: 'price_dfy_intervention', order: 2, name: 'Intervention', segment: 'dfy',
    priceUsd: 3000, billing: 'one_time',
    scope: 'S&F implements the diagnosed fix directly, with measured before/after.',
  },
  {
    priceId: 'price_dfy_monitoring', order: 3, name: 'Monitoring', segment: 'dfy',
    priceUsd: 2500, billing: 'monthly',
    scope: "Monthly: measure the fix's effect, report signal movement, and surface the next friction point.",
  },
  {
    priceId: 'price_dfy_expansion', order: 4, name: 'Expansion', segment: 'dfy',
    priceUsd: 2000, billing: 'one_time', // LIVE price. Approved change to $2,500 not yet in Stripe — see PENDING_PRICE_CHANGES.
    scope: 'The diagnostic repeated on another funnel area, with S&F implementing the fix directly.',
  },
  {
    priceId: 'price_dfy_autonomy', order: 5, name: 'Autonomy Kit', segment: 'dfy',
    priceUsd: 5000, billing: 'one_time',
    scope: 'The method packaged — framework, checklist, and templates — handed to your team to run future diagnostics in-house.',
  },
];

// ── Certified — ARCHIVED. Deliberately excluded from ALL_LADDERS / getPublicPhases(). ──
export const CERTIFIED_TIER: { archived: true; archivedNote: string; phases: OfferPhase[] } = {
  archived: true,
  archivedNote: 'Not shown anywhere public as of 2026-07-29. Kept here for record only — never included in ALL_LADDERS or getPublicPhases(). The standalone /certified marketing page and its own hardcoded Stripe links (src/app/certified/CertifiedClient.tsx) are untouched by this — unpublishing that page is a separate task if wanted.',
  phases: [
    {
      priceId: 'price_certified_practitioner', order: 1, name: 'Certified Practitioner', segment: 'certified',
      priceUsd: 2500, billing: 'one_time',
      scope: 'Annual license to deliver S&F diagnostics under your own brand.',
    },
    {
      priceId: 'price_certified_agency', order: 2, name: 'Certified Agency', segment: 'certified',
      priceUsd: 5000, billing: 'one_time',
      scope: 'Annual agency-tier license.',
    },
  ],
};

export const PENDING_PRICE_CHANGES: PendingPriceChange[] = [
  {
    priceId: 'price_dwy_expansion', fromUsd: 350, toUsd: 500,
    approvedAt: '2026-07-29', status: 'awaiting_stripe_update',
    note: 'priceUsd above stays at 350 (the real live price) until a new Stripe Price + Payment Link exist and stripe_payment_links.payment_link_url / amount for price_dwy_expansion are updated to match — Stripe Prices are immutable, so this cannot be edited in place.',
  },
  {
    priceId: 'price_dfy_expansion', fromUsd: 2000, toUsd: 2500,
    approvedAt: '2026-07-29', status: 'awaiting_stripe_update',
    note: 'priceUsd above stays at 2000 (the real live price) until a new Stripe Price + Payment Link exist and stripe_payment_links.payment_link_url / amount for price_dfy_expansion are updated to match — Stripe Prices are immutable, so this cannot be edited in place.',
  },
];

/** Certified is deliberately excluded — archived, never public. */
export const ALL_LADDERS: OfferPhase[] = [...DWY_LADDER, ...DFY_LADDER];

export function getPublicPhases(): OfferPhase[] {
  return ALL_LADDERS;
}

export function getPhase(priceId: string): OfferPhase | undefined {
  return ALL_LADDERS.find((p) => p.priceId === priceId);
}

export function getLadder(segment: 'dwy' | 'dfy'): OfferPhase[] {
  return (segment === 'dwy' ? DWY_LADDER : DFY_LADDER).slice().sort((a, b) => a.order - b.order);
}

export function formatPriceUsd(phase: OfferPhase): string {
  const amount = `$${phase.priceUsd.toLocaleString('en-US')}`;
  return phase.billing === 'monthly' ? `${amount}/mo` : amount;
}

export function getPendingChange(priceId: string): PendingPriceChange | undefined {
  return PENDING_PRICE_CHANGES.find((c) => c.priceId === priceId);
}
