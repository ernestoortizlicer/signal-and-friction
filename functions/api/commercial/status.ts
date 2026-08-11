import { createClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseUrl } from "../_env";

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const OFFER_NAMES: Record<string, string> = {
  diagnostic: "Diagnostic",
  intervention: "Intervention",
  monitoring: "Monitoring",
  expansion: "Expansion",
  autonomy: "Autonomy Kit",
};

function paidCopy(phase: string): { headline: string; message: string } {
  switch (phase) {
    case "diagnostic":
      return {
        headline: "Your Diagnostic engagement is active.",
        message:
          "Payment, intake, and accountable analyst ownership are recorded. Your 72-hour Diagnostic window is now in motion for the exact funnel context you submitted.",
      };
    case "intervention":
      return {
        headline: "Your Intervention is authorized.",
        message:
          "Payment is attached to the eligible prior Diagnostic and the implementation engagement is ready for delivery work. This is not a new Diagnostic purchase.",
      };
    case "monitoring":
      return {
        headline: "Your Monitoring engagement is active.",
        message:
          "The subscription and its predecessor engagement are linked. Monitoring begins from the verified intervention state; no unrelated client record was selected by email.",
      };
    case "expansion":
      return {
        headline: "Your Expansion is authorized.",
        message:
          "Payment is attached to the eligible completed lifecycle and the additional funnel scope is ready for analyst delivery.",
      };
    case "autonomy":
      return {
        headline: "Your Autonomy Kit engagement is active.",
        message:
          "Payment and lifecycle eligibility are verified. The handoff engagement is now ready for its assigned analyst; no Diagnostic delivery has been promised again.",
      };
    default:
      return {
        headline: "Your engagement is recorded.",
        message: "Payment is attached to a verified commercial engagement.",
      };
  }
}

export const onRequestGet = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() || "";
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return Response.json({ error: "A valid Checkout Session ID is required." }, { status: 400 });
  }

  const serviceRoleKey = getServiceRoleKey(env);
  if (!serviceRoleKey) {
    return Response.json({ error: "Status verification is not configured." }, { status: 500 });
  }

  const supabase = createClient(getSupabaseUrl(env), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("commercial_engagements")
    .select("id,offer_line,offer_phase,billing_state,delivery_state")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("commercial_status_lookup_failed", { sessionId, error: error.message });
    return Response.json({ error: "Status verification is temporarily unavailable." }, { status: 500 });
  }
  if (!data) {
    return Response.json(
      { pending: true, error: "This Checkout Session is not attached to an engagement yet." },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  }

  const offerPhase = String(data.offer_phase);
  const base = {
    engagementId: String(data.id),
    offerName: OFFER_NAMES[offerPhase] || "Engagement",
    offerLine: data.offer_line as "dwy" | "dfy",
    offerPhase,
    billingState: String(data.billing_state),
    deliveryState: String(data.delivery_state),
  };

  if (data.billing_state === "checkout_pending" || data.billing_state === "payment_pending") {
    return Response.json(
      {
        ...base,
        pending: true,
        headline: "Stripe returned; payment is still being verified.",
        message: "No entitlement or delivery success is being claimed until the signed webhook commits.",
      },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (data.billing_state === "paid") {
    return Response.json(
      { ...base, ...paidCopy(offerPhase) },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(
    {
      ...base,
      headline: "This payment needs explicit review.",
      message:
        "The event is durably recorded, but the system has not activated a delivery entitlement. Signal & Friction will reconcile or refund it without guessing the intended client or offer.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
};
