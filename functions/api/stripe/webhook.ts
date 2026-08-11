import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseUrl } from "../_env";
import {
  COMMERCIAL_METADATA_KEYS,
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
} from "./_commercial-rules.mjs";

interface Env {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
}

type JsonObject = Record<string, unknown>;

interface CanonicalOffer {
  offerPriceId: string;
  stripePriceId: string;
  amountCents: number;
  currency: string;
  line: "dwy" | "dfy";
  tier: "beta_diagnostic" | "intervention" | "monitoring" | "expansion" | "autonomy_kit";
  billingInterval: "one_time" | "monthly";
  authorizationKind: "public_diagnostic" | "operator_lifecycle";
}

interface CommercialMetadata {
  engagementId: string;
  offerPriceId: string;
  authorizationKind: "public_diagnostic" | "operator_lifecycle";
  catalogVersion: string;
  offer: {
    line: "dwy" | "dfy";
    phase: "diagnostic" | "intervention" | "monitoring" | "expansion" | "autonomy_kit";
    order: number;
    name: string;
    billing: CanonicalOffer["billingInterval"];
  };
}

interface NormalizedLine {
  stripePriceId: string | null;
  quantity: number | null;
  unitAmountCents: number | null;
  amountTotal: number | null;
  currency: string | null;
  priceCurrency: string | null;
  periodStart?: number | null;
  periodEnd?: number | null;
  metadata?: Record<string, string>;
}

interface RuleIssue {
  code: string;
  message: string;
  details?: JsonObject;
}

interface RecordResult extends JsonObject {
  status: string;
  event_id?: string;
  engagement_id?: string | null;
  transaction_id?: string | null;
  billing_state?: string;
  delivery_state?: string;
  outbox_id?: string | null;
}

interface OutboxClaim extends JsonObject {
  status: "claimed" | "none" | "busy" | "already_sent";
  event_id?: string;
  outbox_id?: string | null;
  kind?: string | null;
  idempotency_key?: string | null;
  recipient_email?: string | null;
  offer_price_id?: string | null;
  amount_cents?: number | string | null;
  currency?: string | null;
  template_key?: string | null;
}

class CommercialProcessingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CommercialProcessingError";
    this.code = code;
  }
}

function response(status: number, body: JsonObject): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export const onRequestGet = async ({ env }: { env: Env }): Promise<Response> => {
  const ready = Boolean(
    env.STRIPE_SECRET_KEY?.trim().startsWith("sk_") &&
      env.STRIPE_WEBHOOK_SECRET?.trim().startsWith("whsec_") &&
      getServiceRoleKey(env) &&
      env.RESEND_API_KEY?.trim()
  );
  return response(ready ? 200 : 503, {
    ready,
    boundary: "canonical_commercial_webhook",
    durableOutboxRequired: true,
  });
};

function asRecord(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function nonBlank(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function providerId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return nonBlank(asRecord(value)?.id);
}

function safeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+(?:\.0+)?$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function normalizedEmail(value: unknown): string | null {
  const email = nonBlank(value)?.toLowerCase() ?? null;
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizedMetadata(value: unknown): Record<string, string> {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function eventCreatedAt(event: Stripe.Event): string {
  return new Date(event.created * 1000).toISOString();
}

function issueFromRule(result: unknown): RuleIssue | null {
  const record = asRecord(result);
  if (!record || record.ok !== false) return null;
  return {
    code: nonBlank(record.code) ?? "commercial_rule_failed",
    message: nonBlank(record.message) ?? "Commercial rule failed",
    details: asRecord(record.details) ?? {},
  };
}

function commercialEventEnvelope(event: Stripe.Event): JsonObject {
  return {
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    event_created_at: eventCreatedAt(event),
    event_payload: event as unknown as JsonObject,
  };
}

async function rpcJson<T extends JsonObject>(
  supabase: SupabaseClient,
  functionName: string,
  args: JsonObject,
): Promise<T> {
  const { data, error } = await supabase.rpc(functionName, args);
  if (error) {
    throw new CommercialProcessingError(
      `rpc_${functionName}_failed`,
      `${functionName} failed (${error.code ?? "database_error"})`,
    );
  }

  const candidate = Array.isArray(data) && data.length === 1 ? data[0] : data;
  const result = asRecord(candidate);
  if (!result) {
    throw new CommercialProcessingError(`rpc_${functionName}_invalid_result`, `${functionName} returned no JSON object`);
  }
  return result as T;
}

async function loadEngagementOffer(
  supabase: SupabaseClient,
  engagementId: string,
): Promise<CanonicalOffer | null> {
  const { data, error } = await supabase
    .from("commercial_engagements")
    .select(
      "id,offer_price_id,stripe_price_id,amount_cents,currency,offer_line,offer_tier,billing_interval,authorization_kind"
    )
    .eq("id", engagementId)
    .maybeSingle();

  if (error) {
    throw new CommercialProcessingError(
      "engagement_snapshot_lookup_failed",
      `Engagement snapshot lookup failed (${error.code ?? "database_error"})`
    );
  }
  if (!data) return null;

  const amountCents = safeInteger(data.amount_cents);
  const stripePriceId = nonBlank(data.stripe_price_id);
  const currency = nonBlank(data.currency)?.toLowerCase() ?? null;
  const offerPriceId = nonBlank(data.offer_price_id);
  const line = data.offer_line;
  const tier = data.offer_tier;
  const billingInterval = data.billing_interval;
  const authorizationKind = data.authorization_kind;
  if (
    !offerPriceId || !stripePriceId || amountCents === null || !currency ||
    (line !== "dwy" && line !== "dfy") ||
    !["beta_diagnostic", "intervention", "monitoring", "expansion", "autonomy_kit"].includes(tier) ||
    (billingInterval !== "one_time" && billingInterval !== "monthly") ||
    (authorizationKind !== "public_diagnostic" && authorizationKind !== "operator_lifecycle")
  ) {
    throw new CommercialProcessingError(
      "engagement_snapshot_invalid",
      "Canonical engagement offer snapshot is incomplete"
    );
  }

  return {
    offerPriceId,
    stripePriceId,
    amountCents,
    currency,
    line,
    tier,
    billingInterval,
    authorizationKind,
  };
}

function validateCanonicalBinding(metadata: CommercialMetadata, offer: CanonicalOffer): RuleIssue | null {
  const expectedTier = metadata.offer.phase === "diagnostic"
    ? "beta_diagnostic"
    : metadata.offer.phase;
  if (
    offer.offerPriceId !== metadata.offerPriceId ||
    offer.line !== metadata.offer.line ||
    offer.tier !== expectedTier ||
    offer.billingInterval !== metadata.offer.billing
  ) {
    return {
      code: "catalog_binding_mismatch",
      message: "Canonical database binding disagrees with the commercial rules",
    };
  }

  if (offer.authorizationKind !== metadata.authorizationKind) {
    return {
      code: "engagement_authorization_mismatch",
      message: "Webhook authorization does not match the frozen engagement snapshot",
    };
  }
  return null;
}

function normalizeCheckoutLine(value: unknown): NormalizedLine {
  const line = asRecord(value) ?? {};
  const price = asRecord(line.price);
  return {
    stripePriceId: providerId(line.price),
    quantity: safeInteger(line.quantity),
    unitAmountCents: safeInteger(price?.unit_amount),
    amountTotal: safeInteger(line.amount_total),
    currency: nonBlank(line.currency)?.toLowerCase() ?? null,
    priceCurrency: nonBlank(price?.currency)?.toLowerCase() ?? null,
    metadata: normalizedMetadata(line.metadata),
  };
}

function normalizeInvoiceLine(value: unknown): NormalizedLine {
  const line = asRecord(value) ?? {};
  const pricing = asRecord(line.pricing);
  const priceDetails = asRecord(pricing?.price_details);
  const price = asRecord(priceDetails?.price);
  const period = asRecord(line.period);
  return {
    stripePriceId: providerId(priceDetails?.price),
    quantity: safeInteger(line.quantity),
    unitAmountCents: safeInteger(price?.unit_amount ?? pricing?.unit_amount_decimal),
    amountTotal: safeInteger(line.amount),
    currency: nonBlank(line.currency)?.toLowerCase() ?? null,
    priceCurrency: nonBlank(price?.currency ?? line.currency)?.toLowerCase() ?? null,
    periodStart: safeInteger(period?.start),
    periodEnd: safeInteger(period?.end),
    metadata: normalizedMetadata(line.metadata),
  };
}

function metadataHasCommercialKey(metadata: Record<string, string>): boolean {
  return Object.values(COMMERCIAL_METADATA_KEYS).some((key) => Object.hasOwn(metadata, key));
}

function chooseInvoiceMetadata(candidates: Array<Record<string, string>>): {
  metadata: Record<string, string>;
  issue: RuleIssue | null;
} {
  const relevant = candidates.filter(metadataHasCommercialKey);
  if (relevant.length === 0) return { metadata: {}, issue: null };

  const fields = Object.values(COMMERCIAL_METADATA_KEYS);
  const first = relevant[0];
  const conflict = relevant.slice(1).some((candidate) =>
    fields.some((field) => (candidate[field] ?? null) !== (first[field] ?? null)),
  );
  return conflict
    ? {
        metadata: first,
        issue: {
          code: "conflicting_commercial_metadata",
          message: "Invoice carries conflicting commercial metadata snapshots",
        },
      }
    : { metadata: first, issue: null };
}

function invoicePaymentIdentifiers(invoice: JsonObject): {
  paymentIntentId: string | null;
  chargeId: string | null;
} {
  const payments = asRecord(invoice.payments);
  const paymentRows = Array.isArray(payments?.data) ? payments.data : [];
  const successful = paymentRows.find((row) => asRecord(row)?.status === "paid") ?? paymentRows[0];
  const payment = asRecord(asRecord(successful)?.payment);
  return {
    paymentIntentId: providerId(payment?.payment_intent ?? invoice.payment_intent),
    chargeId: providerId(payment?.charge ?? invoice.charge),
  };
}

async function loadInvoicePaymentIdentifiers(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<{ paymentIntentId: string | null; chargeId: string | null }> {
  const embedded = invoicePaymentIdentifiers(invoice as unknown as JsonObject);
  if (embedded.paymentIntentId || embedded.chargeId) return embedded;

  const payments = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 2 });
  const paymentRows = payments.data as unknown as JsonObject[];
  const successful = paymentRows.find((row) => row.status === "paid") ?? paymentRows[0];
  const payment = asRecord(successful?.payment);
  return {
    paymentIntentId: providerId(payment?.payment_intent),
    chargeId: providerId(payment?.charge),
  };
}

function failurePayload(payload: JsonObject, issue: RuleIssue, suppressCustomerNotification: boolean): JsonObject {
  return {
    ...payload,
    failure_reason: issue.code,
    failure_code: issue.code,
    failure_message: issue.message,
    failure_details: issue.details ?? {},
    suppress_customer_notification: suppressCustomerNotification,
  };
}

async function recordCheckoutEvent(
  stripe: Stripe,
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<RecordResult> {
  const eventSession = asRecord(event.data.object);
  if (!eventSession) {
    throw new CommercialProcessingError("checkout_session_missing", "Verified event has no Checkout Session object");
  }
  const sessionId = providerId(eventSession);
  if (!sessionId) throw new CommercialProcessingError("checkout_session_missing", "Verified event has no Checkout Session ID");

  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  let lineList = session.line_items;
  if (!lineList) lineList = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 2 });
  const rawLines = lineList.data.slice(0, 2);
  const normalizedLines = rawLines.map(normalizeCheckoutLine);
  const firstLine = normalizedLines[0] ?? null;
  // Lifecycle facts come from the signed event snapshot. A later mutable
  // Session retrieval is used only to obtain the immutable price lines.
  const rawMetadata = normalizedMetadata(eventSession.metadata);
  const clientReferenceId = nonBlank(eventSession.client_reference_id);
  const paymentStatus = nonBlank(eventSession.payment_status);
  const amountTotal = safeInteger(eventSession.amount_total);
  const currency = nonBlank(eventSession.currency)?.toLowerCase() ?? null;
  const eventCustomerDetails = asRecord(eventSession.customer_details);
  const metadataResult = validateCommercialMetadata(rawMetadata, {
    clientReferenceId,
    requireClientReference: true,
  });
  const metadataIssue = issueFromRule(metadataResult);
  const metadata = metadataIssue ? null : (metadataResult as { value: CommercialMetadata }).value;

  const basePayload: JsonObject = {
    ...commercialEventEnvelope(event),
    engagement_id: metadata?.engagementId ?? null,
    sf_engagement_id: metadata?.engagementId ?? nonBlank(rawMetadata[COMMERCIAL_METADATA_KEYS.engagementId]),
    checkout_session_id: session.id,
    offer_price_id: metadata?.offerPriceId ?? nonBlank(rawMetadata[COMMERCIAL_METADATA_KEYS.offerPriceId]),
    sf_offer_price_id: metadata?.offerPriceId ?? nonBlank(rawMetadata[COMMERCIAL_METADATA_KEYS.offerPriceId]),
    stripe_price_id: firstLine?.stripePriceId ?? null,
    line_item_count: rawLines.length,
    line_items_has_more: lineList.has_more,
    quantity: firstLine?.quantity ?? null,
    amount_total: amountTotal,
    currency,
    payment_status: paymentStatus,
    customer_email: normalizedEmail(eventCustomerDetails?.email ?? eventSession.customer_email),
    stripe_customer_id: providerId(eventSession.customer),
    payment_intent_id: providerId(eventSession.payment_intent),
    subscription_id: providerId(eventSession.subscription),
    client_reference_id: clientReferenceId,
    authorization_kind: metadata?.authorizationKind ?? nonBlank(rawMetadata[COMMERCIAL_METADATA_KEYS.authorizationKind]),
    catalog_version: metadata?.catalogVersion ?? nonBlank(rawMetadata[COMMERCIAL_METADATA_KEYS.catalogVersion]),
    sf_authorization_kind: metadata?.authorizationKind ?? nonBlank(rawMetadata[COMMERCIAL_METADATA_KEYS.authorizationKind]),
    sf_catalog_version: metadata?.catalogVersion ?? nonBlank(rawMetadata[COMMERCIAL_METADATA_KEYS.catalogVersion]),
  };

  let issue = metadataIssue;
  let canonicalOffer: CanonicalOffer | null = null;
  if (!issue && metadata) {
    canonicalOffer = await loadEngagementOffer(supabase, metadata.engagementId);
    if (!canonicalOffer) {
      issue = {
        code: "offer_not_in_catalog",
        message: "Commercial event has no canonical engagement snapshot",
      };
    } else {
      issue = validateCanonicalBinding(metadata, canonicalOffer);
    }
    if (canonicalOffer && !issue) {
      issue = issueFromRule(validateCommercialLine({
        metadataOfferPriceId: metadata.offerPriceId,
        expectedOffer: canonicalOffer,
        lineItems: normalizedLines,
        hasMore: lineList.has_more,
        amountTotal,
        currency,
      }));
      if (!issue && firstLine?.priceCurrency !== canonicalOffer.currency) {
        issue = {
          code: "price_currency_mismatch",
          message: "Stripe Price currency does not match the canonical offer",
        };
      }
    }
  }

  const intake = classifyCheckoutIntake(event.type, paymentStatus);
  const intakeIssue = issueFromRule(intake);
  if (!issue && intakeIssue) issue = intakeIssue;

  if (issue) {
    return rpcJson<RecordResult>(supabase, "record_commercial_checkout_failed", {
      p_payload: failurePayload(basePayload, issue, true),
    });
  }

  const transition = (intake as { transition: "pending" | "paid" | "failed"; reason: string | null; notifyCustomer?: boolean }).transition;
  if (transition === "failed") {
    const failure: RuleIssue = {
      code: (intake as { reason?: string }).reason ?? "checkout_payment_failed",
      message: event.type === "checkout.session.expired"
        ? "Checkout Session expired before payment"
        : "Stripe reported that Checkout payment failed",
    };
    return rpcJson<RecordResult>(supabase, "record_commercial_checkout_failed", {
      p_payload: failurePayload(basePayload, failure, (intake as { notifyCustomer?: boolean }).notifyCustomer === false),
    });
  }

  const functionName = transition === "paid"
    ? "record_commercial_checkout_paid"
    : "record_commercial_checkout_pending";
  return rpcJson<RecordResult>(supabase, functionName, { p_payload: basePayload });
}

async function recordInvoiceEvent(
  stripe: Stripe,
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<RecordResult> {
  const eventInvoice = asRecord(event.data.object);
  if (!eventInvoice) {
    throw new CommercialProcessingError("invoice_missing", "Verified event has no Invoice object");
  }
  const invoiceId = providerId(eventInvoice);
  if (!invoiceId) throw new CommercialProcessingError("invoice_missing", "Verified event has no Invoice ID");

  const invoice = await stripe.invoices.retrieve(invoiceId);
  const invoiceRecord = invoice as unknown as JsonObject;
  const lineList = await stripe.invoices.listLineItems(invoiceId, {
    limit: 2,
  });
  const rawLines = lineList.data.slice(0, 2);
  const normalizedLines = rawLines.map(normalizeInvoiceLine);
  const firstLine = normalizedLines[0] ?? null;

  const eventParent = asRecord(eventInvoice.parent);
  const eventSubscriptionDetails = asRecord(eventParent?.subscription_details);
  const parent = asRecord(invoiceRecord.parent);
  const subscriptionDetails = asRecord(parent?.subscription_details);
  const firstRawLine = asRecord(rawLines[0]);
  const subscriptionId = providerId(
    eventSubscriptionDetails?.subscription ?? subscriptionDetails?.subscription ?? firstRawLine?.subscription,
  );
  const metadataCandidates = [
    normalizedMetadata(eventSubscriptionDetails?.metadata),
    normalizedMetadata(eventInvoice.metadata),
    normalizedMetadata(subscriptionDetails?.metadata),
    normalizedMetadata(invoiceRecord.metadata),
  ];

  const chosenMetadata = chooseInvoiceMetadata(metadataCandidates);
  const metadataResult = validateCommercialMetadata(chosenMetadata.metadata);
  const metadataIssue = chosenMetadata.issue ?? issueFromRule(metadataResult);
  const metadata = metadataIssue ? null : (metadataResult as { value: CommercialMetadata }).value;
  const amountPaid = safeInteger(eventInvoice.amount_paid);
  const amountDue = safeInteger(eventInvoice.amount_due);
  const invoiceStatus = nonBlank(eventInvoice.status);
  const billingReason = nonBlank(eventInvoice.billing_reason);
  const invoiceCurrency = nonBlank(eventInvoice.currency)?.toLowerCase() ?? null;
  const amountForValidation = event.type === "invoice.paid" ? amountPaid : amountDue;
  const paymentIds = await loadInvoicePaymentIdentifiers(stripe, invoice);

  const basePayload: JsonObject = {
    ...commercialEventEnvelope(event),
    engagement_id: metadata?.engagementId ?? null,
    sf_engagement_id: metadata?.engagementId ?? nonBlank(chosenMetadata.metadata[COMMERCIAL_METADATA_KEYS.engagementId]),
    invoice_id: invoice.id,
    subscription_id: subscriptionId,
    offer_price_id: metadata?.offerPriceId ?? nonBlank(chosenMetadata.metadata[COMMERCIAL_METADATA_KEYS.offerPriceId]),
    sf_offer_price_id: metadata?.offerPriceId ?? nonBlank(chosenMetadata.metadata[COMMERCIAL_METADATA_KEYS.offerPriceId]),
    stripe_price_id: firstLine?.stripePriceId ?? null,
    line_item_count: rawLines.length,
    line_items_has_more: lineList.has_more,
    quantity: firstLine?.quantity ?? null,
    amount_paid: amountPaid,
    amount_due: amountDue,
    currency: invoiceCurrency,
    billing_period_start: firstLine?.periodStart
      ? new Date(firstLine.periodStart * 1000).toISOString()
      : new Date(invoice.period_start * 1000).toISOString(),
    billing_period_end: firstLine?.periodEnd
      ? new Date(firstLine.periodEnd * 1000).toISOString()
      : new Date(invoice.period_end * 1000).toISOString(),
    payment_intent_id: paymentIds.paymentIntentId,
    charge_id: paymentIds.chargeId,
    invoice_status: invoiceStatus,
    billing_reason: billingReason,
    customer_email: normalizedEmail(eventInvoice.customer_email),
    stripe_customer_id: providerId(eventInvoice.customer),
    authorization_kind: metadata?.authorizationKind ?? nonBlank(chosenMetadata.metadata[COMMERCIAL_METADATA_KEYS.authorizationKind]),
    catalog_version: metadata?.catalogVersion ?? nonBlank(chosenMetadata.metadata[COMMERCIAL_METADATA_KEYS.catalogVersion]),
    sf_authorization_kind: metadata?.authorizationKind ?? nonBlank(chosenMetadata.metadata[COMMERCIAL_METADATA_KEYS.authorizationKind]),
    sf_catalog_version: metadata?.catalogVersion ?? nonBlank(chosenMetadata.metadata[COMMERCIAL_METADATA_KEYS.catalogVersion]),
  };

  let issue = metadataIssue;
  let canonicalOffer: CanonicalOffer | null = null;
  if (!issue && metadata) {
    if (metadata.offer.phase !== "monitoring" || metadata.offer.billing !== "monthly") {
      issue = {
        code: "invoice_offer_not_monitoring",
        message: "Recurring invoice events are valid only for Monitoring",
      };
    } else {
      canonicalOffer = await loadEngagementOffer(supabase, metadata.engagementId);
      if (!canonicalOffer) {
        issue = {
          code: "offer_not_in_catalog",
          message: "Monitoring event has no canonical engagement snapshot",
        };
      } else {
        issue = validateCanonicalBinding(metadata, canonicalOffer);
      }
      if (!issue && canonicalOffer) {
        issue = issueFromRule(validateCommercialLine({
          metadataOfferPriceId: metadata.offerPriceId,
          expectedOffer: canonicalOffer,
          lineItems: normalizedLines,
          hasMore: lineList.has_more,
          amountTotal: amountForValidation,
          currency: invoiceCurrency,
        }));
        if (!issue && firstLine?.priceCurrency !== canonicalOffer.currency) {
          issue = {
            code: "price_currency_mismatch",
            message: "Invoice Price currency does not match the canonical offer",
          };
        }
      }
    }
  }

  const intake = classifyInvoiceIntake(event.type, invoiceStatus, amountPaid, billingReason);
  const intakeIssue = issueFromRule(intake);
  if (!issue && intakeIssue) issue = intakeIssue;

  if (issue) {
    return rpcJson<RecordResult>(supabase, "record_commercial_invoice_failed", {
      p_payload: failurePayload(basePayload, issue, true),
    });
  }

  const transition = (intake as {
    transition: "paid" | "failed" | "initial_checkout_confirmation" | "initial_checkout_failed";
    reason: string | null;
  }).transition;
  if (transition === "failed" || transition === "initial_checkout_failed") {
    const failure: RuleIssue = {
      code: (intake as { reason?: string }).reason ?? "invoice_payment_failed",
      message: "Stripe reported that the Monitoring invoice payment failed",
    };
    return rpcJson<RecordResult>(supabase, "record_commercial_invoice_failed", {
      p_payload: failurePayload(basePayload, failure, false),
    });
  }

  return rpcJson<RecordResult>(supabase, "record_commercial_invoice_paid", {
    p_payload: basePayload,
  });
}

function expectedOutboxKind(templateKey: string): string | null {
  if (/^commercial\.checkout_paid\.price_(?:dwy|dfy)_(?:beta_diagnostic|intervention|monitoring|expansion|autonomy)\.v1$/.test(templateKey)) {
    return "checkout_confirmation";
  }
  if (/^commercial\.checkout_failed\.price_(?:dwy|dfy)_(?:beta_diagnostic|intervention|monitoring|expansion|autonomy)\.v1$/.test(templateKey)) {
    return "checkout_payment_failed";
  }
  if (/^commercial\.invoice_paid\.price_(?:dwy|dfy)_monitoring\.v1$/.test(templateKey)) {
    return "monitoring_renewal_confirmation";
  }
  if (/^commercial\.invoice_failed\.price_(?:dwy|dfy)_monitoring\.v1$/.test(templateKey)) {
    return "monitoring_payment_failed";
  }
  return null;
}

async function sendOutboxEmail(apiKey: string, claim: OutboxClaim, expectedEventId: string): Promise<string> {
  const outboxId = nonBlank(claim.outbox_id);
  const recipient = normalizedEmail(claim.recipient_email);
  const idempotencyKey = nonBlank(claim.idempotency_key);
  const offerPriceId = nonBlank(claim.offer_price_id);
  const templateKey = nonBlank(claim.template_key);
  const kind = nonBlank(claim.kind);
  const amountCents = safeInteger(claim.amount_cents);
  const currency = nonBlank(claim.currency)?.toLowerCase() ?? null;
  if (!outboxId || !recipient || !idempotencyKey || idempotencyKey.length > 256 || !offerPriceId || !templateKey || !kind || amountCents === null || !currency) {
    throw new CommercialProcessingError("outbox_claim_invalid", "Claimed outbox row is incomplete");
  }
  if (claim.event_id !== expectedEventId || idempotencyKey !== `commercial/${kind}/${expectedEventId}`) {
    throw new CommercialProcessingError("outbox_identity_mismatch", "Outbox event identity or idempotency key is invalid");
  }
  if (expectedOutboxKind(templateKey) !== kind) {
    throw new CommercialProcessingError("outbox_template_kind_mismatch", "Outbox template and kind disagree");
  }

  const message = buildCommercialEmail({ templateKey, offerPriceId, amountCents, currency });
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: "Signal & Friction <hello@signal-and-friction.com>",
      to: recipient,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  const body = await resendResponse.json().catch(() => null) as { id?: unknown } | null;
  const providerMessageId = nonBlank(body?.id);
  if (!resendResponse.ok || !providerMessageId) {
    throw new CommercialProcessingError("resend_delivery_failed", `Resend delivery failed (${resendResponse.status})`);
  }
  return providerMessageId;
}

async function dispatchOutbox(
  supabase: SupabaseClient,
  eventId: string,
  resendApiKey: string | undefined,
): Promise<{ status: string; retry: boolean }> {
  const disposition = (status: string): { status: string; retry: boolean } => {
    const classification = classifyOutboxAcknowledgement(status);
    const issue = issueFromRule(classification);
    if (issue) throw new CommercialProcessingError(issue.code, issue.message);
    return { status, retry: asRecord(classification)?.retry === true };
  };

  const claim = await rpcJson<OutboxClaim>(supabase, "claim_commercial_outbox", { p_event_id: eventId });
  if (claim.event_id !== eventId) {
    throw new CommercialProcessingError("outbox_claim_event_mismatch", "Outbox claim returned the wrong event identity");
  }
  if (claim.status === "none" || claim.status === "already_sent") {
    return disposition(claim.status);
  }
  if (claim.status === "busy") {
    return disposition("busy");
  }
  if (claim.status !== "claimed") {
    throw new CommercialProcessingError("outbox_claim_unknown", "Outbox claim returned an unknown state");
  }

  const outboxId = nonBlank(claim.outbox_id);
  if (!outboxId) throw new CommercialProcessingError("outbox_id_missing", "Claimed outbox row has no ID");

  try {
    const apiKey = resendApiKey?.trim();
    if (!apiKey) throw new CommercialProcessingError("resend_not_configured", "Resend is not configured");
    const providerMessageId = await sendOutboxEmail(apiKey, claim, eventId);
    const completed = await rpcJson<JsonObject>(supabase, "complete_commercial_outbox", {
      p_outbox_id: outboxId,
      p_provider_message_id: providerMessageId,
    });
    const completedStatus = nonBlank(completed.status);
    if (
      (completedStatus !== "completed" && completedStatus !== "already_completed") ||
      completed.event_id !== eventId ||
      completed.outbox_id !== outboxId
    ) {
      throw new CommercialProcessingError("outbox_completion_invalid", "Outbox completion returned an unknown state");
    }
    return disposition(completedStatus);
  } catch (error) {
    const code = error instanceof CommercialProcessingError ? error.code : "outbox_delivery_failed";
    let failed: JsonObject;
    try {
      failed = await rpcJson<JsonObject>(supabase, "fail_commercial_outbox", {
        p_outbox_id: outboxId,
        p_error: code,
      });
    } catch (recordError) {
      console.error("commercial_outbox_failure_record_failed", {
        eventId,
        outboxId,
        code: recordError instanceof CommercialProcessingError ? recordError.code : "unknown",
      });
      throw error;
    }
    const failedStatus = nonBlank(failed.status);
    if (failed.event_id !== eventId || failed.outbox_id !== outboxId) {
      throw new CommercialProcessingError("outbox_failure_identity_mismatch", "Outbox failure returned the wrong identity");
    }
    return disposition(failedStatus ?? "unknown");
  }
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const signature = request.headers.get("stripe-signature");
  const verification = validateWebhookPreflight({
    signature,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  });
  const verificationIssue = issueFromRule(verification);
  if (verificationIssue) {
    const status = Number(verificationIssue.details?.httpStatus) || 500;
    console.error("commercial_webhook_preflight_failed", { code: verificationIssue.code });
    return response(status, { error: status === 400 ? "Invalid webhook request" : "Server misconfiguration" });
  }

  const stripeSecretKey = env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) {
    console.error("commercial_webhook_config_failed", { code: "missing_stripe_secret" });
    return response(500, { error: "Server misconfiguration" });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature as string,
      env.STRIPE_WEBHOOK_SECRET!.trim(),
    );
  } catch {
    console.warn("commercial_webhook_signature_invalid");
    return response(400, { error: "Invalid webhook request" });
  }

  if (!isHandledCommercialEvent(event.type)) {
    return response(200, { received: true, eventId: event.id, ignored: event.type });
  }

  const serviceRoleKey = getServiceRoleKey(env);
  const supabaseUrl = getSupabaseUrl(env);
  const processingConfig = validateProcessingConfig({ stripeSecretKey, supabaseUrl, serviceRoleKey });
  const processingConfigIssue = issueFromRule(processingConfig);
  if (processingConfigIssue) {
    console.error("commercial_webhook_config_failed", {
      eventId: event.id,
      code: processingConfigIssue.code,
      missing: processingConfigIssue.details?.missing,
    });
    return response(500, { error: "Server misconfiguration", eventId: event.id });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const recordResult = event.type.startsWith("checkout.session.")
      ? await recordCheckoutEvent(stripe, supabase, event)
      : await recordInvoiceEvent(stripe, supabase, event);
    const recordStatus = nonBlank(recordResult.status);
    if (!recordStatus || recordResult.event_id !== event.id) {
      throw new CommercialProcessingError("record_result_invalid", "Commercial record RPC returned an invalid event result");
    }

    const recordAcknowledgement = classifyRecordAcknowledgement(recordStatus);
    const recordAcknowledgementIssue = issueFromRule(recordAcknowledgement);
    if (recordAcknowledgementIssue) {
      throw new CommercialProcessingError(recordAcknowledgementIssue.code, recordAcknowledgementIssue.message);
    }

    // If an initial subscription invoice beats checkout.session.completed,
    // leave Stripe's delivery retryable. The database must not mark that
    // invoice processed until the single authoritative Checkout transaction
    // has committed.
    if (asRecord(recordAcknowledgement)?.retry === true) {
      console.warn("commercial_webhook_initial_invoice_waiting", { eventId: event.id });
      return response(500, {
        error: "Initial Checkout payment is not committed yet",
        eventId: event.id,
      });
    }

    // This runs for duplicates too. A prior delivery may have committed the
    // payment transition and failed before its durable outbox was delivered.
    const outbox = await dispatchOutbox(supabase, event.id, env.RESEND_API_KEY);
    if (outbox.retry) {
      console.warn("commercial_webhook_outbox_retry", { eventId: event.id, status: outbox.status });
      return response(500, {
        error: "Commercial notification is pending retry",
        eventId: event.id,
      });
    }

    console.log("commercial_webhook_processed", {
      eventId: event.id,
      eventType: event.type,
      recordStatus,
      outboxStatus: outbox.status,
    });
    return response(200, {
      received: true,
      eventId: event.id,
      status: recordStatus,
      outboxStatus: outbox.status,
    });
  } catch (error) {
    const code = error instanceof CommercialProcessingError ? error.code : "commercial_processing_failed";
    console.error("commercial_webhook_processing_failed", {
      eventId: event.id,
      eventType: event.type,
      code,
    });
    return response(500, { error: "Commercial event processing failed", eventId: event.id });
  }
};
