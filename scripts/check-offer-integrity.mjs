#!/usr/bin/env node
/**
 * Commercial offer integrity guard.
 *
 * Product invariant:
 *   - active offer identity/price/billing/scope live in src/lib/offer-catalog.ts
 *   - public/runtime code may resolve checkout URLs from the canonical
 *     stripe_payment_links table, but may not hardcode Stripe Payment Links
 *   - archived Certified code may not carry independent Stripe price env vars
 *     or recreate checkout sessions
 *   - read-only retrieval of an existing Checkout Session is allowed only in
 *     the dedicated payment-verification endpoint and must remain GET-only
 *
 * This intentionally checks runtime source trees rather than documentation,
 * migrations, or one-off maintenance scripts.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_ROOTS = ["src/app", "src/components", "functions", "supabase/functions"];
const READ_ONLY_CHECKOUT_SESSION_READER = "functions/api/stripe/session-status.ts";

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
    kind: "payment_link",
    pattern: /https:\/\/buy\.stripe\.com\//,
    message: "hardcoded Stripe Payment Link found; runtime checkout must resolve through canonical offer data",
  },
  {
    kind: "certified_price",
    pattern: /STRIPE_PRICE_CERTIFIED_(ANNUAL|MONTHLY|RENEWAL)/,
    message: "archived Certified Stripe price environment variable found in runtime code",
  },
  {
    kind: "checkout_session",
    pattern: /api\.stripe\.com\/v1\/checkout\/sessions/,
    message: "direct Stripe checkout-session creation found outside the canonical active-offer path",
  },
];

for (const root of RUNTIME_ROOTS) {
  for (const file of walk(root)) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) continue;
    const content = readFileSync(path.join(ROOT, file), "utf8");
    for (const rule of forbidden) {
      if (!rule.pattern.test(content)) continue;

      if (rule.kind === "checkout_session" && file === READ_ONLY_CHECKOUT_SESSION_READER) {
        if (/method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(content)) {
          fail(file, "Checkout session verifier must remain read-only");
        }
        continue;
      }

      fail(file, rule.message);
    }
  }
}

const certifiedPage = readFileSync(path.join(ROOT, "src/app/certified/page.tsx"), "utf8");
if (!certifiedPage.includes("not accepting new enrollments")) {
  fail("src/app/certified/page.tsx", "public Certified route must render an explicit archived state");
}

if (failed) {
  console.error("\nCommercial offer integrity failed. Resolve the contradiction before shipping.");
  process.exit(1);
}

console.log("✓ Active offer commerce is governed by the canonical catalog.");
console.log("✓ No hardcoded Stripe Payment Links exist in runtime source.");
console.log("✓ Checkout session verification is read-only.");
console.log("✓ Certified is structurally non-transactable.");
