#!/usr/bin/env node
/**
 * Add Stripe's {CHECKOUT_SESSION_ID} placeholder to existing Signal & Friction
 * Payment Link success redirects.
 *
 * Safe by default: without --apply this is read-only and prints the proposed
 * changes. It discovers eligible links from Stripe instead of hardcoding IDs.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/update-payment-link-session-redirects.mjs
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/update-payment-link-session-redirects.mjs --apply
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY?.trim();
const APPLY = process.argv.includes("--apply");
const SUCCESS_PREFIX = "https://signal-and-friction.com/confirmed/success";
const PLACEHOLDER = "{CHECKOUT_SESSION_ID}";

if (!STRIPE_KEY || !STRIPE_KEY.startsWith("sk_")) {
  console.error("Set STRIPE_SECRET_KEY to a valid Stripe secret key.");
  process.exit(1);
}

async function stripe(path, init = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      ...(init.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Stripe ${response.status}`);
  return data;
}

function withSessionPlaceholder(rawUrl) {
  const url = new URL(rawUrl);
  if (url.searchParams.get("session_id") === PLACEHOLDER) return rawUrl;
  url.searchParams.set("session_id", PLACEHOLDER);
  // URLSearchParams percent-encodes braces. Stripe requires the literal
  // placeholder in the configured redirect URL so restore it explicitly.
  return url.toString().replace("%7BCHECKOUT_SESSION_ID%7D", PLACEHOLDER);
}

async function listAllPaymentLinks() {
  const links = [];
  let startingAfter = null;
  do {
    const query = new URLSearchParams({ limit: "100", active: "true" });
    if (startingAfter) query.set("starting_after", startingAfter);
    const page = await stripe(`/payment_links?${query.toString()}`);
    links.push(...page.data);
    startingAfter = page.has_more ? page.data.at(-1)?.id ?? null : null;
  } while (startingAfter);
  return links;
}

async function updateRedirect(paymentLinkId, redirectUrl) {
  const body = new URLSearchParams();
  body.set("after_completion[type]", "redirect");
  body.set("after_completion[redirect][url]", redirectUrl);
  return stripe(`/payment_links/${encodeURIComponent(paymentLinkId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

const links = await listAllPaymentLinks();
const eligible = links.filter((link) => {
  const redirect = link.after_completion?.type === "redirect"
    ? link.after_completion?.redirect?.url
    : null;
  return typeof redirect === "string" && redirect.startsWith(SUCCESS_PREFIX);
});

if (eligible.length === 0) {
  console.log("No active Signal & Friction success redirects need inspection.");
  process.exit(0);
}

console.log(`${APPLY ? "APPLY" : "DRY RUN"}: ${eligible.length} eligible Payment Link(s)`);

for (const link of eligible) {
  const current = link.after_completion.redirect.url;
  const next = withSessionPlaceholder(current);
  const changed = next !== current;
  console.log(`\n${link.id}`);
  console.log(`  current: ${current}`);
  console.log(`  next:    ${next}`);

  if (!changed) {
    console.log("  status:  already migrated");
    continue;
  }
  if (!APPLY) {
    console.log("  status:  would update");
    continue;
  }

  const updated = await updateRedirect(link.id, next);
  const actual = updated.after_completion?.redirect?.url;
  if (actual !== next) {
    throw new Error(`Post-update verification failed for ${link.id}`);
  }
  console.log("  status:  updated and verified");
}

if (!APPLY) {
  console.log("\nNo Stripe data was changed. Re-run with --apply after reviewing the dry run.");
}
