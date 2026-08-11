#!/usr/bin/env node
/**
 * Commercial offer integrity guard.
 *
 * Product invariant:
 *   - active offer identity/price/billing/scope live in src/lib/offer-catalog.ts
 *   - only a Diagnostic may expose a public internal checkout route
 *   - later phases must enter through an engagement-owned server checkout
 *   - archived Certified code may not carry independent Stripe price env vars
 *     or recreate checkout sessions
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCommercialOfferRule } from "../functions/api/stripe/_commercial-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_ROOTS = ["src/app", "src/components", "functions", "supabase/functions"];
const OPERATIONAL_MUTATORS = [
  "scripts/create-stripe-products.mjs",
  "scripts/mcp-supabase-server.mjs",
  "supabase/functions/stripe-invoice/index.ts",
  "supabase/functions/stripe-refund/index.ts",
];

let failed = false;

function walk(relPath) {
  const abs = path.join(ROOT, relPath);
  const stat = statSync(abs);
  if (stat.isFile()) return [relPath];

  return readdirSync(abs).flatMap((entry) => walk(path.join(relPath, entry)));
}

function fail(file, message) {
  console.error(`✗ OFFER INTEGRITY: ${file}: ${message}`);
  failed = true;
}

const catalogPath = "src/lib/offer-catalog.ts";
const catalog = readFileSync(path.join(ROOT, catalogPath), "utf8");
const certifiedStart = catalog.indexOf("export const CERTIFIED_TIER");
const certifiedEnd = catalog.indexOf("export const PENDING_PRICE_CHANGES");

if (certifiedStart === -1 || certifiedEnd === -1 || certifiedEnd <= certifiedStart) {
  fail(catalogPath, "could not isolate the canonical Certified archive record");
} else {
  const certifiedBlock = catalog.slice(certifiedStart, certifiedEnd);

  if (!/archived:\s*true/.test(certifiedBlock)) {
    fail(catalogPath, "Certified must remain explicitly archived until a new product decision reactivates it.");
  }

  if (/priceId\s*:/.test(certifiedBlock)) {
    fail(catalogPath, "Archived Certified records must not carry active checkout price IDs.");
  }
}

const forbidden = [
  {
    pattern: /https:\/\/buy\.stripe\.com\//,
    message: "hardcoded Stripe Payment Link found; runtime checkout must resolve through canonical offer data",
  },
  {
    pattern: /STRIPE_PRICE_CERTIFIED_(ANNUAL|MONTHLY|RENEWAL)/,
    message: "archived Certified Stripe price environment variable found in runtime code",
  },
  {
    pattern: /api\.stripe\.com\/v1\/checkout\/sessions/,
    message: "direct Stripe checkout-session creation found outside the canonical active-offer path",
  },
  {
    pattern: /api\.stripe\.com\/v1\/payment_links/,
    message: "persistent Stripe Payment Link creation bypasses engagement admission",
  },
];

for (const root of RUNTIME_ROOTS) {
  for (const file of walk(root)) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) continue;
    const content = readFileSync(path.join(ROOT, file), "utf8");
    for (const rule of forbidden) {
      if (rule.pattern.test(content)) fail(file, rule.message);
    }
  }
}

for (const file of OPERATIONAL_MUTATORS) {
  const content = readFileSync(path.join(ROOT, file), "utf8");
  if (/api\.stripe\.com\/v1\/payment_links/.test(content)) {
    fail(file, "operational path can still create a bearer Payment Link");
  }
}

const retiredCreator = readFileSync(path.join(ROOT, "scripts/create-stripe-products.mjs"), "utf8");
if (!retiredCreator.includes("RETIRED") || /const\s+PRODUCTS\s*=/.test(retiredCreator)) {
  fail("scripts/create-stripe-products.mjs", "legacy second catalog must remain a fail-closed tombstone");
}

const deactivationGate = readFileSync(
  path.join(ROOT, "scripts/deactivate-legacy-payment-links.mjs"),
  "utf8"
);
if (
  !deactivationGate.includes("DRY RUN") ||
  !deactivationGate.includes("DEACTIVATE_SIGNAL_AND_FRICTION_PAYMENT_LINKS") ||
  !deactivationGate.includes('active: "false"')
) {
  fail(
    "scripts/deactivate-legacy-payment-links.mjs",
    "provider cutover must remain scoped, explicit-confirmation, idempotent, and dry-run by default"
  );
}

const activationGate = readFileSync(
  path.join(ROOT, "scripts/activate-commercial-checkout.mjs"),
  "utf8"
);
if (
  !activationGate.includes("DRY RUN") ||
  !activationGate.includes("ACTIVATE_CANONICAL_COMMERCIAL_CHECKOUT") ||
  !activationGate.includes("verifyNoPersistentPaymentLinks") ||
  !activationGate.includes("verifyProviderBindings") ||
  !activationGate.includes("verifyDeployedWebhookSecret") ||
  !activationGate.includes("STRIPE_WEBHOOK_SECRET") ||
  !activationGate.includes("p_payload") ||
  !activationGate.includes("activate_commercial_checkout")
) {
  fail(
    "scripts/activate-commercial-checkout.mjs",
    "public entry activation must remain a dry-run-first provider, deployment, and catalog gate"
  );
}

const adjacentCheckoutApi = readFileSync(
  path.join(ROOT, "functions/api/admin/commercial/checkout.ts"),
  "utf8"
);
if (
  !adjacentCheckoutApi.includes(
    '...(binding.tier === "expansion" ? { target_url: input.targetUrl } : {})'
  )
) {
  fail(
    "functions/api/admin/commercial/checkout.ts",
    "only Expansion may include target_url in the adjacent-intent RPC payload"
  );
}

const publicCheckoutBoundary = readFileSync(
  path.join(ROOT, "functions/api/commercial/_checkout.ts"),
  "utf8"
);
const publicCheckoutForm = readFileSync(
  path.join(ROOT, "src/app/checkout/[offer]/CheckoutIntakeForm.tsx"),
  "utf8"
);
if (
  publicCheckoutBoundary.includes('form.set("idempotency_key"') ||
  publicCheckoutBoundary.includes("turnstileValidationId") ||
  publicCheckoutForm.includes("turnstileValidationId")
) {
  fail(
    "functions/api/commercial/_checkout.ts",
    "Turnstile replay protection must never trust a client-controlled Siteverify idempotency key"
  );
}

const rollbackGate = readFileSync(
  path.join(ROOT, "scripts/deactivate-commercial-checkout.mjs"),
  "utf8"
);
if (
  !rollbackGate.includes("DRY RUN") ||
  !rollbackGate.includes("DEACTIVATE_CANONICAL_COMMERCIAL_CHECKOUT") ||
  !rollbackGate.includes("deactivate_commercial_checkout") ||
  !rollbackGate.includes("cancel_commercial_checkout_session") ||
  !rollbackGate.includes("/expire")
) {
  fail(
    "scripts/deactivate-commercial-checkout.mjs",
    "incident rollback must disable entry and expire every engagement-bound open Session"
  );
}

for (const file of [
  "supabase/functions/stripe-invoice/index.ts",
  "supabase/functions/stripe-refund/index.ts",
]) {
  const content = readFileSync(path.join(ROOT, file), "utf8");
  if (!content.includes("RETIRED LEGACY MUTATION BOUNDARY")) {
    fail(file, "legacy money mutation must stay explicitly retired until it consumes an exact commercial transaction");
  }
}

// Catalog ↔ provider binding ↔ webhook mirror drift. The catalog remains the
// product authority; the migration is the provider binding and the pure
// webhook rules are a fail-fast mirror. CI refuses any independent edit that
// makes those three disagree.
const catalogOffers = [...catalog.matchAll(
  /priceId:\s*'([^']+)'\s*,\s*order:\s*(\d)[\s\S]*?segment:\s*'([^']+)'[\s\S]*?priceUsd:\s*(\d+)\s*,\s*billing:\s*'([^']+)'/g
)].map((match) => ({
  priceId: match[1],
  order: Number(match[2]),
  line: match[3],
  amountCents: Number(match[4]) * 100,
  billing: match[5],
}));

if (catalogOffers.length !== 10) {
  fail(catalogPath, `expected 10 canonical active offers, parsed ${catalogOffers.length}`);
}

const commercialMigrationPath = "supabase/migrations/20260814000000_canonical_commercial_engagements.sql";
const commercialMigration = readFileSync(path.join(ROOT, commercialMigrationPath), "utf8");
if (!/status IN \('pending', 'failed'\) AND attempt_count < max_attempts/.test(commercialMigration)) {
  fail(
    commercialMigrationPath,
    "outbox claims must keep non-exhausted pending/failed rows retryable during backoff"
  );
}
const migrationBindings = new Map();
for (const match of commercialMigration.matchAll(
  /\('([^']+)',\s*'(dwy|dfy)',\s*'([^']+)',\s*(\d+),\s*'(one_time|monthly)'\)/g
)) {
  const value = { line: match[2], tier: match[3], amountCents: Number(match[4]), billing: match[5] };
  const previous = migrationBindings.get(match[1]);
  if (previous && JSON.stringify(previous) !== JSON.stringify(value)) {
    fail(commercialMigrationPath, `conflicting provider bindings for ${match[1]}`);
  }
  migrationBindings.set(match[1], value);
}

const phaseByOrder = {
  1: "diagnostic",
  2: "intervention",
  3: "monitoring",
  4: "expansion",
  5: "autonomy_kit",
};

for (const offer of catalogOffers) {
  const binding = migrationBindings.get(offer.priceId);
  if (!binding) {
    fail(commercialMigrationPath, `missing provider binding for ${offer.priceId}`);
    continue;
  }
  if (
    binding.line !== offer.line ||
    binding.amountCents !== offer.amountCents ||
    binding.billing !== offer.billing
  ) {
    fail(commercialMigrationPath, `${offer.priceId} provider binding disagrees with the canonical catalog`);
  }

  const webhookRule = getCommercialOfferRule(offer.priceId);
  if (
    !webhookRule ||
    webhookRule.line !== offer.line ||
    webhookRule.order !== offer.order ||
    webhookRule.phase !== phaseByOrder[offer.order] ||
    webhookRule.billing !== offer.billing
  ) {
    fail("functions/api/stripe/_commercial-rules.mjs", `${offer.priceId} webhook rule disagrees with the canonical catalog`);
  }
}

const publicEntries = catalogOffers.filter((offer) => offer.order === 1).map((offer) => offer.priceId).sort();
if (publicEntries.join(",") !== "price_dfy_beta_diagnostic,price_dwy_beta_diagnostic") {
  fail(catalogPath, "exactly the two Diagnostics must be the public entry offers");
}
for (const priceId of publicEntries) {
  if (!commercialMigration.includes(`'/checkout/${priceId}'`)) {
    fail(commercialMigrationPath, `${priceId} does not map to its internal intake route`);
  }
}

const pricingPage = readFileSync(path.join(ROOT, "src/app/pricing/page.tsx"), "utf8");
if (!pricingPage.includes("is_public_entry=eq.true") || !pricingPage.includes("Authorized after the prior phase")) {
  fail("src/app/pricing/page.tsx", "public pricing must fetch only public entries and render later phases as authorization-gated");
}

const certifiedPage = readFileSync(path.join(ROOT, "src/app/certified/page.tsx"), "utf8");
if (!certifiedPage.includes("not accepting new enrollments")) {
  fail("src/app/certified/page.tsx", "public Certified route must render an explicit archived state");
}

if (failed) {
  console.error("\nCommercial offer integrity failed. Resolve the contradiction before shipping.");
  process.exit(1);
}

const commercialRulesTest = spawnSync(
  process.execPath,
  ["--test", path.join(ROOT, "functions/api/stripe/_commercial-rules.test.mjs")],
  { encoding: "utf8" }
);
if (commercialRulesTest.status !== 0) {
  process.stderr.write(commercialRulesTest.stdout || "");
  process.stderr.write(commercialRulesTest.stderr || "");
  console.error("\nCommercial webhook contract tests failed.");
  process.exit(commercialRulesTest.status || 1);
}

const publicUrlSafetyTest = spawnSync(
  process.execPath,
  ["--test", path.join(ROOT, "functions/api/_public-url-safety.test.mjs")],
  { encoding: "utf8" }
);
if (publicUrlSafetyTest.status !== 0) {
  process.stderr.write(publicUrlSafetyTest.stdout || "");
  process.stderr.write(publicUrlSafetyTest.stderr || "");
  console.error("\nPublic target URL safety tests failed.");
  process.exit(publicUrlSafetyTest.status || 1);
}

console.log("✓ Active offer commerce is governed by the canonical catalog.");
console.log("✓ Only Diagnostics expose public internal checkout routes.");
console.log("✓ Later phases require engagement-owned server checkout.");
console.log("✓ Webhook offer rules and provider bindings match the catalog.");
console.log("✓ Certified is structurally non-transactable.");
