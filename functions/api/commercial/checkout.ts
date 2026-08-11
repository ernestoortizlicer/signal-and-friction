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
  normalizeIntentResult,
  normalizePublicIntake,
  verifyCommercialTurnstile,
  verifyFrozenStripePrice,
  type CommercialEnv,
  type IntentResult,
} from "./_checkout";

export const onRequestGet = async ({ env }: { env: CommercialEnv }): Promise<Response> => {
  const ready = Boolean(
    env.STRIPE_SECRET_KEY?.trim().startsWith("sk_") &&
      env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      env.TURNSTILE_SECRET_KEY?.trim()
  );
  return Response.json(
    { ready, boundary: "canonical_commercial_checkout", turnstileRequired: true },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
};

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: CommercialEnv;
}): Promise<Response> => {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return Response.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const intake = normalizePublicIntake(raw);
  if (!intake.ok) return Response.json({ error: intake.error }, { status: 422 });

  try {
    await verifyCommercialTurnstile({ request, env, intake: intake.value });
  } catch (cause) {
    return commercialErrorResponse(cause);
  }
  const clients = createCommercialClients(env);
  if (clients instanceof Response) return clients;

  const { stripe, supabase } = clients;
  const payload = intake.value;

  try {
    const binding = await loadOfferBinding(supabase, payload.offerPriceId, "public");

    const { data, error } = await supabase.rpc("create_commercial_public_intent", {
      p_payload: {
        request_key: payload.requestId,
        sf_offer_price_id: binding.price_id,
        sf_authorization_kind: "public_diagnostic",
        sf_catalog_version: COMMERCIAL_CATALOG_VERSION,
        company_name: payload.companyName,
        contact_name: payload.contactName,
        contact_email: payload.contactEmail,
        industry: payload.industry,
        target_url: payload.targetUrl,
        scope_brief: payload.scopeBrief,
        referral_code: payload.referralCode,
      },
    });
    if (error) throw commercialIntentRpcError(error, "public");

    const result = data as (Partial<IntentResult> & { ok?: boolean; error?: string }) | null;
    if (!result?.ok || !result.engagement_id) {
      if (result?.error === "default_analyst_unavailable") {
        throw new CommercialRequestError(
          "Checkout is temporarily unavailable because no analyst can accept a new engagement.",
          503
        );
      }
      throw new Error(`commercial_intent_rejected:${result?.error || "unknown"}`);
    }

    const intent = normalizeIntentResult(result, {
      offerPriceId: binding.price_id,
      authorizationKind: "public_diagnostic",
      contactEmail: payload.contactEmail,
    });
    await verifyFrozenStripePrice(stripe, intent);
    const origin = new URL(request.url).origin;
    const session = await createCheckoutSession({
      stripe,
      intent,
      requestOrigin: origin,
      cancelPath: `/checkout/${encodeURIComponent(binding.price_id)}?cancelled=1`,
    });
    const disposition = checkoutSessionDisposition(session);
    if (disposition === "complete") {
      // A concurrent request may have handed this idempotent Session to the
      // browser already. Converge the exact provider object into the durable
      // engagement before directing anyone to status.
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
        "The prior checkout attempt is no longer open. Reload this page to create a new engagement attempt.",
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
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (cause) {
    return commercialErrorResponse(cause);
  }
};
