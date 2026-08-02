/**
 * list-stripe-prices.mjs
 *
 * Read-only. Lists every active Stripe price (product name, amount,
 * real price ID) side by side with the stripe_payment_links rows that
 * still have no stripe_price_id — so a name/amount mismatch from a
 * manual post-creation edit in Stripe is visible directly, instead of
 * guessed at. Makes zero writes to Stripe or Supabase.
 *
 * Usage: node scripts/list-stripe-prices.mjs
 * Requires the same .env.local vars as the backfill script:
 *   STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_KEY || !STRIPE_KEY.startsWith("sk_")) {
  console.error("❌ STRIPE_SECRET_KEY missing or not a secret key in .env.local.");
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY missing in .env.local.");
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
  console.log("📋 Real, live Stripe prices (read-only — nothing written anywhere)\n");

  const priceList = await stripeGet("/prices?limit=100&expand[]=data.product&active=true");
  const prices = priceList.data
    .map((p) => ({
      id: p.id,
      amount: p.unit_amount,
      productName: typeof p.product === "object" ? p.product.name : "(unexpanded)",
      productActive: typeof p.product === "object" ? p.product.active : null,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName));

  console.log(`${prices.length} active prices in Stripe:\n`);
  for (const p of prices) {
    console.log(
      `  $${(p.amount / 100).toFixed(2).padStart(9)}  ${p.id.padEnd(30)}  ${p.productName}`
    );
  }

  const { data: linkRows, error } = await supabase
    .from("stripe_payment_links")
    .select("price_id, product_name, amount, stripe_price_id")
    .order("price_id");
  if (error) {
    console.error("❌ Failed to read stripe_payment_links:", error.message);
    process.exit(1);
  }

  const unmatched = linkRows.filter((r) => !r.stripe_price_id);
  console.log(`\n\n🔴 stripe_payment_links rows still missing stripe_price_id (${unmatched.length}):\n`);
  for (const r of unmatched) {
    const expectedName = `Signal & Friction — ${r.product_name}`;
    console.log(`  ${r.price_id.padEnd(30)}  expects name: "${expectedName}"  expects amount: $${(r.amount / 100).toFixed(2)}`);
  }

  console.log("\nCompare each expected row above against the real list at the top — a name or amount that doesn't match exactly is why the backfill script skipped it.");
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
