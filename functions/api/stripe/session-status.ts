import { getServiceRoleKey, getSupabaseUrl } from "../_env";

type Env = {
  STRIPE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};
const CORS = { "Content-Type": "application/json" };

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !/^cs_(?:live|test)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
    return Response.json({ error: "Valid Checkout session_id required" }, { status: 400, headers: CORS });
  }
  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Payment verification unavailable" }, { status: 503, headers: CORS });
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
    if (!response.ok) {
      return Response.json({ verified: false, status: "unavailable", canonicalRecorded: false }, { status: 404, headers: CORS });
    }

    const session = await response.json() as { status?: string; payment_status?: string };
    const verified = session.status === "complete"
      && (session.payment_status === "paid" || session.payment_status === "no_payment_required");

    let canonicalRecorded = false;
    const serviceRoleKey = getServiceRoleKey(env);
    if (verified && serviceRoleKey) {
      const canonical = await fetch(
        `${getSupabaseUrl(env)}/rest/v1/payments?stripe_session_id=eq.${encodeURIComponent(sessionId)}&select=id&limit=1`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      );
      if (canonical.ok) {
        const rows = await canonical.json() as Array<{ id: string }>;
        canonicalRecorded = rows.length > 0;
      }
    }

    return Response.json({
      verified,
      canonicalRecorded,
      status: session.status ?? null,
      paymentStatus: session.payment_status ?? null,
    }, { headers: CORS });
  } catch {
    return Response.json({ error: "Payment verification unavailable" }, { status: 503, headers: CORS });
  }
};
