#!/usr/bin/env node

/**
 * RETIRED: persistent Stripe Payment Link creator.
 *
 * The old script recreated every historical offer from a second hardcoded
 * catalog, published bearer Payment Links for post-Diagnostic phases, and
 * redirected every purchase into the same Diagnostic confirmation. Running
 * it could therefore bypass engagement eligibility even when the application
 * itself was correct.
 *
 * Current checkouts are created per engagement by:
 *   - POST /api/commercial/checkout (public Diagnostic after real intake)
 *   - POST /api/admin/commercial/checkout (eligible adjacent phase)
 *
 * Stripe products/prices are commercial configuration and must be reconciled
 * deliberately against src/lib/offer-catalog.ts plus stripe_payment_links.
 * This tombstone is intentionally executable so an old runbook fails safely
 * instead of silently recreating the bypass.
 */

console.error(
  "RETIRED: persistent Payment Links are not a supported checkout path. " +
    "Use the engagement-owned commercial checkout APIs. No Stripe mutation was attempted."
);
process.exit(1);
