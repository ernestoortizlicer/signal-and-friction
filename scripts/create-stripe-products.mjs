/**
 * create-stripe-products.mjs
 *
 * Creates all 12 Signal & Friction products + payment links in Stripe.
 * Run AFTER setting STRIPE_SECRET_KEY=sk_live_... in .env.local
 *
 * Usage: node scripts/create-stripe-products.mjs
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUCCESS_BASE = "https://signal-and-friction.com/confirmed/success";

if (!STRIPE_KEY || STRIPE_KEY === "sk_test_placeholder") {
  console.error("❌ STRIPE_SECRET_KEY is not set or still placeholder.");
  console.error("   Set STRIPE_SECRET_KEY=sk_live_... in .env.local and retry.");
  process.exit(1);
}

if (!STRIPE_KEY.startsWith("sk_")) {
  console.error("❌ Key looks like a publishable key (pk_...), not a secret key (sk_...).");
  console.error("   Go to: https://dashboard.stripe.com/apikeys");
  console.error("   Copy the 'Secret key' row (starts with sk_live_).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function stripePost(path, body) {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(body)) {
    if (typeof val === "object") {
      for (const [k, v] of Object.entries(val)) {
        params.append(`${key}[${k}]`, v);
      }
    } else {
      params.append(key, String(val));
    }
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe error on ${path}: ${data.error?.message}`);
  return data;
}

const PRODUCTS = [
  { name: "DFY Beta Diagnostic",    priceId: "price_dfy_beta_diagnostic",    amount: 200000, segment: "high_ticket", recurring: false },
  { name: "DFY Intervention",       priceId: "price_dfy_intervention",        amount: 300000, segment: "high_ticket", recurring: false },
  { name: "DFY Monitoring",         priceId: "price_dfy_monitoring",          amount: 250000, segment: "high_ticket", recurring: true  },
  { name: "DFY Expansion",          priceId: "price_dfy_expansion",           amount: 200000, segment: "high_ticket", recurring: false },
  { name: "DFY Autonomy Kit",       priceId: "price_dfy_autonomy",            amount: 500000, segment: "high_ticket", recurring: false },
  { name: "DWY Beta Diagnostic",    priceId: "price_dwy_beta_diagnostic",     amount:  35000, segment: "microdosing", recurring: false },
  { name: "DWY Intervention",       priceId: "price_dwy_intervention",        amount:  75000, segment: "microdosing", recurring: false },
  { name: "DWY Monitoring",         priceId: "price_dwy_monitoring",          amount:  50000, segment: "microdosing", recurring: true  },
  { name: "DWY Expansion",          priceId: "price_dwy_expansion",           amount:  35000, segment: "microdosing", recurring: false },
  { name: "DWY Autonomy Kit",       priceId: "price_dwy_autonomy",            amount: 150000, segment: "microdosing", recurring: false },
  { name: "Certified Practitioner", priceId: "price_certified_practitioner",  amount: 250000, segment: "certified",   recurring: false },
  { name: "Certified Agency",       priceId: "price_certified_agency",        amount: 500000, segment: "certified",   recurring: false },
];

async function run() {
  console.log("🚀 Signal & Friction — Stripe Product Activation");
  console.log(`   Key: ${STRIPE_KEY.substring(0, 12)}...`);

  // Verify key
  const account = await fetch("https://api.stripe.com/v1/account", {
    headers: { "Authorization": `Bearer ${STRIPE_KEY}` },
  }).then(r => r.json());

  if (account.error) {
    console.error("❌ Key verification failed:", account.error.message);
    process.exit(1);
  }
  console.log(`✅ Key verified. Account: ${account.id} (${account.email})`);

  const results = [];

  for (const product of PRODUCTS) {
    process.stdout.write(`   Creating ${product.name}... `);

    try {
      // 1. Create product
      const stripeProduct = await stripePost("/products", {
        name: `Signal & Friction — ${product.name}`,
        description: `Signal & Friction ${product.name}. Async delivery. Results-based guarantee.`,
      });

      // 2. Create price
      const priceBody = {
        product: stripeProduct.id,
        unit_amount: product.amount,
        currency: "usd",
      };
      if (product.recurring) {
        priceBody["recurring[interval]"] = "month";
      }
      const stripePrice = await stripePost("/prices", priceBody);

      // 3. Create payment link
      const productSlug = product.name.toLowerCase().replace(/\s+/g, "+");
      const successUrl = `${SUCCESS_BASE}?product=${encodeURIComponent(product.name)}`;
      const linkBody = {
        "line_items[0][price]": stripePrice.id,
        "line_items[0][quantity]": "1",
        "after_completion[type]": "redirect",
        "after_completion[redirect][url]": successUrl,
      };
      const paymentLink = await stripePost("/payment_links", linkBody);

      // 4. Update Supabase
      const { error: dbErr } = await supabase
        .from("stripe_payment_links")
        .update({ payment_link_url: paymentLink.url })
        .eq("price_id", product.priceId);

      if (dbErr) {
        console.log(`⚠️  DB update failed: ${dbErr.message}`);
      }

      results.push({
        name: product.name,
        priceId: product.priceId,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.url,
        successUrl,
        status: "OK",
      });

      console.log(`✅  ${paymentLink.url}`);
    } catch (err) {
      console.log(`❌  ${err.message}`);
      results.push({ name: product.name, priceId: product.priceId, status: "ERROR", error: err.message });
    }
  }

  const ok = results.filter(r => r.status === "OK").length;
  const fail = results.filter(r => r.status === "ERROR").length;
  console.log(`\n✅ ${ok} products created | ❌ ${fail} errors`);

  if (ok > 0) {
    console.log("\n📋 Payment Links Summary:");
    results.filter(r => r.status === "OK").forEach(r => {
      console.log(`   ${r.name.padEnd(30)} ${r.paymentLinkUrl}`);
    });
  }

  if (fail > 0) {
    console.log("\n⚠️  Errors:");
    results.filter(r => r.status === "ERROR").forEach(r => {
      console.log(`   ${r.name}: ${r.error}`);
    });
  }

  return results;
}

run().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
