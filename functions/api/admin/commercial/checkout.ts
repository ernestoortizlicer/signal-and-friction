import { requireAdmin } from "../../_admin-auth";
import {
  COMMERCIAL_CATALOG_VERSION,
  CommercialRequestError,
  attachSession,
  cancelSessionAttempt,
  checkoutSessionDisposition,
  commercialErrorResponse,
  commercialIntentRpcError,
  createCheckoutSession,
  createCommercialClients,
  loadOfferBinding,
  normalizeCommercialTargetUrl,
  normalizeIntentResult,
  verifyFrozenStripePrice,
  type IntentResult,
} from "../../commercial/_checkout";

interface Env extends Record<string, string> {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface AdjacentCheckoutInput {
  requestId: string;
  predecessorEngagementId: string;
  offerPriceId: string;
  scopeBrief: string | null;
  targetUrl: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseInput(value: unknown): AdjacentCheckoutInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (body.scopeBrief != null && typeof body.scopeBrief !== "string") return null;
  if (body.targetUrl != null && typeof body.targetUrl !== "string") return null;
  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  const predecessorEngagementId =
    typeof body.predecessorEngagementId === "string" ? body.predecessorEngagementId.trim() : "";
  const offerPriceId = typeof body.offerPriceId === "string" ? body.offerPriceId.trim() : "";
  const scopeBrief = typeof body.scopeBrief === "string" ? body.scopeBrief.trim() || null : null;
  const rawTargetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : null;
  const targetUrl = rawTargetUrl ? normalizeCommercialTargetUrl(rawTargetUrl) : null;

  if (!UUID.test(requestId) || !UUID.test(predecessorEngagementId)) return null;
  if (offerPriceId.length < 5 || offerPriceId.length > 100) return null;
  if (scopeBrief && scopeBrief.length > 2000) return null;
  if (rawTargetUrl && !targetUrl) return null;
  return { requestId, predecessorEngagementId, offerPriceId, scopeBrief, targetUrl };
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = parseInput(raw);
  if (!input) {
    return Response.json(
      {
        error:
          "requestId, predecessorEngagementId, and offerPriceId are required; IDs must be UUIDs.",
      },
      { status: 422 }
    );
  }

  const clients = createCommercialClients(env);
  if (clients instanceof Response) return clients;
  const { stripe, supabase } = clients;

  try {
    const binding = await loadOfferBinding(supabase, input.offerPriceId, "operator");
    if (
      binding.tier === "expansion" &&
      (!input.targetUrl || !input.scopeBrief || input.scopeBrief.length < 20)
    ) {
      throw new CommercialRequestError(
        "Expansion requires a new HTTPS funnel URL and a scope brief of at least 20 characters.",
        422
      );
    }
    if (binding.tier !== "expansion" && input.targetUrl) {
      throw new CommercialRequestError(
        "Only Expansion may replace the predecessor engagement target URL.",
        422
      );
    }

    const { data, error } = await supabase.rpc("create_commercial_adjacent_intent", {
      p_payload: {
        request_key: input.requestId,
        predecessor_engagement_id: input.predecessorEngagementId,
        sf_offer_price_id: binding.price_id,
        sf_authorization_kind: "operator_lifecycle",
        authorized_by_auth_user_id: admin.id,
        scope_brief: input.scopeBrief,
        ...(binding.tier === "expansion" ? { target_url: input.targetUrl } : {}),
        sf_catalog_version: COMMERCIAL_CATALOG_VERSION,
      },
    });
    if (error) throw commercialIntentRpcError(error, "operator");

    const result = data as (Partial<IntentResult> & { ok?: boolean; error?: string }) | null;
    if (!result?.ok || !result.engagement_id) {
      const reason = result?.error || "lifecycle_not_eligible";
      throw new CommercialRequestError(`Later-phase checkout rejected: ${reason}.`, 409);
    }
    if (!result.contact_email) {
      throw new CommercialRequestError(
        "The authorized client has no verified billing contact email.",
        409
      );
    }

    const intent = normalizeIntentResult(result, {
      offerPriceId: binding.price_id,
      authorizationKind: "operator_lifecycle",
    });
    await verifyFrozenStripePrice(stripe, intent);
    const origin = new URL(request.url).origin;
    const session = await createCheckoutSession({
      stripe,
      intent,
      requestOrigin: origin,
      cancelPath: "/pricing?checkout=cancelled",
    });
    const disposition = checkoutSessionDisposition(session);
    if (disposition === "complete") {
      await attachSession({ supabase, stripe, intent, session });
      return Response.json(
        {
          engagementId: intent.engagement_id,
          checkoutUrl: `${origin}/checkout/success?session_id=${encodeURIComponent(session.id)}`,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (disposition !== "open" || !session.url) {
      await cancelSessionAttempt({
        supabase,
        stripe,
        intent,
        session,
        reason: "checkout_session_not_open",
      });
      throw new CommercialRequestError(
        "The prior checkout attempt is no longer open. Create a new authorized request.",
        409
      );
    }

    await attachSession({
      supabase,
      stripe,
      intent,
      session,
    });

    return Response.json(
      {
        engagementId: intent.engagement_id,
        checkoutUrl: session.url,
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (cause) {
    return commercialErrorResponse(cause);
  }
};
