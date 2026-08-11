#!/usr/bin/env node

/**
 * Safe rollout tool for the commercial checkout cutover.
 *
 * Dry-run is the default. `--apply` is accepted only with the exact confirmation
 * phrase below. The script scopes itself to active Payment Links whose Stripe
 * Product name starts with "Signal & Friction"; it never deactivates an
 * unrelated account link and never creates a product, price, link, or charge.
 * Re-running is idempotent because already-inactive links are absent from the
 * active-only inventory.
 *
 * Apply only in the coordinated release step after the new schema/endpoints are
 * deployed and before the canonical webhook is enabled:
 *
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/deactivate-legacy-payment-links.mjs \
 *     --apply --confirm=DEACTIVATE_SIGNAL_AND_FRICTION_PAYMENT_LINKS
 */

import { listActiveSignalAndFrictionPaymentLinks } from "./_stripe-payment-link-scope.mjs";

const APPLY = process.argv.includes("--apply");
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="))?.slice(10) || "";
const REQUIRED_CONFIRMATION = "DEACTIVATE_SIGNAL_AND_FRICTION_PAYMENT_LINKS";
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!stripeKey || !stripeKey.startsWith("sk_")) {
  console.error("STRIPE_SECRET_KEY is required. No Stripe mutation was attempted.");
  process.exit(2);
}
if (APPLY && confirmation !== REQUIRED_CONFIRMATION) {
  console.error(`--apply requires --confirm=${REQUIRED_CONFIRMATION}. No Stripe mutation was attempted.`);
  process.exit(2);
}

async function stripe(path, init = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Stripe ${path} returned HTTP ${response.status}`);
  return body;
}

const candidates = (await listActiveSignalAndFrictionPaymentLinks(stripe)).map((link) => link.id);

if (candidates.length === 0) {
  console.log("✓ No active Signal & Friction persistent Payment Links found.");
  process.exit(0);
}

console.log(`${APPLY ? "Deactivating" : "DRY RUN — would deactivate"} ${candidates.length} link(s): ${candidates.join(", ")}`);
if (!APPLY) {
  console.log(`Re-run with --apply --confirm=${REQUIRED_CONFIRMATION} during the coordinated release gate.`);
  process.exit(1);
}

for (const id of candidates) {
  await stripe(`/payment_links/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `sf-deactivate-persistent-link/${id}/v1`,
    },
    body: new URLSearchParams({ active: "false" }).toString(),
  });
  console.log(`✓ Deactivated ${id}`);
}

const remaining = (await listActiveSignalAndFrictionPaymentLinks(stripe)).map((link) => link.id);
if (remaining.length > 0) {
  console.error(`Release gate failed: ${remaining.length} scoped link(s) remain active: ${remaining.join(", ")}`);
  process.exit(1);
}

console.log("✓ All Signal & Friction persistent Payment Links are inactive.");
