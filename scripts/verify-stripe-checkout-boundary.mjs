#!/usr/bin/env node

/**
 * Read-only release gate for the canonical checkout boundary.
 *
 * Per-engagement Checkout Sessions replace every persistent Stripe Payment
 * Link, including the two old Diagnostic links. This script performs no POST,
 * DELETE, or mutation of any kind; it fails while any active bearer link still
 * exists so deployment cannot be described as commercially closed before the
 * Stripe-side deactivation step is actually complete.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/verify-stripe-checkout-boundary.mjs
 */

import { listActiveSignalAndFrictionPaymentLinks } from "./_stripe-payment-link-scope.mjs";

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!stripeKey || !stripeKey.startsWith("sk_")) {
  console.error("STRIPE_SECRET_KEY is required for this read-only production verification.");
  process.exit(2);
}

async function stripe(path) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  if (!response.ok) {
    throw new Error(`Stripe ${path} returned HTTP ${response.status}`);
  }
  return response.json();
}

let activeIds;
try {
  activeIds = (await listActiveSignalAndFrictionPaymentLinks(stripe)).map((link) => link.id);
} catch (cause) {
  console.error(`Stripe Payment Link verification failed: ${cause instanceof Error ? cause.message : "unknown"}`);
  process.exit(2);
}

if (activeIds.length > 0) {
  console.error(
    `Commercial release gate failed: ${activeIds.length} persistent Stripe Payment Link(s) remain active: ${activeIds.join(", ")}`
  );
  console.error("Deactivate them in Stripe before enabling the canonical webhook/checkout rollout.");
  process.exit(1);
}

console.log("✓ Stripe has zero active Signal & Friction persistent Payment Links; checkout is engagement-owned.");
