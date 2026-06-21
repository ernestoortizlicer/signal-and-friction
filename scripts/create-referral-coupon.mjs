#!/usr/bin/env node
/**
 * Creates the SFREF500 coupon in Stripe for the Signal & Friction referral program.
 * Run once: node scripts/create-referral-coupon.mjs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_KEY || !STRIPE_KEY.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY not found or invalid in .env.local');
  process.exit(1);
}

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  return res.json();
}

async function stripePost(path, body) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) params.set(k, v);
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe error on ${path}: ${data.error?.message}`);
  return data;
}

async function run() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SIGNAL & FRICTION — REFERRAL COUPON CREATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if coupon already exists
  const existing = await stripeGet('/coupons/SFREF500');
  if (existing.id === 'SFREF500') {
    console.log('✅ Coupon SFREF500 already exists in Stripe:');
    console.log(`   Name:        ${existing.name}`);
    console.log(`   Amount off:  $${existing.amount_off / 100}`);
    console.log(`   Currency:    ${existing.currency?.toUpperCase()}`);
    console.log(`   Duration:    ${existing.duration}`);
    console.log(`   Valid:       ${existing.valid}`);
    console.log('\n   No action taken. Coupon is ready.\n');
    printWorkflow();
    return;
  }

  const coupon = await stripePost('/coupons', {
    id: 'SFREF500',
    name: 'S&F Diagnostic Credit — $500',
    amount_off: '50000',
    currency: 'usd',
    duration: 'once',
    'metadata[program]': 'Signal & Friction Referral Program',
    'metadata[eligibility]': 'DFY phases ($2k+), Certified ($2.5k+), or DWY >= $750',
    'metadata[max_per_client]': '5 per calendar year',
    'metadata[expiry_policy]': '12 months from issuance',
  });

  console.log('✅ Coupon created successfully in Stripe:');
  console.log(`   ID:          ${coupon.id}`);
  console.log(`   Name:        ${coupon.name}`);
  console.log(`   Amount off:  $${coupon.amount_off / 100}`);
  console.log(`   Currency:    ${coupon.currency?.toUpperCase()}`);
  console.log(`   Duration:    ${coupon.duration}`);
  console.log(`   Valid:       ${coupon.valid}`);

  printWorkflow();
}

function printWorkflow() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DISTRIBUTION WORKFLOW');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  1. Client refers founder via unique /?ref=XXXXX link');
  console.log('  2. Referred client completes payment → recorded in Supabase');
  console.log('  3. Admin panel shows pending referral credit to approve');
  console.log('  4. Ernesto approves → emails SFREF500 coupon to referrer');
  console.log('  5. Referrer applies at checkout on any DFY/Certified/DWY≥$750 phase');
  console.log('\n  Dashboard: https://dashboard.stripe.com/coupons/SFREF500');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
