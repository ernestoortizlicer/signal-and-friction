#!/usr/bin/env node

/**
 * Incident rollback for the canonical commercial boundary.
 *
 * Dry-run is the default. Apply first hides public entry in the database,
 * then expires every still-open Checkout Session carrying the current S&F
 * engagement metadata, records exact cancellation against that engagement,
 * and finally proves no canonical Session remains payable.
 *
 *   STRIPE_SECRET_KEY=sk_live_... SUPABASE_URL=https://...supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/deactivate-commercial-checkout.mjs \
 *     --apply --confirm=DEACTIVATE_CANONICAL_COMMERCIAL_CHECKOUT
 */

const APPLY = process.argv.includes("--apply");
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="))?.slice(10) || "";
const REQUIRED_CONFIRMATION = "DEACTIVATE_CANONICAL_COMMERCIAL_CHECKOUT";
const CATALOG_VERSION = "2026-08-14";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OFFER_PRICE_ID = /^price_(?:dwy|dfy)_(?:beta_diagnostic|intervention|monitoring|expansion|autonomy)$/;
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .trim()
  .replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!stripeKey?.startsWith("sk_live_") || !supabaseUrl.startsWith("https://") || !serviceRoleKey) {
  console.error("Live Stripe and Supabase service credentials are required. No mutation was attempted.");
  process.exit(2);
}
if (APPLY && confirmation !== REQUIRED_CONFIRMATION) {
  console.error(`--apply requires --confirm=${REQUIRED_CONFIRMATION}. No mutation was attempted.`);
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

async function rpc(name, payload) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_payload: payload }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok !== true) {
    throw new Error(`Supabase ${name} returned HTTP ${response.status}`);
  }
  return body;
}

function canonicalMetadata(session) {
  const metadata = session.metadata || {};
  if (
    metadata.sf_catalog_version !== CATALOG_VERSION ||
    !UUID.test(metadata.sf_engagement_id || "") ||
    !OFFER_PRICE_ID.test(metadata.sf_offer_price_id || "") ||
    !["public_diagnostic", "operator_lifecycle"].includes(metadata.sf_authorization_kind)
  ) {
    return null;
  }
  return metadata;
}

async function openCanonicalSessions() {
  const rows = [];
  let startingAfter = null;
  do {
    const params = new URLSearchParams({ status: "open", limit: "100" });
    if (startingAfter) params.set("starting_after", startingAfter);
    const page = await stripe(`/checkout/sessions?${params}`);
    rows.push(...(page.data || []).filter(canonicalMetadata));
    startingAfter = page.has_more && page.data?.length ? page.data.at(-1).id : null;
  } while (startingAfter);
  return rows;
}

try {
  const preview = await openCanonicalSessions();
  console.log(
    `${APPLY ? "Rollback will close" : "DRY RUN — would close"} ${preview.length} canonical open Checkout Session(s).`
  );
  if (!APPLY) {
    console.log(`Re-run with --apply --confirm=${REQUIRED_CONFIRMATION} during an incident rollback.`);
    process.exit(preview.length > 0 ? 1 : 0);
  }

  await rpc("deactivate_commercial_checkout", {
    sf_catalog_version: CATALOG_VERSION,
    confirmation_token: `deactivate-canonical-commercial-checkout:${CATALOG_VERSION}`,
  });
  console.log("✓ Public commercial entry is disabled.");

  for (const session of await openCanonicalSessions()) {
    const metadata = canonicalMetadata(session);
    const expired = await stripe(`/checkout/sessions/${encodeURIComponent(session.id)}/expire`, {
      method: "POST",
      headers: { "Idempotency-Key": `sf-incident-expire/${session.id}/v1` },
    });
    if (expired.status !== "expired") {
      throw new Error(`Stripe Session ${session.id} did not become expired`);
    }
    await rpc("cancel_commercial_checkout_session", {
      sf_engagement_id: metadata.sf_engagement_id,
      sf_offer_price_id: metadata.sf_offer_price_id,
      sf_authorization_kind: metadata.sf_authorization_kind,
      sf_catalog_version: CATALOG_VERSION,
      checkout_session_id: session.id,
      reason: "operator_incident_rollback",
    });
    console.log(`✓ Expired and cancelled ${session.id}`);
  }

  const remaining = await openCanonicalSessions();
  if (remaining.length > 0) {
    throw new Error(`${remaining.length} canonical Checkout Session(s) remain open`);
  }
  console.log("✓ Rollback verified: no canonical Checkout Session remains payable.");
} catch (cause) {
  console.error(`Commercial rollback failed: ${cause instanceof Error ? cause.message : "unknown"}`);
  console.error("Public entry may already be disabled; reconcile the reported Session before reactivation.");
  process.exit(1);
}
