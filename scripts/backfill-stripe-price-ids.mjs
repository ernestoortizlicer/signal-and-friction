/**
 * backfill-stripe-price-ids.mjs
 *
 * Populates stripe_payment_links.stripe_price_id for products that ALREADY
 * exist in Stripe — this is the read-only counterpart to
 * create-stripe-products.mjs, which only knows how to create NEW products.
 * Re-running the create script against already-live products would create
 * duplicates (no "find existing, reuse it" logic in its POST calls); this
 * script never creates or modifies anything in Stripe — it only LISTS
 * existing prices and matches them to the internal price_id slugs already
 * in stripe_payment_links, by product name + amount (both must match).
 *
 * Usage: node scripts/backfill-stripe-price-ids.mjs
 * Requires the same .env.local vars as create-stripe-products.mjs:
 *   STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_KEY || STRIPE_KEY === "sk_test_placeholder") {
  console.error("❌ STRIPE_SECRET_KEY is not set or still placeholder in .env.local.");
  process.exit(1);
}
if (!STRIPE_KEY.startsWith("sk_")) {
  console.error("❌ Key looks like a publishable key (pk_...), not a secret key (sk_...).");
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local — needed to write stripe_price_id.");
  console.error("   Get it from: Supabase dashboard → Project Settings → API → service_role key.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe error on ${path}: ${data.error?.message}`);
  return data;
}

async function run() {
  console.log("🔎 Signal & Friction — Stripe price ID backfill (read-only against Stripe)");

  // Verify key
  const account = await stripeGet("/account");
  if (account.error) {
    console.error("❌ Key verification failed:", account.error.message);
    process.exit(1);
  }
  console.log(`✅ Key verified. Account: ${account.id} (${account.email})`);

  // 1. Pull every row this project expects to have a real Stripe price —
  // the DB is the source of truth for what SHOULD exist, not a hardcoded
  // list in this script, so this stays correct even if the ladder changes.
  const { data: linkRows, error: linkErr } = await supabase
    .from("stripe_payment_links")
    .select("id, product_name, price_id, amount, stripe_price_id");
  if (linkErr) {
    console.error("❌ Failed to read stripe_payment_links:", linkErr.message);
    process.exit(1);
  }

  const alreadySet = linkRows.filter((r) => r.stripe_price_id);
  const needsBackfill = linkRows.filter((r) => !r.stripe_price_id);
  console.log(`   ${linkRows.length} rows total — ${alreadySet.length} already have a real price ID, ${needsBackfill.length} need one.`);
  if (needsBackfill.length === 0) {
    console.log("✅ Nothing to do — every row already has stripe_price_id set.");
    return;
  }

  // 2. List every live price in Stripe, with its product name expanded
  // inline (one call, not N+1) — GET only, never creates or modifies
  // anything in Stripe.
  console.log("   Fetching live Stripe prices...");
  const priceList = await stripeGet("/prices?limit=100&expand[]=data.product&active=true");
  const stripePrices = priceList.data.map((p) => ({
    id: p.id,
    unit_amount: p.unit_amount,
    productName: typeof p.product === "object" ? p.product.name : null,
  }));
  console.log(`   Found ${stripePrices.length} active prices in Stripe.`);

  // 3. Match by product name (with the "Signal & Friction — " prefix the
  // creation script always adds) AND amount — both must agree before this
  // ever writes anything, so a name collision alone can't misroute a
  // price to the wrong internal slug.
  const results = [];
  for (const row of needsBackfill) {
    const expectedName = `Signal & Friction — ${row.product_name}`;
    const match = stripePrices.find(
      (sp) => sp.productName === expectedName && sp.unit_amount === row.amount
    );
    if (!match) {
      results.push({ price_id: row.price_id, status: "NO MATCH", detail: `looked for "${expectedName}" at ${row.amount} cents` });
      continue;
    }

    const { error: updateErr } = await supabase
      .from("stripe_payment_links")
      .update({ stripe_price_id: match.id })
      .eq("id", row.id);

    if (updateErr) {
      results.push({ price_id: row.price_id, status: "DB UPDATE FAILED", detail: updateErr.message });
    } else {
      results.push({ price_id: row.price_id, status: "OK", detail: match.id });
    }
  }

  const ok = results.filter((r) => r.status === "OK").length;
  console.log(`\n✅ ${ok}/${needsBackfill.length} backfilled.\n`);
  for (const r of results) {
    console.log(`   ${r.status.padEnd(16)} ${r.price_id.padEnd(30)} ${r.detail}`);
  }

  if (ok < needsBackfill.length) {
    console.log("\n⚠️  Some rows had no match — check the product name/amount in Stripe matches stripe_payment_links exactly (a manual price edit after creation, e.g. a discount, would break the amount match).");
  }
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
