#!/usr/bin/env node

/**
 * Final, fail-closed release gate for canonical commercial checkout.
 *
 * Dry-run is the default. Before the activation RPC can run, this script proves:
 *   1. the new production intake routes and API boundary are deployed;
 *   2. Stripe has zero active persistent Payment Links;
 *   3. Supabase exposes exactly ten active canonical bindings; and
 *   4. each immutable Stripe Price matches its DB amount/currency/recurrence.
 *
 * The migration itself keeps public entry disabled. Activate only after the
 * provider-side deactivation step has completed:
 *
 *   STRIPE_SECRET_KEY=sk_live_... \
 *   STRIPE_WEBHOOK_SECRET=whsec_... \
 *   SUPABASE_URL=https://...supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/activate-commercial-checkout.mjs --apply \
 *     --confirm=ACTIVATE_CANONICAL_COMMERCIAL_CHECKOUT
 */

import { createHmac, randomUUID } from "node:crypto";

import { listActiveSignalAndFrictionPaymentLinks } from "./_stripe-payment-link-scope.mjs";

const APPLY = process.argv.includes("--apply");
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="))?.slice(10) || "";
const REQUIRED_CONFIRMATION = "ACTIVATE_CANONICAL_COMMERCIAL_CHECKOUT";
const CATALOG_VERSION = "2026-08-14";
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .trim()
  .replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const siteUrl = (process.env.PUBLIC_SITE_URL || "https://signal-and-friction.com")
  .trim()
  .replace(/\/$/, "");

if (
  !stripeKey?.startsWith("sk_live_") ||
  !webhookSecret?.startsWith("whsec_") ||
  !supabaseUrl.startsWith("https://") ||
  !serviceRoleKey
) {
  console.error(
    "A live STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, HTTPS SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required. No mutation was attempted."
  );
  process.exit(2);
}
if (APPLY && confirmation !== REQUIRED_CONFIRMATION) {
  console.error(`--apply requires --confirm=${REQUIRED_CONFIRMATION}. No mutation was attempted.`);
  process.exit(2);
}

async function responseJson(response, system, path) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof body?.message === "string" ? `: ${body.message}` : "";
    throw new Error(`${system} ${path} returned HTTP ${response.status}${detail}`);
  }
  return body;
}

async function stripe(path) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  return responseJson(response, "Stripe", path);
}

async function supabase(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  return responseJson(response, "Supabase", path);
}

async function verifyApplicationBoundary() {
  const routes = [
    "/checkout/price_dwy_beta_diagnostic",
    "/checkout/price_dfy_beta_diagnostic",
  ];
  for (const route of routes) {
    const response = await fetch(`${siteUrl}${route}/`);
    const finalUrl = new URL(response.url);
    const body = await response.text();
    if (
      response.status !== 200 ||
      finalUrl.origin !== new URL(siteUrl).origin ||
      !body.includes("challenges.cloudflare.com/turnstile")
    ) {
      throw new Error(`Production intake route ${route} returned HTTP ${response.status}`);
    }
  }

  for (const endpoint of ["/api/commercial/checkout", "/api/stripe/webhook"]) {
    const response = await fetch(`${siteUrl}${endpoint}`, { headers: { Accept: "application/json" } });
    const result = await response.json().catch(() => null);
    if (response.status !== 200 || result?.ready !== true) {
      throw new Error(`Production readiness endpoint ${endpoint} is not ready`);
    }
  }

  const turnstileProbe = await fetch(`${siteUrl}/api/commercial/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: randomUUID(),
      offerPriceId: "price_dwy_beta_diagnostic",
      companyName: "Release gate probe",
      contactName: "Release gate",
      contactEmail: "release-probe@signal-and-friction.com",
      industry: "Software",
      targetUrl: "https://signal-and-friction.com/pricing/",
      scopeBrief: "Non-persisting probe: invalid Turnstile must fail before commercial intent creation.",
      referralCode: null,
      turnstileToken: "release-gate-intentionally-invalid-token",
    }),
  });
  if (turnstileProbe.status !== 403) {
    throw new Error(
      `Production Turnstile fail-closed probe returned HTTP ${turnstileProbe.status}; expected 403 before persistence`
    );
  }
}

async function verifyStripeWebhookEndpoint() {
  const requiredEvents = new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "invoice.paid",
    "invoice.payment_failed",
  ]);
  const expectedUrl = `${siteUrl}/api/stripe/webhook`;
  let startingAfter = null;
  const matches = [];
  do {
    const params = new URLSearchParams({ limit: "100" });
    if (startingAfter) params.set("starting_after", startingAfter);
    const page = await stripe(`/webhook_endpoints?${params}`);
    matches.push(
      ...(page.data || []).filter((endpoint) =>
        endpoint.status === "enabled" && endpoint.url?.replace(/\/$/, "") === expectedUrl
      )
    );
    startingAfter = page.has_more && page.data?.length ? page.data.at(-1).id : null;
  } while (startingAfter);

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one enabled Stripe webhook endpoint at ${expectedUrl}; found ${matches.length}`);
  }
  const enabled = new Set(matches[0].enabled_events || []);
  if (!enabled.has("*") && [...requiredEvents].some((event) => !enabled.has(event))) {
    throw new Error("Stripe webhook endpoint is missing one or more required commercial events");
  }
}

async function verifyDeployedWebhookSecret() {
  const timestamp = Math.floor(Date.now() / 1000);
  const eventType = "signal_and_friction.release_gate_probe";
  const eventId = `evt_sf_release_probe_${randomUUID().replaceAll("-", "")}`;
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    api_version: null,
    created: timestamp,
    data: { object: {} },
    livemode: true,
    pending_webhooks: 0,
    request: null,
    type: eventType,
  });
  const digest = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  const response = await fetch(`${siteUrl}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": `t=${timestamp},v1=${digest}`,
    },
    body: payload,
  });
  const result = await response.json().catch(() => null);
  if (
    response.status !== 200 ||
    result?.received !== true ||
    result?.eventId !== eventId ||
    result?.ignored !== eventType
  ) {
    throw new Error(
      `Deployed webhook signing-secret probe returned HTTP ${response.status}; activation cannot prove endpoint verification`
    );
  }
}

async function verifyNoPersistentPaymentLinks() {
  const active = (await listActiveSignalAndFrictionPaymentLinks(stripe)).map((link) => link.id);

  if (active.length > 0) {
    throw new Error(
      `${active.length} persistent Stripe Payment Link(s) remain active: ${active.join(", ")}`
    );
  }
}

async function verifyProviderBindings() {
  const query =
    "/stripe_payment_links?is_active=eq.true&select=price_id,stripe_price_id,amount,currency,billing_interval";
  const bindings = await supabase(query);
  if (!Array.isArray(bindings) || bindings.length !== 10) {
    throw new Error(`Expected exactly 10 active provider bindings; found ${bindings?.length ?? "invalid"}`);
  }

  const logicalIds = new Set();
  const providerIds = new Set();
  for (const binding of bindings) {
    if (logicalIds.has(binding.price_id) || providerIds.has(binding.stripe_price_id)) {
      throw new Error(`Duplicate provider binding detected for ${binding.price_id}`);
    }
    logicalIds.add(binding.price_id);
    providerIds.add(binding.stripe_price_id);

    const price = await stripe(`/prices/${encodeURIComponent(binding.stripe_price_id)}`);
    const interval = price.recurring?.interval ?? null;
    const intervalCount = price.recurring?.interval_count ?? null;
    const expectedInterval = binding.billing_interval === "monthly" ? "month" : null;
    const expectedIntervalCount = binding.billing_interval === "monthly" ? 1 : null;
    const expectedType = binding.billing_interval === "monthly" ? "recurring" : "one_time";
    if (
      price.active !== true ||
      price.id !== binding.stripe_price_id ||
      price.unit_amount !== binding.amount ||
      price.currency !== binding.currency ||
      price.type !== expectedType ||
      interval !== expectedInterval ||
      intervalCount !== expectedIntervalCount
    ) {
      throw new Error(`Stripe Price ${binding.stripe_price_id} disagrees with ${binding.price_id}`);
    }
  }
}

try {
  await verifyApplicationBoundary();
  await verifyStripeWebhookEndpoint();
  await verifyDeployedWebhookSecret();
  await verifyNoPersistentPaymentLinks();
  await verifyProviderBindings();
  console.log("✓ Production routes, provider bindings, and persistent-link boundary are ready.");

  if (!APPLY) {
    console.log(
      `DRY RUN — activation was not changed. Re-run with --apply --confirm=${REQUIRED_CONFIRMATION}.`
    );
    process.exit(0);
  }

  const result = await supabase("/rpc/activate_commercial_checkout", {
    method: "POST",
    body: JSON.stringify({
      p_payload: {
        sf_catalog_version: CATALOG_VERSION,
        confirmation_token: `activate-canonical-commercial-checkout:${CATALOG_VERSION}`,
      },
    }),
  });
  if (result?.ok !== true || result?.public_entry_count !== 2) {
    throw new Error("Activation RPC did not return the exact canonical public-entry state");
  }

  console.log(`✓ Canonical commercial checkout ${result.status}; exactly two Diagnostics are public.`);
} catch (cause) {
  console.error(`Commercial activation gate failed: ${cause instanceof Error ? cause.message : "unknown"}`);
  console.error("No public-entry activation was claimed. Resolve the failed gate before retrying.");
  process.exit(1);
}
