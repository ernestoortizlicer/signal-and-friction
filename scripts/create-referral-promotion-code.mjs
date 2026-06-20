#!/usr/bin/env node
/**
 * Creates the SFREF500 Promotion Code in Stripe.
 *
 * A Promotion Code wraps the existing SFREF500 Coupon and adds:
 *   - minimum_amount: $750 (protects margin on DWY small tickets)
 *
 * This is the customer-facing code Ernesto sends to referrers.
 * The underlying Coupon ($500 off, once) remains unchanged.
 *
 * Run once: node scripts/create-referral-promotion-code.mjs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY?.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY invalid in .env.local'); process.exit(1);
}

async function stripeGet(path) {
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  return r.json();
}

async function stripePost(path, body) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) params.set(k, String(v));
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Stripe ${path}: ${d.error?.message}`);
  return d;
}

async function run() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SIGNAL & FRICTION — SFREF500 PROMOTION CODE SETUP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Verify the underlying coupon exists
  const coupon = await stripeGet('/coupons/SFREF500');
  if (!coupon.id) {
    console.error('❌ Coupon SFREF500 not found. Run create-referral-coupon.mjs first.');
    process.exit(1);
  }
  console.log(`✅ Coupon SFREF500 found: $${coupon.amount_off / 100} off, ${coupon.duration}`);

  // 2. Check if promotion code already exists
  const existing = await stripeGet('/promotion_codes?code=SFREF500&limit=5');
  if (existing.data?.length > 0) {
    const pc = existing.data[0];
    const min = pc.restrictions?.minimum_amount;
    console.log(`\n✅ Promotion Code SFREF500 already exists:`);
    console.log(`   ID:             ${pc.id}`);
    console.log(`   Code:           ${pc.code}`);
    console.log(`   Minimum amount: $${min ? min / 100 : 0}`);
    console.log(`   Active:         ${pc.active}`);
    console.log(`\n   No action taken. Minimum is enforced.\n`);
    printSummary(pc.id, min);
    return;
  }

  // 3. Create promotion code
  const pc = await stripePost('/promotion_codes', {
    coupon:                            'SFREF500',
    code:                              'SFREF500',
    'restrictions[minimum_amount]':    '75000',        // $750.00
    'restrictions[minimum_amount_currency]': 'usd',
    'metadata[program]':               'Signal & Friction Referral',
    'metadata[eligible_segments]':     'DFY all tiers, Certified all tiers, DWY >= $750',
    'metadata[max_per_client_year]':   '5',
  });

  console.log(`\n✅ Promotion Code created successfully:`);
  console.log(`   ID:             ${pc.id}`);
  console.log(`   Code:           ${pc.code}`);
  console.log(`   Minimum:        $${pc.restrictions.minimum_amount / 100}`);
  console.log(`   Active:         ${pc.active}`);
  console.log(`   Coupon:         SFREF500 ($500 off, once, USD)`);

  printSummary(pc.id, pc.restrictions.minimum_amount);
}

function printSummary(id, minCents) {
  const min = minCents / 100;
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('MARGIN PROTECTION — AFTER FIX');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  Minimum order required: $${min}`);
  console.log('');
  const rows = [
    ['DWY Beta Diagnostic', 350],
    ['DWY Monitoring (1mo)', 500],
    ['DWY Expansion', 350],
    ['DWY Intervention', 750],
    ['DWY Autonomy Kit', 1500],
    ['DFY Beta Diagnostic', 2000],
    ['DFY Intervention', 3000],
    ['Certified Practitioner', 2500],
    ['Certified Agency', 5000],
  ];
  for (const [name, price] of rows) {
    const eligible = price >= min;
    const net = eligible ? price - 500 : price;
    const margin = eligible ? Math.round((net / price) * 100) : 100;
    const status = !eligible ? '🚫 Credit blocked (below minimum)' : net < 0 ? '❌ Loss' : margin < 40 ? `⚠️  ${margin}% net` : `✅  ${margin}% net — $${net}`;
    console.log(`  ${name.padEnd(26)} $${String(price).padStart(5)}  ${status}`);
  }
  console.log(`\n  Dashboard: https://dashboard.stripe.com/promotion_codes/${id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
