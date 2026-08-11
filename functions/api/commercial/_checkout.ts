import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseUrl } from "../_env.ts";
import { normalizePublicHttpUrl } from "../_public-url-safety.mjs";
import {
  canPersistCommercialSessionCancellation,
  classifyCommercialCheckoutSession,
  classifyCommercialIntentRpcError,
  validateCommercialIntentSnapshot,
  validateCommercialStripePrice,
} from "../stripe/_commercial-rules.mjs";

export const COMMERCIAL_CATALOG_VERSION = "2026-08-14";

export type AuthorizationKind = "public_diagnostic" | "operator_lifecycle";
export type CommercialBilling = "one_time" | "monthly";
export type CommercialPhase =
  | "diagnostic"
  | "intervention"
  | "monitoring"
  | "expansion"
  | "autonomy";

export interface CommercialEnv {
  STRIPE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export interface OfferBinding {
  price_id: string;
  product_name: string;
  amount: number;
  stripe_price_id: string;
  line: "dwy" | "dfy";
  tier: "beta_diagnostic" | "intervention" | "monitoring" | "expansion" | "autonomy_kit";
  billing_interval: CommercialBilling;
  currency: string;
  is_active: boolean;
  is_public_entry: boolean;
}

export interface IntentResult {
  engagement_id: string;
  offer_price_id: string;
  stripe_price_id: string;
  amount_cents: number;
  currency: string;
  billing: CommercialBilling;
  offer_line: "dwy" | "dfy";
  offer_phase: CommercialPhase;
  contact_email: string;
  authorization_kind: AuthorizationKind;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface IntakePayload {
  requestId: string;
  offerPriceId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  industry: string;
  targetUrl: string;
  scopeBrief: string;
  referralCode: string | null;
  turnstileToken: string;
}

export function normalizeCommercialTargetUrl(value: string): string | null {
  const result = normalizePublicHttpUrl(value, { httpsOnly: true });
  return result.ok && typeof result.url === "string" ? result.url : null;
}

export function createCommercialClients(env: CommercialEnv): {
  stripe: Stripe;
  supabase: SupabaseClient;
} | Response {
  const stripeKey = env.STRIPE_SECRET_KEY?.trim();
  const serviceRoleKey = getServiceRoleKey(env);
  if (!stripeKey || !serviceRoleKey) {
    return Response.json({ error: "Commercial checkout is not configured." }, { status: 500 });
  }

  return {
    stripe: new Stripe(stripeKey, {
      apiVersion: "2026-05-27.dahlia",
      httpClient: Stripe.createFetchHttpClient(),
    }),
    supabase: createClient(getSupabaseUrl(env), serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export function normalizePublicIntake(value: unknown):
  | { ok: true; value: IntakePayload }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "A JSON intake object is required." };
  }

  const body = value as Record<string, unknown>;
  const required = [
    ["requestId", 36, 36],
    ["offerPriceId", 5, 100],
    ["companyName", 2, 120],
    ["contactName", 2, 120],
    ["contactEmail", 5, 254],
    ["industry", 2, 120],
    ["targetUrl", 10, 2048],
    ["scopeBrief", 20, 2000],
    ["turnstileToken", 1, 2048],
  ] as const;

  const strings: Record<string, string> = {};
  for (const [field, min, max] of required) {
    const raw = body[field];
    if (typeof raw !== "string") return { ok: false, error: `${field} is required.` };
    const trimmed = raw.trim();
    if (trimmed.length < min || trimmed.length > max) {
      return { ok: false, error: `${field} must be between ${min} and ${max} characters.` };
    }
    strings[field] = trimmed;
  }

  if (!UUID.test(strings.requestId)) {
    return { ok: false, error: "requestId must be a UUID." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strings.contactEmail)) {
    return { ok: false, error: "contactEmail must be a valid email address." };
  }

  const targetUrl = normalizeCommercialTargetUrl(strings.targetUrl);
  if (!targetUrl) return { ok: false, error: "targetUrl must be a valid HTTPS URL without credentials." };

  const referralCode =
    body.referralCode == null
      ? null
      : typeof body.referralCode === "string" && body.referralCode.trim().length <= 120
        ? body.referralCode.trim() || null
        : null;

  return {
    ok: true,
    value: {
      requestId: strings.requestId,
      offerPriceId: strings.offerPriceId,
      companyName: strings.companyName,
      contactName: strings.contactName,
      contactEmail: strings.contactEmail.toLowerCase(),
      industry: strings.industry,
      targetUrl,
      scopeBrief: strings.scopeBrief,
      referralCode,
      turnstileToken: strings.turnstileToken,
    },
  };
}

export async function verifyCommercialTurnstile(params: {
  request: Request;
  env: CommercialEnv;
  intake: IntakePayload;
}): Promise<void> {
  const { request, env, intake } = params;
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    throw new CommercialRequestError("Commercial abuse protection is not configured.", 503);
  }

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", intake.turnstileToken);
  const remoteIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (remoteIp) form.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new CommercialRequestError("Abuse protection is temporarily unavailable.", 503);
  }

  const result = (await response.json().catch(() => null)) as
    | { success?: boolean; action?: string; hostname?: string }
    | null;
  const expectedHostname = new URL(request.url).hostname.toLowerCase().replace(/^www\./, "");
  const verifiedHostname = result?.hostname?.toLowerCase().replace(/^www\./, "") || "";
  if (
    !response.ok ||
    result?.success !== true ||
    result.action !== "commercial_checkout" ||
    verifiedHostname !== expectedHostname
  ) {
    throw new CommercialRequestError(
      "Human verification expired or failed. Complete the challenge and retry.",
      403
    );
  }
}

export async function loadOfferBinding(
  supabase: SupabaseClient,
  offerPriceId: string,
  access: "public" | "operator"
): Promise<OfferBinding> {
  let query = supabase
    .from("stripe_payment_links")
    .select("price_id,product_name,amount,stripe_price_id,line,tier,billing_interval,currency,is_active,is_public_entry")
    .eq("price_id", offerPriceId)
    .eq("is_active", true);

  if (access === "public") query = query.eq("is_public_entry", true);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`offer_binding_lookup_failed:${error.message}`);
  if (!data?.stripe_price_id || !data.line || !data.tier || !data.billing_interval || !data.currency) {
    throw new CommercialRequestError(
      access === "public" ? "This offer is not available for public checkout." : "This offer is not active.",
      409
    );
  }

  const binding = data as OfferBinding;
  if (access === "public" && binding.tier !== "beta_diagnostic") {
    throw new CommercialRequestError("Only a Diagnostic can begin a public engagement.", 403);
  }
  if (access === "operator" && binding.tier === "beta_diagnostic") {
    throw new CommercialRequestError("Diagnostic checkout uses the public intake boundary.", 409);
  }
  return binding;
}

/**
 * Validate the immutable checkout snapshot returned from the same locked SQL
 * transaction that created the engagement. Stripe sessions must consume this
 * snapshot—not the earlier catalog read—so a concurrent catalog update cannot
 * make the provider charge disagree with the persisted entitlement.
 */
export function normalizeIntentResult(
  value: unknown,
  expected: {
    offerPriceId: string;
    authorizationKind: AuthorizationKind;
    contactEmail?: string;
  }
): IntentResult {
  const result = validateCommercialIntentSnapshot(value, expected);
  if (!result.ok || !("value" in result)) {
    const code = "code" in result && typeof result.code === "string"
      ? result.code
      : "commercial_intent_snapshot_invalid";
    throw new Error(code);
  }
  return result.value as IntentResult;
}

export async function verifyFrozenStripePrice(stripe: Stripe, intent: IntentResult): Promise<void> {
  const price = await stripe.prices.retrieve(intent.stripe_price_id);
  if (!validateCommercialStripePrice(price, intent).ok) {
    throw new Error(`stripe_price_snapshot_mismatch:${intent.offer_price_id}`);
  }
}

export function checkoutSessionDisposition(
  session: Stripe.Checkout.Session
): "open" | "complete" | "unusable" {
  const disposition = classifyCommercialCheckoutSession(session.status, session.url).disposition;
  return disposition === "open" || disposition === "complete" ? disposition : "unusable";
}

export async function createCheckoutSession(params: {
  stripe: Stripe;
  intent: IntentResult;
  requestOrigin: string;
  cancelPath: string;
}): Promise<Stripe.Checkout.Session> {
  const { stripe, intent, requestOrigin, cancelPath } = params;
  const metadata: Record<string, string> = {
    sf_engagement_id: intent.engagement_id,
    sf_offer_price_id: intent.offer_price_id,
    sf_authorization_kind: intent.authorization_kind,
    sf_catalog_version: COMMERCIAL_CATALOG_VERSION,
  };

  const common: Stripe.Checkout.SessionCreateParams = {
    mode: intent.billing === "monthly" ? "subscription" : "payment",
    line_items: [{ price: intent.stripe_price_id, quantity: 1 }],
    customer_email: intent.contact_email,
    client_reference_id: intent.engagement_id,
    metadata,
    success_url: `${requestOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${requestOrigin}${cancelPath}`,
  };

  if (intent.billing === "monthly") {
    common.subscription_data = { metadata };
  } else {
    common.payment_intent_data = { metadata };
  }

  const created = await stripe.checkout.sessions.create(common, {
    idempotencyKey: `sf-commercial-checkout/${intent.engagement_id}/v1`,
  });

  // Stripe replays the original response for an idempotency key. Retrieve the
  // live object so a retry never hands the browser a cached URL for a Session
  // that has since completed or expired.
  return stripe.checkout.sessions.retrieve(created.id);
}

export async function cancelSessionAttempt(params: {
  supabase: SupabaseClient;
  stripe: Stripe;
  intent: IntentResult;
  session: Stripe.Checkout.Session;
  reason: string;
}): Promise<void> {
  const { supabase, stripe, intent, session, reason } = params;
  let providerSession = session;

  if (session.status === "open") {
    try {
      providerSession = await stripe.checkout.sessions.expire(session.id);
    } catch (cause) {
      console.error("commercial_checkout_expire_failed", {
        engagementId: intent.engagement_id,
        sessionId: session.id,
        error: cause instanceof Error ? cause.message : "unknown",
      });
      // The expire request can race with payment completion or return an
      // ambiguous network error. Re-read Stripe before changing local state.
      // A completed Session must remain pending for its signed webhook; only a
      // provider-confirmed expired Session is safe to mark cancelled locally.
      providerSession = await stripe.checkout.sessions.retrieve(session.id);
    }
  }

  if (!canPersistCommercialSessionCancellation(providerSession.status)) {
    throw new Error(`checkout_session_not_expired:${providerSession.status || "unknown"}`);
  }

  const { data, error } = await supabase.rpc("cancel_commercial_checkout_session", {
    p_payload: {
      sf_engagement_id: intent.engagement_id,
      sf_offer_price_id: intent.offer_price_id,
      sf_authorization_kind: intent.authorization_kind,
      sf_catalog_version: COMMERCIAL_CATALOG_VERSION,
      checkout_session_id: session.id,
      reason,
    },
  });
  const result = data as { ok?: boolean; error?: string } | null;
  if (error || !result?.ok) {
    throw new Error(`checkout_session_cleanup_failed:${error?.message || result?.error || "unknown"}`);
  }
}

export async function attachSession(params: {
  supabase: SupabaseClient;
  stripe: Stripe;
  intent: IntentResult;
  session: Stripe.Checkout.Session;
}): Promise<void> {
  const { supabase, stripe, intent, session } = params;
  const engagementId = intent.engagement_id;
  const { data, error } = await supabase.rpc("attach_commercial_checkout_session", {
    p_payload: {
      sf_engagement_id: engagementId,
      sf_offer_price_id: intent.offer_price_id,
      sf_authorization_kind: intent.authorization_kind,
      sf_catalog_version: COMMERCIAL_CATALOG_VERSION,
      checkout_session_id: session.id,
      checkout_expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    },
  });

  const result = data as { ok?: boolean; error?: string } | null;
  if (!error && result?.ok) return;

  const attachError = error?.message || result?.error || "unknown";
  try {
    await cancelSessionAttempt({
      supabase,
      stripe,
      intent,
      session,
      reason: "checkout_session_attach_failed",
    });
  } catch (cleanupCause) {
    throw new Error(
      `checkout_session_attach_and_cleanup_failed:${attachError}:${
        cleanupCause instanceof Error ? cleanupCause.message : "unknown"
      }`
    );
  }
  throw new Error(`checkout_session_attach_failed:${attachError}`);
}

export class CommercialRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function commercialIntentRpcError(
  error: { code?: string; message?: string },
  boundary: "public" | "operator"
): Error {
  const classification = classifyCommercialIntentRpcError(error, boundary);
  if (classification.reason === "analyst_unavailable") {
    return new CommercialRequestError(
      "Checkout is temporarily unavailable because no analyst can accept a new engagement.",
      503
    );
  }
  if (classification.reason === "admission_rejected") {
    return new CommercialRequestError(
      boundary === "public"
        ? "This Diagnostic checkout is no longer available. Reload pricing before retrying."
        : "Later-phase checkout was rejected by the engagement lifecycle.",
      409
    );
  }
  return new Error(`commercial_intent_rpc_failed:${error.code || "database_error"}`);
}

export function commercialErrorResponse(cause: unknown): Response {
  if (cause instanceof CommercialRequestError) {
    return Response.json({ error: cause.message }, { status: cause.status });
  }
  console.error("commercial_checkout_failed", {
    error: cause instanceof Error ? cause.message : "unknown",
  });
  return Response.json(
    {
      error:
        "Checkout could not be prepared safely. No entitlement was activated; reload this page before retrying.",
    },
    { status: 500 }
  );
}
