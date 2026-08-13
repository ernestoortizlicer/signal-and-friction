type Env = { STRIPE_SECRET_KEY?: string };
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
      return Response.json({ verified: false, status: "unavailable" }, { status: 404, headers: CORS });
    }
    const session = await response.json() as { status?: string; payment_status?: string };
    const verified = session.status === "complete"
      && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
    return Response.json({
      verified,
      status: session.status ?? null,
      paymentStatus: session.payment_status ?? null,
    }, { headers: CORS });
  } catch {
    return Response.json({ error: "Payment verification unavailable" }, { status: 503, headers: CORS });
  }
};
