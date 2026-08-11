import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMERCIAL_CATALOG_VERSION,
  buildCommercialEmail,
  classifyCheckoutIntake,
  classifyInvoiceIntake,
  classifyOutboxAcknowledgement,
  classifyRecordAcknowledgement,
  isHandledCommercialEvent,
  validateCommercialLine,
  validateCommercialMetadata,
  validateProcessingConfig,
  validateWebhookPreflight,
  validateCommercialIntentSnapshot,
  validateCommercialStripePrice,
  classifyCommercialCheckoutSession,
  canPersistCommercialSessionCancellation,
  classifyCommercialIntentRpcError,
} from "./_commercial-rules.mjs";

const ENGAGEMENT_ID = "7f3d9617-7068-4f70-975c-38298696e1bb";

function metadata(offerPriceId, authorizationKind) {
  return {
    sf_engagement_id: ENGAGEMENT_ID,
    sf_offer_price_id: offerPriceId,
    sf_authorization_kind: authorizationKind,
    sf_catalog_version: COMMERCIAL_CATALOG_VERSION,
  };
}

function validLine(overrides = {}) {
  return {
    metadataOfferPriceId: "price_dwy_intervention",
    expectedOffer: {
      offerPriceId: "price_dwy_intervention",
      stripePriceId: "price_live_intervention",
      amountCents: 75000,
      currency: "usd",
    },
    lineItems: [{
      stripePriceId: "price_live_intervention",
      quantity: 1,
      unitAmountCents: 75000,
      amountTotal: 75000,
      currency: "usd",
      priceCurrency: "usd",
    }],
    hasMore: false,
    amountTotal: 75000,
    currency: "usd",
    ...overrides,
  };
}

test("request preflight uses 400 for missing caller signature and 500 for missing verification config", () => {
  const noSignature = validateWebhookPreflight({ signature: "", webhookSecret: "whsec_live" });
  assert.equal(noSignature.ok, false);
  assert.equal(noSignature.details.httpStatus, 400);

  const noSecret = validateWebhookPreflight({ signature: "signed", webhookSecret: "" });
  assert.equal(noSecret.ok, false);
  assert.equal(noSecret.details.httpStatus, 500);

  assert.equal(validateWebhookPreflight({ signature: "signed", webhookSecret: "whsec_live" }).ok, true);
});

test("missing Stripe/Supabase processing configuration is a retriable 500", () => {
  const result = validateProcessingConfig({ stripeSecretKey: "", supabaseUrl: "", serviceRoleKey: "" });
  assert.equal(result.ok, false);
  assert.equal(result.details.httpStatus, 500);
  assert.deepEqual(result.details.missing, ["STRIPE_SECRET_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
});

test("only the six explicit commercial event types are handled", () => {
  for (const eventType of [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "invoice.paid",
    "invoice.payment_failed",
  ]) assert.equal(isHandledCommercialEvent(eventType), true);
  assert.equal(isHandledCommercialEvent("customer.created"), false);
});

test("Checkout completion is pending until paid; async success must also prove paid", () => {
  assert.equal(classifyCheckoutIntake("checkout.session.completed", "unpaid").transition, "pending");
  assert.equal(classifyCheckoutIntake("checkout.session.completed", "paid").transition, "paid");
  assert.equal(classifyCheckoutIntake("checkout.session.async_payment_succeeded", "paid").transition, "paid");
  assert.equal(classifyCheckoutIntake("checkout.session.async_payment_failed", "unpaid").transition, "failed");
  const expired = classifyCheckoutIntake("checkout.session.expired", "unpaid");
  assert.equal(expired.transition, "failed");
  assert.equal(expired.reason, "checkout_expired");
  assert.equal(expired.notifyCustomer, false);
  assert.equal(classifyCheckoutIntake("checkout.session.completed", "no_payment_required").ok, false);
  assert.equal(classifyCheckoutIntake("checkout.session.async_payment_succeeded", "unpaid").ok, false);
});

test("invoice.paid requires Stripe's paid state, a positive amount, and a supported billing reason", () => {
  assert.equal(classifyInvoiceIntake("invoice.paid", "paid", 50000, "subscription_cycle").transition, "paid");
  assert.equal(classifyInvoiceIntake("invoice.paid", "open", 50000, "subscription_cycle").ok, false);
  assert.equal(classifyInvoiceIntake("invoice.paid", "paid", 0, "subscription_cycle").ok, false);
  assert.equal(classifyInvoiceIntake("invoice.payment_failed", "open", 0, "subscription_cycle").transition, "failed");
  assert.equal(classifyInvoiceIntake("invoice.paid", "paid", 50000, "manual").code, "unsupported_invoice_billing_reason");
});

test("the initial Monitoring invoice confirms Checkout and is never classified as a renewal", () => {
  const initialPaid = classifyInvoiceIntake("invoice.paid", "paid", 50000, "subscription_create");
  assert.equal(initialPaid.ok, true);
  assert.equal(initialPaid.transition, "initial_checkout_confirmation");
  assert.notEqual(initialPaid.transition, "paid");

  const initialFailed = classifyInvoiceIntake("invoice.payment_failed", "open", 0, "subscription_create");
  assert.equal(initialFailed.transition, "initial_checkout_failed");
});

test("initial invoice ordering and outbox backoff remain retriable HTTP failures", () => {
  assert.equal(classifyRecordAcknowledgement("pending_initial_checkout").retry, true);
  assert.equal(classifyRecordAcknowledgement("duplicate").retry, false);
  assert.equal(classifyRecordAcknowledgement("unknown").ok, false);

  assert.equal(classifyOutboxAcknowledgement("busy").retry, true);
  assert.equal(classifyOutboxAcknowledgement("retry_scheduled").retry, true);
  assert.equal(classifyOutboxAcknowledgement("already_sent").retry, false);
  assert.equal(classifyOutboxAcknowledgement("dead_letter").retry, false);
  assert.equal(classifyOutboxAcknowledgement("unknown").ok, false);
});

test("current sf_* metadata is mandatory; legacy/commercial aliases are not accepted", () => {
  assert.equal(validateCommercialMetadata(metadata("price_dwy_beta_diagnostic", "public_diagnostic")).ok, true);
  assert.equal(validateCommercialMetadata({}).code, "missing_commercial_metadata");
  assert.equal(validateCommercialMetadata({
    commercial_engagement_id: ENGAGEMENT_ID,
    commercial_offer_price_id: "price_dwy_beta_diagnostic",
    commercial_authorization_kind: "public_diagnostic",
    commercial_catalog_version: COMMERCIAL_CATALOG_VERSION,
  }).code, "missing_commercial_metadata");
});

test("public authorization is Diagnostic-only and later phases require operator lifecycle authorization", () => {
  assert.equal(validateCommercialMetadata(metadata("price_dfy_beta_diagnostic", "public_diagnostic")).ok, true);
  assert.equal(validateCommercialMetadata(metadata("price_dfy_intervention", "operator_lifecycle")).ok, true);
  assert.equal(validateCommercialMetadata(metadata("price_dfy_intervention", "public_diagnostic")).code, "public_offer_not_diagnostic");
  assert.equal(validateCommercialMetadata(metadata("price_dfy_beta_diagnostic", "operator_lifecycle")).code, "lifecycle_offer_is_entry");
  assert.equal(validateCommercialMetadata(metadata("price_dfy_intervention", "operator_adjacent")).code, "unknown_authorization_kind");
});

test("metadata rejects malformed engagement IDs, unknown offers, and stale catalog versions", () => {
  assert.equal(validateCommercialMetadata({ ...metadata("price_dwy_beta_diagnostic", "public_diagnostic"), sf_engagement_id: "not-a-uuid" }).code, "invalid_engagement_id");
  assert.equal(validateCommercialMetadata(metadata("price_archived", "public_diagnostic")).code, "unknown_offer");
  assert.equal(validateCommercialMetadata({ ...metadata("price_dwy_beta_diagnostic", "public_diagnostic"), sf_catalog_version: "old" }).code, "catalog_version_mismatch");
  assert.equal(
    validateCommercialMetadata(metadata("price_dwy_beta_diagnostic", "public_diagnostic"), {
      requireClientReference: true,
    }).code,
    "missing_engagement_reference",
  );
  assert.equal(
    validateCommercialMetadata(metadata("price_dwy_beta_diagnostic", "public_diagnostic"), {
      clientReferenceId: "fb46a53b-7a44-479d-8953-81d432ed1030",
    }).code,
    "engagement_reference_mismatch",
  );
});

test("line validation requires exact offer, Stripe price, amount, currency, and quantity", () => {
  assert.equal(validateCommercialLine(validLine()).ok, true);
  assert.equal(validateCommercialLine(validLine({ metadataOfferPriceId: "price_dwy_expansion" })).code, "metadata_offer_mismatch");
  assert.equal(validateCommercialLine(validLine({ lineItems: [{ ...validLine().lineItems[0], stripePriceId: "price_other" }] })).code, "stripe_price_mismatch");
  assert.equal(validateCommercialLine(validLine({ lineItems: [{ ...validLine().lineItems[0], quantity: 2 }] })).code, "quantity_mismatch");
  assert.equal(validateCommercialLine(validLine({ lineItems: [{ ...validLine().lineItems[0], unitAmountCents: 74999 }] })).code, "unit_amount_mismatch");
  assert.equal(validateCommercialLine(validLine({ amountTotal: 74999 })).code, "amount_total_mismatch");
  assert.equal(validateCommercialLine(validLine({ currency: "eur" })).code, "currency_mismatch");
  assert.equal(
    validateCommercialLine(validLine({ lineItems: [validLine().lineItems[0], validLine().lineItems[0]] })).code,
    "line_item_count_mismatch",
  );
});

test("line validation rejects pagination ambiguity and absent catalog rows", () => {
  assert.equal(validateCommercialLine(validLine({ hasMore: true })).code, "line_item_count_mismatch");
  assert.equal(validateCommercialLine(validLine({ expectedOffer: null })).code, "offer_not_in_catalog");
});

test("confirmation copy is phase-specific and later offers never say Diagnostic", () => {
  const cases = [
    ["price_dwy_intervention", "DWY Intervention"],
    ["price_dwy_monitoring", "DWY Monitoring"],
    ["price_dwy_expansion", "DWY Expansion"],
    ["price_dwy_autonomy", "DWY Autonomy Kit"],
    ["price_dfy_intervention", "DFY Intervention"],
    ["price_dfy_monitoring", "DFY Monitoring"],
    ["price_dfy_expansion", "DFY Expansion"],
    ["price_dfy_autonomy", "DFY Autonomy Kit"],
  ];

  for (const [offerPriceId, expectedName] of cases) {
    const message = buildCommercialEmail({
      templateKey: `commercial.checkout_paid.${offerPriceId}.v1`,
      offerPriceId,
      amountCents: 75000,
      currency: "usd",
    });
    assert.match(message.subject, new RegExp(expectedName));
    assert.doesNotMatch(`${message.subject}\n${message.text}\n${message.html}`, /diagnostic/i);
  }
});

test("all ten checkout templates are offer-specific, including failure mail", () => {
  const allOffers = [
    "price_dwy_beta_diagnostic",
    "price_dwy_intervention",
    "price_dwy_monitoring",
    "price_dwy_expansion",
    "price_dwy_autonomy",
    "price_dfy_beta_diagnostic",
    "price_dfy_intervention",
    "price_dfy_monitoring",
    "price_dfy_expansion",
    "price_dfy_autonomy",
  ];
  for (const offerPriceId of allOffers) {
    assert.doesNotThrow(() => buildCommercialEmail({
      templateKey: `commercial.checkout_paid.${offerPriceId}.v1`,
      offerPriceId,
      amountCents: 50000,
      currency: "usd",
    }));
    const failure = buildCommercialEmail({
      templateKey: `commercial.checkout_failed.${offerPriceId}.v1`,
      offerPriceId,
      amountCents: 50000,
      currency: "usd",
    });
    if (!offerPriceId.endsWith("beta_diagnostic")) {
      assert.doesNotMatch(`${failure.subject}\n${failure.text}\n${failure.html}`, /diagnostic/i);
    }
  }
});

test("Monitoring renewal has explicit renewal copy and cannot be used for another phase", () => {
  const renewal = buildCommercialEmail({
    templateKey: "commercial.invoice_paid.price_dfy_monitoring.v1",
    offerPriceId: "price_dfy_monitoring",
    amountCents: 250000,
    currency: "usd",
  });
  assert.match(renewal.subject, /renewal confirmed/i);
  assert.match(renewal.text, /next monitoring cycle/i);
  assert.throws(() => buildCommercialEmail({
    templateKey: "commercial.invoice_paid.price_dfy_intervention.v1",
    offerPriceId: "price_dfy_intervention",
    amountCents: 300000,
    currency: "usd",
  }));
});

test("unknown offers and unknown templates have no generic email fallback", () => {
  assert.throws(() => buildCommercialEmail({ templateKey: "commercial.checkout_paid.price_unknown.v1", offerPriceId: "price_unknown", amountCents: 100, currency: "usd" }));
  assert.throws(() => buildCommercialEmail({ templateKey: "generic", offerPriceId: "price_dwy_intervention", amountCents: 75000, currency: "usd" }));
  assert.throws(() => buildCommercialEmail({
    templateKey: "commercial.checkout_paid.price_dwy_expansion.v1",
    offerPriceId: "price_dwy_intervention",
    amountCents: 75000,
    currency: "usd",
  }));
});

test("locked intent snapshots require exact offer, owner, price, and contact facts", () => {
  const snapshot = {
    ok: true,
    engagement_id: ENGAGEMENT_ID,
    offer_price_id: "price_dwy_beta_diagnostic",
    stripe_price_id: "price_live_dwy_diagnostic",
    amount_cents: 35000,
    currency: "USD",
    billing: "one_time",
    offer_line: "dwy",
    offer_phase: "diagnostic",
    contact_email: "Founder@Example.org",
    authorization_kind: "public_diagnostic",
  };
  const valid = validateCommercialIntentSnapshot(snapshot, {
    offerPriceId: "price_dwy_beta_diagnostic",
    authorizationKind: "public_diagnostic",
    contactEmail: "founder@example.org",
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.currency, "usd");
  assert.equal(valid.value.contact_email, "founder@example.org");

  for (const override of [
    { amount_cents: "35000" },
    { offer_phase: "intervention" },
    { authorization_kind: "operator_lifecycle" },
    { stripe_price_id: "not-a-price" },
    { contact_email: "attacker@example.org" },
  ]) {
    assert.equal(
      validateCommercialIntentSnapshot({ ...snapshot, ...override }, {
        offerPriceId: "price_dwy_beta_diagnostic",
        authorizationKind: "public_diagnostic",
        contactEmail: "founder@example.org",
      }).ok,
      false
    );
  }
});

test("Stripe Price validation distinguishes one-time from exact one-month recurrence", () => {
  const monthlyIntent = {
    stripe_price_id: "price_live_monitoring",
    amount_cents: 50000,
    currency: "usd",
    billing: "monthly",
  };
  const monthlyPrice = {
    active: true,
    id: "price_live_monitoring",
    unit_amount: 50000,
    currency: "usd",
    type: "recurring",
    recurring: { interval: "month", interval_count: 1 },
  };
  assert.equal(validateCommercialStripePrice(monthlyPrice, monthlyIntent).ok, true);
  assert.equal(
    validateCommercialStripePrice(
      { ...monthlyPrice, recurring: { interval: "month", interval_count: 3 } },
      monthlyIntent
    ).ok,
    false
  );
  assert.equal(
    validateCommercialStripePrice({ ...monthlyPrice, type: "one_time", recurring: null }, monthlyIntent).ok,
    false
  );

  const oneTimeIntent = { ...monthlyIntent, billing: "one_time" };
  const oneTimePrice = { ...monthlyPrice, type: "one_time", recurring: null };
  assert.equal(validateCommercialStripePrice(oneTimePrice, oneTimeIntent).ok, true);
});

test("Checkout retries converge only open Sessions to Stripe and complete Sessions to status", () => {
  assert.equal(classifyCommercialCheckoutSession("open", "https://checkout.stripe.com/x").disposition, "open");
  assert.equal(classifyCommercialCheckoutSession("complete", null).disposition, "complete");
  assert.equal(classifyCommercialCheckoutSession("expired", "https://checkout.stripe.com/x").disposition, "unusable");
  assert.equal(classifyCommercialCheckoutSession("open", null).disposition, "unusable");
  assert.equal(canPersistCommercialSessionCancellation("expired"), true);
  assert.equal(canPersistCommercialSessionCancellation("open"), false);
  assert.equal(canPersistCommercialSessionCancellation("complete"), false);
});

test("expected SQL admission denials map to explicit HTTP states", () => {
  assert.deepEqual(
    classifyCommercialIntentRpcError({ code: "P0002", message: "default analyst unavailable" }, "public"),
    { status: 503, reason: "analyst_unavailable" }
  );
  assert.equal(classifyCommercialIntentRpcError({ code: "23514" }, "operator").status, 409);
  assert.equal(classifyCommercialIntentRpcError({ code: "XX000" }, "operator").status, 500);
});
