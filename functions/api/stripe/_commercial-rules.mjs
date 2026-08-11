/**
 * Pure commercial rules for the Stripe webhook.
 *
 * This module deliberately has no Stripe, Supabase, or Cloudflare imports so
 * the rules that decide whether money may advance an engagement can be tested
 * without network or database fixtures. Database RPCs repeat the invariants;
 * this is the fail-fast boundary, not the sole enforcement layer.
 */

export const COMMERCIAL_CATALOG_VERSION = "2026-08-14";

export const COMMERCIAL_METADATA_KEYS = Object.freeze({
  engagementId: "sf_engagement_id",
  offerPriceId: "sf_offer_price_id",
  authorizationKind: "sf_authorization_kind",
  catalogVersion: "sf_catalog_version",
});

export const COMMERCIAL_AUTHORIZATION_KINDS = Object.freeze({
  publicDiagnostic: "public_diagnostic",
  operatorLifecycle: "operator_lifecycle",
});

const OFFER_RULES = Object.freeze({
  price_dwy_beta_diagnostic: Object.freeze({ line: "dwy", phase: "diagnostic", order: 1, name: "DWY Diagnostic", billing: "one_time" }),
  price_dwy_intervention: Object.freeze({ line: "dwy", phase: "intervention", order: 2, name: "DWY Intervention", billing: "one_time" }),
  price_dwy_monitoring: Object.freeze({ line: "dwy", phase: "monitoring", order: 3, name: "DWY Monitoring", billing: "monthly" }),
  price_dwy_expansion: Object.freeze({ line: "dwy", phase: "expansion", order: 4, name: "DWY Expansion", billing: "one_time" }),
  price_dwy_autonomy: Object.freeze({ line: "dwy", phase: "autonomy_kit", order: 5, name: "DWY Autonomy Kit", billing: "one_time" }),
  price_dfy_beta_diagnostic: Object.freeze({ line: "dfy", phase: "diagnostic", order: 1, name: "DFY Diagnostic", billing: "one_time" }),
  price_dfy_intervention: Object.freeze({ line: "dfy", phase: "intervention", order: 2, name: "DFY Intervention", billing: "one_time" }),
  price_dfy_monitoring: Object.freeze({ line: "dfy", phase: "monitoring", order: 3, name: "DFY Monitoring", billing: "monthly" }),
  price_dfy_expansion: Object.freeze({ line: "dfy", phase: "expansion", order: 4, name: "DFY Expansion", billing: "one_time" }),
  price_dfy_autonomy: Object.freeze({ line: "dfy", phase: "autonomy_kit", order: 5, name: "DFY Autonomy Kit", billing: "one_time" }),
});

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "invoice.paid",
  "invoice.payment_failed",
]);

const ACKNOWLEDGED_RECORD_STATUSES = new Set(["processed", "duplicate", "pending", "failed"]);
const ACKNOWLEDGED_OUTBOX_STATUSES = new Set([
  "none",
  "already_sent",
  "completed",
  "already_completed",
  "dead_letter",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function invalid(code, message, details = {}) {
  return { ok: false, code, message, details };
}

export function getCommercialOfferRule(offerPriceId) {
  return typeof offerPriceId === "string" ? OFFER_RULES[offerPriceId] ?? null : null;
}

export function isHandledCommercialEvent(eventType) {
  return HANDLED_EVENTS.has(eventType);
}

/** Pure validation for the locked SQL intent snapshot consumed by checkout. */
export function validateCommercialIntentSnapshot(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid("intent_snapshot_missing", "Commercial intent snapshot is missing");
  }
  const offer = getCommercialOfferRule(value.offer_price_id);
  const expectedPhase = offer?.phase === "autonomy_kit" ? "autonomy" : offer?.phase;
  const email = typeof value.contact_email === "string" ? value.contact_email.trim().toLowerCase() : "";
  if (
    value.ok !== true ||
    typeof value.engagement_id !== "string" ||
    !UUID_PATTERN.test(value.engagement_id) ||
    value.offer_price_id !== expected.offerPriceId ||
    !offer ||
    typeof value.stripe_price_id !== "string" ||
    !/^price_[A-Za-z0-9_]+$/.test(value.stripe_price_id) ||
    !Number.isSafeInteger(value.amount_cents) ||
    value.amount_cents <= 0 ||
    typeof value.currency !== "string" ||
    !/^[a-z]{3}$/i.test(value.currency) ||
    value.billing !== offer.billing ||
    value.offer_line !== offer.line ||
    value.offer_phase !== expectedPhase ||
    value.authorization_kind !== expected.authorizationKind ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    (expected.contactEmail != null && email !== expected.contactEmail.trim().toLowerCase())
  ) {
    return invalid("intent_snapshot_invalid", "Commercial intent snapshot is inconsistent");
  }
  return {
    ok: true,
    value: {
      engagement_id: value.engagement_id,
      offer_price_id: value.offer_price_id,
      stripe_price_id: value.stripe_price_id,
      amount_cents: value.amount_cents,
      currency: value.currency.toLowerCase(),
      billing: value.billing,
      offer_line: value.offer_line,
      offer_phase: value.offer_phase,
      contact_email: email,
      authorization_kind: value.authorization_kind,
    },
  };
}

export function validateCommercialStripePrice(price, intent) {
  const expectedRecurring = intent.billing === "monthly";
  if (
    price?.active !== true ||
    price?.id !== intent.stripe_price_id ||
    price?.unit_amount !== intent.amount_cents ||
    price?.currency?.toLowerCase() !== intent.currency ||
    price?.type !== (expectedRecurring ? "recurring" : "one_time") ||
    (price?.recurring?.interval ?? null) !== (expectedRecurring ? "month" : null) ||
    (price?.recurring?.interval_count ?? null) !== (expectedRecurring ? 1 : null)
  ) {
    return invalid("stripe_price_snapshot_mismatch", "Stripe Price disagrees with the intent snapshot");
  }
  return { ok: true };
}

export function classifyCommercialCheckoutSession(status, url) {
  if (status === "complete") return { ok: true, disposition: "complete" };
  if (status === "open" && present(url)) return { ok: true, disposition: "open" };
  return { ok: true, disposition: "unusable" };
}

export function canPersistCommercialSessionCancellation(status) {
  return status === "expired";
}

export function classifyCommercialIntentRpcError(error, boundary) {
  const code = typeof error?.code === "string" ? error.code : "database_error";
  const message = typeof error?.message === "string" ? error.message : "";
  if (boundary === "public" && code === "P0002" && /analyst/i.test(message)) {
    return { status: 503, reason: "analyst_unavailable" };
  }
  if (["P0002", "23503", "23505", "23514"].includes(code)) {
    return { status: 409, reason: "admission_rejected" };
  }
  return { status: 500, reason: "persistence_failed" };
}

/** HTTP acknowledgement policy shared by runtime branches and unit tests. */
export function classifyRecordAcknowledgement(status) {
  if (status === "pending_initial_checkout") {
    return { ok: true, retry: true, reason: "pending_initial_checkout" };
  }
  if (ACKNOWLEDGED_RECORD_STATUSES.has(status)) {
    return { ok: true, retry: false, reason: null };
  }
  return invalid("unknown_record_status", "Commercial record result is not acknowledgeable", { status });
}

export function classifyOutboxAcknowledgement(status) {
  if (status === "busy" || status === "retry_scheduled") {
    return { ok: true, retry: true, reason: "outbox_retry" };
  }
  if (ACKNOWLEDGED_OUTBOX_STATUSES.has(status)) {
    return { ok: true, retry: false, reason: null };
  }
  return invalid("unknown_outbox_status", "Commercial outbox result is not acknowledgeable", { status });
}

/** Missing/malformed caller input is a 400. Missing server verification state is a 500. */
export function validateWebhookPreflight({ signature, webhookSecret }) {
  if (!present(signature)) {
    return invalid("missing_signature", "Missing Stripe signature", { httpStatus: 400 });
  }
  if (!present(webhookSecret)) {
    return invalid("missing_webhook_secret", "Webhook verification is not configured", { httpStatus: 500 });
  }
  return { ok: true };
}

/** Processing configuration is checked only after a verified, relevant event is known. */
export function validateProcessingConfig({ stripeSecretKey, supabaseUrl, serviceRoleKey }) {
  const missing = [];
  if (!present(stripeSecretKey)) missing.push("STRIPE_SECRET_KEY");
  if (!present(supabaseUrl)) missing.push("SUPABASE_URL");
  if (!present(serviceRoleKey)) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    return invalid("missing_processing_config", "Commercial processing is not configured", {
      httpStatus: 500,
      missing,
    });
  }
  return { ok: true };
}

/**
 * Determines which durable checkout transition is allowed. A completed
 * Checkout Session is not payment truth when Stripe still reports it unpaid.
 */
export function classifyCheckoutIntake(eventType, paymentStatus) {
  if (eventType === "checkout.session.expired") {
    return { ok: true, transition: "failed", reason: "checkout_expired", notifyCustomer: false };
  }
  if (eventType === "checkout.session.async_payment_failed") {
    return { ok: true, transition: "failed", reason: "async_payment_failed", notifyCustomer: true };
  }

  if (eventType === "checkout.session.completed" && paymentStatus === "unpaid") {
    return { ok: true, transition: "pending", reason: "awaiting_delayed_payment", notifyCustomer: false };
  }

  if (
    (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") &&
    paymentStatus === "paid"
  ) {
    return { ok: true, transition: "paid", reason: null, notifyCustomer: true };
  }

  return invalid("invalid_checkout_payment_state", "Checkout event does not prove the required payment state", {
    eventType,
    paymentStatus: paymentStatus ?? null,
  });
}

export function classifyInvoiceIntake(eventType, invoiceStatus, amountPaid, billingReason) {
  if (billingReason !== "subscription_create" && billingReason !== "subscription_cycle") {
    return invalid("unsupported_invoice_billing_reason", "Invoice is not an initial or renewal subscription invoice", {
      eventType,
      billingReason: billingReason ?? null,
    });
  }

  if (eventType === "invoice.payment_failed") {
    return {
      ok: true,
      transition: billingReason === "subscription_create" ? "initial_checkout_failed" : "failed",
      reason: "invoice_payment_failed",
      billingReason,
    };
  }
  if (eventType === "invoice.paid" && invoiceStatus === "paid" && Number.isSafeInteger(amountPaid) && amountPaid > 0) {
    return {
      ok: true,
      // The initial subscription invoice only confirms the Checkout payment;
      // it is never a renewal transaction or a renewal-notification trigger.
      transition: billingReason === "subscription_create" ? "initial_checkout_confirmation" : "paid",
      reason: null,
      billingReason,
    };
  }
  return invalid("invalid_invoice_payment_state", "Invoice event does not prove a positive paid amount", {
    eventType,
    invoiceStatus: invoiceStatus ?? null,
    amountPaid: amountPaid ?? null,
    billingReason,
  });
}

/**
 * All current checkouts must originate from one of the two canonical intent
 * creators. Old Payment Links without these fields are review cases, never a
 * reason to guess an engagement from the payer email.
 *
 * @param {Record<string, string> | null | undefined} metadata
 * @param {{clientReferenceId?: string | null, requireClientReference?: boolean}} [options]
 */
export function validateCommercialMetadata(metadata, { clientReferenceId = null, requireClientReference = false } = {}) {
  const source = metadata && typeof metadata === "object" ? metadata : {};
  const engagementId = present(source[COMMERCIAL_METADATA_KEYS.engagementId])
    ? source[COMMERCIAL_METADATA_KEYS.engagementId].trim()
    : null;
  const offerPriceId = present(source[COMMERCIAL_METADATA_KEYS.offerPriceId])
    ? source[COMMERCIAL_METADATA_KEYS.offerPriceId].trim()
    : null;
  const authorizationKind = present(source[COMMERCIAL_METADATA_KEYS.authorizationKind])
    ? source[COMMERCIAL_METADATA_KEYS.authorizationKind].trim()
    : null;
  const catalogVersion = present(source[COMMERCIAL_METADATA_KEYS.catalogVersion])
    ? source[COMMERCIAL_METADATA_KEYS.catalogVersion].trim()
    : null;

  if (!engagementId || !offerPriceId || !authorizationKind || !catalogVersion) {
    return invalid("missing_commercial_metadata", "Required commercial metadata is missing", {
      engagementId,
      offerPriceId,
      authorizationKind,
      catalogVersion,
    });
  }
  if (!UUID_PATTERN.test(engagementId)) {
    return invalid("invalid_engagement_id", "Commercial engagement ID is not a UUID", { engagementId });
  }
  if (requireClientReference && !clientReferenceId) {
    return invalid("missing_engagement_reference", "Checkout has no commercial engagement reference");
  }
  if (clientReferenceId !== null && clientReferenceId !== engagementId) {
    return invalid("engagement_reference_mismatch", "Checkout reference does not match commercial metadata", {
      engagementId,
      clientReferenceId,
    });
  }
  if (catalogVersion !== COMMERCIAL_CATALOG_VERSION) {
    return invalid("catalog_version_mismatch", "Checkout catalog version is not current", {
      expected: COMMERCIAL_CATALOG_VERSION,
      actual: catalogVersion,
    });
  }

  const offer = getCommercialOfferRule(offerPriceId);
  if (!offer) {
    return invalid("unknown_offer", "Commercial offer is not active", { offerPriceId });
  }

  if (authorizationKind === COMMERCIAL_AUTHORIZATION_KINDS.publicDiagnostic && offer.order !== 1) {
    return invalid("public_offer_not_diagnostic", "Public authorization is valid only for an entry Diagnostic", {
      offerPriceId,
    });
  }
  if (authorizationKind === COMMERCIAL_AUTHORIZATION_KINDS.operatorLifecycle && offer.order === 1) {
    return invalid("lifecycle_offer_is_entry", "Operator lifecycle authorization is valid only for later phases", {
      offerPriceId,
    });
  }
  if (
    authorizationKind !== COMMERCIAL_AUTHORIZATION_KINDS.publicDiagnostic &&
    authorizationKind !== COMMERCIAL_AUTHORIZATION_KINDS.operatorLifecycle
  ) {
    return invalid("unknown_authorization_kind", "Commercial authorization kind is invalid", { authorizationKind });
  }

  return {
    ok: true,
    value: { engagementId, offerPriceId, authorizationKind, catalogVersion, offer },
  };
}

/**
 * Exact, no-guess line validation. The canonical database offer is supplied
 * by the caller and is rechecked transactionally by the record RPC.
 */
export function validateCommercialLine({
  metadataOfferPriceId,
  expectedOffer,
  lineItems,
  hasMore = false,
  amountTotal,
  currency,
}) {
  if (!expectedOffer) {
    return invalid("offer_not_in_catalog", "No canonical catalog row exists for this offer", {
      metadataOfferPriceId: metadataOfferPriceId ?? null,
    });
  }

  const expectedOfferPriceId = expectedOffer.offerPriceId;
  const expectedStripePriceId = expectedOffer.stripePriceId;
  const expectedAmount = expectedOffer.amountCents;
  const expectedCurrency = String(expectedOffer.currency ?? "").toLowerCase();

  if (!present(expectedOfferPriceId) || !present(expectedStripePriceId)) {
    return invalid("catalog_identity_incomplete", "Canonical catalog identity is incomplete");
  }
  if (!Number.isSafeInteger(expectedAmount) || expectedAmount <= 0 || !/^[a-z]{3}$/.test(expectedCurrency)) {
    return invalid("catalog_money_invalid", "Canonical catalog money fields are invalid");
  }
  if (metadataOfferPriceId !== expectedOfferPriceId) {
    return invalid("metadata_offer_mismatch", "Metadata offer does not match the canonical catalog row", {
      metadataOfferPriceId,
      expectedOfferPriceId,
    });
  }
  if (!Array.isArray(lineItems) || lineItems.length !== 1 || hasMore) {
    return invalid("line_item_count_mismatch", "Commercial checkout must contain exactly one line item", {
      lineItemCount: Array.isArray(lineItems) ? lineItems.length : null,
      hasMore: Boolean(hasMore),
    });
  }

  const line = lineItems[0] ?? {};
  if (line.quantity !== 1) {
    return invalid("quantity_mismatch", "Commercial checkout quantity must be exactly one", {
      quantity: line.quantity ?? null,
    });
  }
  if (line.stripePriceId !== expectedStripePriceId) {
    return invalid("stripe_price_mismatch", "Stripe price does not match the canonical offer", {
      actual: line.stripePriceId ?? null,
      expected: expectedStripePriceId,
    });
  }
  if (line.unitAmountCents !== expectedAmount) {
    return invalid("unit_amount_mismatch", "Stripe unit amount does not match the canonical offer", {
      actual: line.unitAmountCents ?? null,
      expected: expectedAmount,
    });
  }
  if (line.amountTotal !== expectedAmount || amountTotal !== expectedAmount) {
    return invalid("amount_total_mismatch", "Paid amount does not exactly match the canonical offer", {
      lineAmount: line.amountTotal ?? null,
      totalAmount: amountTotal ?? null,
      expected: expectedAmount,
    });
  }

  const envelopeCurrency = typeof currency === "string" ? currency.toLowerCase() : null;
  const lineCurrency = typeof line.currency === "string" ? line.currency.toLowerCase() : null;
  const priceCurrency = typeof line.priceCurrency === "string" ? line.priceCurrency.toLowerCase() : null;
  if (envelopeCurrency !== expectedCurrency || lineCurrency !== expectedCurrency || priceCurrency !== expectedCurrency) {
    return invalid("currency_mismatch", "Currency does not match the canonical offer", {
      lineCurrency,
      priceCurrency,
      envelopeCurrency,
      expected: expectedCurrency,
    });
  }

  return {
    ok: true,
    value: {
      offerPriceId: expectedOfferPriceId,
      stripePriceId: expectedStripePriceId,
      lineItemCount: 1,
      quantity: 1,
      amountTotal: expectedAmount,
      currency: expectedCurrency,
    },
  };
}

function formatAmount(amountCents, currency) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || !/^[a-z]{3}$/i.test(currency ?? "")) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function confirmationCopy(phase, renewal) {
  if (renewal) {
    if (phase !== "monitoring") throw new Error("Renewal confirmation is valid only for Monitoring");
    return {
      subjectVerb: "renewal confirmed",
      headingVerb: "renewal confirmed",
      next: "Your next monitoring cycle is active. We’ll measure the current signal, report the movement, and surface the next friction point.",
    };
  }

  const byPhase = {
    diagnostic: "We’ll begin the evidence review and prepare the specific finding, decision, and walkthrough for this engagement.",
    intervention: "We’ll move into the implementation work defined for this phase and keep the scope tied to the finding already established.",
    monitoring: "Your monitoring cycle is active. We’ll measure the current signal, report the movement, and surface the next friction point.",
    expansion: "We’ll begin the additional-funnel review covered by this phase and keep it separate from the original engagement area.",
    autonomy_kit: "We’ll prepare the framework, checklist, and operating materials covered by your Autonomy Kit.",
  };
  const next = byPhase[phase];
  if (!next) throw new Error(`Unknown commercial phase: ${phase}`);
  return { subjectVerb: "payment confirmed", headingVerb: "confirmed", next };
}

function failureCopy(phase) {
  const nouns = {
    diagnostic: "entry payment",
    intervention: "Intervention payment",
    monitoring: "Monitoring payment",
    expansion: "Expansion payment",
    autonomy_kit: "Autonomy Kit payment",
  };
  const noun = nouns[phase];
  if (!noun) throw new Error(`Unknown commercial phase: ${phase}`);
  return {
    subjectVerb: "payment needs attention",
    headingVerb: "payment needs attention",
    next: `Stripe could not complete your ${noun}. No new work has been activated. Please use Stripe’s payment update flow or contact us if you need help.`,
  };
}

/** Build only explicitly supported, offer-specific customer mail. */
export function buildCommercialEmail({
  templateKey,
  offerPriceId,
  amountCents,
  currency,
}) {
  const offer = getCommercialOfferRule(offerPriceId);
  if (!offer) throw new Error(`Cannot build email for unknown offer: ${offerPriceId ?? "(missing)"}`);

  const exactTemplates = {
    checkoutPaid: `commercial.checkout_paid.${offerPriceId}.v1`,
    checkoutFailed: `commercial.checkout_failed.${offerPriceId}.v1`,
    invoicePaid: `commercial.invoice_paid.${offerPriceId}.v1`,
    invoiceFailed: `commercial.invoice_failed.${offerPriceId}.v1`,
  };
  const renewal = templateKey === exactTemplates.invoicePaid;
  const failure = templateKey === exactTemplates.checkoutFailed || templateKey === exactTemplates.invoiceFailed;
  const confirmation = templateKey === exactTemplates.checkoutPaid;

  if (!renewal && !failure && !confirmation) {
    throw new Error(`Unsupported commercial email template: ${templateKey ?? "(missing)"}`);
  }
  if ((templateKey === exactTemplates.invoicePaid || templateKey === exactTemplates.invoiceFailed) && offer.phase !== "monitoring") {
    throw new Error("Invoice email templates are valid only for Monitoring");
  }

  const copy = failure ? failureCopy(offer.phase) : confirmationCopy(offer.phase, renewal);
  const amountLabel = formatAmount(amountCents, currency);
  const amountSentence = amountLabel ? `We recorded ${amountLabel}.` : null;
  const subject = `${offer.name} — ${copy.subjectVerb}`;
  const heading = `${offer.name} ${copy.headingVerb}`;
  const bodyText = [amountSentence, copy.next].filter(Boolean).join(" ");
  const text = `${heading}. ${bodyText}\n\n— Signal & Friction`;
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#0A0908;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;color:#F5F0EB;">
      <div style="font-family:monospace;font-size:11px;letter-spacing:.35em;text-transform:uppercase;color:#5C9A6B;">Signal &amp; Friction</div>
      <h1 style="font-size:26px;font-weight:700;margin:16px 0 12px;">${heading}</h1>
      <p style="color:#B0A89E;font-size:14px;line-height:1.65;margin:0;">${bodyText}</p>
      <p style="color:#7A6F65;font-size:12px;margin-top:32px;">— Signal &amp; Friction</p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
