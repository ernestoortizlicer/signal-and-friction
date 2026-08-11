/**
 * Signal & Friction — canonical commercial offer architecture.
 *
 * This file is the single source of truth for what can be sold publicly:
 * offer identity, current price, billing type, segment, order, and scope.
 * Public transactional surfaces must derive from the active ladders below.
 *
 * `priceId` is the exact `price_id` value used in the live
 * `stripe_payment_links` Supabase table. UI code may resolve a payment URL
 * from that table only for a phase returned by getPublicPhases()/getPhase().
 *
 * Archived concepts are records only. They deliberately do NOT implement
 * OfferPhase and do not carry checkout identifiers, so archived product
 * history cannot accidentally become transactable through the same APIs as
 * active offers.
 */

export type BillingType = 'one_time' | 'monthly';
export type ActiveOfferSegment = 'dwy' | 'dfy';

export interface OfferPhase {
  /** Exact match for stripe_payment_links.price_id. */
  priceId: string;
  order: 1 | 2 | 3 | 4 | 5;
  name: string;
  segment: ActiveOfferSegment;
  /** Current LIVE price in USD — matches what priceId's payment link charges. */
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

export interface ArchivedOfferRecord {
  archived: true;
  archivedAt: string;
  name: string;
  archivedNote: string;
  /** Historical context only. Never render as a current price or checkout. */
  historicalPricing: Array<{
    label: string;
    priceUsd: number;
    billing: BillingType;
  }>;
}

// ── DWY (Done-With-You) — founder executes, S&F diagnoses and guides ──
export const DWY_LADDER: OfferPhase[] = [
  {
    priceId: 'price_dwy_beta_diagnostic', order: 1, name: 'Diagnostic', segment: 'dwy',
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
    priceUsd: 500, billing: 'one_time',
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
    priceId: 'price_dfy_beta_diagnostic', order: 1, name: 'Diagnostic', segment: 'dfy',
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
    priceUsd: 2500, billing: 'one_time',
    scope: 'The diagnostic repeated on another funnel area, with S&F implementing the fix directly.',
  },
  {
    priceId: 'price_dfy_autonomy', order: 5, name: 'Autonomy Kit', segment: 'dfy',
    priceUsd: 5000, billing: 'one_time',
    scope: 'The method packaged — framework, checklist, and templates — handed to your team to run future diagnostics in-house.',
  },
];

/**
 * Certified — ARCHIVED.
 *
 * Deliberately represented as historical product state rather than an active
 * OfferPhase. It has no Stripe price IDs and can never appear in ALL_LADDERS,
 * getPublicPhases(), getPhase(), or getLadder(). Re-activating Certified
 * requires an explicit product decision plus migration back into the canonical
 * active-offer model; a page-local price or checkout link is never sufficient.
 */
export const CERTIFIED_TIER: ArchivedOfferRecord = {
  archived: true,
  archivedAt: '2026-07-29',
  name: 'S&F Certified',
  archivedNote: 'Archived product concept. No new enrollments or payments are accepted. Historical pricing is retained for audit context only.',
  historicalPricing: [
    { label: 'Certified Practitioner', priceUsd: 2500, billing: 'one_time' },
    { label: 'Certified Agency', priceUsd: 5000, billing: 'one_time' },
  ],
};

// Empty as of 2026-07-29 — approved future price changes belong here until
// the corresponding Stripe Price + Payment Link are live and the canonical
// catalog can safely be updated.
export const PENDING_PRICE_CHANGES: PendingPriceChange[] = [];

/** Active public offers only. Archived concepts are structurally excluded. */
export const ALL_LADDERS: OfferPhase[] = [...DWY_LADDER, ...DFY_LADDER];

export function getPublicPhases(): OfferPhase[] {
  return ALL_LADDERS;
}

export function getPhase(priceId: string): OfferPhase | undefined {
  return ALL_LADDERS.find((p) => p.priceId === priceId);
}

export function isActivePriceId(priceId: string): boolean {
  return getPhase(priceId) !== undefined;
}

export function getLadder(segment: ActiveOfferSegment): OfferPhase[] {
  return (segment === 'dwy' ? DWY_LADDER : DFY_LADDER).slice().sort((a, b) => a.order - b.order);
}

export function formatPriceUsd(phase: OfferPhase): string {
  const amount = `$${phase.priceUsd.toLocaleString('en-US')}`;
  return phase.billing === 'monthly' ? `${amount}/mo` : amount;
}

export function getPendingChange(priceId: string): PendingPriceChange | undefined {
  return PENDING_PRICE_CHANGES.find((c) => c.priceId === priceId);
}
